/**
 * FORFEIT Send Notification Edge Function
 *
 * Triggered by INSERT on notifications table (via database webhook).
 * Sends Web Push notifications to the user's subscribed devices.
 *
 * Required secrets (set via `supabase secrets set`):
 *   VAPID_PUBLIC_KEY  — the VAPID public key
 *   VAPID_PRIVATE_KEY — the VAPID private key
 *
 * Deploy:
 *   supabase functions deploy send-notification
 *
 * To wire up the database webhook:
 *   1. In Supabase Dashboard → Database → Webhooks
 *   2. Create webhook on notifications table, INSERT event
 *   3. Point to: https://<project-ref>.supabase.co/functions/v1/send-notification
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!

// ---------------------------------------------------------------------------
// Minimal Web Push implementation for Deno (VAPID + aes128gcm)
// Uses the Web Crypto API available in Deno/Edge Functions
// ---------------------------------------------------------------------------

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Create a signed VAPID JWT */
async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: "mailto:noreply@forfeit.app",
  }

  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header)),
  )
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  )
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  // Import VAPID private key
  const rawKey = base64UrlDecode(VAPID_PRIVATE_KEY)
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    buildPkcs8FromRaw(rawKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  )

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      new TextEncoder().encode(unsignedToken),
    ),
  )

  // Convert DER signature to raw r||s (64 bytes)
  const rawSig = derToRaw(signature)

  return `${unsignedToken}.${base64UrlEncode(rawSig)}`
}

/** Wrap raw 32-byte EC private key in PKCS#8 DER */
function buildPkcs8FromRaw(rawKey: Uint8Array): Uint8Array {
  // PKCS#8 prefix for P-256 private key
  const prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ])
  // Public key section omitted — just the private key
  const result = new Uint8Array(prefix.length + rawKey.length)
  result.set(prefix)
  result.set(rawKey, prefix.length)
  return result
}

/** Convert DER-encoded ECDSA signature to raw r||s format */
function derToRaw(der: Uint8Array): Uint8Array {
  // DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  const raw = new Uint8Array(64)

  let offset = 2 // skip 0x30 and total length
  // r
  offset++ // skip 0x02
  const rLen = der[offset++]
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset
  const rDest = rLen < 32 ? 32 - rLen : 0
  raw.set(der.slice(rStart, offset + rLen), rDest)
  offset += rLen

  // s
  offset++ // skip 0x02
  const sLen = der[offset++]
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset
  const sDest = sLen < 32 ? 64 - sLen : 32
  raw.set(der.slice(sStart, offset + sLen), sDest)

  return raw
}

/** Encrypt payload using aes128gcm for Web Push */
async function encryptPayload(
  payload: Uint8Array,
  subscriptionPublicKey: Uint8Array,
  subscriptionAuth: Uint8Array,
): Promise<{ encrypted: Uint8Array; serverPublicKey: Uint8Array }> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )

  // Import subscription public key
  const subKey = await crypto.subtle.importKey(
    "raw",
    subscriptionPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  )

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subKey },
      localKeyPair.privateKey,
      256,
    ),
  )

  // Export local public key
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey),
  )

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF: auth_secret -> PRK
  const authInfo = new TextEncoder().encode("WebPush: info\0")
  const infoConcat = new Uint8Array(
    authInfo.length + subscriptionPublicKey.length + localPublicKeyRaw.length,
  )
  infoConcat.set(authInfo)
  infoConcat.set(subscriptionPublicKey, authInfo.length)
  infoConcat.set(localPublicKeyRaw, authInfo.length + subscriptionPublicKey.length)

  const ikmKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const authKey = await crypto.subtle.importKey(
    "raw",
    subscriptionAuth,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  // PRK = HMAC-SHA256(auth_secret, shared_secret)
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", authKey, sharedSecret),
  )

  // Derive IKM from PRK using info
  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const ikm = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      prkKey,
      new Uint8Array([...infoConcat, 1]),
    ),
  )

  // HKDF for CEK and nonce
  const saltKey = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const prkFinal = new Uint8Array(
    await crypto.subtle.sign("HMAC", saltKey, ikm),
  )
  const prkFinalKey = await crypto.subtle.importKey(
    "raw",
    prkFinal,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0")
  const cekFull = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      prkFinalKey,
      new Uint8Array([...cekInfo, 1]),
    ),
  )
  const cek = cekFull.slice(0, 16)

  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0")
  const nonceFull = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      prkFinalKey,
      new Uint8Array([...nonceInfo, 1]),
    ),
  )
  const nonce = nonceFull.slice(0, 12)

  // Add padding delimiter
  const paddedPayload = new Uint8Array(payload.length + 1)
  paddedPayload.set(payload)
  paddedPayload[payload.length] = 2 // delimiter

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  )
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload,
    ),
  )

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length)
  header.set(salt)
  new DataView(header.buffer).setUint32(16, rs)
  header[20] = localPublicKeyRaw.length
  header.set(localPublicKeyRaw, 21)

  const encrypted = new Uint8Array(header.length + ciphertext.length)
  encrypted.set(header)
  encrypted.set(ciphertext, header.length)

  return { encrypted, serverPublicKey: localPublicKeyRaw }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()

    // Webhook payload shape: { type: "INSERT", record: {...}, ... }
    const notification = payload.record ?? payload

    const userId = notification.user_id
    if (!userId) {
      return new Response(JSON.stringify({ ok: true, skipped: "no user_id" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check notification preferences — if notification has group_id or bet_id in data,
    // look up whether push is disabled for that entity
    const notifData = notification.data as Record<string, unknown> | null
    if (notifData) {
      const groupId = notifData.group_id as string | undefined
      const competitionId = notifData.competition_id as string | undefined

      if (groupId) {
        const { data: pref } = await supabase
          .from("notification_preferences")
          .select("push_enabled")
          .eq("user_id", userId)
          .eq("entity_type", "group")
          .eq("entity_id", groupId)
          .single()

        if (pref && !pref.push_enabled) {
          console.log(`[send-notification] Push muted for group ${groupId}`)
          return new Response(JSON.stringify({ ok: true, skipped: "muted" }), {
            headers: { "Content-Type": "application/json" },
          })
        }
      }

      if (competitionId) {
        const { data: pref } = await supabase
          .from("notification_preferences")
          .select("push_enabled")
          .eq("user_id", userId)
          .eq("entity_type", "competition")
          .eq("entity_id", competitionId)
          .single()

        if (pref && !pref.push_enabled) {
          console.log(`[send-notification] Push muted for competition ${competitionId}`)
          return new Response(JSON.stringify({ ok: true, skipped: "muted" }), {
            headers: { "Content-Type": "application/json" },
          })
        }
      }
    }

    // Fetch user's push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[send-notification] No push subscriptions for user ${userId}`)
      return new Response(JSON.stringify({ ok: true, skipped: "no_subscriptions" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Build push payload
    const pushPayload = JSON.stringify({
      title: notification.title ?? "FORFEIT",
      body: notification.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: notifData ?? {},
    })

    const pushPayloadBytes = new TextEncoder().encode(pushPayload)

    // Send to each subscription
    const staleEndpoints: string[] = []

    for (const sub of subscriptions) {
      try {
        const endpoint = sub.endpoint as string
        const p256dh = base64UrlDecode(sub.keys_p256dh as string)
        const auth = base64UrlDecode(sub.keys_auth as string)

        const { encrypted } = await encryptPayload(pushPayloadBytes, p256dh, auth)

        const url = new URL(endpoint)
        const audience = `${url.protocol}//${url.host}`
        const jwt = await createVapidJwt(audience)

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            TTL: "86400",
            Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
          },
          body: encrypted,
        })

        if (response.status === 410 || response.status === 404) {
          // Subscription expired or invalid — mark for cleanup
          staleEndpoints.push(endpoint)
          console.log(`[send-notification] Stale subscription: ${endpoint}`)
        } else if (!response.ok) {
          console.error(
            `[send-notification] Push failed ${response.status}: ${await response.text()}`,
          )
        } else {
          console.log(`[send-notification] Push sent to ${endpoint}`)
        }
      } catch (pushErr) {
        console.error(`[send-notification] Push error:`, pushErr)
      }
    }

    // Clean up stale subscriptions
    for (const endpoint of staleEndpoints) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent: subscriptions.length - staleEndpoints.length,
        cleaned: staleEndpoints.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("[send-notification] Error:", err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    )
  }
})
