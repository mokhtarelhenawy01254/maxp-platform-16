import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ShieldCheck, EyeOff, AlertTriangle } from "lucide-react";

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
    active: "bg-emerald-100 text-emerald-700",
    draft: "bg-amber-100 text-amber-700",
    tracked: "bg-slate-100 text-slate-600",
    hidden: "bg-rose-100 text-rose-700",
  };
  return map[state] || "bg-slate-100 text-slate-600";
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

  return (
    <div className="p-4 sm:p-6 space-y-4 min-h-0 overflow-y-auto">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(["draft", "active", "stale", "all"] as const).map((f) => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors active:scale-97 cursor-pointer ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}>
              {f === "draft" ? "مسودات بانتظار المراجعة" : f === "active" ? "مفعّلة" : f === "stale" ? "مسارات ميتة" : "الكل"}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {domains.map((d) => (
              <div key={d.domain} className="rounded-xl border bg-background p-3">
                <div className="text-sm font-semibold truncate">{d.domain}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
                  <Badge variant="secondary" className={stateBadge("active")}>{d.active} مفعّلة</Badge>
                  {d.draft > 0 && <Badge variant="secondary" className={stateBadge("draft")}>{d.draft} مسودات</Badge>}
                  <span className="text-muted-foreground">من {d.total}</span>
                </div>
              </div>
            ))}
            {domains.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">
                لسه مفيش بيانات — الكتالوج بيتزامن عند إقلاع خدمة الـ AI.
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-background divide-y">
            {visible.slice(0, 80).map((c) => (
              <div key={c.name} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium truncate">{c.name}</span>
                    <Badge variant="secondary" className={stateBadge(c.exposure_state)}>{c.exposure_state}</Badge>
                    {c.risk_level === "write" && <Badge variant="secondary" className="bg-violet-100 text-violet-700">كتابة</Badge>}
                    {c.stale && (
                      <Badge variant="secondary" className="bg-rose-100 text-rose-700 gap-0.5">
                        <AlertTriangle className="size-3" /> مسار ميت
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{c.description_en}</p>
                </div>
                {c.exposure_state === "draft" && (
                  <Button size="sm" variant="outline" className="gap-1 shrink-0"
                    disabled={busy === c.name} onClick={() => act(c.name, "activate")}>
                    <ShieldCheck className="size-3.5" /> تفعيل
                  </Button>
                )}
                {c.exposure_state === "active" && c.source === "auto" && (
                  <Button size="sm" variant="ghost" className="gap-1 shrink-0 text-rose-600"
                    disabled={busy === c.name} onClick={() => act(c.name, "hide")}>
                    <EyeOff className="size-3.5" /> إخفاء
                  </Button>
                )}
              </div>
            ))}
            {visible.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">مفيش نتايج في الفلتر الحالي.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
