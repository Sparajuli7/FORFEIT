/**
 * FORFEIT Auto-Resolution Edge Function
 *
 * Runs on a cron schedule (every hour) to auto-resolve stale bets.
 *
 * Deploy:
 *   supabase functions deploy auto-resolve
 *
 * Schedule (via Supabase Dashboard or cron):
 *   Add a cron trigger to invoke this function every hour.
 *   Or use: supabase functions deploy auto-resolve --schedule "0 * * * *"
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async () => {
  try {
    // 1. Active bets past deadline (48h) with no proof → claimant failed
    const { data: expiredNoProof } = await supabase
      .from("bets")
      .select("id, claimant_id, title, group_id")
      .eq("status", "active")
      .lt("deadline", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())

    for (const bet of expiredNoProof ?? []) {
      const { data: proofExists } = await supabase
        .from("proofs")
        .select("id")
        .eq("bet_id", bet.id)
        .limit(1)
        .single()

      if (!proofExists) {
        await supabase.from("bets").update({ status: "completed" }).eq("id", bet.id)
        await supabase.from("outcomes").insert({
          bet_id: bet.id,
          result: "claimant_failed",
        })

        const { data: participants } = await supabase
          .from("bet_sides")
          .select("user_id")
          .eq("bet_id", bet.id)

        for (const p of participants ?? []) {
          await supabase.from("notifications").insert({
            user_id: p.user_id,
            type: "outcome_resolved",
            title: "Bet auto-resolved",
            body: `"${bet.title}" — No proof submitted. Claimant failed.`,
            data: { bet_id: bet.id },
          })
        }
      }
    }

    // 2. Proof submitted 72h ago with no outcome → voided
    const { data: proofSubmitted } = await supabase
      .from("bets")
      .select("id, claimant_id, title, group_id")
      .eq("status", "proof_submitted")

    const cutoff72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

    for (const bet of proofSubmitted ?? []) {
      const { data: latestProof } = await supabase
        .from("proofs")
        .select("submitted_at")
        .eq("bet_id", bet.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single()

      const { data: outcomeExists } = await supabase
        .from("outcomes")
        .select("id")
        .eq("bet_id", bet.id)
        .single()

      if (
        latestProof &&
        new Date(latestProof.submitted_at) < new Date(cutoff72h) &&
        !outcomeExists
      ) {
        await supabase.from("bets").update({ status: "voided" }).eq("id", bet.id)
        await supabase.from("outcomes").insert({
          bet_id: bet.id,
          result: "voided",
        })

        const { data: participants } = await supabase
          .from("bet_sides")
          .select("user_id")
          .eq("bet_id", bet.id)

        for (const p of participants ?? []) {
          await supabase.from("notifications").insert({
            user_id: p.user_id,
            type: "outcome_resolved",
            title: "Bet voided",
            body: `"${bet.title}" — No resolution after 72h. Voided.`,
            data: { bet_id: bet.id },
          })
        }
      }
    }

    // 3. H2H bets: pending, 24h old, only 1 participant → voided
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: h2hPending } = await supabase
      .from("bets")
      .select("id, claimant_id, h2h_opponent_id")
      .eq("bet_type", "h2h")
      .eq("status", "pending")
      .lt("created_at", cutoff24h)

    for (const bet of h2hPending ?? []) {
      const { data: sides } = await supabase
        .from("bet_sides")
        .select("user_id")
        .eq("bet_id", bet.id)

      if (sides && sides.length === 1) {
        await supabase.from("bets").update({ status: "voided" }).eq("id", bet.id)

        await supabase.from("notifications").insert({
          user_id: bet.claimant_id,
          type: "general",
          title: "H2H challenge expired",
          body: "Your challenge had no response and was voided.",
          data: { bet_id: bet.id },
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    )
  }
})
