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

### Round 1 (Initial Test)

**Tested:** 2026-02-20
**Tester:** QA Engineer (AI)
**Build Status:** PASS
**Bugs Found:** 17 total (2 critical, 2 high, 4 medium, 9 low)
**Production Ready:** NO

---

### Round 2 (Retest after PROJ-2 / PROJ-3 changes)

**Tested:** 2026-02-20
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Build Status:** PASS (Next.js 16 compiles successfully, 0 TypeScript errors, all 13 routes generated)

#### Bug Retest Summary

| Bug | Original Severity | Status | Notes |
|-----|-------------------|--------|-------|
| BUG-1 | Low | MITIGATED | Intent is "pending" at creation, but `embed-entry` Edge Function now classifies seek/offer asynchronously post-save. Acceptable for MVP. |
| BUG-2 | Low | OPEN | `line-clamp-2` still used instead of 80-char truncation. |
| BUG-3 | High | FIXED | Edit (Pencil icon) now present in EntryCard with full edit Sheet. |
| BUG-4 | Low | OPEN | No explicit Magic Link fallback prompt after Google OAuth failure. |
| BUG-5 | Medium | OPEN | "Weiter" button still has no loading state or double-click prevention. |
| BUG-6 | Low | OPEN | No explicit retry button on profile save error. User must re-click "Fertig". |
| BUG-7 | Medium | OPEN | Textarea on Create page still has no maxLength enforcement. Counter shows X/500 but input is unlimited. |
| BUG-8 | Low | OPEN | WhyPage still renders content briefly before redirect when freitext is empty. |
| BUG-9 | Low | OPEN | Non-functional empty button on Create page header still present (lines 48-54 in create/page.tsx). |
| BUG-10 | Critical | OPEN | Dashboard `fetchEntries()` still has no `.eq("user_id", ...)` filter. No RLS migration files found in project (`supabase/migrations/` directory does not exist). |
| BUG-11 | High | OPEN | No `middleware.ts` exists anywhere in the project. All auth checks remain client-side only. |
| BUG-12 | Critical | PARTIALLY FIXED | `handleSaveEdit` now includes `.eq("user_id", user.id)` (line 206). However, `handlePauseResume` (line 123) and `handleDelete` (line 131) still lack user_id filter. |
| BUG-13 | Medium | PARTIALLY MITIGATED | `/api/classify-skills` route now uses Zod validation (`z.string().min(10).max(2000)`). But profile upsert and entry creation in `onboarding/profile/page.tsx` still send raw values directly to Supabase without server-side validation. |
| BUG-14 | Medium | OPEN | No rate limiting on Magic Link resend. `resent` flag resets on page refresh. |
| BUG-15 | Medium | FIXED | `next.config.ts` now contains full security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS with includeSubDomains and preload. |
| BUG-16 | Low | OPEN | Auth callback still accepts arbitrary `next` query parameter. Mitigated by origin prepending. |
| BUG-17 | Low | OPEN | Back buttons still use hardcoded `aria-label="Zurueck"` on Why, Auth, and Confirm pages. |

#### Acceptance Criteria Retest

##### Screen 0 -- Splash
- [x] AC-S0-1: PASS (unchanged)
- [x] AC-S0-2: PASS (unchanged)
- [x] AC-S0-3: PASS (unchanged)

##### Screen 1 -- Zettel-Moment (Freitext)
- [x] AC-S1-1: PASS (unchanged)
- [x] AC-S1-2: PASS (unchanged)
- [x] AC-S1-3: PASS (unchanged)
- [x] AC-S1-4: PASS (unchanged)
- [x] AC-S1-5: PASS (unchanged)
- [x] AC-S1-6: PASS (unchanged)

##### Screen 2 -- Warum Registrierung
- [x] AC-S2-1: PASS (unchanged)
- [x] AC-S2-2: PASS (unchanged)
- [x] AC-S2-3: PASS (unchanged)

