# PROJ-3: Ping-Modell, Lifecycle & KI-Klassifikation

## Status: Planned
**Created:** 2026-02-20
**Last Updated:** 2026-02-20

## Dependencies
- Requires: PROJ-1 (Onboarding + Freitext-Eintrag) — bestehende Entry-Tabelle wird zu Ping migriert
- Requires: PROJ-2 (Matching-Engine) — Matching-Logik wird erweitert (PEER/NEED/OFFER + Scoring-Schwellenwerte)

## Kontext

Das bestehende „Entry"-System (PROJ-1/2) wird zu einem „Ping"-System weiterentwickelt.
Ein Ping ist ein universeller Kontext-Impuls: Nutzer formulieren frei, was sie suchen oder anbieten.
Das System klassifiziert, strukturiert und matcht Pings kontinuierlich.

**Terminologie:** In der UI heißt es „Ping", intern bleibt die Tabelle vorerst `entries` (Migration möglich in PROJ-4+).

**Abgrenzung:**
- PROJ-3: Kern-Ping-Modell + Lifecycle + KI-Klassifikation + Skill-Vorschläge + verbessertes Scoring
- PROJ-4 (geplant): Vollständige Skill-Taxonomie (Hierarchie, Familien, Synonyme)
- PROJ-5 (geplant): OPEN-Refinement Flow (Klärungsfragen für vage Pings)
- PROJ-6 (geplant): Geo-Matching (lat/lon, Radius)

---

## User Stories

**US-1: Ping erstellen mit KI-Unterstützung**
Als eingeloggter Nutzer möchte ich einen Ping per Freitext erstellen und sofort KI-Vorschläge für passende Skills sehen, damit mein Ping präziser ist und bessere Matches bekommt.

**US-2: Skills bestätigen, bearbeiten, ergänzen**
Als Nutzer möchte ich die bis zu 3 KI-vorgeschlagenen Skills einzeln bestätigen, ablehnen oder durch eigene Freitext-Skills ersetzen können, damit der Ping meine Intention genau widerspiegelt.

**US-3: Ping als „Erledigt" markieren**
Als Nutzer möchte ich einen Ping auf „Erledigt" (DONE) setzen, wenn mein Bedarf erfüllt ist, damit er keine neuen Match-Vorschläge mehr erhält — aber bisherige Matches noch einsehbar bleiben.

**US-4: Ping pausieren und fortsetzen**
Als Nutzer möchte ich einen Ping temporär pausieren und später wieder aktivieren, ohne meine bisherigen Matches zu verlieren.

**US-5: Ping löschen**
Als Nutzer möchte ich einen Ping dauerhaft löschen, damit er im System nicht mehr existiert und keine Matches mehr erzeugt.

**US-6: Klarer Überblick über meine Pings**
Als Nutzer möchte ich meine Pings nach Status (Aktiv / Pausiert / Erledigt) gefiltert sehen, damit ich den Überblick behalte.

**US-7: Starke Matches hervorheben**
Als Nutzer möchte ich nur Matches ab 50% Score in meiner Inbox sehen, damit ich nicht mit schwachen Vorschlägen überwältigt werde.

**US-8: Push-Benachrichtigung bei sehr starkem Match**
Als Nutzer möchte ich eine Push-/In-App-Benachrichtigung erhalten, wenn ein Match ≥ 75% gefunden wird, damit ich starke Matches sofort bemerke.

---

## Acceptance Criteria

### Ping-Modell
- [ ] Das Ping-Modell erweitert die bestehende `entries` Tabelle um die Felder: `specificity` (OPEN/SPECIFIC), `skill_ids[]` (max 3 UUIDs), `classification` (PEER/NEED/OFFER)
- [ ] Bestehende Entries (PROJ-1) sind nach der Migration valide Pings mit `specificity=OPEN`, `skill_ids=[]`, `classification` wird beim nächsten embed-Lauf gesetzt
- [ ] Ein Ping enthält mindestens: `raw_text`, `category`, `status`, `specificity`, `skill_ids[]`

