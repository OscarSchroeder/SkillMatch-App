"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { translations, type Lang, type Translations } from "@/lib/translations"

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de")

  useEffect(() => {
    const stored = localStorage.getItem("skillmatch_lang") as Lang | null
    if (stored === "de" || stored === "en") {
      setLangState(stored)
    } else {
      const browser = navigator.language.startsWith("en") ? "en" : "de"
      setLangState(browser)
    }
  }, [])

  const setLang = (newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem("skillmatch_lang", newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLang must be used within LanguageProvider")
  return ctx
}
