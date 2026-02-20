import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SCORE_THRESHOLD = 0.75

Deno.serve(async (req: Request) => {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret")
  if (secret !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Find new matches using pgvector cosine similarity
  const { data: candidates, error } = await supabase.rpc("find_new_matches", {
    threshold: SCORE_THRESHOLD,
  })

  if (error) {
    console.error("find_new_matches error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!candidates || candidates.length === 0) {
    return new Response(JSON.stringify({ matched: 0 }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  // Insert new matches and get back the generated IDs
  const { data: inserted, error: insertError } = await supabase
    .from("matches")
    .upsert(candidates, { onConflict: "entry_a_id,entry_b_id", ignoreDuplicates: true })
    .select("id")

  if (insertError) {
    console.error("insert matches error:", insertError)
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
  }

  const matchIds = (inserted ?? []).map((m: { id: string }) => m.id)

  // Trigger notifications for new matches
  if (matchIds.length > 0) {
    await supabase.functions.invoke("send-notifications", {
      body: { match_ids: matchIds },
    })
  }

  return new Response(JSON.stringify({ matched: matchIds.length }), {
    headers: { "Content-Type": "application/json" },
  })
})
