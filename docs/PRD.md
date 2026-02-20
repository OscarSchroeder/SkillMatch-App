# Product Requirements Document — SkillMatch Connect

## Vision

**SkillMatch Connect** ist ein universelles, skill-basiertes Verbindungsnetzwerk.
Nutzer formulieren in freier Form, was sie suchen oder bieten. Das System strukturiert diese Information, organisiert kontextbasierte Matches und führt Nutzer privat zusammen.

**Claim:** *We connect people based on skills*
**Kern-Promise:** Menschen suchen keine Apps. Menschen suchen passende Menschen.

## Target Users

**Primäre Personas (MVP)**

| Persona | Beschreibung | Motivation |
|---------|-------------|------------|
| Pragmatischer Problemlöser | Will schnell jemanden finden | Teilt nur wenn es Erfolgsquote verbessert |
| Community Builder / Pionier | Teilt breit, will Status & Einfluss | Langfristige Vorteile, Ownership |
| Anbieter / Helper | Bietet Skills an (Handwerk, Hilfe, Reparatur) | Will passende Anfragen erhalten |
| Job/Projekt-Suchender | Sucht Projekte/Jobs lokal oder remote | Matching zu Möglichkeiten |

**Use Cases (universell)**
- Freizeit & Sport: Partner/Gruppe/Trainer suchen oder anbieten
- Alltag & Hilfe: Entrümpeln, Streichen, Reparaturcheck
- Dienstleistungen privat/semiprofessionell: „jemand mit Skill X"
- Jobs/Projekte: lokal/remote

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Onboarding + Freitext-Eintrag erstellen | Planned |
| P0 (MVP) | Registrierung + Miniprofil (Magic Link) | Planned |
| P0 (MVP) | Dashboard – Zettelwand (Aktiv/Pausiert/Abgeschlossen) | Planned |
| P0 (MVP) | Eintrag verwalten (pausieren/löschen/bearbeiten/teilen) | Planned |
| P0 (MVP) | Matching-Engine (regelbasiert + semantisch) | Planned |
| P0 (MVP) | Match-Benachrichtigungen (Push + E-Mail) | Planned |
| P0 (MVP) | Privater Chat (In-App, minimal) | Planned |
| P0 (MVP) | Referral/Sharing-System + Viral Tracking | Planned |
| P1 | Pionier-Level + Badges (Gamification) | Planned |
| P1 | Punkte-System (Season-Pool, Upline-Verteilung) | Planned |
| P2 | Filter (Radius, remote, Zeit, Verfügbarkeit) | Planned |
| P2 | Skill-Profil Ausbau | Planned |
| P2 | Reputation / Bewertungen | Planned |
| P2 | Community-Equity (Token/Profit-Share) | Planned |

## Produktprinzipien

1. **One input, many outcomes:** Freitext → systemische Strukturierung → Match
2. **Friction killt Viralität:** kein Formular-Monster, keine Setup-Hölle
3. **Wahrscheinlichkeit statt Features:** Mehr Nutzer = höhere Erfolgsquote (sichtbar machen)
4. **Privat by default:** Kontakt erst bei Match, dann 1:1
5. **Kontrolle:** Einträge aktiv bis Nutzer pausiert/löscht. Kein Handlungszwang.
6. **Messbarkeit:** Referral-Ketten + Conversion + Match-Funnel von Tag 1

## Matching-Logik

Ein Match entsteht wenn:
- Kategorie kompatibel (Suche ↔ Biete in gleicher Kategorie)
- Skills/Tags überlappen (semantische Nähe)
- Kontext kompatibel (lokal/remote, Sprache)

**Pipeline:** Raw Text → Klassifikation (intent/Kategorie/Skills) → Kandidatenfindung → Scoring (0–100) → Match-Trigger (Schwelle) → Notification

## Viral-Mechanik

**Limit + Freischaltung:**
- Default: max. 2 aktive Einträge
- Freischaltung durch: erfolgreiche Referral-Aktivierungen oder abgeschlossene Matches

**Punkte-Modell (Season-Pool):**
- Jede Registrierung via Referral erzeugt Aktivierungswert = 1
- Verteilung entlang Kette: Upline1 50% / Upline2 20% / Upline3 10% / Upline4 5% / Self 15%
- Pool pro Season (nicht unbegrenzt) → faire, stabile Verteilung

**Pionier-Level:** basiert auf aktivierten Nutzern → Vorteile: Matching-Boost, höhere Limits, frühere Notifications

## Datenmodell

| Entität | Key Fields |
|---------|------------|
| User | id, email, display_name, language, location?, referral_code, status |
| Entry | id, user_id, raw_text, intent (seek/offer), category, skill_tags[], status |
| Referral | inviter_id, invited_id, timestamp, depth, source |
| Match | entry_id_a, entry_id_b, score, status (new/contacted/closed) |
| Chat | participants, messages |
| PointsLedger | user_id, event_type, value, reference_id, season_id |

## Success Metrics

**Funnel-Metriken:**
- Startscreen Input begonnen → Registrierung abgeschlossen
- Erster Eintrag erstellt
- Share-Button geklickt → Registrierung via Referral
- Aktivierte Nutzer pro Einlader (K-Faktor)
- Time-to-first-match
- Retention D1/D7/D30

**Wachstumsmetriken:**
- Viral K-Faktor
- Netzwerk-Tiefe (Avg Referral Depth)
- Aktivierungsqualität (Eintrag nach Signup)

## Constraints

- MVP-Timeline: 4–8 Wochen (Phase 1 Live)
- Stack: Next.js 16, TypeScript, Tailwind, shadcn/ui, Supabase, Vercel
- Team: klein / solo
- Kein Marktplatz für physische Gegenstände (explizit ausgeschlossen)

## Non-Goals (MVP)

- Öffentliche Indexierbarkeit (kein SEO/Google Kleinanzeigen)
- Physische Produkte / Gegenstände
- Zahlungssystem
- Komplexe Reputations-/Bewertungssystem
- Community-Equity Implementierung (nur kommunizieren, nicht bauen)

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.