##### Screen 3 -- Registrierung (Auth)
- [x] AC-S3-1: PASS (unchanged)
- [x] AC-S3-2: PASS (unchanged)
- [x] AC-S3-3: PASS (unchanged)
- [x] AC-S3-4: PASS (unchanged)
- [x] AC-S3-5: PASS (unchanged)
- [x] AC-S3-6: PASS (unchanged)

##### Screen 3b -- Miniprofil
- [x] AC-S3b-1: PASS (unchanged)
- [x] AC-S3b-2: PASS (unchanged)
- [x] AC-S3b-3: PASS (unchanged)
- [x] AC-S3b-4: PASS (unchanged)
- [x] AC-S3b-5: PASS (was BUG-1, now mitigated) -- Entry is saved with `intent: "pending"` initially, but `embed-entry` Edge Function classifies intent as "seek" or "offer" asynchronously after save. Profile page triggers this via fire-and-forget fetch to `embed-entry` (line 127 in profile/page.tsx).

##### Screen 4 -- Dashboard
- [x] AC-S4-1: PASS (unchanged)
- [x] AC-S4-2: PASS -- Tabs now show "Aktiv", "Pausiert", "Abgeschlossen" with correct filtering. "done" tab also includes legacy "closed" entries.
- [x] AC-S4-3: PASS (unchanged)
- [ ] AC-S4-4: STILL OPEN (BUG-2) -- Card text uses `line-clamp-2` instead of 80-char truncation.
- [x] AC-S4-5: PASS (was BUG-3, now FIXED) -- All 5 actions present: Share, Edit (Pencil), Pause/Resume, Done (CheckCircle2), Delete. The "Done" action is a new addition from PROJ-3. The edit action opens a bottom Sheet with textarea + save button.

#### New Bugs Found in Round 2

##### NEW-BUG-1: Dashboard handlePauseResume still lacks user_id ownership check
- **Severity:** Critical
- **Location:** `src/app/dashboard/page.tsx` line 117-126
- **Steps to Reproduce:**
  1. Review `handlePauseResume` function
  2. Calls `.update({ status: newStatus }).eq("id", entry.id)` with no `.eq("user_id", ...)`
  3. Without RLS, any authenticated user who knows an entry ID could pause/resume another user's entry
- **Note:** This is the remaining unfixed portion of original BUG-12. `handleSaveEdit` was fixed but `handlePauseResume` was not.
- **Priority:** Fix before deployment

##### NEW-BUG-2: Dashboard handleDelete still lacks user_id ownership check
- **Severity:** Critical
- **Location:** `src/app/dashboard/page.tsx` line 128-135
- **Steps to Reproduce:**
  1. Review `handleDelete` function
  2. Calls `.delete().eq("id", id)` with no `.eq("user_id", ...)`
  3. Without RLS, any authenticated user who knows an entry ID could delete another user's entry
- **Note:** This is the remaining unfixed portion of original BUG-12.
- **Priority:** Fix before deployment

##### NEW-BUG-3: Dashboard handleDone lacks user_id ownership check
- **Severity:** Critical
- **Location:** `src/app/dashboard/page.tsx` line 137-145
- **Steps to Reproduce:**
  1. Review `handleDone` function (new in PROJ-3)
  2. Calls `.update({ status: "done" }).eq("id", entry.id)` with no `.eq("user_id", ...)`
  3. Same vulnerability as handlePauseResume and handleDelete
- **Priority:** Fix before deployment

##### NEW-BUG-4: Notifications query has no user_id filter
- **Severity:** Critical
- **Location:** `src/app/dashboard/page.tsx` line 68-72
- **Steps to Reproduce:**
  1. Review `loadNotifications` function
  2. Calls `supabase.from("notifications").select("*")` with no `.eq("user_id", ...)`
  3. Without RLS on the notifications table, ALL users' notifications would be visible
- **Priority:** Fix before deployment (verify RLS or add user_id filter)

##### NEW-BUG-5: markAllRead updates all unread notifications globally
- **Severity:** Critical
- **Location:** `src/app/dashboard/page.tsx` line 164-168
- **Steps to Reproduce:**
  1. Review `markAllRead` function
  2. Calls `.update({ read: true }).eq("read", false)` without user_id filter
  3. Without RLS, this would mark ALL users' notifications as read
