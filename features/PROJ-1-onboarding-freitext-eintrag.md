# PROJ-1: Onboarding + Freitext-Eintrag (Zettel-UX)

## Status: In Review
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

**Tested:** 2026-02-20
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Build Status:** PASS (Next.js 16.1.1 compiles successfully, 0 TypeScript errors)

### Acceptance Criteria Status

#### Screen 0 -- Splash

##### AC-S0-1: Wird nur beim allerersten App-Start gezeigt (danach nicht mehr)
- [x] PASS: `localStorage.getItem("skillmatch_splash_seen")` is checked on mount. If set, `router.replace("/onboarding/create")` fires immediately. On CTA click, `localStorage.setItem("skillmatch_splash_seen", "1")` is stored before navigating.

##### AC-S0-2: Zeigt Logo, Claim ("We connect people based on skills") und CTA "Loslegen"
- [x] PASS: `<Logo>` component rendered, claim via `t.splash.claim` = "We connect people based on skills", CTA button with `t.splash.cta` = "Loslegen".

##### AC-S0-3: Subline erklaert das Konzept in max. 1 Satz
- [x] PASS: `t.splash.subtitle` = "Erstelle ein Gesuch oder Angebot. Wir matchen dich kontextbasiert mit passenden Menschen." (one sentence, explains the concept).

#### Screen 1 -- Zettel-Moment (Freitext)

##### AC-S1-1: Grosses Textarea-Feld ist das dominante UI-Element
- [x] PASS: `<Textarea>` with `min-h-[160px]` class is the primary element on the page.

##### AC-S1-2: Placeholder-Text rotiert zwischen min. 3 Beispielen
- [x] PASS: 5 rotating placeholders defined in `translations.ts` (Badminton, Streichen, Entwickler, Nachhilfe, Laufgruppe). Rotation interval: 2800ms via `setInterval`.

##### AC-S1-3: "Beispiele anzeigen" oeffnet ein Bottom Sheet mit 6 Beispielen
- [x] PASS: shadcn `<Sheet>` component with `side="bottom"`. 6 examples in `t.create.examples` array. Each example is a clickable button that fills the textarea.

##### AC-S1-4: Freitext-Eingabe ist Pflicht (min. 10 Zeichen), CTA "Weiter" ist disabled solange leer
- [x] PASS: `isValid = freitext.trim().length >= 10`, button has `disabled={!isValid}`. Inline error message shown on submit attempt with < 10 chars.

##### AC-S1-5: Standort ist nicht abgefragt auf diesem Screen
- [x] PASS: No location/city input on the create page. Confirmed by code review.

##### AC-S1-6: Eingabe bleibt im State erhalten beim Navigieren
- [x] PASS: `freitext` is stored in `OnboardingContext` (React Context), shared across all `/onboarding/*` routes via `OnboardingLayout`.

#### Screen 2 -- Warum Registrierung

##### AC-S2-1: Zeigt 3 klar formulierte Gruende
- [x] PASS: `t.why.reasons` contains 3 reasons (Suche speichern, Matches kontaktieren, Benachrichtigungen). Rendered with `CheckCircle2` icons.

##### AC-S2-2: CTA "Registrieren" fuehrt zu Auth-Screen
- [x] PASS: Button `onClick={() => router.push("/onboarding/auth")}` navigates to auth.

##### AC-S2-3: Freitext aus Screen 1 bleibt gespeichert (Session)
- [x] PASS: `const { freitext } = useOnboarding()` -- freitext is read from context and displayed as a preview card on the Why page.

#### Screen 3 -- Registrierung (Auth)

##### AC-S3-1: Magic Link via E-Mail ist verfuegbar
- [x] PASS: `supabase.auth.signInWithOtp({ email })` is implemented. Email input + "Magic Link senden" button present.

##### AC-S3-2: Google OAuth ist verfuegbar
- [x] PASS: `supabase.auth.signInWithOAuth({ provider: "google" })` implemented. Google button with SVG icon present.

##### AC-S3-3: E-Mail-Validierung (Format + Pflichtfeld)
- [x] PASS: Regex validation `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` on submit. Button disabled when email is empty (`disabled={loading || !email}`). Inline error shown.

##### AC-S3-4: Nach Magic Link: Bestaetigungsseite
- [x] PASS: After successful OTP send, `router.push("/onboarding/confirm")` navigates to confirm page showing "Pruef deine E-Mails" with email display and resend option.

##### AC-S3-5: Nach OAuth: direkt weiter zu Miniprofil
- [x] PASS: `redirectTo` points to `/auth/callback`, which redirects to `/onboarding/profile`. No confirm step for OAuth.

