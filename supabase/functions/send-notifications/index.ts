import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

async function sendEmail(to: string, matchScore: number, entryPreview: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SkillMatch <noreply@skillmatch.de>",
      to,
      subject: "Du hast einen neuen Match!",
      html: `
        <h2>Neuer Match gefunden</h2>
        <p>Jemand passt zu deinem Eintrag:</p>
        <blockquote>${escapeHtml(entryPreview)}</blockquote>
        <p>Match-Score: <strong>${Math.round(matchScore * 100)}%</strong></p>
        <p><a href="${Deno.env.get("SITE_URL") ?? "https://skillmatch-app-theta.vercel.app"}/dashboard">Zum Dashboard</a></p>
      `,
    }),
  })
}

Deno.serve(async (req: Request) => {
  try {
    const { match_ids } = await req.json()
    if (!match_ids?.length) return new Response(JSON.stringify({ sent: 0 }))

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    for (const matchId of match_ids) {
      const { data: match } = await supabase
        .from("matches")
        .select(`
          id, score,
          entry_a:entries!entry_a_id(id, raw_text, user_id),
          entry_b:entries!entry_b_id(id, raw_text, user_id)
        `)
        .eq("id", matchId)
        .single()

      if (!match) continue

      const pairs = [
        { userId: match.entry_a.user_id, otherEntry: match.entry_b },
        { userId: match.entry_b.user_id, otherEntry: match.entry_a },
      ]

      for (const { userId, otherEntry } of pairs) {
        // 1. In-app notification
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "match",
          reference_id: matchId,
          read: false,
        })

        // 2. Email
        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        if (authUser?.user?.email) {
          await sendEmail(
            authUser.user.email,
            match.score,
            otherEntry.raw_text.slice(0, 120)
          )
        }

        // 3. Web push (placeholder — full implementation later)
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", userId)

        for (const sub of subs ?? []) {
          console.log("Web push to:", sub.endpoint, JSON.stringify({
            title: "Neuer Match!",
            body: otherEntry.raw_text.slice(0, 80),
            url: "/dashboard",
          }))
        }
      }
    }

    return new Response(JSON.stringify({ sent: match_ids.length }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("send-notifications error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
