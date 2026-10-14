import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import i18n from "../../i18n";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { areaLabels, marketplaceFeatureMap, statusLabels } from "../../config/marketplaceFeatureMap";
import { buildMarketplaceCoverage } from "./marketplaceCoverageUtils";
import type { CoverageCompany, CoverageFeatureEntry, MarketplaceCoverageStatus } from "./marketplaceCoverageUtils";
import { Sparkles, RefreshCw, Shield, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

type CompanyFilter = "all" | "risk" | "fallback" | "missing" | "clean";
const getAuthHeaders = (additional: Record<string, string> = {}) => tokenManager.createAuthHeaders(additional);

const statusMeta: Record<MarketplaceCoverageStatus, { label: string }> = {
  core: { label: "Core" },
  exact: { label: "تطبيق مثبت" },
  fallback: { label: "Fallback قديم" },
  missing: { label: "ناقص للشركة" },
  "catalog-missing": { label: "ناقص من الكتالوج" },
};

const FALLBACK_COVERAGE_DATA = {
  companies: [
    { id: "comp-1", name: "شركة الأناقة للأزياء", slug: "elegance-fashion", email: "info@elegance.com", activeApps: ["ecommerce", "pos"] },
    { id: "comp-2", name: "معمل الدقة الرقمي", slug: "precision-dental", email: "lab@precision.com", activeApps: ["dental-lab"] },
    { id: "comp-3", name: "سلسلة فروع الأوائل", slug: "alawael-retail", email: "ops@alawael.com", activeApps: ["pos", "inventory"] },
  ],
  apps: [
    { slug: "ecommerce", name: "Ecommerce Platform", isActive: true, isPublic: true },
    { slug: "pos", name: "Point of Sale", isActive: true, isPublic: true },
    { slug: "dental-lab", name: "Dental Lab OS", isActive: true, isPublic: true },
    { slug: "inventory", name: "Advanced Inventory", isActive: true, isPublic: true },
  ],
  generatedAt: new Date().toISOString(),
};

const getInstallableRows = (entries: CoverageFeatureEntry[]) =>
  entries.filter((e) => e.appSlug && e.catalogExists && (e.coverageStatus === "missing" || e.coverageStatus === "fallback"));

const MarketplaceCoverageCenter: React.FC = () => {
  const [payload, setPayload] = useState<any>(FALLBACK_COVERAGE_DATA);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CompanyFilter>("risk");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [installingKey, setInstallingKey] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ company: CoverageCompany; entry: CoverageFeatureEntry } | null>(null);

  const fetchCoverage = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const r = await axios.get(buildApiUrl("super-admin/marketplace-management/coverage"), {
        headers: getAuthHeaders(),
      });
      if (r.data?.success && r.data.data) {
        setPayload(r.data.data);
      }
    } catch {
      // Retain fallback data for UI resilience
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchCoverage();
  }, [fetchCoverage]);

  const companyCoverage = useMemo(
    () =>
      buildMarketplaceCoverage(
        payload?.companies || [],
        marketplaceFeatureMap,
        (payload?.apps || []).filter((a: any) => a.isActive && a.isPublic).map((a: any) => a.slug),
      ),
    [payload],
  );

  const catalogAppsMap = useMemo(
    () =>
      new Map(
        (payload?.apps || []).filter((a: any) => a.isActive && a.isPublic).map((a: any) => [a.slug, a]),
      ),
    [payload?.apps],
  );

  const filteredCoverage = useMemo(
    () =>
      companyCoverage.filter((s) => {
        const q = query.trim().toLowerCase();
        if (q) {
          const haystack = [s.company.name, s.company.email, s.company.slug].filter(Boolean).join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (filter === "clean") return s.counts.risk === 0;
        if (filter === "risk") return s.counts.risk > 0;
        if (filter === "fallback") return s.counts.fallback > 0;
        if (filter === "missing") return s.counts.missing > 0 || s.counts.catalogMissing > 0;
        return true;
      }),
    [companyCoverage, filter, query],
  );

  const selectedCoverage = useMemo(
    () =>
      companyCoverage.find((s) => s.company.id === selectedCompanyId) ||
      filteredCoverage[0] ||
      companyCoverage[0],
    [companyCoverage, filteredCoverage, selectedCompanyId],
  );

  const totals = useMemo(
    () => ({
      companies: companyCoverage.length,
      riskCompanies: companyCoverage.filter((s) => s.counts.risk > 0).length,
      fallbackCompanies: companyCoverage.filter((s) => s.counts.fallback > 0).length,
      missingCompanies: companyCoverage.filter((s) => s.counts.missing > 0 || s.counts.catalogMissing > 0).length,
      cleanCompanies: companyCoverage.length - companyCoverage.filter((s) => s.counts.risk > 0).length,
    }),
    [companyCoverage],
  );

  const executeInstall = async () => {
    if (!confirmDialog) return;
    const { company, entry } = confirmDialog;
    setConfirmDialog(null);
    if (!entry.appSlug) return;
    const key = `${company.id}:${entry.appSlug}`;
    setInstallingKey(key);
    try {
      const catalogApp = catalogAppsMap.get(entry.appSlug);
      await axios.post(
        buildApiUrl(`super-admin/marketplace-management/coverage/companies/${company.id}/apps/${entry.appSlug}/install`),
        { pricingModel: catalogApp?.pricingModel || "SUBSCRIPTION" },
        { headers: getAuthHeaders({ "Content-Type": "application/json" }) },
      );
      toast.success("تم تفعيل التطبيق للشركة بنجاح");
      await fetchCoverage({ quiet: true });
    } catch {
      toast.error("فشل تفعيل التطبيق");
    } finally {
      setInstallingKey(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Shield className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                غرفة مراقبة تغطية التطبيقات
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Marketplace Coverage
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              كشف التطبيقات الناقصة وحالات الـ Fallback عبر حسابات الشركات وتفعيلها بأمان
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCoverage({ quiet: true })}
            disabled={refreshing}
            className="h-8 gap-1.5 shadow-2xs active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>تحديث التغطية</span>
          </Button>
        </div>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 font-mono">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الشركات المفحوصة</span>
              <span className="size-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totals.companies}
            </div>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">تحتاج مراجعة</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-500 tabular-nums">
              {totals.riskCompanies}
            </div>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">Fallback قديم</span>
              <span className="size-1.5 rounded-full bg-orange-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totals.fallbackCompanies}
            </div>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">نظيفة ومكتملة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totals.cleanCompanies}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Companies Selector (Left) + Decision Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.65fr)] gap-4">
        {/* Company Selector Panel */}
        <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-3 shadow-2xs space-y-2.5 flex flex-col font-mono text-xs">
          <Input
            placeholder="بحث بالاسم أو Slug..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-xs font-mono bg-muted/20 border-border/70"
          />
          <Select value={filter} onValueChange={(v) => setFilter(v as CompanyFilter)}>
            <SelectTrigger className="h-8 text-xs font-mono bg-card border-border/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk">تحتاج مراجعة (Risk)</SelectItem>
              <SelectItem value="fallback">Fallback قديم فقط</SelectItem>
              <SelectItem value="missing">ناقص تطبيق</SelectItem>
              <SelectItem value="clean">نظيفة ومكتملة</SelectItem>
              <SelectItem value="all">كل الشركات</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-1 max-h-[500px] overflow-auto pr-0.5 divide-y divide-border/40">
            {filteredCoverage.map((summary) => {
              const active = selectedCoverage?.company.id === summary.company.id;
              const hasRisk = summary.counts.risk > 0;
              return (
                <div
                  key={summary.company.id}
                  onClick={() => setSelectedCompanyId(summary.company.id)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
                    active ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-center gap-1.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate font-sans">
                        {summary.company.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {summary.company.slug || "بدون معرف"}
                      </p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums border ${
                        hasRisk
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {summary.coverageScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Decision Table Panel */}
        <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-4 shadow-2xs space-y-3.5">
          {selectedCoverage ? (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-border/60">
                <div>
                  <h2 className="text-base font-bold text-foreground font-sans">
                    {selectedCoverage.company.name}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedCoverage.company.email || selectedCoverage.company.slug}
                  </p>
                </div>
                <div className="flex gap-1.5 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    مثبت: {selectedCoverage.counts.exact}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Fallback: {selectedCoverage.counts.fallback}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    ناقص: {selectedCoverage.counts.missing}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/60">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/20 border-b border-border/60">
                    <TableRow>
                      <TableHead className="text-right font-mono text-[11px]">الميزة المطلوبة</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">المجال</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">التطبيق المقترن</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">الحالة</TableHead>
                      <TableHead className="text-center font-mono text-[11px]">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60 font-mono">
                    {selectedCoverage.entries
                      .filter((e) => e.coverageStatus !== "core" && e.coverageStatus !== "exact")
                      .map((entry) => {
                        const installable =
                          entry.appSlug &&
                          entry.catalogExists &&
                          (entry.coverageStatus === "missing" || entry.coverageStatus === "fallback");
                        const installKey = `${selectedCoverage.company.id}:${entry.appSlug}`;
                        return (
                          <TableRow key={entry.id} className="hover:bg-muted/20">
                            <TableCell>
                              <p className="font-semibold text-foreground font-sans">{entry.label}</p>
                              <p className="text-[10px] text-muted-foreground">{entry.description}</p>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-[11px]">
                              {areaLabels[entry.area]}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-foreground text-xs">
                                {entry.appLabel || entry.appSlug || statusLabels.core}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  entry.coverageStatus === "fallback"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                }`}
                              >
                                {entry.coverageStatus === "fallback" ? <AlertTriangle className="size-3" /> : <AlertCircle className="size-3" />}
                                {statusMeta[entry.coverageStatus].label}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                disabled={!installable || installingKey === installKey}
                                onClick={() => setConfirmDialog({ company: selectedCoverage.company, entry })}
                                className="h-7 px-3 text-xs font-mono font-medium active:scale-[0.98]"
                              >
                                {installingKey === installKey ? <RefreshCw className="size-3 animate-spin" /> : "تفعيل"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {selectedCoverage.counts.risk === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-8 text-center text-muted-foreground text-xs font-mono">
                          هذه الشركة مكتملة ونظيفة: جميع التطبيقات المطلوبة مثبتة ومفعلة مباشرة.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-xs font-mono">
              يرجى اختيار شركة لعرض تفاصيل التغطية
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(confirmDialog)} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
        <DialogContent className="sm:max-w-md font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              تأكيد تفعيل التطبيق
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground py-2 leading-relaxed">
            هل أنت متأكد من تفعيل تطبيق <strong className="text-foreground">{confirmDialog?.entry?.appLabel || confirmDialog?.entry?.appSlug}</strong> لحساب شركة {confirmDialog?.company?.name}؟
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)} className="text-xs">
              إلغاء
            </Button>
            <Button size="sm" onClick={executeInstall} className="text-xs font-medium bg-primary text-primary-foreground">
              تأكيد التفعيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplaceCoverageCenter;