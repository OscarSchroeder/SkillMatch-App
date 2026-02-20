"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { useLang } from "@/contexts/language-context"

export default function SplashPage() {
  const router = useRouter()
  const { t } = useLang()

  useEffect(() => {
    const seen = localStorage.getItem("skillmatch_splash_seen")
    if (seen) {
      router.replace("/onboarding/create")
    }
  }, [router])

  const handleStart = () => {
    localStorage.setItem("skillmatch_splash_seen", "1")
    router.push("/onboarding/create")
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-10 max-w-sm w-full">
        <Logo className="w-52 h-auto" />

        <div className="space-y-3">
          <p className="text-lg font-semibold text-foreground leading-snug">
            {t.splash.claim}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t.splash.subtitle}
          </p>
        </div>

        <Button
          size="lg"
          className="w-full text-base font-semibold"
          onClick={handleStart}
        >
          {t.splash.cta}
        </Button>
      </div>
    </main>
  )
}
