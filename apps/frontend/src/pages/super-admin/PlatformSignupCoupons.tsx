import React, { useEffect, useState } from "react";
import {
  Ticket,
  Plus,
  RefreshCw,
  Search,
  Users,
  CalendarRange,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  platformSignupCouponService,
  type PlatformSignupCoupon,
  type PlatformSignupCouponFormPayload,
  type PlatformSignupCouponSummary,
} from "../../services/platformSignupCouponService";
import {
  CouponFormDialog,
  CouponDeleteDialog,
  createDefaultFormState,
  mapCouponToForm,
} from "./PlatformSignupCouponDialogs";
import {
  PlatformSignupCouponsTable,
  stateOptions,
  type CouponStateFilter,
} from "./PlatformSignupCouponsTable";

const summaryFallback: PlatformSignupCouponSummary = {
  totalCoupons: 0,
  liveCoupons: 0,
  scheduledCoupons: 0,
  expiredCoupons: 0,
  inactiveCoupons: 0,
  depletedCoupons: 0,
  totalRedemptions: 0,
};

export default function PlatformSignupCoupons() {
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

  const handleSaveCoupon = async () => {
    try {
      setSaving(true);
      const payload: PlatformSignupCouponFormPayload = {
        ...formState,
        code: formState.code.trim().toUpperCase(),
        name: formState.name.trim(),
        description: formState.description.trim(),
      };

      await (editingCoupon
        ? platformSignupCouponService.updateCoupon(editingCoupon.id, payload)
        : platformSignupCouponService.createCoupon(payload));

      setDialogOpen(false);
      setEditingCoupon(null);
      setFormState(createDefaultFormState());
      toast.success(editingCoupon ? "تم تحديث كوبون التسجيل بنجاح" : "تم إنشاء كوبون التسجيل بنجاح");
      void loadCoupons();
    } catch (error: any) {
      toast.error(error?.message || "فشل حفظ كوبون التسجيل");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!couponPendingRemoval) return;
    try {
      setRemoving(true);
      await platformSignupCouponService.deleteCoupon(couponPendingRemoval.id);
      setCouponPendingRemoval(null);
      toast.success("تم حذف كوبون التسجيل بنجاح");
      void loadCoupons();
    } catch {
      toast.error("فشل حذف الكوبون");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Ticket className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              كوبونات التسجيل والاشتراك
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {summary.totalCoupons} كوبون
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة أكواد الحملات الترويجية والحوافز الممنوحة للشركات والمشتركين الجدد
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadCoupons()}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>إنشاء كوبون جديد</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي الكوبونات</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">{summary.totalCoupons}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">{summary.liveCoupons} نشط الآن</p>
          </div>
          <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            <Ticket className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">إجمالي الاستخدامات</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
              {summary.totalRedemptions}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">اشتراك مسجل بكود</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Users className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400">كوبونات مجدولة</p>
            <p className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5">
              {summary.scheduledCoupons}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">لحملات قادمة</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600">
            <CalendarRange className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">مستهلك أو منتهي</p>
            <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">
              {summary.expiredCoupons + summary.depletedCoupons}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">غير متاح حالياً</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Gift className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Main Single-Surface Table Chassis */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        {/* Chassis Controls */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
              placeholder="بحث باسم أو كود الكوبون..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={stateFilter} onValueChange={(v) => setStateFilter(v as CouponStateFilter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs border-border/70 bg-background font-mono">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs font-mono">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <PlatformSignupCouponsTable
          loading={loading}
          coupons={coupons}
          onEdit={openEditDialog}
          onRemove={(c) => setCouponPendingRemoval(c)}
        />
      </div>

      <CouponFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCoupon={editingCoupon}
        formState={formState}
        setFormState={setFormState}
        saving={saving}
        onSave={handleSaveCoupon}
      />

      <CouponDeleteDialog
        coupon={couponPendingRemoval}
        onClose={() => setCouponPendingRemoval(null)}
        removing={removing}
        onConfirm={handleRemoveCoupon}
      />
    </div>
  );
}
