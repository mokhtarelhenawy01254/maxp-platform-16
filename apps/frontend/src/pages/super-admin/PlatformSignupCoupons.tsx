import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Gift,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  Trash2,
  Users,
  Edit3,
  Filter,
  CheckCircle2,
  Clock,
  Ban
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";
import {
  platformSignupCouponService,
  type PlatformSignupCoupon,
  type PlatformSignupCouponBenefits,
  type PlatformSignupCouponFormPayload,
  type PlatformSignupCouponSummary,
} from "../../services/platformSignupCouponService";
import { cn } from "../../lib/utils";

type CouponStateFilter =
  | "all"
  | "live"
  | "scheduled"
  | "expired"
  | "inactive"
  | "depleted";

const stateOptions: Array<{
  value: CouponStateFilter;
  label: string;
}> = [
  { value: "all", label: "كل الحالات" },
  { value: "live", label: "فعّال الآن" },
  { value: "scheduled", label: "مجدول" },
  { value: "expired", label: "منتهي" },
  { value: "inactive", label: "موقوف" },
  { value: "depleted", label: "مستهلك" },
];

const createDefaultFormState = (): PlatformSignupCouponFormPayload => {
  const now = new Date();
  const validTo = new Date(now);
  validTo.setDate(validTo.getDate() + 30);

  return {
    name: "",
    code: "",
    description: "",
    usageLimit: null,
    isActive: true,
    validFrom: now.toISOString().slice(0, 16),
    validTo: validTo.toISOString().slice(0, 16),
    ...platformSignupCouponService.zeroBenefits,
  };
};

const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const mapCouponToForm = (
  coupon: PlatformSignupCoupon,
): PlatformSignupCouponFormPayload => ({
  name: coupon.name,
  code: coupon.code,
  description: coupon.description || "",
  trialDays: coupon.trialDays,
  bonusUsers: coupon.bonusUsers,
  bonusProducts: coupon.bonusProducts,
  bonusOrdersPerMonth: coupon.bonusOrdersPerMonth,
  bonusCustomers: coupon.bonusCustomers,
  usageLimit: coupon.usageLimit,
  isActive: coupon.isActive,
  validFrom: toDateTimeInputValue(coupon.validFrom),
  validTo: toDateTimeInputValue(coupon.validTo),
});

