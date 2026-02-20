import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { z } from "zod"

const RequestSchema = z.object({
  text: z.string().min(10).max(2000),
})

export async function POST(request: Request) {
  // Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Input validation
  const body = await request.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { text } = parsed.data

  // Call OpenAI to extract skill keywords
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Extract up to 3 key skills or topics from this text. Return ONLY a JSON array of short skill names (1-3 words each), no explanation. If no clear skills, return [].

Text: ${text}

Reply format (JSON array only): ["skill1", "skill2", "skill3"]`,
      }],
      max_tokens: 50,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  })

  if (!openaiRes.ok) {
    return NextResponse.json({ skills: [] })
  }

  const openaiJson = await openaiRes.json()
  const raw = openaiJson.choices?.[0]?.message?.content ?? "[]"

  let skills: string[] = []
  try {
    const parsed = JSON.parse(raw)
    // Handle both {"skills": [...]} and [...] formats
    const arr = Array.isArray(parsed) ? parsed : (parsed.skills ?? Object.values(parsed)[0] ?? [])
    skills = arr
      .filter((s: unknown) => typeof s === "string" && s.length > 0)
      .slice(0, 3)
  } catch {
    skills = []
  }

  return NextResponse.json({ skills })
}