##### AC-S3-6: Bereits registrierter Nutzer wird erkannt und eingeloggt
- [x] PASS: Supabase `signInWithOtp` handles existing users natively -- sends login link instead of creating duplicate.

#### Screen 3b -- Miniprofil

##### AC-S3b-1: Name/Alias ist Pflichtfeld (min. 2 Zeichen)
- [x] PASS: Validation `name.trim().length < 2` with inline error. Button `disabled={saving || name.trim().length < 2}`.

##### AC-S3b-2: Sprache auswaehlen (DE / EN) -- Default: Browser-Sprache
- [x] PASS: Two toggle buttons for DE/EN. Default is `lang` from `LanguageContext`, which detects browser language on mount.

##### AC-S3b-3: Stadt/Region ist optional
- [x] PASS: City input present, no validation. Sent as `city.trim() || null` (null if empty).

##### AC-S3b-4: CTA "Fertig" speichert Profil und erstellt Entry
- [x] PASS: `handleSave` upserts to `profiles` table and inserts into `entries` table if freitext exists.

##### AC-S3b-5: Entry wird mit intent, Kategorie und raw_text gespeichert
- [ ] BUG: Entry is saved with `intent: "pending"` instead of classifying as "seek" or "offer". The spec says intent should be "seek/offer" with category as "TBD/pending". Currently both intent AND category are "pending". See BUG-1.

#### Screen 4 -- Dashboard

##### AC-S4-1: Infobanner (fix oben)
- [x] PASS: Banner with Info icon shows both messages: `t.dashboard.banner_1` and `t.dashboard.banner_2`. Not dismissible (correct for MVP).

##### AC-S4-2: Tabs: Aktiv / Pausiert / Abgeschlossen
- [x] PASS: shadcn `<Tabs>` with three tabs: "active", "paused", "closed". Each filters entries by status.

##### AC-S4-3: Erster Eintrag aus Onboarding wird sofort angezeigt
- [x] PASS: `fetchEntries()` runs on mount after session check. Entry created during onboarding has `status: "active"`.

##### AC-S4-4: Eintragskarte zeigt Kurztext, Kategorie, Status, Match-Indikator
- [ ] BUG: Card shows `line-clamp-2` (CSS line clamping) instead of truncating to exactly 80 characters as specified. See BUG-2.
- [x] Category badge shows "wird analysiert" for pending entries.
- [x] Match indicator shows "0 Matches".

##### AC-S4-5: Actions pro Karte: Bearbeiten, Pausieren, Loeschen, Teilen
- [ ] BUG: "Bearbeiten" (Edit) action is MISSING from the EntryCard. Only Share, Pause/Resume, and Delete are implemented. See BUG-3.

### Edge Cases Status

#### EC-1: Nutzer schliesst App nach Screen 1
- [x] PASS: Freitext is in React Context (in-memory) -- correctly lost on app restart. After restart, splash is skipped (localStorage flag persists), user lands on `/onboarding/create` with empty field.

#### EC-2: Magic Link laeuft ab (>1h)
- [x] PASS: `/auth/callback` redirects to `/onboarding/auth?error=link_expired` on failure. Auth page reads `searchParams.get("error")` and shows styled error banner with `t.errors.link_expired` message.

#### EC-3: Magic Link auf anderem Geraet
- [x] PASS: Auth callback works independently of device. Freitext session is lost (in-memory context), user proceeds to profile without entry. Entry will not be created if `freitext.trim()` is empty.

#### EC-4: Google OAuth schlaegt fehl
- [x] PASS: `toast.error(t.errors.google_failed)` shown on failure. `setGoogleLoading(false)` resets state.
- [ ] BUG: No explicit fallback to Magic Link is offered after Google OAuth failure. Only a toast error is shown. The user can still manually use Magic Link (it is on the same page), but no specific prompt guides them. See BUG-4.

#### EC-5: E-Mail bereits registriert (Magic Link)
- [x] PASS: Supabase `signInWithOtp` handles this natively. Existing user gets a login link. Freitext from session will be saved as a new entry in the profile step.

#### EC-6: Minimaltext eingegeben (z.B. "hi")
- [x] PASS: Inline error `t.create.validation_min` = "Bitte beschreibe dein Anliegen (min. 10 Zeichen)". No toast/modal used. Error has `aria-live="polite"`.

