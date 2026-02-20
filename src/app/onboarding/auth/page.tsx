"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { useOnboarding } from "@/contexts/onboarding-context"
import { createClient } from "@/lib/supabase-browser"
import { ChevronLeft, Mail } from "lucide-react"
import { toast } from "sonner"

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLang()
  const { setEmail: saveEmail } = useOnboarding()

  const [mode, setMode] = useState<"signup" | "login">("signup")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const linkExpired = searchParams.get("error") === "link_expired"

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const validate = () => {
    let valid = true
    if (!validateEmail(email)) { setEmailError(t.auth.invalid_email); valid = false }
    if (password.length < 6) { setPasswordError(t.auth.password_short); valid = false }
    return valid
  }

  // --- Sign Up (new account) ---
  const handleSignUp = async () => {
    if (!validate()) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { toast.error(t.errors.auth_failed); return }
    if (data.session) {
      window.location.href = "/onboarding/profile"
    } else {
      saveEmail(email)
      router.push("/onboarding/confirm")
    }
  }

  // --- Login (existing account) ---
  const handleLogin = async () => {
    if (!validate()) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      toast.error(t.auth.login_failed)
      return
    }
    const { data: profile } = await supabase
      .from("profiles").select("id").eq("id", data.user.id).single()
    setLoading(false)
    window.location.href = profile ? "/dashboard" : "/onboarding/profile"
  }

  // --- Magic Link ---
  const handleMagicLink = async () => {
    if (!validateEmail(email)) { setEmailError(t.auth.invalid_email); return }
    setEmailError("")
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) { toast.error(t.errors.auth_failed); return }
    saveEmail(email)
    router.push("/onboarding/confirm")
  }

  const switchMode = (next: "signup" | "login") => {
    setMode(next)
    setEmailError("")
    setPasswordError("")
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-5 py-8">
      <div className="w-full max-w-md flex flex-col gap-6">
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

        {linkExpired && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{t.errors.link_expired}</p>
          </div>
        )}

        <h1 className="text-2xl font-bold text-foreground">
          {mode === "signup" ? t.auth.headline_signup : t.auth.headline_login}
        </h1>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email_label}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t.auth.email_placeholder}
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError("") }}
            className="h-12 text-base"
          />
          {emailError && (
            <p className="text-sm text-destructive">{emailError}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.password_label}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t.auth.password_placeholder}
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError("") }}
            onKeyDown={(e) => e.key === "Enter" && (mode === "signup" ? handleSignUp() : handleLogin())}
            className="h-12 text-base"
          />
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </div>

        {/* Primary CTA */}
        {mode === "signup" ? (
          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={handleSignUp}
            disabled={loading || !email || !password}
          >
            {loading ? "…" : t.auth.signup_cta}
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? "…" : t.auth.login_cta}
          </Button>
        )}

        {/* Mode toggle */}
        <p className="text-sm text-center text-muted-foreground">
          {mode === "signup" ? (
            <>
              {t.auth.already_registered}{" "}
              <button
                className="text-primary underline-offset-2 hover:underline font-medium"
                onClick={() => switchMode("login")}
              >
                {t.auth.login_cta}
              </button>
            </>
          ) : (
            <>
              {t.auth.no_account}{" "}
              <button
                className="text-primary underline-offset-2 hover:underline font-medium"
                onClick={() => switchMode("signup")}
              >
                {t.auth.signup_cta}
              </button>
            </>
          )}
        </p>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">{t.auth.divider}</span>
          </div>
        </div>

        {/* Magic Link as alternative */}
        <Button
          size="lg"
          variant="outline"
          className="w-full font-semibold"
          onClick={handleMagicLink}
          disabled={loading || !email}
        >
          <Mail className="w-4 h-4 mr-2" />
          {loading ? t.auth.sending : t.auth.magic_link_cta}
        </Button>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen" />}>
      <AuthContent />
    </Suspense>
  )
}
