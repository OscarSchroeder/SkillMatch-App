"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { useOnboarding } from "@/contexts/onboarding-context"
import { createClient } from "@/lib/supabase-browser"
import { toast } from "sonner"
import { X, Plus, Loader2 } from "lucide-react"

const MAX_SKILLS = 3

export default function ProfilePage() {
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const { freitext: contextFreitext, skillIds, setSkillIds, reset } = useOnboarding()

  // Restore freitext from sessionStorage if context is empty (happens after Magic Link redirect)
  const [freitext, setFreitextState] = useState(contextFreitext)
  useEffect(() => {
    if (!contextFreitext.trim()) {
      const stored = sessionStorage.getItem("skillmatch_freitext") ?? ""
      if (stored) setFreitextState(stored)
    } else {
      setFreitextState(contextFreitext)
    }
  }, [contextFreitext])

  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [selectedLang, setSelectedLang] = useState(lang)
  const [nameError, setNameError] = useState("")
  const [saving, setSaving] = useState(false)
  const [analyzingSkills, setAnalyzingSkills] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const skillsFetched = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/onboarding/auth")
    })
  }, [router])

  // Fetch skill suggestions on mount (once, only if freitext present and no skills yet)
  useEffect(() => {
    if (skillsFetched.current || !freitext.trim() || skillIds.length > 0) return
    skillsFetched.current = true

    const fetchSkills = async () => {
      setAnalyzingSkills(true)
      try {
        const res = await fetch("/api/classify-skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: freitext.trim() }),
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.skills) && data.skills.length > 0) {
            setSkillIds(data.skills.slice(0, MAX_SKILLS))
          }
        }
      } catch {
        // Skill suggestions are non-critical; silently ignore errors
      } finally {
        setAnalyzingSkills(false)
      }
    }
    fetchSkills()
  }, [freitext, skillIds.length, setSkillIds])

  const removeSkill = (skill: string) => {
    setSkillIds(skillIds.filter((s) => s !== skill))
  }

  const addSkill = () => {
    const trimmed = newSkill.trim()
    if (!trimmed || skillIds.includes(trimmed) || skillIds.length >= MAX_SKILLS) return
    setSkillIds([...skillIds, trimmed])
    setNewSkill("")
  }

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addSkill() }
  }

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
            skill_ids: skillIds,
            specificity: "open",
            classification: "pending",
          })
          .select("id")
          .single()
        if (entryError) throw entryError

        // Trigger embedding + full classification (fire-and-forget)
        if (entryData?.id) {
          const { data: { session } } = await supabase.auth.getSession()
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed-entry`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ entry_id: entryData.id, raw_text: freitext.trim() }),
          }).catch(console.error)
        }
      }

      setLang(selectedLang)
      reset()
      sessionStorage.removeItem("skillmatch_freitext")
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

          {/* Skill Chips (only shown if freitext exists) */}
          {freitext.trim() && (
            <div className="space-y-3">
              <div>
                <Label>{t.profile.skills_title}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t.profile.skills_subtitle}</p>
              </div>

              {analyzingSkills ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t.profile.skills_analyzing}
                </div>
              ) : (
                <div className="space-y-2">
                  {skillIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skillIds.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="flex items-center gap-1 px-3 py-1 text-sm"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(skill)}
                            className="ml-1 rounded-full hover:text-destructive transition-colors"
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {skillIds.length < MAX_SKILLS && (
                    <div className="flex gap-2">
                      <Input
                        placeholder={t.profile.skills_add_placeholder}
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={handleSkillKeyDown}
                        className="h-9 text-sm"
                        maxLength={40}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addSkill}
                        disabled={!newSkill.trim() || skillIds.includes(newSkill.trim())}
                        className="h-9 px-3"
                      >
                        <Plus className="w-4 h-4" />
                        {t.profile.skills_add_button}
                      </Button>
                    </div>
                  )}

                  {skillIds.length >= MAX_SKILLS && (
                    <p className="text-xs text-muted-foreground">{t.profile.skills_max_hint}</p>
                  )}
                </div>
              )}
            </div>
          )}
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
