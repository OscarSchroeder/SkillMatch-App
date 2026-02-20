# PROJ-1: Onboarding + Freitext-Eintrag (Zettel-UX)

## Status: Planned
**Created:** 2026-02-20
**Last Updated:** 2026-02-20

## Dependencies
- None (erstes Feature, keine Voraussetzungen)

## Overview
Vollständiger Onboarding-Flow: Von der ersten App-Öffnung bis zum persönlichen Dashboard.
Der Nutzer erstellt seinen ersten Eintrag (Suche oder Biete) als Freitext **vor** der Registrierung,
registriert sich danach mit Magic Link oder Google OAuth, vervollständigt ein Miniprofil und landet auf dem Dashboard.

**Screens:**
- Screen 0: Splash / Intro (1x, optional)
- Screen 1: Zettel-Moment – Freitext-Input
- Screen 2: Warum Registrierung
- Screen 3: Miniprofil (Name/Alias, Sprache, Stadt optional)
- Screen 4: Dashboard – Zettelwand

## User Stories

- Als **neuer Nutzer** möchte ich sofort loslegen ohne Registrierung, damit ich nicht abbreche, bevor ich den Wert erkenne.
- Als **neuer Nutzer** möchte ich in freiem Text beschreiben was ich suche oder biete, damit ich nicht durch Formulare abgeschreckt werde.
- Als **neuer Nutzer** möchte ich rotierende Beispiele sehen (z.B. "Ich suche Badminton-Partner…"), damit ich verstehe was das System kann.
- Als **neuer Nutzer** möchte ich verstehen warum ich mich registrieren soll, bevor ich meine E-Mail angebe.
- Als **neuer Nutzer** möchte ich mich per Magic Link oder Google einloggen, damit ich kein Passwort brauche.
- Als **neuer Nutzer** möchte ich nur Name/Alias und Sprache angeben (optional: Stadt), damit das Setup unter 30 Sekunden dauert.
- Als **registrierter Nutzer** möchte ich mein Dashboard mit meinen Einträgen sehen, damit ich sofort Kontrolle über meine Gesuche/Angebote habe.
- Als **Nutzer** möchte ich einen erklärenden Banner im Dashboard sehen ("Einträge bleiben aktiv bis du sie pausierst"), damit meine Erwartungen korrekt gesetzt sind.

## Acceptance Criteria

### Screen 0 – Splash
- [ ] Wird nur beim allerersten App-Start gezeigt (danach nicht mehr)
- [ ] Zeigt Logo, Claim ("We connect people based on skills") und CTA "Loslegen"
- [ ] Subline erklärt das Konzept in max. 1 Satz

### Screen 1 – Zettel-Moment (Freitext)
- [ ] Großes Textarea-Feld ist das dominante UI-Element
- [ ] Placeholder-Text rotiert zwischen min. 3 Beispielen (Badminton, Streichen, Job-Suche)
- [ ] "Beispiele anzeigen" öffnet ein Bottom Sheet mit 6 Beispielen
- [ ] Freitext-Eingabe ist Pflicht (min. 10 Zeichen), CTA "Weiter" ist disabled solange leer
- [ ] Standort ist **nicht** abgefragt auf diesem Screen
- [ ] Eingabe bleibt im State erhalten beim Navigieren (nicht verloren gehen)

### Screen 2 – Warum Registrierung
- [ ] Zeigt 3 klar formulierte Gründe (Suche speichern / Matches kontaktieren / Benachrichtigungen)
- [ ] CTA "Registrieren" führt zu Auth-Screen
- [ ] Freitext aus Screen 1 bleibt gespeichert (Session)

### Screen 3 – Registrierung (Auth)
- [ ] Magic Link via E-Mail ist verfügbar
- [ ] Google OAuth ist verfügbar
- [ ] E-Mail-Validierung (Format + Pflichtfeld)
- [ ] Nach Magic Link: Bestätigungsseite "Prüf deine E-Mails – wir haben dir einen Link geschickt"
- [ ] Nach OAuth: direkt weiter zu Miniprofil
- [ ] Bereits registrierter Nutzer (gleiche E-Mail) wird erkannt und eingeloggt statt doppelt angelegt

