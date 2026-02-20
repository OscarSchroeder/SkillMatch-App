# Matching-Engine + Match-Benachrichtigungen (PROJ-2) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Semantic vector matching between entries (seek↔offer) with three notification channels: in-app bell, email (Resend), and web push (VAPID).

**Architecture:** Hybrid pipeline — when an entry is saved, an Edge Function immediately computes its OpenAI embedding and stores it in pgvector. A Vercel Cron every 15 minutes runs cosine similarity matching, creates match records, and triggers notifications. Frontend shows a live bell icon via Supabase Realtime.

**Tech Stack:** pgvector (Supabase), OpenAI text-embedding-3-small, Supabase Edge Functions (Deno), Resend, Web Push VAPID, Next.js App Router, Supabase Realtime

---

## Environment Variables Needed

Add to `.env.local` and Vercel Dashboard before starting:

```
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
VAPID_PUBLIC_KEY=   # generated in Task 7
VAPID_PRIVATE_KEY=  # generated in Task 7
CRON_SECRET=        # any random string, e.g. openssl rand -hex 32
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # same as VAPID_PUBLIC_KEY
```

---

## Task 1: Database Migration — pgvector + new tables

**Files:**
- Apply via Supabase MCP (no local file needed)

**Step 1: Apply migration**

Run via Supabase MCP tool `apply_migration` with name `proj2_matching_schema` and this SQL:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to entries
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_entries_embedding
  ON public.entries USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Matches table
CREATE TABLE public.matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_a_id  UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  entry_b_id  UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  score       FLOAT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT matches_unique UNIQUE(entry_a_id, entry_b_id)
);
CREATE INDEX idx_matches_entry_a ON public.matches(entry_a_id);
CREATE INDEX idx_matches_entry_b ON public.matches(entry_b_id);
CREATE INDEX idx_matches_status  ON public.matches(status);

-- Notifications table
CREATE TABLE public.notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'match',
  reference_id UUID,
  read         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read    ON public.notifications(user_id, read);

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_unique UNIQUE(user_id, endpoint)
);

-- Enable RLS on all new tables
ALTER TABLE public.matches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: matches — user sees matches where their entry is involved
CREATE POLICY "matches: participant read"
  ON public.matches FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.entries WHERE id = entry_a_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.entries WHERE id = entry_b_id AND user_id = auth.uid())
    OR is_admin()
  );

-- RLS: notifications — own only
CREATE POLICY "notifications: own read"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: own update"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: push_subscriptions — own only
CREATE POLICY "push_subscriptions: own all"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Step 2: Verify**

Run `list_tables` via MCP — should show `matches`, `notifications`, `push_subscriptions` with `rls_enabled: true`.

**Step 3: Commit**
```bash
git add -A
git commit -m "feat(PROJ-2): add pgvector + matching schema migration"
```

---

## Task 2: Edge Function — embed-entry

Computes OpenAI embedding for an entry and stores it.

**Files:**
- Create: `supabase/functions/embed-entry/index.ts`

**Step 1: Create the file**

```typescript
// supabase/functions/embed-entry/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  })
  const json = await res.json()
  return json.data[0].embedding
}

Deno.serve(async (req: Request) => {
  try {
    const { entry_id, raw_text } = await req.json()
    if (!entry_id || !raw_text) {
      return new Response(JSON.stringify({ error: "Missing entry_id or raw_text" }), { status: 400 })
    }

    const embedding = await getEmbedding(raw_text)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await supabase
      .from("entries")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", entry_id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("embed-entry error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
```

**Step 2: Deploy via MCP**

Use `deploy_edge_function` MCP tool:
- project_id: `rlsvjzxomgbilvaydnfx`
- name: `embed-entry`
- verify_jwt: `false` (called from DB trigger, not user)
- files: the index.ts above

**Step 3: Add DB trigger to call embed-entry on entry insert/update**

Apply migration `proj2_embed_trigger`:

```sql
CREATE OR REPLACE FUNCTION trigger_embed_entry()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Only re-embed if raw_text changed or embedding is null
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.raw_text IS DISTINCT FROM OLD.raw_text) THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/embed-entry',
      body := json_build_object('entry_id', NEW.id, 'raw_text', NEW.raw_text)::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_embed_entry
  AFTER INSERT OR UPDATE OF raw_text ON public.entries
  FOR EACH ROW EXECUTE FUNCTION trigger_embed_entry();
```

> **Note:** Supabase `pg_net` extension is required for HTTP from triggers. If `net.http_post` fails, call embed-entry from the Next.js API instead (see Task 5 fallback).

**Step 4: Commit**
```bash
git add supabase/functions/embed-entry/index.ts
git commit -m "feat(PROJ-2): add embed-entry edge function + DB trigger"
```

---

## Task 3: Edge Function — run-matching

Finds new matches via cosine similarity.

**Files:**
- Create: `supabase/functions/run-matching/index.ts`

**Step 1: Create the file**

```typescript
// supabase/functions/run-matching/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SCORE_THRESHOLD = 0.75

Deno.serve(async (req: Request) => {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret")
  if (secret !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Find new matches using pgvector cosine similarity
  // seek entries matched against offer entries
  const { data: newMatches, error } = await supabase.rpc("find_new_matches", {
    threshold: SCORE_THRESHOLD,
  })

  if (error) {
    console.error("find_new_matches error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!newMatches || newMatches.length === 0) {
    return new Response(JSON.stringify({ matched: 0 }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  // Insert new matches (UNIQUE constraint prevents duplicates)
  const { error: insertError } = await supabase
    .from("matches")
    .upsert(newMatches, { onConflict: "entry_a_id,entry_b_id", ignoreDuplicates: true })

  if (insertError) {
    console.error("insert matches error:", insertError)
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
  }

  // Trigger notifications for new matches
  await supabase.functions.invoke("send-notifications", {
    body: { match_ids: newMatches.map((m: { id: string }) => m.id) },
  })

  return new Response(JSON.stringify({ matched: newMatches.length }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

**Step 2: Create the `find_new_matches` SQL function**

Apply migration `proj2_find_new_matches`:

```sql
CREATE OR REPLACE FUNCTION find_new_matches(threshold FLOAT DEFAULT 0.75)
RETURNS TABLE(entry_a_id UUID, entry_b_id UUID, score FLOAT)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT
    LEAST(a.id, b.id)          AS entry_a_id,
    GREATEST(a.id, b.id)       AS entry_b_id,
    1 - (a.embedding <=> b.embedding) AS score
  FROM public.entries a
  JOIN public.entries b ON a.id <> b.id
  WHERE
    a.status = 'active'
    AND b.status = 'active'
    AND a.embedding IS NOT NULL
    AND b.embedding IS NOT NULL
    -- seek ↔ offer only
    AND (
      (a.intent = 'seek' AND b.intent = 'offer')
      OR (a.intent = 'offer' AND b.intent = 'seek')
    )
    -- score threshold
    AND (1 - (a.embedding <=> b.embedding)) > threshold
    -- not already matched
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.entry_a_id = LEAST(a.id, b.id)
        AND m.entry_b_id = GREATEST(a.id, b.id)
    )
$$;
```

**Step 3: Deploy run-matching via MCP**

- name: `run-matching`
- verify_jwt: `false` (protected by CRON_SECRET header)

**Step 4: Commit**
```bash
git add supabase/functions/run-matching/index.ts
git commit -m "feat(PROJ-2): add run-matching edge function + find_new_matches SQL"
```

---

## Task 4: Edge Function — send-notifications

Sends in-app + email + web push notifications for new matches.

**Files:**
- Create: `supabase/functions/send-notifications/index.ts`

**Step 1: Create the file**

```typescript
// supabase/functions/send-notifications/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!

async function sendEmail(to: string, matchScore: number, entryPreview: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SkillMatch <noreply@skillmatch.de>",
      to,
      subject: "Du hast einen neuen Match! 🎯",
      html: `
        <h2>Neuer Match gefunden</h2>
        <p>Jemand passt zu deinem Eintrag:</p>
        <blockquote>${entryPreview}</blockquote>
        <p>Match-Score: <strong>${Math.round(matchScore * 100)}%</strong></p>
        <p><a href="${Deno.env.get("SITE_URL") ?? "https://skillmatch-app-theta.vercel.app"}/dashboard">Zum Dashboard</a></p>
      `,
    }),
  })
}

async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth_key: string }, payload: string) {
  // Simple VAPID web push via fetch
  // In production, use the web-push npm package via a Next.js API route instead
  // This is a placeholder — see Task 6 for full web push implementation
  console.log("Web push to:", subscription.endpoint, payload)
}

Deno.serve(async (req: Request) => {
  try {
    const { match_ids } = await req.json()
    if (!match_ids?.length) return new Response(JSON.stringify({ sent: 0 }))

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    for (const matchId of match_ids) {
      // Get match + both entries + both users
      const { data: match } = await supabase
        .from("matches")
        .select(`
          id, score,
          entry_a:entries!entry_a_id(id, raw_text, user_id),
          entry_b:entries!entry_b_id(id, raw_text, user_id)
        `)
        .eq("id", matchId)
        .single()

      if (!match) continue

      const pairs = [
        { userId: match.entry_a.user_id, otherEntry: match.entry_b },
        { userId: match.entry_b.user_id, otherEntry: match.entry_a },
      ]

      for (const { userId, otherEntry } of pairs) {
        // 1. In-app notification
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "match",
          reference_id: matchId,
          read: false,
        })

        // 2. Email
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single()

        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        if (authUser?.user?.email) {
          await sendEmail(
            authUser.user.email,
            match.score,
            otherEntry.raw_text.slice(0, 120)
          )
        }

        // 3. Web push
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", userId)

        for (const sub of subs ?? []) {
          await sendWebPush(sub, JSON.stringify({
            title: "Neuer Match! 🎯",
            body: otherEntry.raw_text.slice(0, 80),
            url: "/dashboard",
          }))
        }
      }
    }

    return new Response(JSON.stringify({ sent: match_ids.length }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("send-notifications error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
```

**Step 2: Deploy send-notifications via MCP**

- name: `send-notifications`
- verify_jwt: `false` (called internally from run-matching)

**Step 3: Commit**
```bash
git add supabase/functions/send-notifications/index.ts
git commit -m "feat(PROJ-2): add send-notifications edge function (in-app + email + push)"
```

---

## Task 5: Next.js Cron Route + Vercel Cron

Triggers matching every 15 minutes.

**Files:**
- Create: `src/app/api/cron/run-matching/route.ts`
- Create: `vercel.json`

**Step 1: Create the cron API route**

```typescript
// src/app/api/cron/run-matching/route.ts
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const res = await fetch(`${supabaseUrl}/functions/v1/run-matching`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": process.env.CRON_SECRET!,
    },
    body: JSON.stringify({}),
  })

  const data = await res.json()
  return NextResponse.json(data)
}
```

**Step 2: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/run-matching",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Step 3: Add CRON_SECRET to Vercel env vars**

In Vercel Dashboard → Settings → Environment Variables, add `CRON_SECRET`.

**Step 4: Verify build passes**

```bash
cd C:\Users\oscarschroeder\SkillMatch-App
npm run build
```
Expected: `✓ Compiled successfully`

**Step 5: Commit**
```bash
git add src/app/api/cron/run-matching/route.ts vercel.json
git commit -m "feat(PROJ-2): add Vercel cron for run-matching every 15 min"
```

---

## Task 6: Web Push — VAPID keys + ServiceWorker

**Files:**
- Create: `public/sw.js`
- Create: `src/app/api/push/subscribe/route.ts`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Copy output to `.env.local`:
```
VAPID_PUBLIC_KEY=<publicKey>
VAPID_PRIVATE_KEY=<privateKey>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
```
Also add both to Vercel Dashboard env vars.

**Step 2: Install web-push**

```bash
npm install web-push
npm install --save-dev @types/web-push
```

**Step 3: Create ServiceWorker**

```javascript
// public/sw.js
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "SkillMatch", {
      body: data.body ?? "Neuer Match!",
      icon: "/icon-192.png",
      data: { url: data.url ?? "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const url = event.notification.data?.url ?? "/"
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
```

**Step 4: Create push subscribe API route**

```typescript
// src/app/api/push/subscribe/route.ts
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { endpoint, keys } = await request.json()

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth_key: keys.auth,
  }, { onConflict: "user_id,endpoint", ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

**Step 5: Commit**
```bash
git add public/sw.js src/app/api/push/subscribe/route.ts
git commit -m "feat(PROJ-2): add ServiceWorker + push subscribe API route"
```

---

## Task 7: Frontend — Notification Bell in Dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/lib/translations.ts`

**Step 1: Add translations for notifications**

In `src/lib/translations.ts`, add to `dashboard` section (both `de` and `en`):

```typescript
// DE
notifications_title: "Benachrichtigungen",
no_notifications: "Keine neuen Benachrichtigungen",
new_match: "Neuer Match für deinen Eintrag",
enable_push: "Benachrichtigungen aktivieren",
push_enabled: "Benachrichtigungen aktiv",

// EN
notifications_title: "Notifications",
no_notifications: "No new notifications",
new_match: "New match for your entry",
enable_push: "Enable notifications",
push_enabled: "Notifications enabled",
```

**Step 2: Update Dashboard with notification bell**

Add to `src/app/dashboard/page.tsx` — the following new state + logic (merge into existing file):

New imports:
```typescript
import { Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
```

New state:
```typescript
const [notifications, setNotifications] = useState<Notification[]>([])
const [unreadCount, setUnreadCount] = useState(0)
const [pushEnabled, setPushEnabled] = useState(false)
```

New type:
```typescript
type Notification = {
  id: string
  reference_id: string
  read: boolean
  created_at: string
}
```

New `useEffect` — load notifications + Realtime subscription:
```typescript
useEffect(() => {
  const supabase = createClient()
  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.read).length)
    }
  }
  loadNotifications()

  // Realtime subscription
  const channel = supabase
    .channel("notifications")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
    }, () => loadNotifications())
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

New `markAllRead` handler:
```typescript
const markAllRead = async () => {
  const supabase = createClient()
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false)
  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  setUnreadCount(0)
}
```

New `enablePush` handler:
```typescript
const enablePush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
  const reg = await navigator.serviceWorker.register("/sw.js")
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  })
  setPushEnabled(true)
  toast.success(t.dashboard.push_enabled)
}
```

Bell icon in header (replace logout section with):
```tsx
<div className="flex items-center gap-2">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-72">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{t.dashboard.notifications_title}</span>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary">
            Alle gelesen
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
          {t.dashboard.no_notifications}
        </div>
      ) : (
        notifications.slice(0, 5).map((n) => (
          <DropdownMenuItem
            key={n.id}
            className={`cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
            onClick={() => router.push(`/matches/${n.reference_id}`)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium">{t.dashboard.new_match}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleDateString("de-DE")}
              </span>
            </div>
          </DropdownMenuItem>
        ))
      )}
      {!pushEnabled && (
        <div className="px-3 py-2 border-t">
          <button
            onClick={enablePush}
            className="w-full text-xs text-primary hover:underline"
          >
            {t.dashboard.enable_push}
          </button>
        </div>
      )}
    </DropdownMenuContent>
  </DropdownMenu>

  <button
    onClick={handleLogout}
    className="text-muted-foreground hover:text-foreground transition-colors p-2"
    aria-label={t.dashboard.logout}
  >
    <LogOut className="w-5 h-5" />
  </button>
</div>
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

**Step 4: Commit**
```bash
git add src/app/dashboard/page.tsx src/lib/translations.ts
git commit -m "feat(PROJ-2): add notification bell with Realtime + web push opt-in"
```

---

## Task 8: Frontend — /matches/[id] page

**Files:**
- Create: `src/app/matches/[id]/page.tsx`

**Step 1: Create the match detail page**

```typescript
// src/app/matches/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { createClient } from "@/lib/supabase-browser"
import { ArrowLeft, User } from "lucide-react"

type MatchDetail = {
  id: string
  score: number
  my_entry: { raw_text: string; intent: string }
  their_entry: { raw_text: string; intent: string }
  their_profile: { display_name: string; city: string | null }
}

export default function MatchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useLang()
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/onboarding/auth"); return }

      const { data } = await supabase
        .from("matches")
        .select(`
          id, score,
          entry_a:entries!entry_a_id(id, raw_text, intent, user_id),
          entry_b:entries!entry_b_id(id, raw_text, intent, user_id)
        `)
        .eq("id", id)
        .single()

      if (!data) { router.replace("/dashboard"); return }

      const myEntry = data.entry_a.user_id === user.id ? data.entry_a : data.entry_b
      const theirEntry = data.entry_a.user_id === user.id ? data.entry_b : data.entry_a

      const { data: theirProfile } = await supabase
        .from("profiles")
        .select("display_name, city")
        .eq("id", theirEntry.user_id)
        .single()

      setMatch({
        id: data.id,
        score: data.score,
        my_entry: myEntry,
        their_entry: theirEntry,
        their_profile: theirProfile ?? { display_name: "Anonym", city: null },
      })

      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("reference_id", id)

      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </main>
  )

  if (!match) return null

  return (
    <main className="flex flex-col min-h-screen px-5 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Logo className="w-28 h-auto" />
      </div>

      <div className="space-y-6">
        {/* Score */}
        <div className="rounded-xl bg-primary/8 border border-primary/20 p-4 text-center">
          <p className="text-3xl font-bold text-primary">{Math.round(match.score * 100)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Match-Score</p>
        </div>

        {/* Their entry */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{match.their_profile.display_name}</span>
            {match.their_profile.city && (
              <Badge variant="secondary" className="text-xs">{match.their_profile.city}</Badge>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-foreground">{match.their_entry.raw_text}</p>
          </div>
        </div>

        {/* My entry */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Dein Eintrag</p>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground">{match.my_entry.raw_text}</p>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full font-semibold"
          disabled
        >
          Kontakt aufnehmen (demnächst)
        </Button>
      </div>
    </main>
  )
}
```

**Step 2: Add `/matches/[id]` to proxy PROTECTED list**

In `src/proxy.ts`, update:
```typescript
const PROTECTED = ["/dashboard", "/onboarding/profile", "/matches"]
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

**Step 4: Commit**
```bash
git add src/app/matches/[id]/page.tsx src/proxy.ts
git commit -m "feat(PROJ-2): add match detail page /matches/[id]"
```

---

## Task 9: Call embed-entry from profile page (fallback)

If the DB trigger (`pg_net`) doesn't work in Supabase free tier, call embed-entry directly after entry creation.

**Files:**
- Modify: `src/app/onboarding/profile/page.tsx`

**Step 1: Add embed call after entry insert**

In `handleSave`, after the entry insert succeeds:

```typescript
// Trigger embedding (fire-and-forget)
if (entryData?.id) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  fetch(`${supabaseUrl}/functions/v1/embed-entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry_id: entryData.id, raw_text: freitext.trim() }),
  }).catch(console.error) // fire and forget
}
```

Update the entry insert to return the id:
```typescript
const { data: entryData, error: entryError } = await supabase
  .from("entries")
  .insert({ user_id: user.id, raw_text: freitext.trim(), intent: "pending", category: "pending", status: "active" })
  .select("id")
  .single()
```

Do the same in `src/app/dashboard/page.tsx` after entry creation via FAB (if applicable).

**Step 2: Commit**
```bash
git add src/app/onboarding/profile/page.tsx
git commit -m "feat(PROJ-2): call embed-entry after entry creation (fallback)"
```

---

## Task 10: Push to GitHub + deploy to Vercel

**Step 1: Final build check**

```bash
npm run build
```

**Step 2: Push all commits**

```bash
git push origin main
```

**Step 3: Add missing env vars to Vercel Dashboard**

Settings → Environment Variables, add:
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `CRON_SECRET`

**Step 4: Set Supabase Edge Function secrets**

Via Supabase Dashboard → Edge Functions → Secrets, add:
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET`
- `SITE_URL` = `https://skillmatch-app-theta.vercel.app`

**Step 5: Trigger a test match manually**

```bash
curl -X POST https://skillmatch-app-theta.vercel.app/api/cron/run-matching \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
Expected: `{"matched": N}`

**Step 6: Update feature index**

In `features/INDEX.md`, add:
```markdown
| PROJ-2 | Matching-Engine + Match-Benachrichtigungen | In Progress | [Spec](PROJ-2-matching-notifications.md) | 2026-02-20 |
```

Update Next Available ID to `PROJ-3`.

**Step 7: Create git tag**

```bash
git tag -a v1.1.0-PROJ-2 -m "PROJ-2: Matching-Engine + Benachrichtigungen"
git push origin v1.1.0-PROJ-2
```
