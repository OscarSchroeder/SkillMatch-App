import type { Metadata } from "next"
import "./globals.css"
import { LanguageProvider } from "@/contexts/language-context"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "SkillMatch – We connect people based on skills",
  description: "Finde Menschen mit den Skills die du brauchst – oder biete deine Skills an.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="antialiased min-h-screen bg-background">
        <LanguageProvider>
          {children}
          <Toaster position="top-center" />
        </LanguageProvider>
      </body>
    </html>
  )
}