### KI-Klassifikation (intern)
- [ ] Beim Erstellen/Bearbeiten eines Pings klassifiziert die KI (gpt-4o-mini) automatisch: `classification` ∈ {PEER, NEED, OFFER}
- [ ] Die KI bestimmt automatisch: `specificity` ∈ {OPEN, SPECIFIC} — SPECIFIC wenn mindestens ein konkreter Skill erkannt wird
- [ ] Die Klassifikation ist im UI **nicht sichtbar** — sie steuert nur das interne Matching
- [ ] Klassifikation läuft parallel zum Embedding in `embed-entry` (fire-and-forget, Nutzer wartet nicht)

### Skill-Vorschläge (KI + Nutzer)
- [ ] Nach der Texteingabe schlägt die KI bis zu 3 Skills vor (Freitext-Labels, z.B. „Badminton", „Python", „Möbel aufbauen")
- [ ] Der Nutzer kann jeden vorgeschlagenen Skill einzeln bestätigen (✓) oder ablehnen (✗)
- [ ] Der Nutzer kann eigene Skills per Freitext eingeben (bis max. 3 Skills gesamt)
- [ ] Skill-Vorschläge werden asynchron geladen — UI zeigt Ladezustand
- [ ] Ein Ping kann 0–3 Skills haben (0 = valide, Matching ist breiter)
- [ ] Skills werden in `entries.skill_ids` als Text-Array gespeichert (MVP: Freitext-Labels, keine UUID-Taxonomie)

### Lifecycle
- [ ] Mögliche Status-Übergänge:
  - ACTIVE → PAUSED (Nutzer pausiert)
  - PAUSED → ACTIVE (Nutzer reaktiviert)
  - ACTIVE | PAUSED → DONE (Nutzer markiert als erledigt)
  - ACTIVE | PAUSED | DONE → DELETED (Nutzer löscht; irreversibel)
- [ ] DELETED ist final: Ping wird nicht mehr angezeigt, zugehörige Matches werden auf `status=CANCELLED` gesetzt
- [ ] PAUSED/DONE: kein neues Matching wird für diesen Ping gestartet, bestehende Matches bleiben einsehbar
- [ ] DONE-Status ersetzt den bisherigen `closed`-Status in der DB
- [ ] Dashboard zeigt 3 Tabs: Aktiv / Pausiert / Erledigt

### Dashboard (Ersatz des Entry-Dashboards)
- [ ] Das bestehende Entry-Dashboard wird vollständig durch das Ping-Dashboard ersetzt
- [ ] Terminology im UI: „Ping" statt „Eintrag" (alle Labels, Toasts, leere Zustände)
- [ ] Jede Ping-Karte zeigt: Textvorschau, Kategorie, Skill-Labels (falls vorhanden), Match-Anzahl, Status-Actions
- [ ] Aktionen pro Ping: Bearbeiten, Pausieren/Reaktivieren, Als erledigt markieren, Löschen, Teilen
- [ ] Der FAB „Neuen Ping erstellen" navigiert zu `/onboarding/create` (wie bisher)

### Matching-Logik (erweitert)
- [ ] Matching berücksichtigt `classification` Kompatibilität:
  - PEER ↔ PEER: erlaubt (bevorzugt)
  - NEED ↔ OFFER: erlaubt (bevorzugt)
  - NEED ↔ NEED: nur bei `category = 'sport'` oder `'freizeit'` erlaubt
  - OFFER ↔ OFFER: standardmäßig nicht ausgespielt
- [ ] Scoring 0–100 mit Schwellenwerten:
  - ≥ 75: High Confidence → Push/In-App Benachrichtigung ausgelöst
  - 50–74: Normal → erscheint in Inbox/Feed, keine Push
  - < 50: nicht ausgespielt (kein Match-Eintrag erstellt)
- [ ] Skill-Overlap erhöht den Score: gleiche Skill-Labels (case-insensitive) = Bonus
- [ ] PAUSED/DONE Pings werden aus dem Candidate Pool für neues Matching ausgeschlossen
- [ ] DELETED Pings werden vollständig aus dem Candidate Pool entfernt

### Match-Detail-Seite
- [ ] Match-Detail `/matches/[id]` zeigt: Score % (unverändert), Partner-Profil, Partner-Ping-Text, eigener Ping-Text
- [ ] Zusätzlich: Skill-Labels beider Pings werden angezeigt (falls vorhanden)
- [ ] Reasons werden **nicht** angezeigt (intern only in PROJ-3)
- [ ] „Kontakt aufnehmen" bleibt deaktiviert (Platzhalter für zukünftige Feature)

---

## Edge Cases

**E-1: Vager Text, keine Skill-Vorschläge möglich**
→ KI gibt leeres Array zurück, Ping wird mit `skill_ids=[]` und `specificity=OPEN` gespeichert. Matching läuft, aber breiter.

**E-2: Nutzer lehnt alle KI-Skill-Vorschläge ab ohne eigene hinzuzufügen**
→ Valide, `skill_ids=[]`. Ping bleibt OPEN.

**E-3: Skill-Vorschlag-API schlägt fehl (Netzwerkfehler)**
→ Ping wird trotzdem ohne Skills gespeichert. Toast: „Skills konnten nicht geladen werden. Du kannst sie später hinzufügen." Ping ist vollständig funktional.

**E-4: Nutzer hat einen Ping in PAUSED und bekommt einen neuen High-Confidence Match**
→ Laut Konzept wird PAUSED nicht neu gematcht. Da der Partner-Ping aber ACTIVE ist, wird kein neuer Match für diesen PAUSED-Ping erzeugt. Bestehende Matches bleiben sichtbar.

**E-5: Migration bestehender Entries**
→ Alle bestehenden `entries` mit `intent = 'seek'` → `classification = NEED` (Näherung); `intent = 'offer'` → `classification = OFFER`; `intent = 'pending'` → wird bei nächstem embed-Lauf klassifiziert. `specificity = OPEN`, `skill_ids = []` für alle.

**E-6: Nutzer löscht seinen Account**
→ Alle Pings werden DELETED, alle Matches werden CANCELLED (wird durch Supabase RLS + Cascade gehandhabt).

**E-7: Max 3 Skills überschritten**
→ UI verhindert das Hinzufügen des 4. Skills. Button ist deaktiviert, Tooltip: „Max. 3 Skills pro Ping".

**E-8: Duplicate Ping-Erkennung**
→ Wenn ein Nutzer in 24h einen Ping mit >90% textlicher Ähnlichkeit in gleicher Kategorie erstellt, zeigt die App eine Warnung: „Du hast bereits einen ähnlichen Ping. Möchtest du den bestehenden bearbeiten?" (kein Hard-Block in PROJ-3).

---

## Technical Requirements

- **Performance:** Skill-Vorschläge erscheinen innerhalb von 3s nach Texteingabe (asynchron, non-blocking)
- **KI-Klassifikation:** Läuft in `embed-entry` Edge Function parallel zum Embedding (fire-and-forget)
- **Score-Schwellenwerte:** Konfigurierbar via Edge Function Umgebungsvariable (Standard: HIGH=0.75, LOW=0.50)
- **Migration:** Ein einmaliger SQL-Befehl migriert bestehende Entries auf das neue Schema (kein Datenverlust)
- **Rückwärtskompatibilität:** Die `find_new_matches` SQL-Funktion wird um classification-Filter erweitert
- **Auth:** Alle Ping-Mutations benötigen authentifizierten User (RLS bleibt unverändert)
- **Browser:** Mobile-first, min. iOS Safari 16 + Chrome 112+

---

## Geplante Folge-Features

| PROJ | Feature | Abhängigkeit |
|------|---------|-------------|
| PROJ-4 | Skill-Taxonomie (Hierarchie, Familien, Synonyme, DB-Tabelle) | PROJ-3 |
| PROJ-5 | OPEN-Refinement Flow (KI fragt nach konkreterem Skill) | PROJ-3, PROJ-4 |
| PROJ-6 | Geo-Matching (lat/lon, Radius-Filter) | PROJ-3 |

---

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
