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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري فحص تغطية التطبيقات عبر الشركات...</span>
        </div>
      </div>
    );
  }

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

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {payload?.generatedAt && (
            <span className="text-[11px] font-mono text-muted-foreground hidden md:inline-block">
              آخر فحص: {new Date(payload.generatedAt).toLocaleTimeString("ar-EG")}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCoverage({ quiet: true })}
            disabled={refreshing}
            className="h-8 text-xs font-mono gap-1.5 shadow-2xs active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>تحديث التغطية</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl border-destructive/30 bg-destructive/5">
          <AlertDescription className="text-xs font-mono">{error}</AlertDescription>
        </Alert>
      )}

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الشركات المفحوصة</span>
              <span className="size-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {totals.companies}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">تحتاج مراجعة</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {totals.riskCompanies}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">Fallback قديم</span>
              <span className="size-1.5 rounded-full bg-orange-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {totals.fallbackCompanies}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">نظيفة ومكتملة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {totals.cleanCompanies}
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid: Left Search & Companies List, Right Active Coverage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.65fr)] gap-4">
        {/* Company Selector Panel */}
        <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-3 shadow-2xs space-y-3 flex flex-col">
          <div className="space-y-2">
            <Input
              placeholder="بحث عن شركة بالاسم أو Slug..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 text-xs font-mono rounded-lg bg-card border-border/60"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as CompanyFilter)}>
              <SelectTrigger className="h-8 text-xs font-mono">
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
          </div>

          <div className="space-y-1.5 max-h-[580px] overflow-auto pr-0.5 divide-y divide-border/40">
            {filteredCoverage.map((summary) => {
              const active = selectedCoverage?.company.id === summary.company.id;
              const hasRisk = summary.counts.risk > 0;
              return (
                <div
                  key={summary.company.id}
                  onClick={() => setSelectedCompanyId(summary.company.id)}
                  className={`pt-2 pb-2 px-2.5 rounded-lg cursor-pointer transition-colors ${
                    active
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/30 border border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-center gap-1.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {summary.company.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {summary.company.email || summary.company.slug || "بدون معرف"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums border ${
                        hasRisk
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {summary.coverageScore}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        hasRisk ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${summary.coverageScore}%` }}
                    />
                  </div>

                  <div className="flex gap-1 mt-2 flex-wrap text-[10px] font-mono">
                    {summary.counts.missing > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        ناقص {summary.counts.missing}
                      </span>
                    )}
                    {summary.counts.fallback > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Fallback {summary.counts.fallback}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">
                      مثبت {summary.counts.exact}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredCoverage.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                لا توجد شركات مطابقة للفلتر المحدد
              </div>
            )}
          </div>
        </div>

        {/* Detailed Decision Table Panel */}
        <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-4 shadow-2xs">
          {selectedCoverage ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-border/60">
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {selectedCoverage.company.name}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedCoverage.company.email || selectedCoverage.company.slug || "بدون بريد إلكتروني"}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                    مثبت مباشر {selectedCoverage.counts.exact}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                    Fallback {selectedCoverage.counts.fallback}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
                    ناقص {selectedCoverage.counts.missing + selectedCoverage.counts.catalogMissing}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2">
                <div>
                  <p className="font-semibold text-xs text-foreground">
                    الأجزاء التي تتطلب قراراً فنياً
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    عرض المميزات بحالة missing أو fallback فقط لاتخاذ الإجراء السريع
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="size-3" />
                  {getInstallableRows(selectedCoverage.entries).length} قابل للتفعيل
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/60">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/20 border-b border-border/60">
                    <TableRow>
                      <TableHead className="text-right font-mono text-[11px]">الجزء</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">المجال</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">التطبيق المطلوب</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">الحالة</TableHead>
                      <TableHead className="text-center font-mono text-[11px]">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
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
                              <p className="font-semibold text-foreground">{entry.label}</p>
                              <p className="text-[10px] text-muted-foreground">{entry.description}</p>
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground text-[11px]">
                              {areaLabels[entry.area]}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-foreground text-xs">
                                {entry.appLabel || entry.appSlug || statusLabels.core}
                              </p>
                              {entry.legacyGate && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  fallback: {entry.legacyGate}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                  entry.coverageStatus === "fallback"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                }`}
                              >
                                {entry.coverageStatus === "fallback" ? (
                                  <AlertTriangle className="size-3" />
                                ) : (
                                  <AlertCircle className="size-3" />
                                )}
                                {statusMeta[entry.coverageStatus].label}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                disabled={!installable || installingKey === installKey}
                                onClick={() =>
                                  setConfirmDialog({ company: selectedCoverage.company, entry })
                                }
                                className="h-7 px-3 text-xs font-mono font-medium active:scale-[0.98]"
                              >
                                {installingKey === installKey ? (
                                  <RefreshCw className="size-3 animate-spin" />
                                ) : (
                                  "تفعيل"
                                )}
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

      <Dialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {t("superAdmin.marketplaceCoverage.confirmTitle")}
            </DialogTitle>
          </DialogHeader>
          <AlertDescription className="text-xs text-muted-foreground leading-relaxed py-2">
            {t("superAdmin.marketplaceCoverage.confirmPrefix")}{" "}
            <strong className="text-foreground">
              {confirmDialog?.entry?.appLabel || confirmDialog?.entry?.appSlug}
            </strong>{" "}
            {t("superAdmin.marketplaceCoverage.confirmSuffix", {
              companyName: confirmDialog?.company?.name || "",
            })}
          </AlertDescription>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)} className="text-xs">
              {t("superAdmin.marketplaceCoverage.cancel")}
            </Button>
            <Button size="sm" onClick={executeInstall} className="text-xs font-medium">
              {t("superAdmin.marketplaceCoverage.confirmActivate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplaceCoverageCenter;