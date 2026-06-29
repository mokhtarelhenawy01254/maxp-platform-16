import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import { Bot, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, GripVertical, X } from "lucide-react";

const CATEGORIES = [
  { ar: "المبيعات", en: "Sales" },
  { ar: "التسويق", en: "Marketing" },
  { ar: "المحاسبة", en: "Accounting" },
  { ar: "الدعم الفني", en: "Technical Support" },
  { ar: "خدمة العملاء", en: "Customer Service" },
  { ar: "الموارد البشرية", en: "Human Resources" },
  { ar: "المشتريات", en: "Purchasing" },
  { ar: "المخازن", en: "Warehouse" },
  { ar: "الشحن", en: "Shipping" },
  { ar: "طب", en: "Medical" },
];

interface Personality {
  id: string;
  name: string;
  desc: string;
  tone: string;
  persona: string;
  goal: string;
  tasks?: string;
  boundaries?: string;
}

interface AgentTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
}

interface ReadyProfile {
  slug: string;
  icon: string;
  title: string;
  titleEn?: string;
  category?: string;
  categoryEn?: string;
  desc: string;
  descEn?: string;
  sortOrder: number;
  isActive: boolean;
  personalities: Personality[];
  templateSlug?: string | null;
  lucideIcon?: string | null;
  roleColor?: string | null;
  channels?: string[] | null;
}

const TONES = [
  { value: "friendly", label: "ودود" },
  { value: "formal", label: "رسمي" },
  { value: "concise", label: "مختصر" },
  { value: "detailed", label: "مفصل" },
];

const ICONS = ["🤖", "💼", "🎧", "📦", "📣", "💬", "📊", "🧠", "⚡", "🎯", "🛒", "🔧", "🏥", "🤝", "🔍", "🛍️"];

const LUCIDE_ICON_OPTIONS = [
  'ShoppingCart', 'Headphones', 'Package', 'Megaphone', 'Heart',
  'Bot', 'MessageSquare', 'Phone', 'Mail', 'Globe',
  'Truck', 'CreditCard', 'BarChart', 'FileText', 'Settings',
  'User', 'Shield', 'Bell',
];

const ROLE_COLOR_OPTIONS = [
  { value: 'sales', label: 'مبيعات' },
  { value: 'support', label: 'دعم فني' },
  { value: 'inventory', label: 'مخازن' },
  { value: 'marketing', label: 'تسويق' },
  { value: 'default', label: 'افتراضي' },
];

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'facebook', label: 'فيسبوك' },
  { value: 'dashboard', label: 'لوحة التحكم' },
  { value: 'phone', label: 'هاتف' },
];

const emptyProfile = (): ReadyProfile => ({
  slug: "", icon: "🤖", title: "", titleEn: "", category: "", categoryEn: "",
  desc: "", descEn: "", sortOrder: 0, isActive: true, personalities: [],
  templateSlug: null, lucideIcon: null, roleColor: null, channels: null,
});

