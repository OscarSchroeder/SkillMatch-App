"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface OnboardingContextType {
  freitext: string
  setFreitext: (text: string) => void
  email: string
  setEmail: (email: string) => void
  step: number
  setStep: (step: number) => void
  reset: () => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [freitext, setFreitext] = useState("")
  const [email, setEmail] = useState("")
  const [step, setStep] = useState(1)

  const reset = () => {
    setFreitext("")
    setEmail("")
    setStep(1)
  }

  return (
    <OnboardingContext.Provider value={{ freitext, setFreitext, email, setEmail, step, setStep, reset }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider")
  return ctx
}
