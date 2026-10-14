import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ShieldCheck, EyeOff, AlertTriangle, Layers } from "lucide-react";

interface Capability {
  name: string;
  domain: string;
  description_en: string;
  endpoint: string | null;
  http_method: string | null;
  risk_level: string;
  exposure_state: string;
  source: string;
  stale: boolean;
}

interface DomainRow {
  domain: string;
  total: number;
  active: number;
  draft: number;
  hidden: number;
  tracked: number;
  writes: number;
}

const stateBadge = (state: string) => {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    tracked: "bg-muted/40 text-muted-foreground border border-border/60",
    hidden: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  };
  return map[state] || "bg-muted/40 text-muted-foreground border border-border/60";
};

export default function CapabilityCoveragePage() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "active" | "stale">("draft");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data }: { data: { success: boolean; error?: string; domains?: DomainRow[]; capabilities?: Capability[] } } =
        await apiClient.get("/capability-catalog");
      if (data.success) {
        setDomains(data.domains || []);
        setCapabilities(data.capabilities || []);
      } else setError(data.error || "فشل التحميل");
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (name: string, action: "activate" | "hide") => {
    setBusy(name);
    try {
      const { data }: { data: { success: boolean } } =
        await apiClient.post(`/capability-catalog/${encodeURIComponent(name)}/${action}`, { roles: ["STORE_MANAGER"] });
      if (data.success) await load();
    } finally {
      setBusy(null);
    }
  };

  const visible = capabilities.filter((c) => {
    if (filter === "draft") return c.exposure_state === "draft";
    if (filter === "active") return c.exposure_state === "active";
    if (filter === "stale") return c.stale;
    return true;
  });

  const totalCapabilities = capabilities.length;
  const activeCount = capabilities.filter((c) => c.exposure_state === "active").length;
  const draftCount = capabilities.filter((c) => c.exposure_state === "draft").length;
  const staleCount = capabilities.filter((c) => c.stale).length;

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="border-b border-border/80 bg-card px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h1 className="text-sm sm:text-base font-bold text-foreground">كتالوج قدرات وتغطية الوكلاء الذكية</h1>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 text-xs h-8">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Telemetry Chassis */}
        <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">إجمالي القدرات المسجلة</span>
              <span className="font-semibold text-foreground tabular-nums font-mono">{totalCapabilities}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">القدرات المفعّلة</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">{activeCount}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">مسودات قيد المراجعة</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums font-mono">{draftCount}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">مسارات متوقفة</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums font-mono">{staleCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/70">
          {(["draft", "active", "stale", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors active:scale-97 cursor-pointer ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "draft" ? "مسودات المراجعة" : f === "active" ? "المفعّلة" : f === "stale" ? "المسارات المتوقفة" : "كافة القدرات"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Domains Summary */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {domains.map((d) => (
                <div key={d.domain} className="rounded-xl border border-border/80 bg-card p-3 space-y-1.5">
                  <div className="text-xs font-semibold truncate text-foreground">{d.domain}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <Badge variant="secondary" className={stateBadge("active")}>
                      <span className="tabular-nums font-mono">{d.active}</span> مفعّلة
                    </Badge>
                    {d.draft > 0 && (
                      <Badge variant="secondary" className={stateBadge("draft")}>
                        <span className="tabular-nums font-mono">{d.draft}</span> مسودات
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-[10px]">من <span className="tabular-nums font-mono">{d.total}</span></span>
                  </div>
                </div>
              ))}
              {domains.length === 0 && (
                <div className="col-span-full text-xs text-muted-foreground p-4 bg-card rounded-xl border border-border/80">
                  لا توجد قطاعات مسجلة حالياً — يتم المزامنة التلقائية مع محرك الذكاء الاصطناعي.
                </div>
              )}
            </div>

            {/* Capabilities List */}
            <div className="rounded-xl border border-border/80 bg-card divide-y divide-border/70 overflow-hidden">
              {visible.slice(0, 80).map((c) => (
                <div key={c.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-3.5 hover:bg-muted/10 transition-colors">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-medium truncate text-foreground">{c.name}</span>
                      <Badge variant="secondary" className={stateBadge(c.exposure_state)}>{c.exposure_state}</Badge>
                      {c.risk_level === "write" && (
                        <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[10px]">
                          كتابة
                        </Badge>
                      )}
                      {c.stale && (
                        <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 gap-0.5 text-[10px]">
                          <AlertTriangle className="w-3 h-3" /> متوقف
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.description_en}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.exposure_state === "draft" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
                        disabled={busy === c.name} onClick={() => act(c.name, "activate")}>
                        <ShieldCheck className="w-3.5 h-3.5" /> تفعيل
                      </Button>
                    )}
                    {c.exposure_state === "active" && c.source === "auto" && (
                      <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 text-rose-600 hover:text-rose-700"
                        disabled={busy === c.name} onClick={() => act(c.name, "hide")}>
                        <EyeOff className="w-3.5 h-3.5" /> إخفاء
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {visible.length === 0 && (
                <div className="p-8 text-xs text-muted-foreground text-center">لا توجد قدرات مطابقة في الفلتر الحالي.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
