"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { useOnboarding } from "@/contexts/onboarding-context"
import { createClient } from "@/lib/supabase-browser"
import { Mail, ChevronLeft } from "lucide-react"
import { toast } from "sonner"

export default function ConfirmPage() {
  const router = useRouter()
  const { t } = useLang()
  const { email } = useOnboarding()
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResending(false)
    if (error) {
      toast.error(t.errors.auth_failed)
    } else {
      setResent(true)
      toast.success(t.confirm.resend_success)
    }
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-5 py-8">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/onboarding/auth")}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Zurück"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Logo className="w-32 h-auto" />
        </div>

        {/* Icon */}
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{t.confirm.headline}</h1>
            <p className="font-medium text-foreground">{t.confirm.message}</p>
            {email && (
              <p className="text-sm font-semibold text-primary">{email}</p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {t.confirm.subtitle}
            </p>
          </div>
        </div>

        {/* Resend */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending || resent}
          >
            {resent ? t.confirm.resend_success : resending ? "…" : t.confirm.resend}
          </Button>
          <button
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => router.push("/onboarding/auth")}
          >
            {t.confirm.back}
          </button>
        </div>
      </div>
    </main>
  )
}