const formatDate = (value?: string | null) => {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const buildBenefitList = (coupon: PlatformSignupCoupon) =>
  [
    coupon.trialDays > 0 ? `${coupon.trialDays} يوم مجاني` : null,
    coupon.bonusUsers > 0 ? `${coupon.bonusUsers} مستخدم` : null,
    coupon.bonusProducts > 0 ? `${coupon.bonusProducts} منتج` : null,
    coupon.bonusOrdersPerMonth > 0 ? `${coupon.bonusOrdersPerMonth} طلب/شهر` : null,
    coupon.bonusCustomers > 0 ? `${coupon.bonusCustomers} عميل` : null,
  ].filter(Boolean) as string[];

const stateBadgeClassName = (state: PlatformSignupCoupon["state"]) => {
  if (state === "live") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (state === "scheduled") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (state === "expired") {
    return "border-border/60 bg-muted text-muted-foreground";
  }
  if (state === "depleted") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
};

const stateLabel = (state: PlatformSignupCoupon["state"]) => {
  if (state === "live") return "فعّال الآن";
  if (state === "scheduled") return "مجدول";
  if (state === "expired") return "منتهي";
  if (state === "depleted") return "مستهلك";
  return "موقوف";
};

const summaryFallback: PlatformSignupCouponSummary = {
  totalCoupons: 0,
  liveCoupons: 0,
  scheduledCoupons: 0,
  expiredCoupons: 0,
  inactiveCoupons: 0,
  depletedCoupons: 0,
  totalRedemptions: 0,
};

const PlatformSignupCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<PlatformSignupCoupon[]>([]);
  const [summary, setSummary] = useState<PlatformSignupCouponSummary>(summaryFallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<CouponStateFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PlatformSignupCoupon | null>(null);
  const [couponPendingRemoval, setCouponPendingRemoval] = useState<PlatformSignupCoupon | null>(null);
  const [removing, setRemoving] = useState(false);
  const [formState, setFormState] = useState<PlatformSignupCouponFormPayload>(createDefaultFormState);

  const loadCoupons = async (nextSearch = search, nextState = stateFilter) => {
    try {
      setLoading(true);
      const response = await platformSignupCouponService.listCoupons(nextSearch, nextState);
      setCoupons(response.items);
      setSummary(response.summary);
    } catch (error) {
      console.error("Failed to load platform signup coupons", error);
      toast.error("فشل تحميل كوبونات التسجيل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCoupons();
  }, [search, stateFilter]);

  const openCreateDialog = () => {
    setEditingCoupon(null);
    setFormState(createDefaultFormState());
    setDialogOpen(true);
  };

  const openEditDialog = (coupon: PlatformSignupCoupon) => {
    setEditingCoupon(coupon);
    setFormState(mapCouponToForm(coupon));
    setDialogOpen(true);
  };

  const updateBenefitField = (
    key: keyof PlatformSignupCouponBenefits,
    value: string,
  ) => {
    setFormState((previous) => ({
      ...previous,
      [key]: Math.max(0, Number.parseInt(value || "0", 10) || 0),
    }));
  };

  const handleSaveCoupon = async () => {
    try {
      setSaving(true);
      const payload: PlatformSignupCouponFormPayload = {
        ...formState,
        code: formState.code.trim().toUpperCase(),
        name: formState.name.trim(),
        description: formState.description.trim(),
      };

      const savedCoupon = editingCoupon
        ? await platformSignupCouponService.updateCoupon(editingCoupon.id, payload)
        : await platformSignupCouponService.createCoupon(payload);

      setDialogOpen(false);
      setEditingCoupon(null);
      setFormState(createDefaultFormState());
      toast.success(editingCoupon ? "تم تحديث كوبون التسجيل بنجاح" : "تم إنشاء كوبون التسجيل بنجاح");

      setCoupons((previous) => {
        if (editingCoupon) {
          return previous.map((coupon) => (coupon.id === savedCoupon.id ? savedCoupon : coupon));
        }
        return [savedCoupon, ...previous];
      });

      await loadCoupons();
    } catch (error: any) {
      console.error("Failed to save platform signup coupon", error);
      toast.error(error?.response?.data?.message || error?.message || "فشل حفظ كوبون التسجيل");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!couponPendingRemoval) return;
    try {
      setRemoving(true);
      await platformSignupCouponService.deleteCoupon(couponPendingRemoval.id);
      toast.success("تم حذف الكوبون بنجاح");
      setCoupons(prev => prev.filter(c => c.id !== couponPendingRemoval.id));
      setCouponPendingRemoval(null);
      await loadCoupons();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "فشل حذف الكوبون");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Ticket className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                كوبونات التسجيل وباقات الترحيب
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {summary.liveCoupons} كوبون فعّال
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              إدارة أكواد الخصم والحوافز وأيام التجربة المجانية الممنوحة للشركات الجديدة عند إنشاء الحساب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>إنشاء كوبون جديد</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadCoupons()}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي الكوبونات</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {summary.totalCoupons}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">أكواد مسجلة بالنظام</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">كوبونات فعّالة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {summary.liveCoupons}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">جاهزة للاستخدام في شاشة التسجيل</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">مرات الاستخدام الفعلية</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {summary.totalRedemptions}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">شركات سجلت باستخدام كود</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">مستهلك أو منتهي</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-muted-foreground font-mono tabular-nums">
            {summary.depletedCoupons + summary.expiredCoupons}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">يحتاج تجديد أو أرشفة</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-border/80 bg-card/40">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 pr-8 text-xs font-mono bg-background/50"
              placeholder="بحث باسم الكوبون أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={stateFilter} onValueChange={(v) => setStateFilter(v as CouponStateFilter)}>
            <SelectTrigger className="h-8 text-xs w-36 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs font-mono text-muted-foreground">
          {coupons.length} كوبون
        </div>
      </div>

      {/* Single Surface Table Chassis */}
      <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/30">
                <TableHead className="text-right text-[11px] font-mono">الكود / الاسم</TableHead>
                <TableHead className="text-right text-[11px] font-mono">الحالة</TableHead>
                <TableHead className="text-right text-[11px] font-mono">المزايا والحوافز</TableHead>
                <TableHead className="text-center text-[11px] font-mono">الاستخدام</TableHead>
                <TableHead className="text-right text-[11px] font-mono">فترة الصلاحية</TableHead>
                <TableHead className="text-left text-[11px] font-mono w-24">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <LoadingSpinner size="sm" />
                  </TableCell>
                </TableRow>
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs font-mono text-muted-foreground">
                    لا توجد كوبونات مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map(coupon => {
                  const benefits = buildBenefitList(coupon);
                  return (
                    <TableRow key={coupon.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-xs font-mono text-foreground tracking-wider">{coupon.code}</span>
                          <span className="text-[11px] text-muted-foreground truncate">{coupon.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border", stateBadgeClassName(coupon.state))}>
                          {stateLabel(coupon.state)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {benefits.length > 0 ? (
                            benefits.map((b, i) => (
                              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted/40 border border-border/60 text-[10px] font-mono text-foreground">
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-xs tabular-nums text-foreground">
                          {coupon.usedCount} / {coupon.usageLimit ? coupon.usageLimit : "∞"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        <span>{formatDate(coupon.validFrom)} — {formatDate(coupon.validTo)}</span>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(coupon)}
                            title="تعديل الكوبون"
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            onClick={() => setCouponPendingRemoval(coupon)}
                            title="حذف الكوبون"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editingCoupon ? "تعديل كوبون التسجيل" : "إنشاء كوبون تسجيل جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              حدد رمز الكود والمزايا الممنوحة تلقائياً للمشترك الجديد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">رمز الكود (CODE)</Label>
                <Input
                  value={formState.code}
                  onChange={e => setFormState(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="مثال: START2026"
                  className="h-8 text-xs font-mono uppercase"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">اسم الحملة / الكوبون</Label>
                <Input
                  value={formState.name}
                  onChange={e => setFormState(p => ({ ...p, name: e.target.value }))}
                  placeholder="مثال: عرض إطلاق المنصة"
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">الوصف (داخلي)</Label>
              <Input
                value={formState.description}
                onChange={e => setFormState(p => ({ ...p, description: e.target.value }))}
                placeholder="ملاحظات توضيحية عن الكوبون"
                className="h-8 text-xs"
              />
            </div>

            <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2">
              <span className="font-semibold text-foreground text-xs block">المزايا والحوافز الإضافية:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">أيام تجربة مجانية</label>
                  <Input
                    type="number"
                    value={formState.trialDays || ""}
                    onChange={e => updateBenefitField("trialDays", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">مستخدمون إضافيون</label>
                  <Input
                    type="number"
                    value={formState.bonusUsers || ""}
                    onChange={e => updateBenefitField("bonusUsers", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">منتجات إضافية</label>
                  <Input
                    type="number"
                    value={formState.bonusProducts || ""}
                    onChange={e => updateBenefitField("bonusProducts", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">طلبات إضافية شهرياً</label>
                  <Input
                    type="number"
                    value={formState.bonusOrdersPerMonth || ""}
                    onChange={e => updateBenefitField("bonusOrdersPerMonth", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">عملاء إضافيون</label>
                  <Input
                    type="number"
                    value={formState.bonusCustomers || ""}
                    onChange={e => updateBenefitField("bonusCustomers", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">الحد الأقصى للاستخدام</label>
                  <Input
                    type="number"
                    value={formState.usageLimit ?? ""}
                    onChange={e => setFormState(p => ({ ...p, usageLimit: e.target.value ? Number(e.target.value) : null }))}
                    className="h-7 text-xs font-mono"
                    placeholder="غير محدود"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">تاريخ البدء</Label>
                <Input
                  type="datetime-local"
                  value={formState.validFrom}
                  onChange={e => setFormState(p => ({ ...p, validFrom: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">تاريخ الانتهاء</Label>
                <Input
                  type="datetime-local"
                  value={formState.validTo}
                  onChange={e => setFormState(p => ({ ...p, validTo: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Switch
                  id="active-toggle"
                  checked={formState.isActive}
                  onCheckedChange={c => setFormState(p => ({ ...p, isActive: c }))}
                />
                <Label htmlFor="active-toggle" className="text-xs cursor-pointer">
                  تفعيل الكوبون فوراً
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-8 text-xs font-mono">
              إلغاء
            </Button>
            <Button size="sm" onClick={handleSaveCoupon} disabled={saving} className="h-8 text-xs font-mono">
              {saving ? "جاري الحفظ..." : "حفظ الكوبون"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!couponPendingRemoval} onOpenChange={o => !o && setCouponPendingRemoval(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">تأكيد حذف الكوبون</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              هل أنت متأكد من حذف الكوبون <strong className="text-foreground font-mono">{couponPendingRemoval?.code}</strong>؟ لن تتمكن الشركات الجديدة من استخدامه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setCouponPendingRemoval(null)} className="h-8 text-xs font-mono">
              إلغاء
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveCoupon} disabled={removing} className="h-8 text-xs font-mono">
              {removing ? "جاري الحذف..." : "حذف نهائي"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformSignupCoupons;
