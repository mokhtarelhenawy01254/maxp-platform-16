import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Card, CardContent } from "../../components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Separator } from "../../components/ui/separator";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { areaLabels, marketplaceFeatureMap, statusLabels } from "../../config/marketplaceFeatureMap";
import { buildMarketplaceCoverage } from "./marketplaceCoverageUtils";
import type { CompanyCoverageSummary, CoverageCompany, CoverageFeatureEntry, MarketplaceCoverageStatus } from "./marketplaceCoverageUtils";
import { Sparkles, Zap, CheckCircle, AlertTriangle, Package, RefreshCw, Shield, AlertCircle } from "lucide-react";

type CompanyFilter = "all" | "risk" | "fallback" | "missing" | "clean";
const getAuthHeaders = (additional: Record<string, string> = {}) => tokenManager.createAuthHeaders(additional);

const statusMeta: Record<MarketplaceCoverageStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  core: { label: "Core", variant: "default" }, exact: { label: "تطبيق مثبت", variant: "success" }, fallback: { label: "Fallback قديم", variant: "warning" }, missing: { label: "ناقص للشركة", variant: "destructive" }, "catalog-missing": { label: "ناقص من الكتالوج", variant: "destructive" },
};

const getRowTone = (summary: CompanyCoverageSummary) => {
  if (summary.counts.catalogMissing > 0 || summary.counts.missing > 0) return "#dc2626";
  if (summary.counts.fallback > 0) return "#d97706";
  return "#059669";
};

const getInstallableRows = (entries: CoverageFeatureEntry[]) => entries.filter(e => e.appSlug && e.catalogExists && (e.coverageStatus === "missing" || e.coverageStatus === "fallback"));

