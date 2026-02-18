/**
 * FORFEIT Send Notification Edge Function
 *
 * Triggered by INSERT on notifications table (via database webhook).
 * For now: placeholder that logs the notification.
 * Later: will send Web Push notifications.
 *
 * Deploy:
 *   supabase functions deploy send-notification
 *
 * To wire up the database webhook:
 *   1. In Supabase Dashboard → Database → Webhooks
 *   2. Create webhook on notifications table, INSERT event
 *   3. Point to: https://<project-ref>.supabase.co/functions/v1/send-notification
 *
 * Or use pg_net / http extension to call this function from a trigger.
 */

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    // payload will contain the new notification row when invoked via webhook
    console.log("[send-notification] Received:", JSON.stringify(payload, null, 2))

    // TODO: Send Web Push notification to user's device
    // - Look up user's push subscription from a push_subscriptions table
    // - Use web-push or similar to send the notification

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (err) {
    console.error("[send-notification] Error:", err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    )
  }
})
