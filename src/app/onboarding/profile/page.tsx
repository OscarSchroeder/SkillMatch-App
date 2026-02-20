"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { useOnboarding } from "@/contexts/onboarding-context"
import { createClient } from "@/lib/supabase-browser"
import { toast } from "sonner"

export default function ProfilePage() {
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const { freitext, reset } = useOnboarding()

  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [selectedLang, setSelectedLang] = useState(lang)
  const [nameError, setNameError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/onboarding/auth")
    })
  }, [router])

  const handleSave = async () => {
    if (name.trim().length < 2) {
      setNameError(t.profile.name_validation)
      return
    }
    setNameError("")
    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user")

      // Save profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: name.trim(),
          language: selectedLang,
          city: city.trim() || null,
        })

      if (profileError) throw profileError

      // Save the freitext entry if present
      if (freitext.trim()) {
        const { data: entryData, error: entryError } = await supabase
          .from("entries")
          .insert({
            user_id: user.id,
            raw_text: freitext.trim(),
            intent: "pending",
            category: "pending",
            status: "active",
          })
          .select("id")
          .single()
        if (entryError) throw entryError

        // Embedding auslösen (fire-and-forget)
        if (entryData?.id) {
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed-entry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entry_id: entryData.id, raw_text: freitext.trim() }),
          }).catch(console.error)
        }
      }

      setLang(selectedLang)
      reset()
      router.push("/dashboard")
    } catch {
      toast.error(t.errors.save_failed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-5 py-8">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <Logo className="w-36 h-auto" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t.profile.headline}</h1>
          <p className="text-sm text-muted-foreground">{t.profile.subtitle}</p>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t.profile.name_label}</Label>
            <Input
              id="name"
              placeholder={t.profile.name_placeholder}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError("")
              }}
              className="h-12 text-base"
              aria-describedby={nameError ? "name-error" : undefined}
            />
            {nameError && (
              <p id="name-error" className="text-sm text-destructive" aria-live="polite">
                {nameError}
              </p>
            )}
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label>{t.profile.language_label}</Label>
            <div className="flex gap-2">
              {(["de", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setSelectedLang(l)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    selectedLang === l
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                  }`}
                >
                  {l === "de" ? t.profile.language_de : t.profile.language_en}
                </button>
              ))}
            </div>
          </div>

          {/* City (optional) */}
          <div className="space-y-2">
            <Label htmlFor="city">{t.profile.city_label}</Label>
            <Input
              id="city"
              placeholder={t.profile.city_placeholder}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-12 text-base"
            />
          </div>
        </div>

        <Button
          size="lg"
          className="w-full text-base font-semibold"
          onClick={handleSave}
          disabled={saving || name.trim().length < 2}
        >
          {saving ? t.profile.saving : t.profile.cta}
        </Button>
      </div>
    </main>
  )
}
