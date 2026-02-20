import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const res = await fetch(`${supabaseUrl}/functions/v1/run-matching`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": process.env.CRON_SECRET!,
    },
    body: JSON.stringify({}),
  })

  const data = await res.json()
  return NextResponse.json(data)
}