### Screen 3b – Miniprofil
- [ ] Name/Alias ist Pflichtfeld (min. 2 Zeichen)
- [ ] Sprache auswählen (DE / EN) – Default: Browser-Sprache
- [ ] Stadt/Region ist optional
- [ ] CTA "Fertig" speichert Profil und erstellt Entry aus gespeichertem Freitext
- [ ] Entry wird mit intent (seek/offer), Kategorie (TBD/pending) und raw_text gespeichert

### Screen 4 – Dashboard
- [ ] Infobanner (fix oben): "Einträge bleiben aktiv bis du sie pausierst oder löschst" + "Matches können sofort oder später kommen"
- [ ] Tabs: Aktiv / Pausiert / Abgeschlossen
- [ ] Erster Eintrag aus Onboarding wird sofort angezeigt (Status: Aktiv)
- [ ] Eintragskarte zeigt: Kurztext (max. 80 Zeichen), Kategorie (pending), Status, Match-Indikator (0)
- [ ] Actions pro Karte: Bearbeiten, Pausieren, Löschen, Teilen

## Edge Cases

- **Nutzer schließt App nach Screen 1:** Freitext geht verloren. Beim nächsten Öffnen: Splash überspringen, direkt zu Screen 1 mit leerem Feld. (Keine Session-Persistenz über App-Neustart im MVP)
- **Magic Link läuft ab (>1h):** Nutzer sieht Fehlermeldung "Link abgelaufen – neuen Link anfordern" mit CTA
- **Nutzer klickt Magic Link auf anderem Gerät:** Auth funktioniert, weiter zu Miniprofil. Freitext-Session ist verloren → Nutzer kann neuen Eintrag manuell erstellen.
- **Google OAuth schlägt fehl:** Fehlermeldung + Fallback auf Magic Link anbieten
- **E-Mail bereits registriert (Magic Link):** Nutzer wird eingeloggt statt neu angelegt. Freitext aus Session wird als neuer Entry gespeichert.
- **Minimaltext eingegeben (z.B. "hi"):** Validierung zeigt inline-Fehler "Bitte beschreibe dein Anliegen (min. 10 Zeichen)" – kein Toast/Modal
- **Nutzer klickt mehrfach auf "Weiter":** CTA zeigt Ladezustand, verhindert Doppel-Submit
- **Netzwerk-Fehler beim Speichern des Entry:** Fehlermeldung + Retry-Option. Entry-Text bleibt im State.
- **Nutzer navigiert mit Browser-Back-Button:** Freitext bleibt im State (kein Datenverlust)

## Technical Requirements

- **Performance:** Initiales Laden < 1.5s (LCP), Freitext-Input ohne spürbaren Lag
- **Auth:** Supabase Auth (Magic Link + Google OAuth)
- **Session-Management:** Freitext im React-State (in-memory, kein localStorage im MVP)
- **Mobile-first:** Textarea muss auf iOS/Android gut bedienbar sein (kein Zoom, kein Jump)
- **Accessibility:** Alle Inputs mit Labels, Fehler mit aria-live

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Seitenstruktur (URL-Routing)

URL-basiertes Routing damit Browser-Back-Button korrekt funktioniert und jeder Schritt eine eigene URL hat:

```
/                        → Splash (nur 1x, danach redirect zu /onboarding/create)
/onboarding/create       → Screen 1: Freitext-Input (Zettel-Moment)
/onboarding/why          → Screen 2: Warum Registrierung
/onboarding/auth         → Screen 3: Magic Link oder Google OAuth
/onboarding/confirm      → Bestätigung "Prüf deine E-Mails"
/onboarding/profile      → Screen 3b: Miniprofil
/auth/callback           → Technische Rücksprung-Seite nach OAuth/Magic Link
/dashboard               → Screen 4: Zettelwand
```

### Komponenten-Baum

