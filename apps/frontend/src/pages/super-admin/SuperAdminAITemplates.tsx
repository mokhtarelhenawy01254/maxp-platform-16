import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Bot,
  Search,
  Eye,
  Pencil,
  Copy,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Layers,
  ExternalLink,
  CheckSquare,
  RefreshCw,
  Star,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  CreateDialog,
  EditDialog,
  PreviewDialog,
  ApplyDialog,
  DeleteDialog,
  DuplicateDialog,
  ROLE_ICONS,
  ROLE_COLORS,
  ROLE_LABELS,
  TemplateItem,
} from "./SuperAdminAITemplatesDialogs";
import i18n from "../../i18n";

const SuperAdminAITemplates: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const roleFilter = searchParams.get("role") || "";
  const industryFilter = searchParams.get("industry") || "";
  const statusFilter = searchParams.get("status") || "";

  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [defaultSlug, setDefaultSlug] = useState<string | null>("support-agent");
  const [defaultUpdating, setDefaultUpdating] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TemplateItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<TemplateItem | null>(null);
  const [applyTarget, setApplyTarget] = useState<TemplateItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateItem | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<TemplateItem | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const { data } = await apiClient.get("/super-admin/agents/marketplace");
      if (data.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else {
        setFetchError("لم يتم العثور على قوالب معتمدة");
      }
    } catch (err: any) {
      setFetchError(err?.response?.data?.error || err.message || "فشل تحميل قوالب الوكلاء");
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultTemplate = async () => {
    try {
      const { data } = await apiClient.get("/super-admin/agents/default-template");
      if (data.success && data.templateSlug) setDefaultSlug(data.templateSlug);
    } catch {}
  };

  useEffect(() => {
    void fetchTemplates();
    void fetchDefaultTemplate();
  }, []);

  const handleSyncTemplates = async () => {
    try {
      setSyncing(true);
      const { data } = await apiClient.post("/super-admin/agents/sync-templates");
      if (data.success) {
        toast.success(data.message || `تمت مزامنة ${data.syncedCount ?? 0} قالب بنجاح`);
        await fetchTemplates();
      } else {
        toast.error(data.error || "فشل مزامنة القوالب");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || "حدث خطأ أثناء مزامنة القوالب");
    } finally {
      setSyncing(false);
    }
  };

  const allRoles = [...new Set(templates.map((t) => t.role))].filter(Boolean).sort();
  const allIndustries = [...new Set(templates.flatMap((t) => t.industries || []))].filter(Boolean).sort();

  const filtered = templates.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      const roleArabic = (ROLE_LABELS[t.role] || "").toLowerCase();
      if (
        !t.name.toLowerCase().includes(q) &&
        !t.role.toLowerCase().includes(q) &&
        !roleArabic.includes(q) &&
        !t.slug.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (roleFilter && t.role !== roleFilter) return false;
    if (industryFilter && !t.industries?.includes(industryFilter)) return false;
    if (statusFilter === "active" && t.isActive === false) return false;
    if (statusFilter === "hidden" && t.isActive !== false) return false;
    return true;
  });

  const stats = {
    total: templates.length,
    byRole: templates.reduce<Record<string, number>>((acc, t) => { acc[t.role] = (acc[t.role] || 0) + 1; return acc; }, {}),
    totalTools: templates.reduce((s, t) => s + (t.toolsCount || 0), 0),
    totalSkills: templates.reduce((s, t) => s + (t.skillsCount || 0), 0),
    activeCount: templates.filter((t) => t.isActive !== false).length,
  };

  const filteredSlugs = new Set(filtered.map((t) => t.slug));
  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selectedSlugs.has(t.slug));

  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedSlugs((prev) => {
        const next = new Set(prev);
        filteredSlugs.forEach((s) => next.delete(s));
        return next;
      });
    } else {
      setSelectedSlugs((prev) => {
        const next = new Set(prev);
        filteredSlugs.forEach((s) => next.add(s));
        return next;
      });
    }
  };

  const handleBulkStatus = async (isActive: boolean) => {
    const slugs = [...selectedSlugs];
    if (!slugs.length) return;
    setBulkUpdating(true);
    try {
      await apiClient.patch("/super-admin/agents/bulk-status", { slugs, isActive });
      setTemplates((prev) => prev.map((t) => (slugs.includes(t.slug) ? { ...t, isActive } : t)));
      setSelectedSlugs(new Set());
      toast.success(`تم ${isActive ? "تفعيل" : "إيقاف"} ${slugs.length} قالب بنجاح`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || "فشل تحديث الحالة الجماعي");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleSetDefault = async (slug: string) => {
    setDefaultUpdating(slug);
    try {
      await apiClient.put("/super-admin/agents/default-template", { templateSlug: slug });
      setDefaultSlug(slug);
      toast.success(`تم تعيين «${slug}» كقالب افتراضي للشركات الجديدة بنجاح`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || "فشل تعيين القالب الافتراضي");
    } finally {
      setDefaultUpdating(null);
    }
  };

  const hasActiveFilters = Boolean(search || roleFilter || industryFilter || statusFilter);

  return (
    <div className="h-full overflow-y-auto min-h-0 p-4 md:p-6 space-y-4 max-w-7xl mx-auto w-full" dir={i18n.dir()}>
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Layers className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                سوق قوالب الذكاء الاصطناعي
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {stats.total} قالب معتمد
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              إدارة ونشر قوالب وكلاء الذكاء الاصطناعي وتخصيصات الشركات المركزية للمنصة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncTemplates}
            disabled={syncing}
            className="h-8 gap-1.5 text-xs shadow-2xs active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin text-primary" : ""}`} />
            <span>مزامنة الملفات</span>
          </Button>

          <Button
            onClick={() => setShowCreate(true)}
            size="sm"
            className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>قالب جديد</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 font-mono">
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي القوالب</span>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums mt-1">{stats.total}</div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">القوالب النشطة</span>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">{stats.activeCount}</div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">الأدوات المركزية</span>
            <div className="text-2xl font-bold tracking-tight text-primary tabular-nums mt-1">{stats.totalTools}</div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">المهارات المسجلة</span>
            <div className="text-2xl font-bold tracking-tight text-amber-500 tabular-nums mt-1">{stats.totalSkills}</div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">الأدوار المعتمدة</span>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums mt-1">{Object.keys(stats.byRole).length}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="البحث بالاسم، المعرف، أو الدور..."
            className="pr-8 h-8 text-xs bg-muted/20 border-border/70 font-mono"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setFilter("role", e.target.value)}
          aria-label="تصفية حسب الدور"
          className="h-8 rounded-lg border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          <option value="">كل الأدوار</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_ICONS[r] || "🤖"} {ROLE_LABELS[r] || r}
            </option>
          ))}
        </select>
        <select
          value={industryFilter}
          onChange={(e) => setFilter("industry", e.target.value)}
          aria-label="تصفية حسب المجال"
          className="h-8 rounded-lg border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          <option value="">كل المجالات</option>
          {allIndustries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setFilter("status", e.target.value)}
          aria-label="تصفية حسب الحالة"
          className="h-8 rounded-lg border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="hidden">مخفي</option>
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            <span>إعادة تعيين</span>
          </Button>
        )}

        <span className="text-[11px] text-muted-foreground mr-auto tabular-nums font-mono">
          {filtered.length} من {templates.length}
        </span>
      </div>

      {/* Bulk action bar */}
      {selectedSlugs.size > 0 && (
        <div className="px-3.5 py-2 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <CheckSquare className="size-4" />
            <span>{selectedSlugs.size} قالب محدد</span>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled={bulkUpdating} onClick={() => handleBulkStatus(true)} className="h-7 text-xs">
              تفعيل
            </Button>
            <Button variant="outline" size="sm" disabled={bulkUpdating} onClick={() => handleBulkStatus(false)} className="h-7 text-xs">
              إيقاف
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedSlugs(new Set())} className="h-7 text-xs">
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      {/* Fetch Error Alert */}
      {fetchError && templates.length === 0 && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{fetchError}</span>
            <Button variant="outline" size="sm" onClick={fetchTemplates} className="h-7 text-xs">
              إعادة المحاولة
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Table Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
                <th className="p-3 w-10 text-center">
                  <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} aria-label="تحديد الكل" />
                </th>
                <th className="px-3 py-3 font-semibold">القالب</th>
                <th className="px-3 py-3 font-semibold">الدور</th>
                <th className="px-3 py-3 font-semibold">الحالة</th>
                <th className="px-3 py-3 font-semibold">الشركات</th>
                <th className="px-3 py-3 font-semibold">الإصدار</th>
                <th className="px-3 py-3 font-semibold">المجالات</th>
                <th className="px-3 py-3 font-semibold">المواصفات</th>
                <th className="px-3 py-3 text-left font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {loading && templates.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3 text-center"><div className="size-4 bg-muted/60 rounded mx-auto" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-muted/60 rounded w-36 mb-1" /><div className="h-3 bg-muted/40 rounded w-24" /></td>
                    <td className="px-3 py-3"><div className="h-5 bg-muted/60 rounded-full w-20" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-muted/60 rounded w-12" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-muted/60 rounded w-16" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-muted/60 rounded w-10" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-muted/60 rounded w-24" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-muted/60 rounded w-20" /></td>
                    <td className="px-3 py-3 text-left"><div className="h-6 bg-muted/60 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SlidersHorizontal className="size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-foreground">لا توجد قوالب تطابق شروط التصفية أو البحث</p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1 text-xs">
                          إعادة تعيين الفلاتر
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isDefault = t.slug === defaultSlug;
                  const isExpanded = expandedSlug === t.slug;
                  return (
                    <React.Fragment key={t.slug}>
                      <tr
                        className={`hover:bg-muted/20 transition-colors ${isExpanded ? "bg-muted/10" : ""}`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedSlugs.has(t.slug)}
                            onCheckedChange={() => toggleSelect(t.slug)}
                            aria-label={`تحديد ${t.name}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg border border-border/70 bg-primary/10 flex items-center justify-center text-primary shrink-0 text-base">
                              {t.icon || ROLE_ICONS[t.role] || "🤖"}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => navigate(`/super-admin/ai-templates/${t.slug}`)}
                                className="text-start group/title hover:underline block truncate"
                                title="فتح صفحة القالب الكاملة"
                              >
                                <span className="text-xs font-semibold text-foreground group-hover/title:text-primary transition-colors font-sans inline-flex items-center gap-1.5">
                                  {t.name}
                                  {isDefault && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono font-medium">
                                      افتراضي
                                    </span>
                                  )}
                                </span>
                              </button>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">{t.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${ROLE_COLORS[t.role] || "bg-muted text-muted-foreground border border-border/60"}`}>
                            <span>{ROLE_ICONS[t.role] || "🤖"}</span>
                            <span>{ROLE_LABELS[t.role] || t.role}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${t.isActive !== false ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                            {t.isActive !== false ? "نشط" : "مخفي"}
                          </span>
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          <span className="font-bold text-foreground">{t.companiesCount ?? 0}</span>
                          <span className="text-[10px] text-muted-foreground mr-1">شركة</span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground tabular-nums">v{t.version}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1 font-sans">
                            {t.industries?.slice(0, 2).map((ind) => (
                              <span key={ind} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
                                {ind}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[10px] text-muted-foreground">
                          <span>{t.toolsCount} أداة</span> · <span>{t.skillsCount} مهارة</span>
                        </td>
                        <td className="px-3 py-3 text-left" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/super-admin/ai-templates/${t.slug}`)}
                              className="h-7 w-7 p-0 hover:text-primary"
                              title="عرض صفحة القالب الكاملة (6 أقسام)"
                            >
                              <ExternalLink className="size-3.5 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewTarget(t)}
                              className="h-7 w-7 p-0"
                              title="معاينة سريعة"
                            >
                              <Eye className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditTarget(t)}
                              className="h-7 w-7 p-0"
                              title="تعديل القالب"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDuplicateTarget(t)}
                              className="h-7 w-7 p-0"
                              title="نسخ القالب"
                            >
                              <Copy className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setApplyTarget(t)}
                              className="h-7 w-7 p-0"
                              title="تطبيق على شركة"
                            >
                              <Send className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(t)}
                              className="h-7 w-7 p-0 hover:text-destructive"
                              title="حذف القالب"
                            >
                              <Trash2 className="size-3.5 text-destructive/70 hover:text-destructive" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedSlug(isExpanded ? null : t.slug)}
                              className="h-7 w-7 p-0"
                              title={isExpanded ? "طي التفاصيل" : "عرض المزيد"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="size-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="size-3.5 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border/60">
                          <td colSpan={9} className="p-3.5">
                            <div className="space-y-3 font-sans">
                              {/* Soul Preview */}
                              <div>
                                <span className="text-[11px] font-bold text-foreground block mb-1">
                                  الشخصية والرسالة (Soul):
                                </span>
                                <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-background/60 p-2.5 rounded-lg border border-border/60 font-mono">
                                  {t.soulPreview || "لا توجد تفاصيل إضافية لهذا القالب."}
                                </div>
                              </div>

                              {/* Badges strip */}
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-[11px] font-medium text-muted-foreground">القنوات:</span>
                                {t.channels?.length ? (
                                  t.channels.map((ch) => (
                                    <span key={ch} className="px-1.5 py-0.5 rounded bg-muted/80 text-[10px] text-foreground border border-border/50">
                                      {ch}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">—</span>
                                )}

                                {t.budget?.dailyUsd && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono font-medium mr-auto">
                                    ميزانية: ${t.budget.dailyUsd}/يوم
                                  </span>
                                )}
                              </div>

                              {/* Actions Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 font-mono text-xs">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/super-admin/ai-templates/${t.slug}`)}
                                    className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                                  >
                                    <ExternalLink className="size-3" />
                                    <span>فتح لوحة القالب الكاملة (6 أقسام)</span>
                                  </Button>

                                  {!isDefault && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={defaultUpdating === t.slug}
                                      onClick={() => handleSetDefault(t.slug)}
                                      className="h-7 text-xs gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/5"
                                    >
                                      <Star className="size-3" />
                                      <span>تعيين كافتراضي للشركات الجديدة</span>
                                    </Button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDuplicateTarget(t)}
                                    className="h-7 text-xs gap-1 text-muted-foreground"
                                  >
                                    <Copy className="size-3" />
                                    <span>نسخ</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setApplyTarget(t)}
                                    className="h-7 text-xs gap-1 text-emerald-600 dark:text-emerald-400"
                                  >
                                    <Send className="size-3" />
                                    <span>تطبيق على شركة</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteTarget(t)}
                                    className="h-7 text-xs gap-1 text-destructive"
                                  >
                                    <Trash2 className="size-3" />
                                    <span>حذف</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      {showCreate && <CreateDialog onClose={() => setShowCreate(false)} onCreated={fetchTemplates} />}
      {editTarget && <EditDialog template={editTarget} onClose={() => setEditTarget(null)} onUpdated={fetchTemplates} />}
      {previewTarget && <PreviewDialog template={previewTarget} onClose={() => setPreviewTarget(null)} />}
      {duplicateTarget && <DuplicateDialog template={duplicateTarget} onClose={() => setDuplicateTarget(null)} onCreated={fetchTemplates} />}
      {applyTarget && <ApplyDialog template={applyTarget} onClose={() => setApplyTarget(null)} />}
      {deleteTarget && <DeleteDialog template={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={fetchTemplates} />}
    </div>
  );
};

export default SuperAdminAITemplates;