"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { createClient } from "@/lib/supabase-browser"
import { Plus, Share2, Pause, Play, Trash2, Info, LogOut, Pencil, Bell } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Entry = {
  id: string
  raw_text: string
  category: string
  status: "active" | "paused" | "closed"
  created_at: string
}

type Notification = {
  id: string
  reference_id: string
  read: boolean
  created_at: string
}

const MAX_CHARS = 500

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLang()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [editText, setEditText] = useState("")
  const [saving, setSaving] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/onboarding/create")
        return
      }
      fetchEntries()
    })
  }, [router])

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
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      }
    }
    loadNotifications()

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

  const fetchEntries = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) {
      setEntries(data)
      if (data.length > 0) {
        const ids = data.map((e: Entry) => e.id)
        const { data: matchRows } = await supabase
          .from("matches")
          .select("entry_a_id, entry_b_id")
          .or(`entry_a_id.in.(${ids.join(",")}),entry_b_id.in.(${ids.join(",")})`)
        const counts: Record<string, number> = {}
        for (const m of matchRows ?? []) {
          counts[m.entry_a_id] = (counts[m.entry_a_id] ?? 0) + 1
          counts[m.entry_b_id] = (counts[m.entry_b_id] ?? 0) + 1
        }
        setMatchCounts(counts)
      }
    }
    setLoading(false)
  }

  const handlePauseResume = async (entry: Entry) => {
    const supabase = createClient()
    const newStatus = entry.status === "active" ? "paused" : "active"
    const { error } = await supabase
      .from("entries")
      .update({ status: newStatus })
      .eq("id", entry.id)
    if (error) { toast.error(t.errors.save_failed); return }
    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: newStatus } : e))
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from("entries").delete().eq("id", id)
    if (error) { toast.error(t.errors.save_failed); setDeletingId(null); return }
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setDeletingId(null)
  }

  const handleShare = async (entry: Entry) => {
    const text = entry.raw_text.slice(0, 100)
    if (navigator.share) {
      await navigator.share({ title: "SkillMatch", text, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link kopiert!")
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem("skillmatch_splash_seen")
    router.replace("/")
  }

  const markAllRead = async () => {
    const supabase = createClient()
    await supabase.from("notifications").update({ read: true }).eq("read", false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const enablePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    try {
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
    } catch {
      toast.error(t.errors.network)
    }
  }

  const openEdit = (entry: Entry) => {
    setEditEntry(entry)
    setEditText(entry.raw_text)
  }

  const handleSaveEdit = async () => {
    if (!editEntry || editText.trim().length < 10) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase
      .from("entries")
      .update({ raw_text: editText.trim() })
      .eq("id", editEntry.id)
      .eq("user_id", user.id)
    setSaving(false)
    if (error) { toast.error(t.errors.save_failed); return }
    setEntries((prev) =>
      prev.map((e) => e.id === editEntry.id ? { ...e, raw_text: editText.trim() } : e)
    )
    setEditEntry(null)
    toast.success(t.dashboard.edit_saved)
  }

  const filterEntries = (status: Entry["status"]) => entries.filter((e) => e.status === status)

  const EmptyState = ({ msg }: { msg: string }) => (
    <div className="text-center py-12 text-muted-foreground text-sm">{msg}</div>
  )

  const EntryCard = ({ entry }: { entry: Entry }) => (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-foreground line-clamp-2 flex-1">
          {entry.raw_text}
        </p>
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {entry.category === "pending" ? t.dashboard.category_pending : entry.category}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {matchCounts[entry.id] ?? 0} {t.dashboard.match_label}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => handleShare(entry)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label={t.dashboard.actions.share}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEdit(entry)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label={t.dashboard.actions.edit}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePauseResume(entry)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label={entry.status === "active" ? t.dashboard.actions.pause : t.dashboard.actions.resume}
          >
            {entry.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              if (confirm(t.dashboard.delete_confirm)) handleDelete(entry.id)
            }}
            disabled={deletingId === entry.id}
            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            aria-label={t.dashboard.actions.delete}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <main className="flex flex-col min-h-screen px-5 py-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Logo className="w-32 h-auto" />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label={t.dashboard.notifications_title}>
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
      </div>

      {/* Info Banner */}
      <div className="rounded-xl bg-primary/8 border border-primary/20 p-4 mb-6 space-y-1">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-foreground">{t.dashboard.banner_1}</p>
            <p className="text-xs text-muted-foreground">{t.dashboard.banner_2}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="flex-1">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="active" className="flex-1">{t.dashboard.tabs.active}</TabsTrigger>
          <TabsTrigger value="paused" className="flex-1">{t.dashboard.tabs.paused}</TabsTrigger>
          <TabsTrigger value="closed" className="flex-1">{t.dashboard.tabs.closed}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filterEntries("active").length === 0 ? (
            <EmptyState msg={t.dashboard.empty_active} />
          ) : (
            filterEntries("active").map((e) => <EntryCard key={e.id} entry={e} />)
          )}
        </TabsContent>

        <TabsContent value="paused" className="space-y-3">
          {filterEntries("paused").length === 0 ? (
            <EmptyState msg={t.dashboard.empty_paused} />
          ) : (
            filterEntries("paused").map((e) => <EntryCard key={e.id} entry={e} />)
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-3">
          {filterEntries("closed").length === 0 ? (
            <EmptyState msg={t.dashboard.empty_closed} />
          ) : (
            filterEntries("closed").map((e) => <EntryCard key={e.id} entry={e} />)
          )}
        </TabsContent>
      </Tabs>

      {/* FAB – New Entry */}
      <div className="sticky bottom-6 flex justify-end mt-6">
        <Button
          size="lg"
          className="rounded-full shadow-lg px-6 font-semibold"
          onClick={() => router.push("/onboarding/create")}
        >
          <Plus className="w-5 h-5 mr-1" />
          {t.dashboard.new_entry}
        </Button>
      </div>

      {/* Edit Sheet */}
      <Sheet open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle>{t.dashboard.actions.edit}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, MAX_CHARS))}
              rows={5}
              className="text-base resize-none"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{editText.trim().length < 10 ? t.dashboard.edit_min_chars : ""}</span>
              <span>{editText.length}/{MAX_CHARS}</span>
            </div>
            <Button
              className="w-full font-semibold"
              onClick={handleSaveEdit}
              disabled={saving || editText.trim().length < 10}
            >
              {saving ? "…" : t.dashboard.edit_save}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}