const SuperAdminAgentProfiles: React.FC = () => {
  const [profiles, setProfiles] = useState<ReadyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<ReadyProfile>(emptyProfile());
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ReadyProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profilesRes, templatesRes] = await Promise.all([
        apiClient.get<{ success: boolean; profiles: ReadyProfile[] }>("/super-admin/agents/quick-profiles"),
        apiClient.get<{ success: boolean; agents: AgentTemplate[] }>("/super-admin/agents"),
      ]);
      if (profilesRes.data.success) setProfiles(profilesRes.data.profiles || []);
      if (templatesRes.data.success) setTemplates(templatesRes.data.agents || []);
    } catch {
      setError("فشل تحميل الوكلاء الجاهزين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const templateMap = new Map(templates.map((t) => [t.id, t.name]));

  const openCreate = () => {
    setIsNew(true);
    setEditProfile(emptyProfile());
    setSaveErr(null);
    setEditOpen(true);
  };

  const openEdit = (p: ReadyProfile) => {
    setIsNew(false);
    setEditProfile(JSON.parse(JSON.stringify(p)));
    setSaveErr(null);
    setEditOpen(true);
  };

  const addPersonality = () => {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setEditProfile((p) => ({
      ...p,
      personalities: [...p.personalities, { id, name: "", desc: "", tone: "friendly", persona: "", goal: "", tasks: "", boundaries: "" }],
    }));
  };

  const removePersonality = (id: string) => {
    setEditProfile((p) => ({ ...p, personalities: p.personalities.filter((x) => x.id !== id) }));
  };

  const updatePersonality = (id: string, field: keyof Personality, value: string) => {
    setEditProfile((p) => ({
      ...p,
      personalities: p.personalities.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    }));
  };

  const handleSave = async () => {
    if (!editProfile.slug.trim() || !editProfile.title.trim()) {
      setSaveErr("slug و title مطلوبان");
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(editProfile.slug)) {
      setSaveErr("slug: أحرف صغيرة وشرطات فقط");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      if (isNew) {
        await apiClient.post("/super-admin/agents/quick-profiles", editProfile);
      } else {
        await apiClient.put(`/super-admin/agents/quick-profiles/${editProfile.slug}`, editProfile);
      }
      await fetchProfiles();
      setEditOpen(false);
    } catch (e: any) {
      setSaveErr(e?.response?.data?.error || e.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/super-admin/agents/quick-profiles/${deleteTarget.slug}`);
      await fetchProfiles();
      setDeleteTarget(null);
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
    }
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const updated = [...profiles];
    const target = idx + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    updated.forEach((p, i) => (p.sortOrder = i));
    setProfiles(updated);
    apiClient.put("/super-admin/agents/quick-profiles/reorder", {
      slugs: updated.map((p) => p.slug),
    }).catch(() => fetchProfiles());
  };

  const toggleActive = async (p: ReadyProfile) => {
    const updated = { ...p, isActive: !p.isActive };
    try {
      await apiClient.put(`/super-admin/agents/quick-profiles/${p.slug}`, updated);
      await fetchProfiles();
    } catch {
      /* ignore */
    }
  };

  const filtered = profiles.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div className="flex justify-center items-center h-[60vh]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="px-4 py-2 border-b bg-white/80 backdrop-blur-sm shrink-0 flex items-center gap-2">
        <Bot className="size-6 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-bold">الوكلاء الجاهزون</p>
          <p className="text-xs text-muted-foreground">إدارة الوكلاء الجاهزين للإنشاء السريع — {profiles.length} وكيل</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="size-4 ml-1" /> إضافة وكيل</Button>
      </div>

      <div className="px-4 py-2 border-b bg-white/50 shrink-0 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." className="pr-9 h-9 text-sm" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} من {profiles.length}</span>
      </div>

      {error && <Alert variant="destructive" className="mx-4 mt-2 shrink-0"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex-1 overflow-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Bot className="size-16 opacity-15" />
            <p className="text-sm text-muted-foreground">{profiles.length === 0 ? "لا يوجد وكلاء جاهزون بعد" : "لا توجد نتائج"}</p>
            {profiles.length === 0 && <Button variant="outline" size="sm" onClick={openCreate}><Plus className="size-3.5 ml-1" /> أضف أول وكيل</Button>}
          </div>
        ) : (
          <div className="grid gap-4">
            {(() => {
              const grouped = new Map<string, typeof filtered>();
              filtered.forEach((p) => {
                const key = p.category || "أخرى";
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(p);
              });
              return Array.from(grouped.entries()).flatMap(([cat, items]) => [
                <div key={`h-${cat}`} className="flex items-center gap-2 pt-1 first:pt-0">
                  <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">{cat}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>,
                ...items.map((p) => {
                  const realIdx = filtered.indexOf(p);
                  return (
                  <div key={p.slug} className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-1 pt-1">
                  <button onClick={() => moveItem(realIdx, -1)} disabled={realIdx === 0} className="size-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground disabled:opacity-20"><ChevronUp className="size-3.5" /></button>
                  <button onClick={() => moveItem(realIdx, 1)} disabled={realIdx === filtered.length - 1} className="size-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground disabled:opacity-20"><ChevronDown className="size-3.5" /></button>
                </div>
                <span className="text-2xl flex-shrink-0">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold">{p.title}</p>
                    {p.titleEn && <span className="text-xs text-muted-foreground/50">({p.titleEn})</span>}
                    <Badge variant="outline" className="text-[10px]">{p.slug}</Badge>
                    {p.category && <span className="text-xs text-indigo-500 font-medium">{p.category}</span>}
                    {p.templateSlug && <Badge variant="secondary" className="text-[10px]">{templateMap.get(p.templateSlug) || p.templateSlug}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc || p.descEn || "—"}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Switch checked={p.isActive} onCheckedChange={() => toggleActive(p)} />
                    <span className="text-xs text-muted-foreground">{p.isActive ? "نشط" : "متوقف"}</span>
                    <span className="text-xs text-muted-foreground/50">{p.personalities?.length || 0} شخصية</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(p)}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            ); })
          ]);
        })()}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o && !saving) setEditOpen(false); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? "إضافة وكيل جاهز" : "تعديل الوكيل"}</DialogTitle></DialogHeader>
          {saveErr && <Alert variant="destructive"><AlertDescription>{saveErr}</AlertDescription></Alert>}
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">المعرّف (slug) *</label>
                <Input value={editProfile.slug}
                  onChange={(e) => setEditProfile((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))}
                  disabled={!isNew} className="h-9 text-sm" placeholder="sales-agent" />
                <p className="text-[10px] text-muted-foreground">أحرف إنجليزية صغيرة وشرطات فقط</p>
              </div>
              <div className="flex-shrink-0">
                <label className="text-xs font-medium text-muted-foreground block mb-1">الأيقونة</label>
                <div className="grid grid-cols-4 gap-0.5">
                  {ICONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => setEditProfile((p) => ({ ...p, icon }))}
                      className={`size-7 flex items-center justify-center rounded-md text-sm border transition-colors ${
                        editProfile.icon === icon ? "border-primary bg-primary/10" : "border hover:border-foreground/30"
                      }`}>{icon}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">القالب (Template)</label>
              <select value={editProfile.templateSlug || ""} onChange={(e) => setEditProfile((p) => ({ ...p, templateSlug: e.target.value || null }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">— بدون قالب —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">العنوان (عربي) *</label>
                <Input value={editProfile.title} onChange={(e) => setEditProfile((p) => ({ ...p, title: e.target.value }))} className="h-9 text-sm" placeholder="مندوب مبيعات شامل" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">العنوان (إنجليزي)</label>
                <Input value={editProfile.titleEn || ""} onChange={(e) => setEditProfile((p) => ({ ...p, titleEn: e.target.value }))} className="h-9 text-sm" placeholder="Sales Agent" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">التصنيف</label>
              <Select
                value={editProfile.category || ""}
                onValueChange={(val) => {
                  const cat = CATEGORIES.find((c) => c.ar === val);
                  setEditProfile((p) => ({ ...p, category: val, categoryEn: cat?.en || "" }));
                }}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر تصنيف" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.ar} value={c.ar}>{c.ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">أيقونة Lucide</label>
              <Select value={editProfile.lucideIcon || ""} onValueChange={(v) => setEditProfile((p) => ({ ...p, lucideIcon: v || null }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="افتراضي" /></SelectTrigger>
                <SelectContent>
                  {LUCIDE_ICON_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">لون البطاقة</label>
              <Select value={editProfile.roleColor || ""} onValueChange={(v) => setEditProfile((p) => ({ ...p, roleColor: v || null }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="افتراضي" /></SelectTrigger>
                <SelectContent>
                  {ROLE_COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className="size-3 rounded-full inline-block" style={{ background: `var(--role-${c.value})` }} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">القنوات</label>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((ch) => {
                  const selected = editProfile.channels?.includes(ch.value) || false;
                  return (
                    <button key={ch.value} type="button" onClick={() => {
                      const next = selected
                        ? (editProfile.channels || []).filter((v) => v !== ch.value)
                        : [...(editProfile.channels || []), ch.value];
                      setEditProfile((p) => ({ ...p, channels: next.length > 0 ? next : null }));
                    }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:border-foreground/30'
                      }`}
                    >{ch.label}</button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">الوصف (عربي)</label>
                <Textarea value={editProfile.desc} onChange={(e) => setEditProfile((p) => ({ ...p, desc: e.target.value }))} className="text-sm min-h-[60px]" placeholder="وكيل مبيعات متكامل..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">الوصف (إنجليزي)</label>
                <Textarea value={editProfile.descEn || ""} onChange={(e) => setEditProfile((p) => ({ ...p, descEn: e.target.value }))} className="text-sm min-h-[60px]" placeholder="Integrated sales agent..." />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">الشخصيات</label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addPersonality}>
                  <Plus className="size-3 ml-1" /> إضافة شخصية
                </Button>
              </div>
              {editProfile.personalities.length === 0 && (
                <p className="text-xs text-muted-foreground/50">لا توجد شخصيات — أضف شخصية واحدة على الأقل</p>
              )}
              <div className="space-y-3">
                {editProfile.personalities.map((pers) => (
                  <div key={pers.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">شخصية</span>
                      <button onClick={() => removePersonality(pers.id)} className="size-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={pers.name} onChange={(e) => updatePersonality(pers.id, "name", e.target.value)} className="h-8 text-sm" placeholder="الاسم (ودود)" />
                      <select value={pers.tone} onChange={(e) => updatePersonality(pers.id, "tone", e.target.value)}
                        className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                        {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <Input value={pers.desc} onChange={(e) => updatePersonality(pers.id, "desc", e.target.value)} className="h-8 text-sm" placeholder="الوصف (أسلوب ودود ومتعاون)" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={pers.persona} onChange={(e) => updatePersonality(pers.id, "persona", e.target.value)} className="h-8 text-sm" placeholder="الشخصية (مندوب مبيعات ودود)" />
                      <Input value={pers.goal} onChange={(e) => updatePersonality(pers.id, "goal", e.target.value)} className="h-8 text-sm" placeholder="الهدف (تساعد العملاء...)" />
                    </div>
                    <Textarea value={pers.tasks || ""} onChange={(e) => updatePersonality(pers.id, "tasks", e.target.value)} className="text-xs min-h-[50px]" placeholder="المهام الأساسية (مثال: يعرض المنتجات، ينشئ الطلبات، يتابع الشحنات)" />
                    <Textarea value={pers.boundaries || ""} onChange={(e) => updatePersonality(pers.id, "boundaries", e.target.value)} className="text-xs min-h-[50px]" placeholder="الحدود (مثال: ما يقدم خصومات غير مصرح بها، ما يضغط على العميل)" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={editProfile.isActive} onCheckedChange={(v) => setEditProfile((p) => ({ ...p, isActive: v }))} />
              <span className="text-xs text-muted-foreground">{editProfile.isActive ? "نشط" : "متوقف"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : <Plus className="size-4 ml-1" />}
              {isNew ? "إضافة" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>حذف الوكيل الجاهز</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف "{deleteTarget?.title}"؟ هذا الإجراء لا رجعة فيه.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <LoadingSpinner size="sm" /> : <Trash2 className="size-4 ml-1" />} حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminAgentProfiles;