```
OnboardingLayout (gemeinsames Layout für alle /onboarding/* Seiten)
│
├── SplashScreen (/)
│   └── Logo + Claim + CTA "Loslegen"
│
├── FreitextScreen (/onboarding/create)
│   ├── FreitextTextarea        ← großes Eingabefeld, rotierender Placeholder
│   ├── ExamplesBottomSheet     ← Bottom Sheet mit 6 Beispielen (Sheet-Komponente)
│   └── CTA "Weiter" (disabled wenn < 10 Zeichen)
│
├── WhyRegisterScreen (/onboarding/why)
│   └── 3 Benefit-Bullets + CTA "Registrieren"
│
├── AuthScreen (/onboarding/auth)
│   ├── MagicLinkForm           ← E-Mail Input + Button
│   └── GoogleOAuthButton       ← OAuth-Redirect
│
├── MagicLinkConfirmScreen (/onboarding/confirm)
│   └── "Prüf deine E-Mails" + Resend-Link
│
├── MiniProfileForm (/onboarding/profile)
│   ├── Name/Alias Input (Pflicht)
│   ├── LanguageSelect DE/EN
│   └── CityInput (optional)
│
DashboardLayout (/dashboard)
├── InfoBanner (fix, nicht schließbar im MVP)
├── EntryTabs (Aktiv / Pausiert / Abgeschlossen)
└── EntryCard (pro Eintrag)
    ├── EntryTextPreview    ← max. 80 Zeichen
    ├── CategoryBadge       ← "pending" im MVP
    ├── MatchIndicator      ← "0 Matches"
    └── EntryActions        ← Bearbeiten / Pausieren / Löschen / Teilen
```

### Datenhaltung

**Was wird wo gespeichert:**

| Daten | Wo | Warum |
|-------|----|-------|
| Freitext während Onboarding | React Context (im Memory) | Einfach, kein localStorage nötig, wird nach Registrierung direkt gespeichert |
| "Splash bereits gesehen" | localStorage | Muss App-Neustarts überleben, klein und unkritisch |
| Nutzer-Session / Auth | Supabase Auth (automatisch) | Supabase verwaltet Tokens selbst |
| Profil (Name, Sprache, Stadt) | Supabase Datenbank – `profiles` Tabelle | Verknüpft mit Supabase Auth-User |
| Einträge (Suche/Biete) | Supabase Datenbank – `entries` Tabelle | Muss persistent und pro Nutzer sein |

**Datenbank-Tabellen (plain language):**

`profiles` – Nutzerprofile:
- Nutzer-ID (verknüpft mit Login)
- Anzeigename / Alias
- Sprache (DE oder EN)
- Stadt (optional)
- Referral-Code (eindeutig, wird bei Erstellung generiert)

`entries` – Gesuche und Angebote:
- Eintrag-ID
- Nutzer-ID (wem gehört der Eintrag)
- Originaltext (was der Nutzer getippt hat)
- Intent: Suche oder Biete (im MVP noch nicht klassifiziert → "pending")
- Kategorie (im MVP "pending" – wird später durch Matching-Engine befüllt)
- Status: Aktiv / Pausiert / Abgeschlossen
- Erstellt-Datum

### Auth-Flow (Magic Link vs. Google)

**Magic Link:**
1. Nutzer gibt E-Mail ein → Supabase schickt Link
2. Nutzer sieht Bestätigungsseite
3. Klick auf Link öffnet `/auth/callback` → Supabase löst Session ein
4. Weiterleitung zu `/onboarding/profile`

**Google OAuth:**
1. Klick → Redirect zu Google
2. Google bestätigt → Redirect zurück zu `/auth/callback`
3. Sofort weiter zu `/onboarding/profile` (kein E-Mail-Step)

**Wichtig:** Nach erfolgreichem Auth wird der gespeicherte Freitext aus dem OnboardingContext als erster Entry in die Datenbank geschrieben.

### Zustandsmanagement

```
OnboardingContext (React Context, keine externe Library nötig)
└── freitextValue: string        ← Eingabe aus Screen 1
└── currentStep: number          ← Für Progress-Anzeige
```

Kein Redux, kein Zustand-Manager nötig. Der Context lebt nur während des Onboardings und wird danach verworfen.

### Tech-Entscheidungen (Begründungen)

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Routing | Next.js App Router (URL-basiert) | Browser-Back funktioniert, jeder Schritt ist verlinkbar/debuggbar |
| Auth | Supabase Auth | Bereits im Stack, unterstützt Magic Link + OAuth nativ |
| State für Freitext | React Context | Einfachste Lösung für einen einmaligen Flow; kein Overhead |
| Splash-Flag | localStorage | Muss Neustarts überleben; sensible Daten sind es keine |
| UI-Komponenten | shadcn/ui (Sheet, Button, Input, Tabs, Badge) | Bereits installiert, kein Custom-Code nötig |

### Abhängigkeiten (neue Pakete)

Keine neuen Pakete nötig – alles bereits im Projekt verfügbar:
- `@supabase/supabase-js` ✓ (bereits installiert)
- `shadcn/ui` Komponenten: Sheet, Tabs, Badge ✓ (bereits im Projekt)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
