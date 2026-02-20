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

interface PingClassification {
  classification: "peer" | "need" | "offer"
  specificity: "open" | "specific"
  intent: "seek" | "offer"
}

async function classifyPing(text: string): Promise<PingClassification> {
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
        content: `Analyze this text and classify it. Reply with ONLY valid JSON, no explanation.

Classification rules:
- "peer": looking for a person to connect with (partner, teammate, friend, sparring partner, co-founder)
- "need": looking for help, a service, or a skill from someone else
- "offer": offering a skill, service, or help to others

Specificity rules:
- "specific": has clear, concrete requirements (named skills, timeframe, location, specific criteria)
- "open": vague or general, could match many people

Reply format (JSON only):
{"classification": "peer" | "need" | "offer", "specificity": "open" | "specific"}

Text: ${text}`,
      }],
      max_tokens: 30,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  })
  const json = await res.json()
  const raw = json.choices?.[0]?.message?.content ?? "{}"
  let parsed: { classification?: string; specificity?: string } = {}
  try { parsed = JSON.parse(raw) } catch { /* ignore */ }

  const classification = (["peer", "need", "offer"].includes(parsed.classification ?? ""))
    ? parsed.classification as "peer" | "need" | "offer"
    : "need"
  const specificity = parsed.specificity === "specific" ? "specific" : "open"
  const intent: "seek" | "offer" = classification === "offer" ? "offer" : "seek"
  return { classification, specificity, intent }
}

Deno.serve(async (req: Request) => {
  try {
    const { entry_id, raw_text } = await req.json()
    if (!entry_id || !raw_text) {
      return new Response(JSON.stringify({ error: "Missing entry_id or raw_text" }), { status: 400 })
    }

    // Auth check
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.replace("Bearer ", "")
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (!user || authError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    // Ownership check
    const { data: entryOwner } = await supabase
      .from("entries").select("user_id").eq("id", entry_id).single()
    if (!entryOwner || entryOwner.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    const [embedding, pingClass] = await Promise.all([
      getEmbedding(raw_text),
      classifyPing(raw_text),
    ])

    const { error } = await supabase
      .from("entries")
      .update({
        embedding: JSON.stringify(embedding),
        intent: pingClass.intent,
        classification: pingClass.classification,
        specificity: pingClass.specificity,
      })
      .eq("id", entry_id)

    if (error) throw error

    return new Response(JSON.stringify({
      success: true,
      intent: pingClass.intent,
      classification: pingClass.classification,
      specificity: pingClass.specificity,
    }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("embed-entry error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
