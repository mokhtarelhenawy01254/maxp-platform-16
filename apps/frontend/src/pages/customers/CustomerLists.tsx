import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Layers, Plus, Search, RefreshCw, Pencil, Trash2, Eye,
  Send, ListFilter, Clock, ShoppingBag, TrendingUp,
  Loader2, FileDown, CheckCircle2, Ban, Tag, Wallet, Star,
  Landmark, FileText, ArrowDownUp, Sparkles, Crown, Heart,
  AlertTriangle, Copy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { broadcastService } from "../../services/broadcastService";
import { customerService } from "../../services/customerService";
import { WhatsAppMetricCard } from "../whatsapp/components/WhatsAppPageShell";
import { cn } from "@/lib/utils";

interface CustomerList {
  id: string;
  name: string;
  description: string;
  count: number;
  criteria: any;
  isDefault?: boolean;
  isStale?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ListMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastActivity: string;
  createdAt: string;
  status: string;
  rating: string;
  tags: string;
  totalSpent?: number;
  ordersCount?: number;
  rfmScore?: number;
  rfmTier?: "gold" | "silver" | "bronze" | "lead";
}

const RFM_TIER_META: Record<string, { label: string; cls: string }> = {
  gold: { label: "ذهبي", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  silver: { label: "فضي", cls: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  bronze: { label: "برونزي", cls: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  lead: { label: "عادي", cls: "bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]" },
};

function rfmTierMeta(tier?: string): { label: string; cls: string } {
  return RFM_TIER_META[tier || "lead"] ?? RFM_TIER_META["lead"] ?? { label: "عادي", cls: "" };
}

const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'SCHEDULED', 'PROCESSING', 'SHIPPED', 'DELIVERED',
  'CANCELLED', 'REFUNDED', 'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED',
  'PARTIALLY_REFUNDED', 'READY_TO_SHIP', 'ON_HOLD', 'OUT_FOR_DELIVERY',
  'LOST', 'PREPARING', 'QUALITY_CHECK', 'PACKAGED', 'PARTIALLY_DELIVERED',
  'STOCK_SHORTAGE', 'PENDING_CANCELLATION',
];

const RETURN_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED'];
const RATINGS = ['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR', 'UNKNOWN'];

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: "تم التسليم",
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  SCHEDULED: "مجدول",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  CANCELLED: "ملغي",
  REFUNDED: "مسترجع",
  RETURNED: "مرتجع",
  PARTIALLY_RETURNED: "مرتجع جزئياً",
  EXCHANGED: "مستبدل",
  PARTIALLY_REFUNDED: "مسترجع جزئياً",
  READY_TO_SHIP: "جاهز للشحن",
  ON_HOLD: "قيد الانتظار",
  OUT_FOR_DELIVERY: "خارج للتوصيل",
  LOST: "ضائع",
  PREPARING: "يتم تجهيزه",
  QUALITY_CHECK: "فحص الجودة",
  PACKAGED: "تم التغليف",
  PARTIALLY_DELIVERED: "تم التسليم جزئياً",
  STOCK_SHORTAGE: "نقص في المخزون",
  PENDING_CANCELLATION: "إلغاء معلق",
  APPROVED: "موافقة",
  REJECTED: "مرفوض",
  COMPLETED: "مكتمل",
  PARTIALLY_PAID: "مدفوع جزئياً",
  FAILED: "فشل",
  EXCELLENT: "ممتاز",
  GOOD: "جيد",
  AVERAGE: "متوسط",
  POOR: "ضعيف",
  UNKNOWN: "غير معروف",
};

const CRITERIA_TYPES = [
  { value: "all", label: "جميع العملاء النشطين", icon: Users, hint: "كل العملاء النشطين" },
  { value: "active", label: "نشط خلال فترة", icon: Clock, hint: "عملاء تواصلوا خلال آخر X ساعة" },
  { value: "inactive", label: "غير نشط منذ فترة", icon: Clock, hint: "عملاء لم يتواصلوا منذ X يوم" },
  { value: "tag", label: "يحمل وسم (Tag)", icon: Tag, hint: "عملاء لديهم وسم محدد" },
  { value: "orderStatus", label: "حالة طلب خلال فترة", icon: ShoppingBag, hint: "عملاء عندهم طلب بحالة معينة" },
  { value: "returnRequest", label: "طلبات مرتجع", icon: FileText, hint: "عملاء قاموا بطلب مرتجع" },
  { value: "paymentStatus", label: "حالة الدفع", icon: Wallet, hint: "عملاء بحالة دفع لطلباتهم" },
  { value: "city", label: "المدينة", icon: Landmark, hint: "عملاء من مدينة معينة" },
  { value: "customerRating", label: "التقييم", icon: Star, hint: "عملاء بتقييم محدد" },
  { value: "latest", label: "الأحدث", icon: ArrowDownUp, hint: "أحدث N عملاء" },
  { value: "oldest", label: "الأقدم", icon: ArrowDownUp, hint: "أقدم N عملاء" },
  { value: "minTotalSpent", label: "إجمالي الإنفاق", icon: Wallet, hint: "عملاء أنفقوا أكثر من مبلغ" },
  { value: "minOrdersCount", label: "عدد الطلبات", icon: ShoppingBag, hint: "عملاء لديهم N طلب أو أكثر" },
  { value: "nps", label: "NPS (مروّج/محايد/منتقد)", icon: Star, hint: "فلترة حسب وسم NPS 9-10 / 7-8 / 0-6" },
  { value: "waitlist", label: "قائمة انتظار مقاس", icon: Heart, hint: "عملاء في Wishlist بمقاس محدد" },
] as const;

type CriteriaType = (typeof CRITERIA_TYPES)[number]["value"];

const SMART_PRESETS = [
  {
    value: "champions",
    label: "أفضل العملاء",
    icon: Crown,
    hint: "نشطون + كثيرو الطلبات + إنفاق مرتفع — عرض ولاء",
  },
  {
    value: "loyal",
    label: "العملاء الأوفياء",
    icon: Heart,
    hint: "5 طلبات أو أكثر — رشّحهم لبرنامج الولاء",
  },
  {
    value: "atRisk",
    label: "معرضون للفقدان",
    icon: AlertTriangle,
    hint: "كانوا مشترين لكن غير نشطين 30 يوم — أعد التنشيط",
  },
  {
    value: "new",
    label: "عملاء جدد",
    icon: Sparkles,
    hint: "أحدث 100 عميل — رحّب بهم",
  },
] as const;

function buildEmptyCriteria(type: CriteriaType): Record<string, any> {
  switch (type) {
    case "active": return { type, hours: 24 };
    case "inactive": return { type, days: 7 };
    case "orderStatus": return { type, status: "DELIVERED", days: 30 };
    case "returnRequest": return { type, status: "APPROVED", days: 30 };
    case "paymentStatus": return { type, status: "COMPLETED", days: 30 };
    case "city": return { type, city: "" };
    case "customerRating": return { type, rating: "EXCELLENT" };
    case "latest": return { type, limit: 100 };
    case "oldest": return { type, limit: 100 };
    case "minTotalSpent": return { type, amount: 1000 };
    case "minOrdersCount": return { type, count: 2 };
    case "tag": return { type, tag: "" };
    default: return { type };
  }
}

function buildPresetCriteria(preset: string): Record<string, any> {
  return { type: "preset", preset };
}

function criteriaSummary(criteria: any): string {
  if (!criteria) return "جميع العملاء النشطين";
  const c = typeof criteria === "string" ? (() => { try { return JSON.parse(criteria); } catch { return {}; } })() : criteria;
  const type = c.type || "all";
  switch (type) {
    case "active": return `نشط خلال آخر ${c.hours ?? 24} ساعة`;
    case "inactive": return `غير نشط منذ ${c.days ?? 7} يوم`;
    case "tag": return `يحمل وسم: ${c.tag}`;
    case "orderStatus": return c.days ? `طلبات "${STATUS_LABELS[c.status] || c.status}" خلال ${c.days} يوم` : `طلبات بحالة "${STATUS_LABELS[c.status] || c.status}"`;
    case "returnRequest": return c.days ? `مرتجعات "${STATUS_LABELS[c.status] || c.status || "الكل"}" خلال ${c.days} يوم` : `مرتجعات بحالة "${STATUS_LABELS[c.status] || c.status || "الكل"}"`;
    case "paymentStatus": return c.days ? `دفع "${STATUS_LABELS[c.status] || c.status}" خلال ${c.days} يوم` : `دفع بحالة "${STATUS_LABELS[c.status] || c.status}"`;
    case "city": return `من مدينة: ${c.city}`;
    case "customerRating": return `التقييم: ${STATUS_LABELS[c.rating] || c.rating}`;
    case "latest": return `أحدث ${c.limit ?? 100} عميل`;
    case "oldest": return `أقدم ${c.limit ?? 100} عميل`;
    case "minTotalSpent": return `إجمالي إنفاق ≥ ${c.amount}`;
    case "minOrdersCount": return `عدد طلبات ≥ ${c.count}`;
    case "preset": {
      const preset = SMART_PRESETS.find((p) => p.value === c.preset);
      return preset ? preset.label : "قائمة جاهزة";
    }
    default: return "جميع العملاء النشطين";
  }
}

const PER_PAGE = 20;

const CustomerLists: React.FC = () => {
  const navigate = useNavigate();

  const [lists, setLists] = useState<CustomerList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "custom" | "default">("all");

  const [stats, setStats] = useState({ totalLists: 0, totalMembers: 0, active24h: 0, newThisMonth: 0 });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomerList | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCriteriaType, setFormCriteriaType] = useState<CriteriaType>("all");
  const [formCriteria, setFormCriteria] = useState<any>({ type: "all" });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<CustomerList | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailList, setDetailList] = useState<CustomerList | null>(null);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotal, setMembersTotal] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");

  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLists = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await broadcastService.getCustomerLists();
      const arr = Array.isArray(res) ? res : (res as any)?.data || [];
      setLists(arr);

      const custom = arr.filter((l: CustomerList) => !l.isDefault);
      const totalMembers = arr.reduce((s: number, l: CustomerList) => s + (l.count || 0), 0);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const newThisMonth = custom.filter((l: CustomerList) => {
        const d = l.createdAt ? new Date(l.createdAt) : null;
        return d && d >= monthStart;
      }).length;

      const active24h = (arr.find((l: CustomerList) => l.id === "active-24h") as CustomerList | undefined)?.count || 0;

      setStats({
        totalLists: arr.length,
        totalMembers,
        active24h,
        newThisMonth,
      });
    } catch (err: any) {
      toast.error(err?.message || "فشل في تحميل قوائم العملاء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadLists(); }, [loadLists]);

  const loadTags = useCallback(async () => {
    try {
      const res = await customerService.getDistinctTags();
      const tags = Array.isArray(res) ? res.map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean) : [];
      setAvailableTags(tags);
    } catch { /* تجاهل */ }
  }, []);

  useEffect(() => { void loadTags(); }, [loadTags]);

  const filteredLists = useMemo(() => {
    let out = lists;
    if (filterType === "custom") out = out.filter((l) => !l.isDefault);
    if (filterType === "default") out = out.filter((l) => l.isDefault);
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      out = out.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        (l.description || "").toLowerCase().includes(q) ||
        criteriaSummary(l.criteria).toLowerCase().includes(q),
      );
    }
    return out;
  }, [lists, filterType, searchTerm]);

  const openCreate = () => {
    setEditingList(null);
    setFormName("");
    setFormDescription("");
    setFormCriteriaType("all");
    setFormCriteria({ type: "all" });
    setPreviewCount(null);
    setDialogOpen(true);
  };

  const openEdit = (list: CustomerList) => {
    const c = typeof list.criteria === "string" ? (() => { try { return JSON.parse(list.criteria); } catch { return { type: "all" }; } })() : (list.criteria || { type: "all" });
    const isPreset = c.type === "preset" && SMART_PRESETS.some((p) => p.value === c.preset);
    const type = (c.type && CRITERIA_TYPES.some((t) => t.value === c.type) ? c.type : "all") as CriteriaType;
    setEditingList(list);
    setFormName(list.name);
    setFormDescription(list.description || "");
    setFormCriteriaType(type);
    setFormCriteria(isPreset ? { ...c, type: "preset" } : { ...c, type });
    setPreviewCount(null);
    setDialogOpen(true);
  };

  const changeCriteriaType = (type: string) => {
    const t = type as CriteriaType;
    const exclude = formCriteria.excludeContactedInDays;
    setFormCriteriaType(t);
    setFormCriteria({ ...buildEmptyCriteria(t), ...(exclude ? { excludeContactedInDays: exclude } : {}) });
    setPreviewCount(null);
  };

  const updateCriteriaField = (key: string, value: any) => {
    setFormCriteria((prev: any) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!dialogOpen) return;
      setPreviewLoading(true);
      try {
        const res = await broadcastService.previewCustomerListCount(formCriteria);
        if (!cancelled) setPreviewCount(res?.data?.count ?? null);
      } catch {
        if (!cancelled) setPreviewCount(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [formCriteria, dialogOpen]);

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("اسم القائمة مطلوب"); return; }
    setSaving(true);
    try {
      const payload = { name: formName.trim(), description: formDescription.trim(), criteria: formCriteria };
      if (editingList) {
        await broadcastService.updateCustomerList(editingList.id, payload);
        toast.success("تم تحديث القائمة بنجاح");
      } else {
        await broadcastService.createCustomerList(payload);
        toast.success("تم إنشاء القائمة بنجاح");
      }
      setDialogOpen(false);
      void loadLists(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await broadcastService.deleteCustomerList(deleteTarget.id);
      toast.success("تم حذف القائمة");
      setDeleteTarget(null);
      void loadLists(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل في حذف القائمة");
    } finally {
      setDeleting(false);
    }
  };

  const handleRefreshCount = async (list: CustomerList) => {
    if (list.isDefault) return;
    setRefreshingId(list.id);
    try {
      await broadcastService.refreshCustomerListCount(list.id);
      toast.success("تم تحديث عدد العملاء");
      void loadLists(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل في تحديث العدد");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDuplicate = async (list: CustomerList) => {
    if (list.isDefault) return;
    setSaving(true);
    try {
      const criteria = typeof list.criteria === "string" ? (() => { try { return JSON.parse(list.criteria); } catch { return {}; } })() : (list.criteria || {});
      await broadcastService.createCustomerList({
        name: `${list.name} (نسخة)`,
        description: list.description || "",
        criteria,
      });
      toast.success("تم إنشاء نسخة من القائمة");
      void loadLists(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل في نسخ القائمة");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (list: CustomerList, page = 1, search = memberSearch) => {
    setDetailList(list);
    setMembersPage(page);
    setMembersLoading(true);
    try {
      const res = await broadcastService.getCustomersInListPaginated(list.id, page, PER_PAGE, search);
      setMembers(res?.data || []);
      setMembersTotal(res?.total ?? (res?.data?.length || 0));
    } catch (err: any) {
      toast.error(err?.message || "فشل في تحميل العملاء");
      setMembers([]);
      setMembersTotal(0);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleMemberPage = async (page: number) => {
    if (!detailList) return;
    setMembersPage(page);
    await openDetail(detailList, page);
  };

  const handleWhatsAppSend = (list: CustomerList) => {
    navigate(`/whatsapp/template-broadcast?listId=${encodeURIComponent(list.id)}`);
  };

  const exportCsv = () => {
    if (!members.length) return;
    const header = ["الاسم", "الهاتف", "البريد", "آخر نشاط", "التقييم"];
    const rows = members.map((m) => [m.name, m.phone, m.email, m.lastActivity, m.rating]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detailList?.name || "customers-list"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("ar-EG");
    } catch {
      return "—";
    }
  };

  return (
    <div className="min-h-full space-y-4 px-1 py-2 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:px-6 sm:py-4 lg:px-8">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-soft sm:rounded-3xl sm:shadow-raised">
        <div className="flex flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:px-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-2 sm:gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:size-12 sm:rounded-2xl">
                <Layers className="size-5 sm:size-6" />
              </div>
              <div className="min-w-0 space-y-1 sm:space-y-2">
                <Badge variant="outline" className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2 text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] sm:px-2.5 sm:text-[10px]">
                  Customer Lists
                </Badge>
                <div className="space-y-0.5 sm:space-y-1">
                  <h1 className="text-balance font-heading text-xl font-semibold tracking-normal text-[color:var(--color-foreground)] sm:text-[2rem]">
                    إدارة قوائم العملاء
                  </h1>
                  <p className="max-w-3xl text-xs leading-5 text-[color:var(--color-muted-foreground)] sm:text-sm sm:leading-6 sm:text-[0.95rem]">
                    أنشئ قوائم عملاء ذكية حسب النشاط والطلبات والمرتجعات، ثم أرسلها مباشرة عبر واتساب.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:justify-end">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => void loadLists()}>
                <RefreshCw className="size-4" /> تحديث
              </Button>
              <Button size="sm" className="rounded-full" onClick={openCreate}>
                <Plus className="size-4" /> قائمة جديدة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <WhatsAppMetricCard label="إجمالي القوائم" value={stats.totalLists.toLocaleString("ar-EG")} hint="قوائم افتراضية ومخصصة" icon={Layers} tone="primary" />
        <WhatsAppMetricCard label="إجمالي العملاء" value={stats.totalMembers.toLocaleString("ar-EG")} hint="عبر كل القوائم" icon={Users} tone="info" />
        <WhatsAppMetricCard label="نشط خلال 24 ساعة" value={stats.active24h.toLocaleString("ar-EG")} hint="عملاء تواصلوا اليوم" icon={TrendingUp} tone="success" />
        <WhatsAppMetricCard label="قوائم جديدة هذا الشهر" value={stats.newThisMonth.toLocaleString("ar-EG")} hint="مخصصة أُنشئت حديثاً" icon={Sparkles} tone="danger" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
          <Input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث في القوائم..."
            className="h-10 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] pr-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <ListFilter className="size-4 text-[color:var(--color-muted-foreground)]" />
          <div className="flex flex-wrap gap-1 rounded-full border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-1">
            {([
              { value: "all", label: "الكل" },
              { value: "custom", label: "المخصصة" },
              { value: "default", label: "الافتراضية" },
            ] as const).map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filterType === f.value
                    ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                    : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lists grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-5 shadow-sm">
              <Skeleton className="mb-3 h-5 w-1/3" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-2/3" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-6 py-16 text-center sm:rounded-3xl">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[color:var(--color-primary)]">
            <Layers className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[color:var(--color-foreground)]">لا توجد قوائم بعد</p>
            <p className="max-w-sm text-sm text-[color:var(--color-muted-foreground)]">
              {searchTerm || filterType !== "all"
                ? "لم يتم العثور على قوائم تطابق البحث."
                : "أنشئ أول قائمة عملاء ذكية لاستهداف حملاتك بشكل دقيق."}
            </p>
          </div>
          {!searchTerm && filterType === "all" && (
            <Button className="rounded-full" onClick={openCreate}>
              <Plus className="size-4" /> إنشاء قائمة جديدة
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLists.map((list) => (
            <div
              key={list.id}
              className="group flex flex-col rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-raised sm:rounded-3xl"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[color:var(--color-primary)]">
                    <Users className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-[color:var(--color-foreground)]">{list.name}</h3>
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      {list.isDefault ? "قائمة افتراضية" : formatDate(list.updatedAt)}
                    </p>
                  </div>
                </div>
                {list.isDefault && (
                  <Badge className="shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--color-info)_15%,var(--color-card))] text-[color:var(--color-info)]">
                    افتراضية
                  </Badge>
                )}
              </div>

              {list.description ? (
                <p className="mb-3 line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">{list.description}</p>
              ) : null}

              <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[color:var(--color-muted)] px-2.5 py-1 text-[11px] text-[color:var(--color-muted-foreground)]">
                <ListFilter className="size-3" />
                {criteriaSummary(list.criteria)}
              </div>

              <div className="mb-4 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[color:var(--color-foreground)]">
                  {list.count.toLocaleString("ar-EG")}
                </span>
                <span className="text-sm text-[color:var(--color-muted-foreground)]">عميل</span>
                {!list.isDefault && list.isStale ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" title="لم يتم تحديث هذا العدد منذ أكثر من 7 أيام">
                    <Clock className="size-3" /> قديم
                  </span>
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_60%,transparent)] pt-3">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => void openDetail(list)}>
                  <Eye className="size-3.5" /> الأعضاء
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleWhatsAppSend(list)}>
                  <Send className="size-3.5" /> واتساب
                </Button>
                {!list.isDefault && (
                  <>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => openEdit(list)}>
                      <Pencil className="size-3.5" /> تعديل
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => void handleDuplicate(list)} title="نسخ قائمة مشابهة">
                      <Copy className="size-3.5" /> نسخ
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => void handleRefreshCount(list)} disabled={refreshingId === list.id}>
                      {refreshingId === list.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="mr-auto rounded-full text-destructive hover:text-destructive" onClick={() => setDeleteTarget(list)} aria-label="حذف">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingList ? "تعديل قائمة العملاء" : "إنشاء قائمة عملاء جديدة"}</DialogTitle>
            <DialogDescription>
              حدد معايير ذكية لاستهداف عملاء محددين، ثم أرسل الحملة عبر واتساب.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="list-name">اسم القائمة *</Label>
                <Input id="list-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="مثال: عملاء VIP" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="list-description">وصف القائمة</Label>
                <Input id="list-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="وصف اختياري" />
              </div>
            </div>

            <Separator />

            {/* Smart RFM presets */}
            <div className="space-y-1.5">
              <Label>ابدأ من قالب جاهز</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SMART_PRESETS.map((p) => {
                  const active = formCriteria.type === "preset" && formCriteria.preset === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setFormCriteriaType("all");
                        setFormCriteria(buildPresetCriteria(p.value));
                        setPreviewCount(null);
                      }}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border p-3 text-start transition-all",
                        active
                          ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] ring-1 ring-[color:var(--color-primary)]/30"
                          : "border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:border-[color:var(--color-primary)]/40",
                      )}
                    >
                      <p.icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-muted-foreground)]")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[color:var(--color-foreground)]">{p.label}</span>
                        <span className="block text-[11px] leading-4 text-[color:var(--color-muted-foreground)]">{p.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>أو حدد معياراً يدوياً</Label>
              <Select value={formCriteriaType} onValueChange={(v) => changeCriteriaType((v ?? "all") as string)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="اختر المعيار" />
                </SelectTrigger>
                <SelectContent>
                  {CRITERIA_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      <span className="flex items-center gap-2">
                        <ct.icon className="size-4" />
                        {ct.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                {CRITERIA_TYPES.find((ct) => ct.value === formCriteriaType)?.hint}
              </p>
            </div>

            {/* Criteria specific fields */}
            {formCriteria.type !== "preset" ? (
            <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/30 p-4">
              {formCriteriaType === "active" && (
                <div className="space-y-1.5">
                  <Label>خلال آخر (ساعة)</Label>
                  <Input type="number" min={1} value={formCriteria.hours ?? 24} onChange={(e) => updateCriteriaField("hours", parseInt(e.target.value) || 1)} />
                </div>
              )}
              {formCriteriaType === "inactive" && (
                <div className="space-y-1.5">
                  <Label>غير نشط منذ (يوم)</Label>
                  <Input type="number" min={1} value={formCriteria.days ?? 7} onChange={(e) => updateCriteriaField("days", parseInt(e.target.value) || 1)} />
                </div>
              )}
              {formCriteriaType === "tag" && (
                <div className="space-y-1.5">
                  <Label>الوسم (Tag)</Label>
                  {availableTags.length > 0 ? (
                    <Select value={formCriteria.tag || ""} onValueChange={(v) => updateCriteriaField("tag", v ?? "")}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="اختر وسماً" /></SelectTrigger>
                      <SelectContent>
                        {availableTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>🏷️ {tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={formCriteria.tag || ""} onChange={(e) => updateCriteriaField("tag", e.target.value)} placeholder="اسم الوسم" />
                  )}
                </div>
              )}
              {(formCriteriaType === "orderStatus" || formCriteriaType === "returnRequest" || formCriteriaType === "paymentStatus") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{formCriteriaType === "returnRequest" ? "حالة المرتجع" : formCriteriaType === "paymentStatus" ? "حالة الدفع" : "حالة الطلب"}</Label>
                    <Select value={formCriteria.status || ""} onValueChange={(v) => updateCriteriaField("status", v ?? "")}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                      <SelectContent>
                        {(formCriteriaType === "returnRequest" ? RETURN_STATUSES : formCriteriaType === "paymentStatus" ? PAYMENT_STATUSES : ORDER_STATUSES).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>خلال آخر (يوم)</Label>
                    <Input type="number" min={1} value={formCriteria.days ?? 30} onChange={(e) => updateCriteriaField("days", parseInt(e.target.value) || 1)} />
                  </div>
                </div>
              )}
              {formCriteriaType === "city" && (
                <div className="space-y-1.5">
                  <Label>المدينة / المحافظة</Label>
                  <Input value={formCriteria.city || ""} onChange={(e) => updateCriteriaField("city", e.target.value)} placeholder="مثال: القاهرة" />
                </div>
              )}
              {formCriteriaType === "customerRating" && (
                <div className="space-y-1.5">
                  <Label>التقييم</Label>
                  <Select value={formCriteria.rating || "EXCELLENT"} onValueChange={(v) => updateCriteriaField("rating", v ?? "EXCELLENT")}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RATINGS.map((r) => (
                        <SelectItem key={r} value={r}>{STATUS_LABELS[r] || r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(formCriteriaType === "latest" || formCriteriaType === "oldest") && (
                <div className="space-y-1.5">
                  <Label>عدد العملاء</Label>
                  <Input type="number" min={1} value={formCriteria.limit ?? 100} onChange={(e) => updateCriteriaField("limit", parseInt(e.target.value) || 1)} />
                </div>
              )}
              {formCriteriaType === "minTotalSpent" && (
                <div className="space-y-1.5">
                  <Label>إجمالي إنفاق ≥ (جنيه / وحدة العملة)</Label>
                  <Input type="number" min={0} value={formCriteria.amount ?? 1000} onChange={(e) => updateCriteriaField("amount", parseFloat(e.target.value) || 0)} />
                </div>
              )}
              {formCriteriaType === "minOrdersCount" && (
                <div className="space-y-1.5">
                  <Label>عدد الطلبات ≥</Label>
                  <Input type="number" min={1} value={formCriteria.count ?? 2} onChange={(e) => updateCriteriaField("count", parseInt(e.target.value) || 1)} />
                </div>
              )}
              {formCriteriaType === "all" && (
                <p className="text-sm text-[color:var(--color-muted-foreground)]">ستشمل هذه القائمة جميع العملاء النشطين.</p>
              )}
            </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-4 py-3">
                {(() => {
                  const preset = SMART_PRESETS.find((p) => p.value === formCriteria.preset);
                  return (
                    <>
                      {preset ? <preset.icon className="size-4 text-[color:var(--color-primary)]" /> : <Sparkles className="size-4 text-[color:var(--color-primary)]" />}
                      <span className="text-sm font-medium text-[color:var(--color-foreground)]">
                        {preset ? preset.label : "قالب جاهز"} — {preset ? preset.hint : "سيتم تطبيق المعايير الذكية تلقائياً"}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Exclusion window */}
            <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label>استثناء المراسَلين حديثاً</Label>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    استبعد العملاء الذين أرسلوا إليك أو أُرسل إليهم خلال آخر (يوم). يمنع إزعاج عملاء تواصلوا مؤخراً.
                  </p>
                </div>
                <div className="w-32 shrink-0">
                  <Select
                    value={formCriteria.excludeContactedInDays ? String(formCriteria.excludeContactedInDays) : "0"}
                    onValueChange={(v) => updateCriteriaField("excludeContactedInDays", v === "0" ? undefined : parseInt(v || "0", 10))}
                  >
                    <SelectTrigger className="h-11"><SelectValue placeholder="بدون استثناء" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">بدون استثناء</SelectItem>
                      <SelectItem value="1">يوم واحد</SelectItem>
                      <SelectItem value="3">3 أيام</SelectItem>
                      <SelectItem value="7">7 أيام</SelectItem>
                      <SelectItem value="14">14 يوم</SelectItem>
                      <SelectItem value="30">30 يوم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Live count preview */}
            <div className="flex items-center justify-between rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-[color:var(--color-primary)]" />
                <span className="text-sm font-medium text-[color:var(--color-foreground)]">عدد العملاء المتوقع</span>
              </div>
              {previewLoading ? (
                <Loader2 className="size-4 animate-spin text-[color:var(--color-primary)]" />
              ) : previewCount !== null ? (
                <span className="text-lg font-bold text-[color:var(--color-primary)]">
                  {previewCount.toLocaleString("ar-EG")} <span className="text-xs font-normal text-[color:var(--color-muted-foreground)]">عميل</span>
                </span>
              ) : (
                <span className="text-sm text-[color:var(--color-muted-foreground)]">غير متاح</span>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button className="rounded-full" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : editingList ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {editingList ? "حفظ التعديلات" : "إنشاء القائمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف قائمة العملاء</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف قائمة "{deleteTarget?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">إلغاء</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Members Sheet */}
      <Sheet open={!!detailList} onOpenChange={(o) => !o && setDetailList(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="border-b border-[color:var(--shell-control-border)] pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[color:var(--color-primary)]">
                <Users className="size-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="truncate">{detailList?.name}</SheetTitle>
                <SheetDescription className="truncate">
                  {criteriaSummary(detailList?.criteria)} • {membersTotal.toLocaleString("ar-EG")} عميل
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                <Input
                  value={memberSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMemberSearch(v);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                      if (detailList) void openDetail(detailList, 1, v);
                    }, 350);
                  }}
                  placeholder="ابحث في الأعضاء..."
                  className="h-10 rounded-full border-[color:var(--shell-control-border)] pr-9"
                />
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={exportCsv} disabled={!members.length}>
                <FileDown className="size-4" /> تصدير CSV
              </Button>
            </div>

            {membersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[color:var(--shell-control-border)] px-6 py-12 text-center">
                <Users className="size-8 text-[color:var(--color-muted-foreground)] opacity-40" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">لا يوجد عملاء في هذه القائمة</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[color:var(--shell-control-border)]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-right">الإنفاق</TableHead>
                      <TableHead className="text-right">القيمة</TableHead>
                      <TableHead className="text-right">آخر نشاط</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-xs font-semibold text-[color:var(--color-primary)]">
                              {(m.name || "?").slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{m.name}</p>
                              {m.email ? <p className="truncate text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">{m.email}</p> : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell dir="ltr" className="text-sm">{m.phone || "—"}</TableCell>
                        <TableCell dir="ltr" className="text-sm font-medium">
                          {(m.totalSpent ?? 0).toLocaleString("ar-EG")}
                          <span className="mr-1 text-xs text-[color:var(--color-muted-foreground)]">ج.م</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {(() => {
                              const tier = rfmTierMeta(m.rfmTier);
                              return (
                                <span className={cn(
                                  "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  tier.cls,
                                )}>
                                  <Star className="size-3" />
                                  {tier.label}
                                  {typeof m.rfmScore === "number" ? ` • ${m.rfmScore}` : ""}
                                </span>
                              );
                            })()}
                            {(m.ordersCount ?? 0) > 0 ? (
                              <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
                                {m.ordersCount} طلب
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">{formatDate(m.lastActivity)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            m.status === "active"
                              ? "bg-[color:color-mix(in_srgb,var(--color-success)_15%,var(--color-card))] text-[color:var(--color-success)]"
                              : "bg-[color:color-mix(in_srgb,var(--color-muted)]_100%,transparent)] text-[color:var(--color-muted-foreground)]",
                          )}>
                            {m.status === "active" ? <CheckCircle2 className="size-3" /> : <Ban className="size-3" />}
                            {m.status === "active" ? "نشط" : "غير نشط"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {membersTotal > PER_PAGE && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  الصفحة {membersPage} من {Math.ceil(membersTotal / PER_PAGE)}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="rounded-full" disabled={membersPage <= 1} onClick={() => void handleMemberPage(membersPage - 1)}>
                    السابق
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" disabled={membersPage * PER_PAGE >= membersTotal} onClick={() => void handleMemberPage(membersPage + 1)}>
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-[color:var(--shell-control-border)] pt-3">
            <Button className="w-full rounded-full" onClick={() => detailList && handleWhatsAppSend(detailList)}>
              <Send className="size-4" /> إرسال عبر واتساب ({membersTotal.toLocaleString("ar-EG")} عميل)
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CustomerLists;
