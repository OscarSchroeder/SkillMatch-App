"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Logo } from "@/components/logo"
import { useLang } from "@/contexts/language-context"
import { createClient } from "@/lib/supabase-browser"
import { Plus, Share2, Pause, Play, Trash2, Info, LogOut } from "lucide-react"
import { toast } from "sonner"

type Entry = {
  id: string
  raw_text: string
  category: string
  status: "active" | "paused" | "closed"
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLang()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const fetchEntries = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) setEntries(data)
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
          0 {t.dashboard.match_label}
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
        <button
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t.dashboard.logout}
        >
          <LogOut className="w-5 h-5" />
        </button>
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
    </main>
  )
}
