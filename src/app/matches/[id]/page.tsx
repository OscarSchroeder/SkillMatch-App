"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { createClient } from "@/lib/supabase-browser"
import { ArrowLeft, User } from "lucide-react"

type MatchDetail = {
  id: string
  score: number
  my_entry: { raw_text: string; intent: string }
  their_entry: { raw_text: string; intent: string }
  their_profile: { display_name: string; city: string | null }
}

export default function MatchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useLang()
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/onboarding/auth"); return }

      const { data } = await supabase
        .from("matches")
        .select(`
          id, score,
          entry_a:entries!entry_a_id(id, raw_text, intent, user_id),
          entry_b:entries!entry_b_id(id, raw_text, intent, user_id)
        `)
        .eq("id", id)
        .single()

      if (!data) { router.replace("/dashboard"); return }

      const entryA = data.entry_a as unknown as { id: string; raw_text: string; intent: string; user_id: string }
      const entryB = data.entry_b as unknown as { id: string; raw_text: string; intent: string; user_id: string }

      const myEntry = entryA.user_id === user.id ? entryA : entryB
      const theirEntry = entryA.user_id === user.id ? entryB : entryA

      const { data: theirProfile } = await supabase
        .from("profiles")
        .select("display_name, city")
        .eq("id", theirEntry.user_id)
        .single()

      setMatch({
        id: data.id,
        score: data.score,
        my_entry: myEntry,
        their_entry: theirEntry,
        their_profile: theirProfile ?? { display_name: "Anonym", city: null },
      })

      // Benachrichtigung als gelesen markieren
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("reference_id", id)

      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </main>
  )

  if (!match) return null

  return (
    <main className="flex flex-col min-h-screen px-5 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Logo className="w-28 h-auto" />
      </div>

      <div className="space-y-6">
        {/* Score */}
        <div className="rounded-xl bg-primary/8 border border-primary/20 p-4 text-center">
          <p className="text-3xl font-bold text-primary">{Math.round(match.score * 100)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Match-Score</p>
        </div>

        {/* Ihr Eintrag */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{match.their_profile.display_name}</span>
            {match.their_profile.city && (
              <Badge variant="secondary" className="text-xs">{match.their_profile.city}</Badge>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-foreground">{match.their_entry.raw_text}</p>
          </div>
        </div>

        {/* Mein Eintrag */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Dein Eintrag</p>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground">{match.my_entry.raw_text}</p>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full font-semibold"
          disabled
        >
          Kontakt aufnehmen (demnächst)
        </Button>
      </div>
    </main>
  )
}
