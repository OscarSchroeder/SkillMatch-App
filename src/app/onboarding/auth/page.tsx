"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { useOnboarding } from "@/contexts/onboarding-context"
import { createClient } from "@/lib/supabase-browser"
import { ChevronLeft, Mail, Lock } from "lucide-react"
import { toast } from "sonner"

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLang()
  const { setEmail: saveEmail } = useOnboarding()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const linkExpired = searchParams.get("error") === "link_expired"

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

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

  // --- Password: Login ---
  const handleLogin = async () => {
    let valid = true
    if (!validateEmail(email)) { setEmailError(t.auth.invalid_email); valid = false }
    if (password.length < 6) { setPasswordError(t.auth.password_short); valid = false }
    if (!valid) return
    setEmailError("")
    setPasswordError("")
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      toast.error(t.auth.login_failed)
      return
    }
    // Check if user already has a profile → dashboard, else onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single()
    setLoading(false)
    if (profile) {
      window.location.href = "/dashboard"
    } else {
      window.location.href = "/onboarding/profile"
    }
  }

  // --- Password: Sign Up ---
  const handleSignUp = async () => {
    let valid = true
    if (!validateEmail(email)) { setEmailError(t.auth.invalid_email); valid = false }
    if (password.length < 6) { setPasswordError(t.auth.password_short); valid = false }
    if (!valid) return
    setEmailError("")
    setPasswordError("")
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { toast.error(t.errors.auth_failed); return }
    if (data.session) {
      // Auto-confirmed (email confirmation disabled in Supabase)
      window.location.href = "/onboarding/profile"
    } else {
      // Email confirmation required
      saveEmail(email)
      router.push("/onboarding/confirm")
    }
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

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{t.auth.headline}</h1>
        </div>

        {/* Shared email field */}
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email_label}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t.auth.email_placeholder}
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError("") }}
            className="h-12 text-base"
            aria-describedby={emailError ? "email-error" : undefined}
          />
          {emailError && (
            <p id="email-error" className="text-sm text-destructive" aria-live="polite">
              {emailError}
            </p>
          )}
        </div>

        {/* Tabs: Passwort | Magic Link */}
        <Tabs defaultValue="password" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="password" className="flex-1">
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              {t.auth.tab_password}
            </TabsTrigger>
            <TabsTrigger value="magic" className="flex-1">
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              {t.auth.tab_magic}
            </TabsTrigger>
          </TabsList>

          {/* Password Tab */}
          <TabsContent value="password" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password_label}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t.auth.password_placeholder}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="h-12 text-base"
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              {passwordError && (
                <p id="password-error" className="text-sm text-destructive" aria-live="polite">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 font-semibold"
                onClick={handleLogin}
                disabled={loading || !email || !password}
              >
                {loading ? "…" : t.auth.login_cta}
              </Button>
              <Button
                size="lg"
                className="flex-1 font-semibold"
                onClick={handleSignUp}
                disabled={loading || !email || !password}
              >
                {loading ? "…" : t.auth.signup_cta}
              </Button>
            </div>
          </TabsContent>

          {/* Magic Link Tab */}
          <TabsContent value="magic" className="space-y-4">
            <Button
              size="lg"
              className="w-full text-base font-semibold"
              onClick={handleMagicLink}
              disabled={loading || !email}
            >
              <Mail className="w-4 h-4 mr-2" />
              {loading ? t.auth.sending : t.auth.magic_link_cta}
            </Button>
          </TabsContent>
        </Tabs>
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