- **Priority:** Fix before deployment

##### NEW-BUG-6: Realtime subscription on notifications table has no user_id filter
- **Severity:** Medium
- **Location:** `src/app/dashboard/page.tsx` line 80-88
- **Steps to Reproduce:**
  1. Review the Realtime channel subscription
  2. Subscribes to ALL inserts on the `notifications` table, not filtered by user_id
  3. Any new notification for any user triggers a reload of notifications (which itself lacks user_id filter -- see NEW-BUG-4)
- **Priority:** Fix in next sprint (the actual data leak depends on NEW-BUG-4 / RLS)

##### NEW-BUG-7: Push subscription endpoint has no Zod validation for request body
- **Severity:** Medium
- **Location:** `src/app/api/push/subscribe/route.ts` line 25
- **Steps to Reproduce:**
  1. Review push subscribe API route
  2. `const { endpoint, keys } = await request.json()` -- destructuring without validation
  3. If `keys` is null/undefined, `keys.p256dh` will throw a runtime error
  4. No Zod schema used despite project convention requiring server-side Zod validation
- **Priority:** Fix in next sprint

##### NEW-BUG-8: embed-entry Edge Function called without auth header
- **Severity:** Medium
- **Location:** `src/app/onboarding/profile/page.tsx` lines 127-131
- **Steps to Reproduce:**
  1. Review the fire-and-forget fetch to `embed-entry`
  2. No `Authorization` header or `x-cron-secret` header is sent
  3. The Edge Function at `supabase/functions/embed-entry/index.ts` does not verify authentication
  4. This means any caller who knows the Supabase URL can invoke embed-entry with arbitrary entry_id and raw_text, potentially overwriting embeddings and intents
- **Priority:** Fix before deployment (add auth verification to Edge Function)

##### NEW-BUG-9: Match detail page exposes other user's profile data without RLS verification
- **Severity:** High
- **Location:** `src/app/matches/[id]/page.tsx` lines 33-55
- **Steps to Reproduce:**
  1. Review the match detail page
  2. It fetches match data and then fetches `their_profile` (display_name, city) for the matched user
  3. The only check is that the current user is authenticated and that they are one side of the match (entry_a or entry_b)
  4. However, if a user crafts a match ID for a match they are not part of, and RLS is not configured on the matches table, they could see the other person's profile
- **Note:** The code does check `entryA.user_id === user.id` to determine which entry is "mine" vs "theirs", but does NOT abort if the user is neither side of the match. If `user.id` matches neither, `myEntry` defaults to `entryB` and `theirEntry` defaults to `entryA`, leaking both entries' data.
- **Priority:** Fix before deployment

##### NEW-BUG-10: Hardcoded German string "Alle gelesen" in notification dropdown
- **Severity:** Low
- **Location:** `src/app/dashboard/page.tsx` line 325
- **Steps to Reproduce:**
  1. Switch app language to English
  2. Open notification dropdown
  3. Expected: "Mark all read" or similar English text
  4. Actual: Shows "Alle gelesen" (German) regardless of language
- **Priority:** Nice to have

##### NEW-BUG-11: Hardcoded German string "Dein Eintrag" on WhyPage
- **Severity:** Low
- **Location:** `src/app/onboarding/why/page.tsx` line 39
- **Steps to Reproduce:**
  1. Switch language to English
  2. Navigate to WhyPage
  3. Expected: "Your entry" or translated label
  4. Actual: Shows "Dein Eintrag" (German) regardless of language setting
- **Priority:** Nice to have

##### NEW-BUG-12: Dashboard notifications date always uses German locale
- **Severity:** Low
- **Location:** `src/app/dashboard/page.tsx` line 343
- **Steps to Reproduce:**
  1. Switch language to English
  2. Open notification dropdown
  3. Expected: Date formatted in English locale
  4. Actual: `new Date(n.created_at).toLocaleDateString("de-DE")` -- hardcoded German locale
- **Priority:** Nice to have

