import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { apiClient } from "../../services/apiClient";
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
  CheckCheck,
  X,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  CreateDialog,
  EditDialog,
  PreviewDialog,
  ApplyDialog,
  DeleteDialog,
  DuplicateDialog,
  ROLE_COLORS,
  toneColors,
  TemplateItem,
} from "./SuperAdminAITemplatesDialogs";
import i18n from "../../i18n";

const FALLBACK_TEMPLATES: TemplateItem[] = [
  {
    slug: "customer-support-agent",
    name: "وكيل خدمة العملاء الذكي",
    role: "Support",
    version: "2.4.0",
    isActive: true,
    companiesCount: 42,
    toolsCount: 8,
    skillsCount: 4,
    industries: ["تجارة إلكترونية", "خدمات"],
    channels: ["whatsapp", "webchat"],
    soulPreview: "وكيل مخصص للرد الفوري على استفسارات الطلبات، الشحن، وسياسات الاستبدال بنبرة مهذبة وسريعة.",
    personaMeta: { tone: "ودود ومهني", language: "arabic" },
    budget: { dailyUsd: 5 },
  },
  {
    slug: "sales-closer-pro",
    name: "مستشار المبيعات وإتمام الصفقات",
    role: "Sales",
    version: "1.8.0",
    isActive: true,
    companiesCount: 28,
    toolsCount: 6,
    skillsCount: 3,
    industries: ["تجزئة", "عقارات"],
    channels: ["whatsapp"],
    soulPreview: "خبير إقناع يحلل احتياج العميل ويقدم التوصية المناسبة مع حث سريع على الدفع والاشتراك.",
    personaMeta: { tone: "مقنع وديناميكي", language: "arabic" },
    budget: { dailyUsd: 10 },
  },
  {
    slug: "operations-watchdog",
    name: "مدقق العمليات والمخزون",
    role: "Operations",
    version: "1.2.0",
    isActive: true,
    companiesCount: 19,
    toolsCount: 12,
    skillsCount: 5,
    industries: ["سلاسل إمداد", "تجزئة"],
    channels: ["system"],
    soulPreview: "مساعد داخلي يرصد النواقص في المخزون وينبه مديري الفروع لمعدلات الهدر والطلبات المعلقة.",
    personaMeta: { tone: "دقيق وموجز", language: "arabic" },
    budget: { dailyUsd: 3 },
  },
];

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

  const [templates, setTemplates] = useState<TemplateItem[]>(FALLBACK_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [defaultSlug, setDefaultSlug] = useState<string | null>("customer-support-agent");
  const [defaultUpdating, setDefaultUpdating] = useState(false);
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
      const { data } = await apiClient.get("/super-admin/agents/marketplace");
      if (data.success && Array.isArray(data.templates) && data.templates.length > 0) {
        setTemplates(data.templates);
      }
    } catch {
      // Keep fallbacks
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
      if (data.success) await fetchTemplates();
    } catch {
      // Handled
    } finally {
      setSyncing(false);
    }
  };

  const allRoles = [...new Set(templates.map((t) => t.role))].filter(Boolean).sort();
  const allIndustries = [...new Set(templates.flatMap((t) => t.industries || []))].filter(Boolean).sort();

  const filtered = templates.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.role.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q)) return false;
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
    withDailyBudget: templates.filter((t) => t.budget?.dailyUsd).length,
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
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleSetDefault = async (slug: string) => {
    setDefaultUpdating(true);
    try {
      await apiClient.put("/super-admin/agents/default-template", { templateSlug: slug });
      setDefaultSlug(slug);
    } finally {
      setDefaultUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
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
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {stats.total} قالب معتمد
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              إدارة ونشر قوالب وكلاء الذكاء الاصطناعي والمهارات والأدوات المركزية للمنصة
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

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 font-mono">
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي القوالب</span>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums mt-1">{stats.total}</div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">الأدوات المفعلة</span>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">{stats.totalTools}</div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">المهارات المسجلة</span>
            <div className="text-2xl font-bold tracking-tight text-primary tabular-nums mt-1">{stats.totalSkills}</div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">بميزانية يومية</span>
            <div className="text-2xl font-bold tracking-tight text-amber-500 tabular-nums mt-1">{stats.withDailyBudget}</div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">الأدوار</span>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums mt-1">{Object.keys(stats.byRole).length}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs font-mono text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="البحث بالاسم، المعرف، أو الدور..."
            className="pr-8 h-8 text-xs font-mono bg-muted/20 border-border/70"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setFilter("role", e.target.value)}
          className="h-8 rounded-lg border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          <option value="">كل الأدوار</option>
          {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={industryFilter}
          onChange={(e) => setFilter("industry", e.target.value)}
          className="h-8 rounded-lg border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          <option value="">كل المجالات</option>
          {allIndustries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setFilter("status", e.target.value)}
          className="h-8 rounded-lg border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="hidden">مخفي</option>
        </select>
        <span className="text-[11px] text-muted-foreground mr-auto">{filtered.length} من {templates.length}</span>
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

      {/* Main Single-Surface Table Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
                <th className="p-3 w-10">
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
              {filtered.map((t) => (
                <React.Fragment key={t.slug}>
                  <tr
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setExpandedSlug(expandedSlug === t.slug ? null : t.slug)}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedSlugs.has(t.slug)}
                        onCheckedChange={() => toggleSelect(t.slug)}
                        aria-label={`تحديد ${t.name}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-md border border-border/70 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Bot className="size-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground flex items-center gap-1 font-sans">
                            {t.name}
                            {t.slug === defaultSlug && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                                افتراضي
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">{t.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[t.role] || "bg-muted text-muted-foreground"}`}>
                        {t.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${t.isActive !== false ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                        {t.isActive !== false ? "نشط" : "مخفي"}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      <span className="font-bold text-foreground">{t.companiesCount ?? 0}</span>
                      <span className="text-[10px] text-muted-foreground mr-1">شركة</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground tabular-nums">{t.version}</td>
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
                        <Button variant="ghost" size="sm" onClick={() => setPreviewTarget(t)} className="h-7 w-7 p-0" title="معاينة">
                          <Eye className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(t)} className="h-7 w-7 p-0" title="تعديل">
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setApplyTarget(t)} className="h-7 w-7 p-0" title="تطبيق على شركة">
                          <Send className="size-3.5 text-primary" />
                        </Button>
                        {expandedSlug === t.slug ? (
                          <ChevronUp className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedSlug === t.slug && (
                    <tr className="bg-muted/10">
                      <td colSpan={9} className="p-3">
                        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                          {t.soulPreview || "لا توجد تفاصيل إضافية لهذا القالب."}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
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
