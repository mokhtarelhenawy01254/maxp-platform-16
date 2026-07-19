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
} from "lucide-react";
import { toast } from "sonner";

import {
  BusinessFilterSheet,
  BusinessMobileSearchPanel,
} from "../../components/business/BusinessFilters";
import {
  BusinessPageHero,
  BusinessPageShell,
  BusinessSectionPanel,
} from "../../components/business/BusinessSurface";
import { BusinessMetricsStrip } from "../../components/business/BusinessMetrics";
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
    coupon.bonusUsers > 0 ? `${coupon.bonusUsers} مستخدم إضافي` : null,
    coupon.bonusProducts > 0 ? `${coupon.bonusProducts} منتج إضافي` : null,
    coupon.bonusOrdersPerMonth > 0
      ? `${coupon.bonusOrdersPerMonth} طلب إضافي شهريًا`
      : null,
    coupon.bonusCustomers > 0
      ? `${coupon.bonusCustomers} عميل إضافي`
      : null,
  ].filter(Boolean) as string[];

const stateBadgeClassName = (state: PlatformSignupCoupon["state"]) => {
  if (state === "live") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "scheduled") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (state === "expired") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (state === "depleted") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-rose-200 bg-rose-50 text-rose-700";
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

const numericBenefitFields: Array<{
  key: keyof PlatformSignupCouponBenefits;
  label: string;
  placeholder: string;
}> = [
  { key: "trialDays", label: "أيام التجربة المجانية", placeholder: "7" },
  { key: "bonusUsers", label: "مستخدمون إضافيون", placeholder: "5" },
  { key: "bonusProducts", label: "منتجات إضافية", placeholder: "100" },
  {
    key: "bonusOrdersPerMonth",
    label: "طلبات إضافية شهريًا",
    placeholder: "200",
  },
  { key: "bonusCustomers", label: "عملاء إضافيون", placeholder: "500" },
];

const PlatformSignupCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<PlatformSignupCoupon[]>([]);
  const [summary, setSummary] =
    useState<PlatformSignupCouponSummary>(summaryFallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<CouponStateFilter>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PlatformSignupCoupon | null>(
    null,
  );
  const [couponPendingRemoval, setCouponPendingRemoval] =
    useState<PlatformSignupCoupon | null>(null);
  const [removing, setRemoving] = useState(false);
  const [formState, setFormState] =
    useState<PlatformSignupCouponFormPayload>(createDefaultFormState);

  const activeFilterLabels = useMemo(() => {
    if (stateFilter === "all") return [];
    const option = stateOptions.find((item) => item.value === stateFilter);
    return option ? [option.label] : [];
  }, [stateFilter]);

  const metricItems = useMemo(
    () => [
      {
        title: "إجمالي الكوبونات",
        value: summary.totalCoupons.toLocaleString("ar-EG"),
        subtitle: "عدد كل كوبونات onboarding المتاحة للإدارة.",
        tone: "primary" as const,
        icon: Ticket,
      },
      {
        title: "الكوبونات الحية",
        value: summary.liveCoupons.toLocaleString("ar-EG"),
        subtitle: "الصالحة الآن للاستخدام في شاشة التسجيل.",
        tone: "success" as const,
        icon: Sparkles,
      },
      {
        title: "إجمالي الاسترداد",
        value: summary.totalRedemptions.toLocaleString("ar-EG"),
        subtitle: "عدد الشركات التي استخدمت كوبونًا عند التسجيل.",
        tone: "secondary" as const,
        icon: Gift,
      },
      {
        title: "المستهلك والمنتهي",
        value: (
          summary.depletedCoupons + summary.expiredCoupons
        ).toLocaleString("ar-EG"),
        subtitle: "كوبونات تحتاج مراجعة أو إعادة تفعيل بخطة جديدة.",
        tone: "warning" as const,
        icon: CalendarRange,
      },
    ],
    [summary],
  );

  const loadCoupons = async (nextSearch = search, nextState = stateFilter) => {
    try {
      setLoading(true);
      const response = await platformSignupCouponService.listCoupons(
        nextSearch,
        nextState,
      );
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

  const openRemoveDialog = (coupon: PlatformSignupCoupon) => {
    setCouponPendingRemoval(coupon);
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
      toast.success(
        editingCoupon
          ? "تم تحديث كوبون التسجيل"
          : "تم إنشاء كوبون التسجيل",
      );

      setCoupons((previous) => {
        if (editingCoupon) {
          return previous.map((coupon) =>
            coupon.id === savedCoupon.id ? savedCoupon : coupon,
          );
        }

        return [savedCoupon, ...previous];
      });

      await loadCoupons();
    } catch (error: any) {
      console.error("Failed to save platform signup coupon", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "فشل حفظ كوبون التسجيل",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!couponPendingRemoval) return;

    try {
      setRemoving(true);
      const result = await platformSignupCouponService.removeCoupon(
        couponPendingRemoval.id,
      );

      if (result.action === "deleted") {
        setCoupons((previous) =>
          previous.filter((coupon) => coupon.id !== couponPendingRemoval.id),
        );
        toast.success("تم حذف كوبون التسجيل");
      } else {
        setCoupons((previous) =>
          previous.map((coupon) =>
            coupon.id === couponPendingRemoval.id && result.coupon
              ? result.coupon
              : coupon,
          ),
        );
        toast.success("تم إيقاف الكوبون مع الاحتفاظ بسجل الاستخدام");
      }

      setCouponPendingRemoval(null);
      await loadCoupons();
    } catch (error: any) {
      console.error("Failed to remove platform signup coupon", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "فشل حذف كوبون التسجيل",
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <BusinessPageShell className="space-y-6">
      <BusinessPageHero
        eyebrow="Growth Controls"
        title="كوبونات التسجيل للمنصة"
        description="إدارة كوبونات onboarding التي تمنح trial إضافي أو limits استخدام أعلى للعملاء الجدد من شاشة التسجيل مباشرة."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => void loadCoupons()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
              تحديث
            </Button>
            <Button type="button" className="rounded-2xl" onClick={openCreateDialog}>
              <Plus />
              إنشاء كوبون
            </Button>
          </div>
        }
      />

      <BusinessMetricsStrip items={metricItems} />

      <BusinessMobileSearchPanel
        searchId="signup-coupon-search-mobile"
        searchLabel="ابحث عن كوبون"
        searchPlaceholder="ابحث بالاسم أو الكود"
        searchValue={search}
        searchAriaLabel="ابحث عن كوبون تسجيل"
        onSearchChange={setSearch}
        onSearchSubmit={() => {
          void loadCoupons(search, stateFilter);
        }}
        onOpenFilters={() => setFilterSheetOpen(true)}
        filterCount={activeFilterLabels.length}
        summaryIcon={<Sparkles className="size-4" />}
        summary={`تعرض ${coupons.length.toLocaleString("ar-EG")} كوبون`}
        activeFilters={activeFilterLabels}
      />

      <BusinessFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        title="فلاتر كوبونات التسجيل"
        description="اختر الحالة التي تريد عرضها في شاشة الإدارة."
        onClear={() => {
          setStateFilter("all");
        }}
        onApply={() => {
          setFilterSheetOpen(false);
          void loadCoupons(search, stateFilter);
        }}
      >
        <div className="space-y-2">
          <Label>حالة الكوبون</Label>
          <Select
            value={stateFilter}
            onValueChange={(value) =>
              setStateFilter(value as CouponStateFilter)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الحالة" />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </BusinessFilterSheet>

      <BusinessSectionPanel
        title="لوحة الكوبونات"
        description="بحث سريع، فلترة، ومراجعة آخر استرداد لكل كوبون قبل التعديل."
        headerAside={
          <div className="hidden flex-wrap items-center gap-3 md:flex">
            <div className="relative w-[18rem]">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بالاسم أو الكود"
                className="pr-10 text-right"
              />
            </div>

            <Select
              value={stateFilter}
              onValueChange={(value) =>
                setStateFilter(value as CouponStateFilter)
              }
            >
              <SelectTrigger className="w-[13rem]">
                <SelectValue placeholder="كل الحالات" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        contentClassName="space-y-4 p-4 sm:p-6"
      >
        {loading ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-background/70 px-6 py-12 text-center text-sm text-muted-foreground">
            جاري تحميل كوبونات التسجيل...
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-background/70 px-6 py-12 text-center">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Empty State
              </Badge>
              <h3 className="text-xl font-semibold text-foreground">
                لا توجد كوبونات مطابقة الآن
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                أنشئ أول كوبون onboarding ليحصل العميل الجديد على فترة مجانية
                إضافية أو limits استخدام أعلى منذ أول يوم.
              </p>
              <Button type="button" className="rounded-2xl" onClick={openCreateDialog}>
                <Plus />
                إنشاء أول كوبون
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:hidden">
              {coupons.map((coupon) => {
                const benefits = buildBenefitList(coupon);

                return (
                  <article
                    key={coupon.id}
                    className="rounded-[28px] border border-border/70 bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-3 py-1 ${stateBadgeClassName(coupon.state)}`}
                          >
                            {stateLabel(coupon.state)}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            {coupon.code}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {coupon.name}
                        </h3>
                        <p className="text-sm leading-7 text-muted-foreground">
                          {coupon.description || "بدون وصف إضافي."}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          aria-label={`تعديل الكوبون ${coupon.code}`}
                          onClick={() => openEditDialog(coupon)}
                        >
                          تعديل
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          aria-label={`حذف الكوبون ${coupon.code}`}
                          onClick={() => openRemoveDialog(coupon)}
                        >
                          <Trash2 className="size-4" />
                          حذف
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {benefits.map((benefit) => (
                        <Badge key={benefit} variant="outline" className="rounded-full px-3 py-1">
                          {benefit}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 rounded-3xl bg-background/80 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">الفترة</span>
                        <span className="font-medium text-foreground">
                          {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">الاستخدام</span>
                        <span className="font-medium text-foreground">
                          {coupon.usageCount.toLocaleString("ar-EG")}
                          {coupon.usageLimit
                            ? ` / ${coupon.usageLimit.toLocaleString("ar-EG")}`
                            : " / غير محدود"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">آخر استرداد</span>
                        <span className="font-medium text-foreground">
                          {coupon.lastRedemption?.companyName || "لا يوجد بعد"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الكوبون</TableHead>
                    <TableHead className="text-right">المزايا</TableHead>
                    <TableHead className="text-right">الفترة</TableHead>
                    <TableHead className="text-right">الاستخدام</TableHead>
                    <TableHead className="text-right">آخر استرداد</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => {
                    const benefits = buildBenefitList(coupon);

                    return (
                      <TableRow key={coupon.id}>
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {coupon.name}
                              </span>
                              <Badge
                                variant="outline"
                                className={`rounded-full px-3 py-1 ${stateBadgeClassName(coupon.state)}`}
                              >
                                {stateLabel(coupon.state)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span dir="ltr">{coupon.code}</span>
                              {coupon.description ? ` • ${coupon.description}` : ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-2">
                            {benefits.map((benefit) => (
                              <Badge
                                key={benefit}
                                variant="outline"
                                className="rounded-full px-3 py-1"
                              >
                                {benefit}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">
                          <div>{formatDate(coupon.validFrom)}</div>
                          <div>{formatDate(coupon.validTo)}</div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-foreground">
                          <div>
                            {coupon.usageCount.toLocaleString("ar-EG")}
                            {coupon.usageLimit
                              ? ` / ${coupon.usageLimit.toLocaleString("ar-EG")}`
                              : " / غير محدود"}
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            {coupon.redemptionsCount.toLocaleString("ar-EG")} شركة
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">
                          {coupon.lastRedemption ? (
                            <>
                              <div className="text-foreground">
                                {coupon.lastRedemption.companyName || "شركة غير معروفة"}
                              </div>
                              <div>{formatDate(coupon.lastRedemption.redeemedAt)}</div>
                            </>
                          ) : (
                            "لا يوجد بعد"
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-2xl"
                              aria-label={`تعديل الكوبون ${coupon.code}`}
                              onClick={() => openEditDialog(coupon)}
                            >
                              تعديل
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              aria-label={`حذف الكوبون ${coupon.code}`}
                              onClick={() => openRemoveDialog(coupon)}
                            >
                              <Trash2 className="size-4" />
                              حذف
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </BusinessSectionPanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="border-b px-6 pt-6">
            <DialogTitle>
              {editingCoupon ? "تعديل كوبون التسجيل" : "إنشاء كوبون تسجيل جديد"}
            </DialogTitle>
            <DialogDescription>
              حدّد مزايا onboarding التي ستظهر مباشرة للعميل عند إدخال الكود في
              شاشة التسجيل.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-name">اسم الكوبون</Label>
                <Input
                  id="coupon-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Welcome PRO Launch"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-code">كود الكوبون</Label>
                <Input
                  id="coupon-code"
                  dir="ltr"
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="WELCOME14"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-description">وصف مختصر</Label>
              <Textarea
                id="coupon-description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                placeholder="الكوبون يمنح 14 يومًا إضافية و200 طلب شهريًا."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-valid-from">بداية الصلاحية</Label>
                <Input
                  id="coupon-valid-from"
                  type="datetime-local"
                  value={formState.validFrom}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      validFrom: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-valid-to">نهاية الصلاحية</Label>
                <Input
                  id="coupon-valid-to"
                  type="datetime-local"
                  value={formState.validTo}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      validTo: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {numericBenefitFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`benefit-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`benefit-${field.key}`}
                    type="number"
                    min={0}
                    value={formState[field.key]}
                    onChange={(event) =>
                      updateBenefitField(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="coupon-usage-limit">حد الاستخدام</Label>
                <Input
                  id="coupon-usage-limit"
                  type="number"
                  min={1}
                  value={formState.usageLimit ?? ""}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      usageLimit: event.target.value
                        ? Math.max(1, Number.parseInt(event.target.value, 10) || 1)
                        : null,
                    }))
                  }
                  placeholder="اتركه فارغًا لغير المحدود"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-border/70 bg-background/70 px-4 py-4">
              <div>
                <p className="font-medium text-foreground">تفعيل الكوبون</p>
                <p className="text-sm text-muted-foreground">
                  عند الإيقاف سيظل ظاهرًا في السوبر أدمن لكن لن يقبل في التسجيل.
                </p>
              </div>
              <Switch
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((previous) => ({
                    ...previous,
                    isActive: Boolean(checked),
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter className="px-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="rounded-2xl"
              onClick={() => void handleSaveCoupon()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="animate-spin" />
                  جاري الحفظ...
                </>
              ) : editingCoupon ? (
                "حفظ التعديلات"
              ) : (
                "إنشاء الكوبون"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(couponPendingRemoval)}
        onOpenChange={(open) => {
          if (!open && !removing) {
            setCouponPendingRemoval(null);
          }
        }}
      >
        <DialogContent className="max-w-md text-right sm:text-right">
          <DialogHeader className="text-right">
            <DialogTitle>
              حذف كوبون التسجيل؟
            </DialogTitle>
            <DialogDescription>
              {couponPendingRemoval?.redemptionsCount
                ? `الكوبون ${couponPendingRemoval.code} تم استخدامه من قبل، لذلك سيتم إيقافه بدلًا من حذف السجل بالكامل.`
                : `سيتم حذف الكوبون ${couponPendingRemoval?.code || ""} نهائيًا لأنه غير مستخدم بعد.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-row-reverse">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              disabled={removing}
              onClick={() => setCouponPendingRemoval(null)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
              disabled={removing}
              onClick={() => void handleRemoveCoupon()}
            >
              {removing ? "جارٍ التنفيذ..." : "تأكيد الحذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessPageShell>
  );
};

export default PlatformSignupCoupons;