##### NEW-BUG-13: Edit Sheet textarea enforces maxLength but Create page does not
- **Severity:** Low (inconsistency)
- **Location:** Dashboard edit textarea (line 441) vs Create textarea (line 69-76)
- **Steps to Reproduce:**
  1. Open Edit Sheet on dashboard -- textarea has `onChange` that slices to `MAX_CHARS` (500)
  2. Open Create page -- textarea has no maxLength enforcement
  3. Inconsistent behavior: Edit enforces limit, Create does not
- **Note:** This is related to original BUG-7 but highlights the inconsistency between the two textareas.
- **Priority:** Fix in next sprint (align both to same behavior)

#### Regression Test Results

##### PROJ-2 Features (Matching + Notifications) -- Regression Check
- [x] Match count display on entry cards works (fetches from `matches` table)
- [x] Notification bell icon with unread count badge present
- [x] Notification dropdown opens and shows notifications with date
- [x] "Mark all read" functionality present
- [x] Push notification opt-in button visible
- [x] Match detail page renders score, both entries, and matched user profile
- [ ] REGRESSION: Notification and match queries lack user_id filters (see NEW-BUG-4, NEW-BUG-5)

##### PROJ-3 Features (Ping Model) -- Regression Check
- [x] "Done" lifecycle action (CheckCircle2 icon) present on active/paused entries
- [x] "Done" tab includes both "done" and legacy "closed" status entries
- [x] Skill chips render on entry cards when `skill_ids` present
- [x] Skill chips shown on profile page during onboarding with AI analysis
- [x] Dashboard translations updated from "Eintrag" to "Ping" terminology
- [ ] REGRESSION: handleDone lacks user_id filter (see NEW-BUG-3)

#### Security Audit Results (Updated)

##### Authentication
- [x] Splash and onboarding pages correctly accessible without login
- [x] Profile page verifies session on mount
- [x] Dashboard verifies session on mount
- [x] API route `/api/classify-skills` verifies auth via `supabase.auth.getUser()`
- [x] API route `/api/push/subscribe` verifies auth via `supabase.auth.getUser()`
- [x] Cron route `/api/cron/run-matching` verifies `CRON_SECRET` bearer token
- [ ] BUG: No `middleware.ts` for server-side route protection (BUG-11 still open)

##### Authorization
- [ ] BUG: Dashboard `fetchEntries` has no user_id filter (BUG-10 still open)
- [ ] BUG: `handlePauseResume`, `handleDelete`, `handleDone` lack user_id filter (NEW-BUG-1, NEW-BUG-2, NEW-BUG-3)
- [ ] BUG: Notification queries lack user_id filter (NEW-BUG-4, NEW-BUG-5)
- [x] `handleSaveEdit` now properly includes `.eq("user_id", user.id)` -- FIXED
- [ ] BUG: Match detail page does not verify user is part of the match (NEW-BUG-9)
- [ ] BUG: `embed-entry` Edge Function has no auth verification (NEW-BUG-8)

##### Input Validation
- [x] XSS: React JSX auto-escaping, no `dangerouslySetInnerHTML` found
- [x] XSS in email: `send-notifications` Edge Function uses `escapeHtml()` on entry preview text
- [x] `/api/classify-skills` uses Zod schema validation
- [ ] BUG: Profile save and entry creation still lack server-side Zod validation (BUG-13 partially mitigated)
- [ ] BUG: `/api/push/subscribe` lacks Zod validation (NEW-BUG-7)
- [ ] BUG: Create page textarea still lacks maxLength enforcement (BUG-7 still open)

##### Rate Limiting
- [ ] BUG: No rate limiting on Magic Link resend (BUG-14 still open)
- [ ] Note: Supabase built-in rate limiting provides baseline protection

##### Secrets & Exposed Data
- [x] No secrets hardcoded in source code
- [x] Only `NEXT_PUBLIC_` prefixed env vars in browser
- [x] `.env.local` in `.gitignore`
- [x] `CRON_SECRET` properly used as bearer token for cron endpoint
- [x] `OPENAI_API_KEY` only used server-side (API route + Edge Functions)
- [x] `SUPABASE_SERVICE_ROLE_KEY` only used in Edge Functions (not in client code)

