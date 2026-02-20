# Design: Matching-Engine + Match-Benachrichtigungen (PROJ-2)

**Datum:** 2026-02-20
**Status:** Approved
**Feature-ID:** PROJ-2

---

## Zusammenfassung

Semantic Matching via pgvector (OpenAI Embeddings) + drei Benachrichtigungskanäle (In-App, E-Mail via Resend, Web Push). Hybrid-Architektur: Embedding sofort bei Eintrag-Erstellung, Matching-Run alle 15 Minuten per Cron.

---

## Entscheidungen

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Matching-Strategie | Semantic Search (pgvector) | Beste Qualität für Freitext-basiertes Matching |
| Embedding-Modell | OpenAI text-embedding-3-small | Gute Qualität, günstig, einfache API |
| E-Mail-Provider | Resend | Developer-freundlich, 3.000 Mails/Monat gratis |
| Notification-Kanäle | In-App + E-Mail + Web Push | Maximale Reichweite |
| Pipeline-Ansatz | Hybrid (Event + Cron) | Skalierbar, embedding sofort verfügbar für Cron |

---

## Datenbankschema

### Änderungen an bestehenden Tabellen

```sql
-- pgvector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- entries: embedding Spalte
ALTER TABLE entries ADD COLUMN embedding vector(1536);
CREATE INDEX idx_entries_embedding ON entries USING ivfflat (embedding vector_cosine_ops);
```

### Neue Tabellen

```sql
-- Matches zwischen zwei Einträgen
CREATE TABLE matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_a_id  UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  entry_b_id  UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  score       FLOAT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entry_a_id, entry_b_id)
);

-- In-App Notifications
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'match',
  reference_id UUID,  -- match_id
  read         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Web Push Subscriptions
CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```

### RLS Policies
- `matches`: Nutzer sieht Matches wo sein Eintrag beteiligt ist
- `notifications`: Nutzer sieht nur eigene Notifications
- `push_subscriptions`: Nutzer verwaltet nur eigene Subscriptions

---

## Matching-Pipeline

```
[1. Embedding — Event-driven]
Eintrag INSERT/UPDATE (raw_text)
  → Supabase DB Trigger
  → Edge Function: embed-entry
  → POST https://api.openai.com/v1/embeddings (text-embedding-3-small)
  → entries.embedding = vector(1536)

[2. Matching — Cron alle 15 Min]
Vercel Cron → POST /api/cron/run-matching
  → Edge Function: run-matching
  → SELECT entries WHERE status='active' AND embedding IS NOT NULL
  → pgvector: cosine_similarity(a.embedding, b.embedding) > 0.75
  → Filter: a.intent='seek' AND b.intent='offer' (oder umgekehrt)
  → INSERT INTO matches (dedupliziert via UNIQUE constraint)

[3. Notifications — nach Matching]
  → INSERT INTO notifications (In-App)
  → Resend API: Match-E-Mail an Nutzer
  → Web Push: VAPID-Notification an subscribed Geräte
```

### Matching-Regeln
- Score-Threshold: `cosine_similarity > 0.75`
- Intent-Filter: seek ↔ offer (keine seek↔seek, offer↔offer Matches)
- Status-Filter: nur `status = 'active'` Einträge
- Duplikat-Schutz: UNIQUE(entry_a_id, entry_b_id) — kleinere UUID immer in entry_a

---

## Supabase Edge Functions

| Function | Trigger | Aufgabe |
|---|---|---|
| `embed-entry` | DB Trigger auf entries (INSERT/UPDATE) | OpenAI Embedding berechnen, in entries.embedding speichern |
| `run-matching` | Vercel Cron (alle 15 Min) | pgvector Matching, matches anlegen |
| `send-notifications` | Aufgerufen von run-matching | E-Mail via Resend + Web Push via VAPID |

---

## Frontend-Änderungen

### Dashboard
- Bell-Icon (Lucide `Bell`) im Header mit rotem Badge (Anzahl ungelesene)
- Notification-Dropdown: Liste der letzten Matches mit Zeitstempel
- Klick auf Notification → `/matches/[id]`
- Supabase Realtime-Subscription auf `notifications` für Live-Updates

### Neuer Screen: `/matches/[id]`
- Zeigt Match-Partner (display_name, Stadt)
- Zeigt ihren Eintrag (raw_text)
- Zeigt Match-Score als Balken
- CTA: "Kontakt aufnehmen" (Phase 3: Chat)
- Schreibt `notifications.read = true` beim Öffnen

### Web Push Setup
- `public/sw.js` — ServiceWorker für Push-Events
- Opt-in Button im Dashboard: "Benachrichtigungen aktivieren"
- Speichert PushSubscription-Objekt in `push_subscriptions`

---

## Neue Umgebungsvariablen

```
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
CRON_SECRET=...  (zum Absichern des /api/cron/* Endpoints)
```

---

## Neue Abhängigkeiten

```
resend           # E-Mail
web-push         # VAPID Web Push
openai           # Embeddings (oder direkter fetch)
```

---

## Error Handling

| Fehler | Verhalten |
|---|---|
| OpenAI API down | Retry 3x mit exponential backoff, dann `embedding = NULL` lassen |
| Resend Fehler | Log, kein Retry (non-critical) |
| Web Push endpoint expired | Subscription aus DB löschen (410 Gone Response) |
| Cron doppelt ausgelöst | UNIQUE constraint auf matches verhindert Duplikate |
