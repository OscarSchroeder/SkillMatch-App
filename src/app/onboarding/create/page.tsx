"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { useOnboarding } from "@/contexts/onboarding-context"
import { ChevronRight, Lightbulb } from "lucide-react"

export default function CreatePage() {
  const router = useRouter()
  const { t, lang } = useLang()
  const { freitext, setFreitext } = useOnboarding()
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % t.create.placeholders.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [t.create.placeholders.length])

  const handleChange = (val: string) => {
    setFreitext(val)
    if (val.length >= 10) setError("")
  }

  const handleContinue = () => {
    if (freitext.trim().length < 10) {
      setError(t.create.validation_min)
      return
    }
    router.push("/onboarding/why")
  }

  const isValid = freitext.trim().length >= 10

  return (
    <main className="flex flex-col items-center min-h-screen px-5 py-8">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Logo */}
        <div className="flex justify-between items-center">
          <Logo className="w-36 h-auto" />
          <button
            onClick={() => {
              const next = lang === "de" ? "en" : "de"
              import("@/contexts/language-context").then(({ useLang: _ }) => {})
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {t.create.headline}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.create.subtitle}
          </p>
        </div>

        {/* Freitext Textarea */}
        <div className="space-y-2">
          <Textarea
            value={freitext}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t.create.placeholders[placeholderIndex]}
            className="min-h-[160px] text-base resize-none rounded-xl border-2 focus:border-primary transition-colors"
            aria-label={t.create.headline}
            aria-describedby={error ? "freitext-error" : undefined}
          />
          {error && (
            <p
              id="freitext-error"
              className="text-sm text-destructive"
              aria-live="polite"
            >
              {error}
            </p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {freitext.length}/500
            </span>
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Lightbulb className="w-3 h-3" />
                  {t.create.show_examples}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader className="mb-4">
                  <SheetTitle>{t.create.examples_title}</SheetTitle>
                </SheetHeader>
                <ul className="space-y-3">
                  {t.create.examples.map((ex, i) => (
                    <li key={i}>
                      <button
                        className="w-full text-left text-sm px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground"
                        onClick={() => {
                          setFreitext(ex)
                          setError("")
                        }}
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full text-base font-semibold"
          onClick={handleContinue}
          disabled={!isValid}
        >
          {t.create.cta}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </main>
  )
}
