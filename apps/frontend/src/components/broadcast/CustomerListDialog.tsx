import React, { useCallback, useEffect, useState } from "react";
import {
  Users, Sparkles, Clock, ShoppingBag, FileText, Wallet, Landmark,
  Star, ArrowDownUp, Tag, Crown, Heart, AlertTriangle, Loader2, Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { broadcastService } from "../../services/broadcastService";
import { customerService } from "../../services/customerService";
import { cn } from "@/lib/utils";

interface CustomerListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

const CustomerListDialog: React.FC<CustomerListDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCriteriaType, setFormCriteriaType] = useState<CriteriaType>("all");
  const [formCriteria, setFormCriteria] = useState<any>({ type: "all" });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const reset = useCallback(() => {
    setFormName("");
    setFormDescription("");
    setFormCriteriaType("all");
    setFormCriteria({ type: "all" });
    setPreviewCount(null);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const loadTags = useCallback(async () => {
    try {
      const res = await customerService.getDistinctTags();
      const tags = Array.isArray(res) ? res.map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean) : [];
      setAvailableTags(tags);
    } catch { /* تجاهل */ }
  }, []);

  useEffect(() => { void loadTags(); }, [loadTags]);

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
      if (!open) return;
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
  }, [formCriteria, open]);

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("اسم القائمة مطلوب"); return; }
    setSaving(true);
    try {
      await broadcastService.createCustomerList({
        name: formName.trim(),
        description: formDescription.trim(),
        criteria: formCriteria,
      });
      toast.success("تم إنشاء القائمة بنجاح");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "فشل في إنشاء القائمة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>إنشاء قائمة عملاء جديدة</DialogTitle>
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
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button className="rounded-full" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            إنشاء القائمة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerListDialog;
