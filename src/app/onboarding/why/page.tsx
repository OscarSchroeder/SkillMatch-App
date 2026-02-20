"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { useOnboarding } from "@/contexts/onboarding-context"
import { CheckCircle2, ChevronLeft } from "lucide-react"

export default function WhyPage() {
  const router = useRouter()
  const { t } = useLang()
  const { freitext } = useOnboarding()

  // Guard: if no freitext, go back
  if (typeof window !== "undefined" && !freitext) {
    router.replace("/onboarding/create")
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-5 py-8">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Zurück"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Logo className="w-32 h-auto" />
        </div>

        {/* Entry preview */}
        {freitext && (
          <div className="rounded-xl border-2 border-primary/20 bg-secondary p-4">
            <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
              Dein Eintrag
            </p>
            <p className="text-sm text-foreground line-clamp-3">{freitext}</p>
          </div>
        )}

        {/* Why register */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            {t.why.headline}
          </h1>
          <p className="text-sm text-muted-foreground">{t.why.subtitle}</p>

          <ul className="space-y-3 pt-2">
            {t.why.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full text-base font-semibold"
          onClick={() => router.push("/onboarding/auth")}
        >
          {t.why.cta}
        </Button>
      </div>
    </main>
  )
}