##### Security Headers
- [x] FIXED: `next.config.ts` now has comprehensive security headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: camera=(), microphone=(), geolocation=()
  - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
- [ ] Note: Content-Security-Policy (CSP) header still not configured. Lower priority but recommended for production.

##### Open Redirect
- [ ] BUG: Auth callback still accepts arbitrary `next` query parameter (BUG-16 still open, low severity)

#### Responsive & Cross-Browser Analysis (Unchanged)
- [x] Mobile (375px): All pages use `max-w-md` centering, `w-full` buttons, mobile-friendly textarea
- [x] Tablet (768px): Layout works but content is narrow column (acceptable for MVP)
- [x] Desktop (1440px): Content centered in narrow column (acceptable for MVP)
- [x] Cross-browser: shadcn/ui (Radix primitives), Tailwind CSS, no browser-specific APIs except `navigator.share` (with clipboard fallback)

#### Accessibility (Updated)
- [x] Textarea has `aria-label`
- [x] Error messages use `aria-live="polite"`
- [x] Inputs have `<Label>` with `htmlFor`
- [x] Error messages connected via `aria-describedby`
- [x] Notification bell has `aria-label={t.dashboard.notifications_title}`
- [x] Logout button has `aria-label={t.dashboard.logout}`
- [x] All action buttons in EntryCard have translated `aria-label`
- [ ] BUG: Back buttons still have hardcoded `aria-label="Zurueck"` (BUG-17 still open)

### Round 2 Summary

**Acceptance Criteria:** 24/25 passed (1 open: BUG-2 text truncation)
**Original Bugs (17):** 3 fixed, 2 mitigated, 12 still open
**New Bugs Found:** 13 (5 critical, 1 high, 3 medium, 4 low)
**Total Open Bugs:** 25 (5 critical, 1 high, 5 medium, 14 low -- but note most critical bugs share root cause: missing user_id filters)

#### Critical Bugs (must fix before deployment)

| Bug | Title | Root Cause |
|-----|-------|-----------|
| BUG-10 | fetchEntries lacks user_id filter | No RLS + no app-level filter |
| NEW-BUG-1 | handlePauseResume lacks user_id filter | Same as BUG-10 |
| NEW-BUG-2 | handleDelete lacks user_id filter | Same as BUG-10 |
| NEW-BUG-3 | handleDone lacks user_id filter | Same as BUG-10 |
| NEW-BUG-4 | Notifications query lacks user_id filter | Same pattern |
| NEW-BUG-5 | markAllRead updates all users' notifications | Same pattern |
| NEW-BUG-8 | embed-entry Edge Function has no auth | Unauthenticated endpoint |

#### High Bugs (must fix before deployment)

| Bug | Title |
|-----|-------|
| BUG-11 | No server-side middleware for route protection |
| NEW-BUG-9 | Match detail page leaks data for non-participant |

#### Recommended Fix Strategy

1. **Root Cause Fix (covers BUG-10, NEW-BUG-1 through NEW-BUG-5):** Add Supabase RLS policies for `entries`, `notifications`, `matches`, and `push_subscriptions` tables. Additionally, add explicit `.eq("user_id", ...)` filters in client code as defense-in-depth.
2. **NEW-BUG-8:** Add auth verification to `embed-entry` Edge Function (check service role key or user JWT).
3. **NEW-BUG-9:** Add check in match detail page to verify current user is `entry_a.user_id` or `entry_b.user_id`, abort if not.
4. **BUG-11:** Add `middleware.ts` with Supabase auth check for `/dashboard` and `/onboarding/profile`.
5. **BUG-7:** Add `maxLength={500}` to Create page textarea or slice input in onChange handler.

**Build:** PASS (0 TypeScript errors, all routes compile)
**Production Ready:** NO
**Recommendation:** Fix critical and high severity bugs (primarily the missing user_id filters / RLS policies). Most critical bugs share a single root cause (no RLS + no app-level user_id filters), so one systematic fix addresses 6 of the 7 critical bugs. After these fixes, run `/qa` again for Round 3.

## Deployment
_To be added by /deploy_
