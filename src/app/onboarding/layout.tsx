import { OnboardingProvider } from "@/contexts/onboarding-context"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <div className="flex flex-col min-h-screen bg-background">
        {children}
      </div>
    </OnboardingProvider>
  )
}
