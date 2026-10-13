import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Checkbox } from "../../components/ui/checkbox";
import { apiClient } from "../../services/apiClient";
import { Bot, Search, Eye, Pencil, Copy, Send, Trash2, ChevronDown, ChevronUp, Plus, Layers, ExternalLink, CheckSquare, CheckCheck, X, RefreshCw } from "lucide-react";
import {
  CreateDialog, EditDialog, PreviewDialog, ApplyDialog, DeleteDialog, DuplicateDialog,
  ROLE_ICONS, ROLE_COLORS, toneColors, TemplateItem,
} from "./SuperAdminAITemplatesDialogs";

/* ════════════════════════════════════════════════
   Main Page
   ════════════════════════════════════════════════ */
const SuperAdminAITemplates: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const roleFilter = searchParams.get("role") || "";
  const industryFilter = searchParams.get("industry") || "";
  const statusFilter = searchParams.get("status") || "";
  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams(prev => { const next = new URLSearchParams(prev); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true });
  }, [setSearchParams]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [defaultSlug, setDefaultSlug] = useState<string | null>(null);
  const [defaultUpdating, setDefaultUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TemplateItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<TemplateItem | null>(null);
  const [applyTarget, setApplyTarget] = useState<TemplateItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateItem | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<TemplateItem | null>(null);

  const handleSyncTemplates = async () => {
    try {
      setSyncing(true);
      const { data } = await apiClient.post("/super-admin/agents/sync-templates");
      if (data.success) {
        await fetchTemplates();
      }
    } catch {
      setError("فشل مزامنة القوالب مع ملفات النظام");
    } finally {
      setSyncing(false);
    }
  };

  const fetchTemplates = async () => {
    try { setLoading(true); const { data } = await apiClient.get("/super-admin/agents/marketplace"); if (data.success) setTemplates(data.templates); }
    catch { setError("فشل تحميل قوالب الذكاء الاصطناعي"); }
    finally { setLoading(false); }
  };

  const fetchDefaultTemplate = async () => {
    try { const { data } = await apiClient.get("/super-admin/agents/default-template"); if (data.success) setDefaultSlug(data.templateSlug); }
    catch { /* ignore */ }
  };

  useEffect(() => { fetchTemplates(); fetchDefaultTemplate(); }, []);

  const allRoles = [...new Set(templates.map(t => t.role))].sort();
  const allIndustries = [...new Set(templates.flatMap(t => t.industries))].sort();

  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.role.toLowerCase().includes(search.toLowerCase()) && !t.slug.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && t.role !== roleFilter) return false;
    if (industryFilter && !t.industries.includes(industryFilter)) return false;
    if (statusFilter === "active" && t.isActive === false) return false;
    if (statusFilter === "hidden" && t.isActive !== false) return false;
    return true;
  });

  const stats = {
    total: templates.length,
    byRole: templates.reduce<Record<string, number>>((acc, t) => { acc[t.role] = (acc[t.role] || 0) + 1; return acc; }, {}),
    totalTools: templates.reduce((s, t) => s + t.toolsCount, 0),
    totalSkills: templates.reduce((s, t) => s + t.skillsCount, 0),
    withDailyBudget: templates.filter(t => t.budget?.dailyUsd).length,
  };

  const filteredSlugs = new Set(filtered.map(t => t.slug));
  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedSlugs.has(t.slug));

  const toggleSelect = (slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedSlugs(prev => { const next = new Set(prev); filteredSlugs.forEach(s => next.delete(s)); return next; });
    } else {
      setSelectedSlugs(prev => { const next = new Set(prev); filteredSlugs.forEach(s => next.add(s)); return next; });
    }
  };

  const handleBulkStatus = async (isActive: boolean) => {
    const slugs = [...selectedSlugs];
    if (!slugs.length) return;
    setBulkUpdating(true);
    try {
      await apiClient.patch("/super-admin/agents/bulk-status", { slugs, isActive });
      await fetchTemplates();
      setSelectedSlugs(new Set());
    } catch { /* toast handled by interceptor */ }
    finally { setBulkUpdating(false); }
  };

  const handleSetDefault = async (slug: string) => {
    setDefaultUpdating(true);
    try {
      await apiClient.put("/super-admin/agents/default-template", { templateSlug: slug });
      setDefaultSlug(slug);
    } catch { /* toast handled by interceptor */ }
    finally { setDefaultUpdating(false); }
  };

  if (loading) return <div className="flex justify-center items-center h-[60vh]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="w-full space-y-4 p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                سوق قوالب الذكاء الاصطناعي
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {stats.total} قالب معتمد
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              إدارة ونشر قوالب وكلاء الذكاء الاصطناعي والمهارات والأدوات المركزية للمنصة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={handleSyncTemplates} disabled={syncing} className="h-8 text-xs font-mono gap-1.5 active:scale-[0.98]">
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>مزامنة الملفات</span>
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm" className="h-8 text-xs font-mono gap-1.5 active:scale-[0.98] shadow-xs">
            <Plus className="size-3.5" />
            <span>قالب جديد</span>
          </Button>
        </div>
      </div>

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <span className="text-[11px] font-medium text-muted-foreground">إجمالي القوالب</span>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-1">{stats.total}</div>
        </div>
        <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <span className="text-[11px] font-medium text-muted-foreground">الأدوات المفعلة</span>
          <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">{stats.totalTools}</div>
        </div>
        <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <span className="text-[11px] font-medium text-muted-foreground">المهارات المسجلة</span>
          <div className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-1">{stats.totalSkills}</div>
        </div>
        <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <span className="text-[11px] font-medium text-muted-foreground">قوالب بميزانية يومية</span>
          <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1">{stats.withDailyBudget}</div>
        </div>
        <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <span className="text-[11px] font-medium text-muted-foreground">الأدوار الوظيفية</span>
          <div className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono tabular-nums mt-1">{Object.keys(stats.byRole).length}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-border/80 bg-card/40">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={e => setFilter("search", e.target.value)} placeholder="ابحث برقم القالب أو الدور أو الاسم..." className="pr-8 h-8 text-xs font-mono bg-background/50" />
        </div>
        <select value={roleFilter} onChange={e => setFilter("role", e.target.value)}
          className="h-8 rounded-lg border border-input bg-background/50 px-2.5 text-xs text-foreground focus:outline-none">
          <option value="">كل الأدوار</option>
          {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={industryFilter} onChange={e => setFilter("industry", e.target.value)}
          className="h-8 rounded-lg border border-input bg-background/50 px-2.5 text-xs text-foreground focus:outline-none">
          <option value="">كل المجالات</option>
          {allIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setFilter("status", e.target.value)}
          className="h-8 rounded-lg border border-input bg-background/50 px-2.5 text-xs text-foreground focus:outline-none">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="hidden">مخفي</option>
        </select>
        <span className="text-[11px] font-mono text-muted-foreground mr-auto">{filtered.length} من {templates.length}</span>
      </div>

      {error && <Alert variant="destructive" className="mx-4 mt-2 shrink-0"><AlertDescription>{error}</AlertDescription><div className="mt-1"><Button variant="outline" size="sm" onClick={fetchTemplates}>إعادة المحاولة</Button></div></Alert>}

      {/* Bulk action bar */}
      {selectedSlugs.size > 0 && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 shrink-0 flex items-center gap-3">
          <CheckCheck className="size-4 text-primary" />
          <span className="text-sm font-medium">{selectedSlugs.size} قالب محدد</span>
          <div className="flex gap-2 mr-auto">
            <Button variant="outline" size="sm" disabled={bulkUpdating} onClick={() => handleBulkStatus(true)}>
              <CheckSquare className="size-3.5 ml-1" /> تفعيل
            </Button>
            <Button variant="outline" size="sm" disabled={bulkUpdating} onClick={() => handleBulkStatus(false)}>
              <X className="size-3.5 ml-1" /> إيقاف
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedSlugs(new Set())}>
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Bot className="size-16 opacity-15" />
            <p className="text-sm text-muted-foreground">لا توجد قوالب تطابق بحثك</p>
            <Button variant="outline" size="sm" onClick={() => { setFilter("search", ""); setFilter("role", ""); setFilter("industry", ""); }}>مسح الفلتر</Button>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="p-3 w-10">
                    <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} aria-label="تحديد الكل" />
                  </th>
                  <th className="text-right p-3 font-medium">القالب</th>
                  <th className="text-right p-3 font-medium">الدور</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                  <th className="text-right p-3 font-medium">الشركات</th>
                  <th className="text-right p-3 font-medium">الإصدار</th>
                  <th className="text-right p-3 font-medium">المجالات</th>
                  <th className="text-right p-3 font-medium">الإحصائيات</th>
                  <th className="text-right p-3 font-medium">القنوات</th>
                  <th className="text-left p-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <React.Fragment key={t.slug}>
                    <tr
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedSlug(expandedSlug === t.slug ? null : t.slug)}
                    >
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedSlugs.has(t.slug)} onCheckedChange={() => toggleSelect(t.slug)} aria-label={`تحديد ${t.name}`} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{t.icon || ROLE_ICONS[t.role] || "🤖"}</span>
                          <div>
                            <button onClick={e => { e.stopPropagation(); navigate(`/super-admin/ai-templates/${t.slug}`); }} className="text-sm font-semibold hover:text-primary transition-colors flex items-center gap-1">
                              {t.name} <ExternalLink className="size-3 opacity-50" />
                            </button>
                            <p className="text-[0.7rem] text-muted-foreground font-mono">{t.slug}</p>
                            {t.slug === defaultSlug && (
                              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">افتراضي</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[t.role] || "bg-gray-100 text-gray-700"}`}>{t.role}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full font-medium ${t.isActive !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {t.isActive !== false ? "نشط" : "مخفي"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-semibold text-primary">{t.companiesCount ?? 0}</span>
                        <span className="text-[0.65rem] text-muted-foreground mr-1">شركة</span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{t.version}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {t.industries.slice(0, 2).map(ind => (<span key={ind} className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary">{ind}</span>))}
                          {t.industries.length > 2 && <span className="text-[0.65rem] text-muted-foreground">+{t.industries.length - 2}</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
                          <span>{t.toolsCount} أداة</span><span>{t.skillsCount} مهارة</span>
                          {t.budget?.dailyUsd && <span>${t.budget.dailyUsd}/d</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">{t.channels.slice(0, 2).map(ch => (<Badge key={ch} variant="outline" className="text-[0.65rem] h-4">{ch}</Badge>))}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-xs" onClick={() => navigate(`/super-admin/ai-templates/${t.slug}`)} title="التفاصيل"><ExternalLink className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => setPreviewTarget(t)} title="معاينة"><Eye className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => setEditTarget(t)} title="تعديل"><Pencil className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => setDuplicateTarget(t)} title="نسخ"><Copy className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => setApplyTarget(t)} title="تطبيق على شركة"><Send className="size-3.5" /></Button>
                          {t.slug !== defaultSlug && (
                            <Button variant="ghost" size="icon-xs" disabled={defaultUpdating} onClick={() => handleSetDefault(t.slug)} title="تعيين كافتراضي" className="text-amber-600 hover:text-amber-700">
                              <CheckCheck className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(t)} title="حذف"><Trash2 className="size-3.5 text-red-500" /></Button>
                          {expandedSlug === t.slug ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                        </div>
                      </td>
                    </tr>
                    {expandedSlug === t.slug && (
                      <tr className="bg-muted/20">
                        <td colSpan={10} className="p-3">
                          <div className="flex gap-4">
                            {t.soulPreview && <div className="flex-1"><p className="text-[0.7rem] font-bold text-muted-foreground mb-1">لمحة عن الشخصية</p><p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4 dir-rtl">{t.soulPreview}</p></div>}
                            {t.personaMeta?.tone && (
                              <div className="shrink-0">
                                <p className="text-[0.7rem] font-bold text-muted-foreground mb-1">الشخصية</p>
                                <div className="flex flex-wrap gap-1">
                                  <span className={`text-[0.7rem] px-1.5 py-0.5 rounded-full font-medium ${toneColors[t.personaMeta.tone] || "bg-gray-100 text-gray-700"}`}>{t.personaMeta.tone}</span>
                                  {t.personaMeta.language && <Badge variant="outline" className="text-[0.65rem]">{t.personaMeta.language === "arabic" ? "عربي" : t.personaMeta.language}</Badge>}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

const StatBox: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-lg bg-white border p-2 text-center">
    <p className="text-lg font-bold text-primary">{value}</p>
    <p className="text-[0.7rem] text-muted-foreground">{label}</p>
  </div>
);

export default SuperAdminAITemplates;