#### EC-7: Nutzer klickt mehrfach auf "Weiter"
- [ ] BUG: On the Create screen, the "Weiter" button does NOT show a loading state or prevent double-clicks. It calls `router.push()` synchronously without disabling itself. Multiple rapid clicks could trigger multiple navigations. See BUG-5.

#### EC-8: Netzwerk-Fehler beim Speichern des Entry
- [x] PASS (partial): `toast.error(t.errors.save_failed)` shown on failure. `setSaving(false)` resets state in `finally` block so user can retry.
- [ ] BUG: No explicit "Retry" button is shown. The user must click "Fertig" again manually. The spec says "Fehlermeldung + Retry-Option". See BUG-6.

#### EC-9: Nutzer navigiert mit Browser-Back-Button
- [x] PASS: URL-based routing with Next.js App Router ensures back button works. Freitext stays in OnboardingContext as long as user stays within `/onboarding/*` routes.

### Additional Edge Cases (QA-Identified)

#### QA-EC-1: Textarea has no maxLength enforcement
- [ ] BUG: The textarea shows a "0/500" character counter but does NOT enforce a maxLength. Users can type unlimited text. See BUG-7.

#### QA-EC-2: WhyPage guard renders content before redirect
- [ ] BUG: The guard on WhyPage (`if (typeof window !== "undefined" && !freitext)`) triggers `router.replace()` but does NOT return early or show a loading state. The full page renders momentarily with empty freitext before redirect completes. See BUG-8.

#### QA-EC-3: Language toggle on Create page is non-functional
- [ ] BUG: There is an empty `<button>` element on the Create page header (line 48-54 in create/page.tsx) that appears to be an abandoned language toggle. It has no visible text/icon and the onClick handler imports a module but does nothing functional. See BUG-9.

#### QA-EC-4: Dashboard fetches entries without user_id filter
- [ ] BUG: `fetchEntries()` calls `supabase.from("entries").select("*")` without a `.eq("user_id", ...)` filter. This relies entirely on RLS policies for data isolation. If RLS is not properly configured, ALL users' entries would be visible. See BUG-10.

#### QA-EC-5: Profile page uses router.push instead of window.location.href
- [x] The profile page uses `router.push("/dashboard")` after saving. The frontend rules specify using `window.location.href` for post-login redirect. However, since the user is already authenticated at this point (session exists), `router.push` is acceptable here.

### Security Audit Results

#### Authentication
- [x] Splash and onboarding pages are correctly accessible without login
- [x] Profile page verifies session on mount: `supabase.auth.getSession()` check redirects to auth if no session
- [x] Dashboard verifies session on mount: redirects to onboarding if no session
- [ ] BUG: No middleware.ts exists for server-side route protection. All auth checks are client-side only (useEffect). A user could briefly see protected page content before being redirected. See BUG-11.

#### Authorization
- [ ] BUG: Dashboard `fetchEntries()` has no `user_id` filter -- relies entirely on Supabase RLS. No RLS migrations found in the project. If RLS is not configured, this is a critical data leak. See BUG-10 (duplicate of QA-EC-4).
- [ ] BUG: `handlePauseResume` and `handleDelete` update/delete entries by `id` without verifying ownership. Without RLS, any authenticated user could modify any entry. See BUG-12.

#### Input Validation
- [x] XSS: React renders all user input safely via JSX (no `dangerouslySetInnerHTML` found anywhere)
- [x] Email validation regex present on auth page
- [ ] BUG: No server-side input validation (Zod schemas). All validation is client-side only. Profile save and entry creation send raw values to Supabase without validation. See BUG-13.
- [ ] BUG: No max-length enforcement on textarea (see BUG-7). Malicious user could submit extremely large text payloads.

#### Rate Limiting
- [ ] BUG: No rate limiting on Magic Link resend. A malicious user could spam the resend button to trigger excessive email sends via Supabase. The "resent" flag only disables the button in the current session. See BUG-14.

#### Secrets & Exposed Data
- [x] No secrets hardcoded in source code
- [x] Only `NEXT_PUBLIC_` prefixed env vars used in browser (Supabase URL + anon key -- these are designed to be public)
- [x] `.env.local` is in `.gitignore` (confirmed by `.env.local.example` existing separately)

#### Security Headers
- [ ] BUG: No security headers configured. `next.config.ts` is empty. Missing: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security. See BUG-15.

#### Open Redirect
- [ ] BUG: The `/auth/callback` route accepts a `next` query parameter and redirects to it: `const next = searchParams.get("next") ?? "/onboarding/profile"`. This could be exploited for open redirect if `next` contains an absolute URL (e.g., `?next=https://evil.com`). However, `${origin}${next}` prepends the origin, which limits the attack to path-based redirects only. Low severity since origin is prepended. See BUG-16.

### Responsive & Cross-Browser Analysis

#### Responsive Design
- [x] All pages use `max-w-md` (448px) centering with `px-5` padding -- works well on mobile
- [x] Buttons are `w-full` -- responsive-friendly
- [x] Textarea has `min-h-[160px]` and `resize-none` -- mobile-friendly
- [x] Sheet uses `side="bottom"` -- proper mobile bottom sheet pattern
- Note: No specific responsive breakpoint handling for tablet/desktop detected. The layout is mobile-first with a narrow max-width. On desktop, content will be a narrow column centered on screen.

#### Cross-Browser
- [x] All UI uses shadcn/ui components (Radix primitives) -- excellent cross-browser support
- [x] `line-clamp-2` uses Tailwind (webkit-line-clamp) -- supported in all modern browsers
- [x] No browser-specific APIs used except `navigator.share` (with fallback to clipboard)

### Accessibility
- [x] Textarea has `aria-label` for screen readers
- [x] Error messages use `aria-live="polite"` for dynamic announcements
- [x] Inputs have `<Label>` components with `htmlFor` attributes
- [x] Error messages connected via `aria-describedby`
- [ ] BUG: Back buttons on Why, Auth, and Confirm pages have hardcoded German `aria-label="Zurueck"` instead of using the translation system. See BUG-17.

### Bugs Found

#### BUG-1: Entry intent saved as "pending" instead of seek/offer
- **Severity:** Low
- **Steps to Reproduce:**
  1. Complete the onboarding flow
  2. Check the `entries` table in Supabase
  3. Expected: `intent` is "seek" or "offer" (or at least "pending" is documented)
  4. Actual: `intent: "pending"` -- spec says "intent (seek/offer)" but MVP does not classify
- **Note:** The spec says "im MVP noch nicht klassifiziert" so this may be intentional. But the AC says "Entry wird mit intent (seek/offer)" which contradicts. Needs clarification.
- **Priority:** Nice to have (clarify spec wording)

#### BUG-2: Entry card text not truncated to 80 characters
- **Severity:** Low
- **Steps to Reproduce:**
  1. Create an entry with a long text (200+ characters)
  2. View the entry card on the dashboard
  3. Expected: Text truncated at exactly 80 characters with ellipsis
  4. Actual: Text uses `line-clamp-2` (CSS two-line clamping), which varies by viewport width
- **Priority:** Nice to have

#### BUG-3: "Bearbeiten" (Edit) action missing from entry cards
- **Severity:** High
- **Steps to Reproduce:**
  1. Go to the Dashboard
  2. Look at entry card actions
  3. Expected: 4 actions -- Bearbeiten, Pausieren, Loeschen, Teilen
  4. Actual: Only 3 actions -- Teilen, Pausieren, Loeschen. Edit is completely missing.
- **Priority:** Fix before deployment

#### BUG-4: No explicit fallback prompt after Google OAuth failure
- **Severity:** Low
- **Steps to Reproduce:**
  1. Click "Mit Google fortfahren" when OAuth fails
  2. Expected: Error message + suggestion to use Magic Link
  3. Actual: Only `toast.error("Google-Anmeldung fehlgeschlagen.")` -- no fallback prompt
- **Priority:** Nice to have

#### BUG-5: "Weiter" button on Create page lacks loading state / double-click prevention
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Type 10+ characters on Create screen
  2. Rapidly click "Weiter" multiple times
  3. Expected: Button shows loading state, prevents double-navigation
  4. Actual: `router.push()` called synchronously, no loading state, no debounce
- **Priority:** Fix in next sprint

#### BUG-6: No explicit retry button on network error during profile save
- **Severity:** Low
- **Steps to Reproduce:**
  1. Disconnect network on Profile page
  2. Click "Fertig"
  3. Expected: Error message with explicit "Retry" button
  4. Actual: Toast error only. User must manually click "Fertig" again.
- **Priority:** Nice to have

#### BUG-7: Textarea has no maxLength enforcement
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Go to `/onboarding/create`
  2. Paste extremely long text (e.g., 10,000 characters)
  3. Expected: Input limited to 500 characters (counter shows X/500)
  4. Actual: Counter shows X/500 but no limit is enforced. User can type unlimited text.
- **Priority:** Fix before deployment

#### BUG-8: WhyPage renders briefly before redirect when freitext is empty
- **Severity:** Low
- **Steps to Reproduce:**
  1. Navigate directly to `/onboarding/why` without entering freitext
  2. Expected: Immediate redirect without rendering page content
  3. Actual: Page renders momentarily (headline, empty preview area) before redirect fires
- **Priority:** Nice to have

#### BUG-9: Non-functional empty button on Create page header
- **Severity:** Low
- **Steps to Reproduce:**
  1. Go to `/onboarding/create`
  2. Inspect the header area next to the logo
  3. Expected: No dead UI elements
  4. Actual: An invisible empty `<button>` exists with a non-functional onClick that imports a module but does nothing
- **Priority:** Fix in next sprint (cleanup)

#### BUG-10: Dashboard fetches entries without user_id filter (RLS dependency)
- **Severity:** Critical
- **Steps to Reproduce:**
  1. Check `fetchEntries()` in dashboard/page.tsx
  2. Query is `supabase.from("entries").select("*")` with no `.eq("user_id", ...)`
  3. Expected: Entries filtered by authenticated user
  4. Actual: Relies 100% on Supabase RLS. No RLS migration files found in the project.
  5. If RLS is not configured: all users' entries are visible to every authenticated user.
- **Priority:** Fix before deployment (verify RLS exists or add user_id filter)

#### BUG-11: No server-side middleware for route protection
- **Severity:** High
- **Steps to Reproduce:**
  1. Check for `middleware.ts` in project root
  2. Expected: Server-side auth check for `/dashboard` and `/onboarding/profile`
  3. Actual: No middleware.ts exists. All auth is client-side useEffect. Protected content flashes briefly before redirect.
- **Priority:** Fix before deployment

#### BUG-12: Entry mutations (pause/delete) lack ownership verification
- **Severity:** Critical
- **Steps to Reproduce:**
  1. Review `handlePauseResume` and `handleDelete` in dashboard/page.tsx
  2. Both call `.eq("id", entry.id)` without `.eq("user_id", userId)`
  3. Expected: Updates/deletes scoped to current user's entries
  4. Actual: Without RLS, any authenticated user could modify any entry by ID
- **Priority:** Fix before deployment (verify RLS exists or add user_id filter)

#### BUG-13: No server-side input validation (Zod)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Check profile save and entry creation code
  2. Expected: Zod schemas validate input before sending to Supabase
  3. Actual: Raw user input sent directly to Supabase. No Zod validation despite Zod being in dependencies.
- **Priority:** Fix in next sprint

#### BUG-14: No rate limiting on Magic Link resend
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Go to `/onboarding/confirm`
  2. Click "Neuen Link senden", wait for success
  3. Refresh the page (resets `resent` state)
  4. Click again -- unlimited resends possible across page refreshes
  5. Note: Supabase has its own rate limits, but the app does not enforce any.
- **Priority:** Fix in next sprint (Supabase rate limits provide baseline protection)

#### BUG-15: No security headers configured
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Check `next.config.ts` -- empty config
  2. Expected: Security headers (X-Frame-Options, CSP, HSTS, etc.)
  3. Actual: No headers configured
- **Priority:** Fix before deployment

#### BUG-16: Auth callback accepts `next` query parameter (limited open redirect)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Craft URL: `/auth/callback?code=valid&next=/../../evil-path`
  2. Expected: Only allow predefined redirect paths
  3. Actual: Any path is accepted for redirect. Mitigated by origin prepending (`${origin}${next}`), so only same-origin paths work. Not exploitable for cross-origin redirect.
- **Priority:** Nice to have (add allowlist validation)

#### BUG-17: Hardcoded German aria-labels on back buttons
- **Severity:** Low
- **Steps to Reproduce:**
  1. Switch language to English
  2. Use screen reader on Why, Auth, or Confirm pages
  3. Expected: Back button announced in current language
  4. Actual: Always announced as "Zurueck" (German) regardless of language setting
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** 22/25 passed (3 failed: BUG-3, BUG-2, BUG-5 partially)
- **Edge Cases (Documented):** 7/9 passed (2 partial: BUG-5, BUG-6)
- **Additional Edge Cases (QA-found):** 5 identified, 4 bugs
- **Bugs Found:** 17 total (2 critical, 2 high, 4 medium, 9 low)
- **Security:** Issues found (no RLS verification, no middleware, no server-side validation, no security headers)
- **Build:** PASS (compiles with 0 errors)
- **Production Ready:** NO
- **Recommendation:** Fix critical and high bugs first (BUG-3, BUG-10, BUG-11, BUG-12), then deploy. Medium bugs can be addressed in next sprint.

## Deployment
_To be added by /deploy_
