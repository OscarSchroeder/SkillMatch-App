// supabase/functions/embed-entry/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  })
  const json = await res.json()
  if (!json.data?.[0]?.embedding) {
    throw new Error(`OpenAI error: ${JSON.stringify(json)}`)
  }
  return json.data[0].embedding
}

async function classifyIntent(text: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Classify this text as 'seek' (looking for something/someone) or 'offer' (offering a skill/service/help). Reply with exactly one word: seek or offer.\n\nText: ${text}`,
      }],
      max_tokens: 5,
      temperature: 0,
    }),
  })
  const json = await res.json()
  const answer = json.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "seek"
  return answer === "offer" ? "offer" : "seek"
}

Deno.serve(async (req: Request) => {
  try {
    const { entry_id, raw_text } = await req.json()
    if (!entry_id || !raw_text) {
      return new Response(JSON.stringify({ error: "Missing entry_id or raw_text" }), { status: 400 })
    }

    const [embedding, intent] = await Promise.all([
      getEmbedding(raw_text),
      classifyIntent(raw_text),
    ])

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await supabase
      .from("entries")
      .update({ embedding: JSON.stringify(embedding), intent })
      .eq("id", entry_id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true, intent }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("embed-entry error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