const MarketplaceCoverageCenter: React.FC = () => {
  const { t } = useTranslation();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CompanyFilter>("risk");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [installingKey, setInstallingKey] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ company: CoverageCompany; entry: CoverageFeatureEntry } | null>(null);

  const fetchCoverage = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try { const r = await axios.get(buildApiUrl("super-admin/marketplace-management/coverage"), { headers: getAuthHeaders() }); if (!r.data?.success) throw new Error("Coverage API returned an unsuccessful response"); setPayload(r.data.data); setError(null); } catch (e: any) { const ae = e.response; if (ae?.status === 401 || ae?.status === 403) setError(t("superAdmin.marketplaceCoverage.noPermission")); else if (ae?.status === 404) setError(t("superAdmin.marketplaceCoverage.coverageUnavailable")); else setError(ae?.data?.message || t("superAdmin.marketplaceCoverage.loadFailed")); } finally { setLoading(false); setRefreshing(false); }
  }, [t]);

  useEffect(() => { fetchCoverage(); }, [fetchCoverage]);

  const companyCoverage = useMemo(() => buildMarketplaceCoverage(payload?.companies || [], marketplaceFeatureMap, (payload?.apps || []).filter(a => a.isActive && a.isPublic).map(a => a.slug)), [payload]);
  const catalogAppsMap = useMemo(() => new Map((payload?.apps || []).filter(a => a.isActive && a.isPublic).map(a => [a.slug, a])), [payload?.apps]);

  const filteredCoverage = useMemo(() => companyCoverage.filter(s => {
    const q = query.trim().toLowerCase();
    if (q) { const haystack = [s.company.name, s.company.email, s.company.slug].filter(Boolean).join(" ").toLowerCase(); if (!haystack.includes(q)) return false; }
    if (filter === "clean") return s.counts.risk === 0; if (filter === "risk") return s.counts.risk > 0; if (filter === "fallback") return s.counts.fallback > 0; if (filter === "missing") return s.counts.missing > 0 || s.counts.catalogMissing > 0;
    return true;
  }), [companyCoverage, filter, query]);

  const selectedCoverage = useMemo(() => companyCoverage.find(s => s.company.id === selectedCompanyId) || filteredCoverage[0] || companyCoverage[0], [companyCoverage, filteredCoverage, selectedCompanyId]);
  const totals = useMemo(() => ({ companies: companyCoverage.length, riskCompanies: companyCoverage.filter(s => s.counts.risk > 0).length, fallbackCompanies: companyCoverage.filter(s => s.counts.fallback > 0).length, missingCompanies: companyCoverage.filter(s => s.counts.missing > 0 || s.counts.catalogMissing > 0).length, cleanCompanies: companyCoverage.length - companyCoverage.filter(s => s.counts.risk > 0).length }), [companyCoverage]);

  const executeInstall = async () => {
    if (!confirmDialog) return;
    const { company, entry } = confirmDialog; setConfirmDialog(null); if (!entry.appSlug) return;
    const key = `${company.id}:${entry.appSlug}`; setInstallingKey(key);
    try { const catalogApp = entry.appSlug ? catalogAppsMap.get(entry.appSlug) : null; await axios.post(buildApiUrl(`super-admin/marketplace-management/coverage/companies/${company.id}/apps/${entry.appSlug}/install`), { pricingModel: catalogApp?.pricingModel || "SUBSCRIPTION" }, { headers: getAuthHeaders({ "Content-Type": "application/json" }) }); toast.success(i18n.t("superAdmin.marketplaceCoverage.activated")); await fetchCoverage({ quiet: true }); } catch (e: any) { toast.error(e.response?.data?.message || i18n.t("superAdmin.marketplaceCoverage.activateFailed")); } finally { setInstallingKey(null); }
  };

  if (loading) return <div className="flex justify-center p-6"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="rtl">
      <div className="relative overflow-hidden mb-3 p-4 md:p-5 rounded-2xl text-white bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-3"><div><Badge className="bg-white/20 text-white border-white/30 mb-2"><Shield className="size-3" /> Marketplace Coverage Center</Badge><h1 className="text-xl sm:text-2xl font-bold max-w-[760px]">غرفة مراقبة التطبيقات الناقصة لكل شركة</h1><p className="mt-1.5 max-w-[760px] text-sm text-white/80">الصفحة دي بتكشف الشركات اللي عندها أجزاء ظاهرة بفallback قديم أو ناقص لها التطبيق الفعلي، وتسمح بتفعيل التطبيق المطلوب بأمان من السوبر أدمن.</p></div>
          <div className="flex flex-col items-stretch md:items-end gap-2"><Button className="bg-amber-500 text-gray-900 font-bold hover:bg-amber-400" onClick={() => fetchCoverage({ quiet: true })} disabled={refreshing}><RefreshCw className="size-4" /> تحديث التغطية</Button><p className="text-xs text-white/70">آخر قراءة: {payload?.generatedAt ? new Date(payload.generatedAt).toLocaleString("ar-EG") : "-"}</p></div></div>
      </div>

      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[{ label: "الشركات المقروءة", value: totals.companies, color: "#2563eb", icon: <Package className="size-5" /> }, { label: "تحتاج مراجعة", value: totals.riskCompanies, color: "#d97706", icon: <AlertTriangle className="size-5" /> }, { label: "Fallback قديم", value: totals.fallbackCompanies, color: "#f59e0b", icon: <Zap className="size-5" /> }, { label: "نظيفة", value: totals.cleanCompanies, color: "#059669", icon: <CheckCircle className="size-5" /> }].map(card => <Card key={card.label} className="border" style={{ borderColor: `${card.color}40`, background: `linear-gradient(135deg, ${card.color}15, transparent 56%)` }}><CardContent><div className="flex justify-between items-center"><div><p className="text-xs text-muted-foreground">{card.label}</p><p className="text-xl font-bold tabular-nums">{card.value}</p></div><div style={{ color: card.color }}>{card.icon}</div></div></CardContent></Card>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.65fr)] gap-3">
        <div className="rounded-xl border bg-card p-3">
          <div className="space-y-2 mb-2"><Input placeholder="بحث عن شركة" value={query} onChange={e => setQuery(e.target.value)} /><Select value={filter} onValueChange={v => setFilter(v as CompanyFilter)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="risk">تحتاج مراجعة</SelectItem><SelectItem value="fallback">Fallback فقط</SelectItem><SelectItem value="missing">ناقص تطبيق</SelectItem><SelectItem value="clean">نظيفة</SelectItem><SelectItem value="all">كل الشركات</SelectItem></SelectContent></Select></div>
          <div className="space-y-1 max-h-[640px] overflow-auto">{filteredCoverage.map(summary => { const active = selectedCoverage?.company.id === summary.company.id; const tone = getRowTone(summary); return <div key={summary.company.id} onClick={() => setSelectedCompanyId(summary.company.id)} className={`rounded-xl border p-3 cursor-pointer transition-all ${active ? "border-2" : "border"}`} style={{ borderColor: active ? tone : "var(--border)", backgroundColor: active ? `${tone}15` : "var(--card)" }}><div className="flex justify-between items-center gap-1"><div className="min-w-0"><p className="font-semibold truncate">{summary.company.name}</p><p className="text-xs text-muted-foreground truncate">{summary.company.email || summary.company.slug || "بدون بريد"}</p></div><Badge className="shrink-0 font-bold tabular-nums" style={{ backgroundColor: `${tone}20`, color: tone, border: "none" }}>{summary.coverageScore}%</Badge></div><div className="mt-2 h-[7px] rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${summary.coverageScore}%`, backgroundColor: tone }} /></div><div className="flex gap-1 mt-2 flex-wrap"><Badge variant="outline" className="text-xs">ناقص {summary.counts.missing}</Badge><Badge variant="outline" className="text-xs">Fallback {summary.counts.fallback}</Badge><Badge variant="outline" className="text-xs">Exact {summary.counts.exact}</Badge></div></div>; })}{filteredCoverage.length === 0 && <Alert><AlertDescription>لا توجد شركات مطابقة للفلتر الحالي.</AlertDescription></Alert>}</div>
        </div>

        <div className="rounded-xl border bg-card p-3">
          {selectedCoverage ? <>
            <div className="flex flex-col md:flex-row justify-between gap-2"><div><h2 className="text-lg font-bold">{selectedCoverage.company.name}</h2><p className="text-sm text-muted-foreground">{selectedCoverage.company.email || "بدون بريد"}</p></div><div className="flex gap-1 flex-wrap"><Badge variant="success">{`مثبت مباشر ${selectedCoverage.counts.exact}`}</Badge><Badge variant="warning">{`Fallback ${selectedCoverage.counts.fallback}`}</Badge><Badge variant="destructive">{`ناقص ${selectedCoverage.counts.missing + selectedCoverage.counts.catalogMissing}`}</Badge></div></div>
            <Separator className="my-3" />
            <div className="flex justify-between items-center gap-2 mb-2"><div><p className="font-semibold">الأجزاء التي تحتاج قرار</p><p className="text-xs text-muted-foreground">نعرض فقط الـ missing/fallback/catalog-missing عشان القرار يبقى واضح وسريع.</p></div><Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="size-3" /> {getInstallableRows(selectedCoverage.entries).length} قابل للتفعيل</Badge></div>
            <Table><TableHeader><TableRow><TableHead>الجزء</TableHead><TableHead>المجال</TableHead><TableHead>التطبيق المطلوب</TableHead><TableHead>الحالة</TableHead><TableHead className="text-center">إجراء</TableHead></TableRow></TableHeader>
              <TableBody>{selectedCoverage.entries.filter(e => e.coverageStatus !== "core" && e.coverageStatus !== "exact").map(entry => { const installable = entry.appSlug && entry.catalogExists && (entry.coverageStatus === "missing" || entry.coverageStatus === "fallback"); const installKey = `${selectedCoverage.company.id}:${entry.appSlug}`; return <TableRow key={entry.id}><TableCell><p className="font-bold">{entry.label}</p><p className="text-xs text-muted-foreground">{entry.description}</p></TableCell><TableCell>{areaLabels[entry.area]}</TableCell><TableCell><div><p className="text-sm font-bold">{entry.appLabel || entry.appSlug || statusLabels.core}</p>{entry.legacyGate && <p className="text-xs text-muted-foreground">fallback: {entry.legacyGate}</p>}</div></TableCell><TableCell><Badge variant={statusMeta[entry.coverageStatus].variant} className={entry.coverageStatus === "missing" || entry.coverageStatus === "catalog-missing" ? "flex items-center gap-1" : ""}>{(entry.coverageStatus === "missing" || entry.coverageStatus === "catalog-missing") && <AlertCircle className="size-3" />}{statusMeta[entry.coverageStatus].label}</Badge></TableCell><TableCell className="text-center"><Button size="sm" disabled={!installable || installingKey === installKey} onClick={() => setConfirmDialog({ company: selectedCoverage.company, entry })} className="rounded-full font-bold">{installingKey === installKey ? "جاري..." : "تفعيل"}</Button></TableCell></TableRow>; })}{selectedCoverage.counts.risk === 0 && <TableRow><TableCell colSpan={5}><Alert variant="default"><AlertDescription>هذه الشركة نظيفة: كل الأجزاء القابلة للتطبيق مثبتة مباشرة.</AlertDescription></Alert></TableCell></TableRow>}</TableBody></Table>
          </> : <Alert><AlertDescription>لا توجد شركة محددة للعرض.</AlertDescription></Alert>}
        </div>
      </div>

      <Dialog open={!!confirmDialog} onOpenChange={o => { if (!o) setConfirmDialog(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{t("superAdmin.marketplaceCoverage.confirmTitle")}</DialogTitle></DialogHeader>
          <AlertDescription>{t("superAdmin.marketplaceCoverage.confirmPrefix")} <strong>{confirmDialog?.entry?.appLabel || confirmDialog?.entry?.appSlug}</strong> {t("superAdmin.marketplaceCoverage.confirmSuffix", { companyName: confirmDialog?.company?.name || "" })}</AlertDescription>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmDialog(null)}>{t("superAdmin.marketplaceCoverage.cancel")}</Button><Button onClick={executeInstall}>{t("superAdmin.marketplaceCoverage.confirmActivate")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplaceCoverageCenter;