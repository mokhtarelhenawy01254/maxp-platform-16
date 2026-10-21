import React from "react";
import { Sparkles, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CriteriaType,
  SMART_PRESETS,
  ORDER_STATUSES,
  RETURN_STATUSES,
  PAYMENT_STATUSES,
  RATINGS,
  STATUS_LABELS,
} from "./types";

interface CustomerListCriteriaFieldsProps {
  formCriteriaType: CriteriaType;
  formCriteria: any;
  onCriteriaFieldChange: (key: string, value: any) => void;
  availableTags: string[] | undefined;
}

export const CustomerListCriteriaFields: React.FC<CustomerListCriteriaFieldsProps> = ({
  formCriteriaType,
  formCriteria,
  onCriteriaFieldChange,
  availableTags = [],
}) => {
  return (
    <>
      {formCriteria.type !== "preset" ? (
        <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/30 p-4">
          {formCriteriaType === "active" && (
            <div className="space-y-1.5">
              <Label>خلال آخر (ساعة)</Label>
              <Input
                type="number"
                min={1}
                value={formCriteria.hours ?? 24}
                onChange={(e) => onCriteriaFieldChange("hours", parseInt(e.target.value) || 1)}
              />
            </div>
          )}
          {formCriteriaType === "inactive" && (
            <div className="space-y-1.5">
              <Label>غير نشط منذ (يوم)</Label>
              <Input
                type="number"
                min={1}
                value={formCriteria.days ?? 7}
                onChange={(e) => onCriteriaFieldChange("days", parseInt(e.target.value) || 1)}
              />
            </div>
          )}
          {formCriteriaType === "tag" && (
            <div className="space-y-1.5">
              <Label>الوسم (Tag)</Label>
              {availableTags && availableTags.length > 0 ? (
                <Select
                  value={formCriteria.tag || ""}
                  onValueChange={(v) => onCriteriaFieldChange("tag", v ?? "")}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="اختر وسماً" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        <span className="flex items-center gap-1.5">
                          <Tag className="size-3.5 text-[color:var(--color-muted-foreground)]" />
                          {tag}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formCriteria.tag || ""}
                  onChange={(e) => onCriteriaFieldChange("tag", e.target.value)}
                  placeholder="اسم الوسم"
                />
              )}
            </div>
          )}
          {(formCriteriaType === "orderStatus" ||
            formCriteriaType === "returnRequest" ||
            formCriteriaType === "paymentStatus") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  {formCriteriaType === "returnRequest"
                    ? "حالة المرتجع"
                    : formCriteriaType === "paymentStatus"
                    ? "حالة الدفع"
                    : "حالة الطلب"}
                </Label>
                <Select
                  value={formCriteria.status || ""}
                  onValueChange={(v) => onCriteriaFieldChange("status", v ?? "")}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formCriteriaType === "returnRequest"
                      ? RETURN_STATUSES
                      : formCriteriaType === "paymentStatus"
                      ? PAYMENT_STATUSES
                      : ORDER_STATUSES
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s] || s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>خلال آخر (يوم)</Label>
                <Input
                  type="number"
                  min={1}
                  value={formCriteria.days ?? 30}
                  onChange={(e) => onCriteriaFieldChange("days", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          )}
          {formCriteriaType === "city" && (
            <div className="space-y-1.5">
              <Label>المدينة / المحافظة</Label>
              <Input
                value={formCriteria.city || ""}
                onChange={(e) => onCriteriaFieldChange("city", e.target.value)}
                placeholder="مثال: القاهرة"
              />
            </div>
          )}
          {formCriteriaType === "customerRating" && (
            <div className="space-y-1.5">
              <Label>التقييم</Label>
              <Select
                value={formCriteria.rating || "EXCELLENT"}
                onValueChange={(v) => onCriteriaFieldChange("rating", v ?? "EXCELLENT")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATINGS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {STATUS_LABELS[r] || r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(formCriteriaType === "latest" || formCriteriaType === "oldest") && (
            <div className="space-y-1.5">
              <Label>عدد العملاء</Label>
              <Input
                type="number"
                min={1}
                value={formCriteria.limit ?? 100}
                onChange={(e) => onCriteriaFieldChange("limit", parseInt(e.target.value) || 1)}
              />
            </div>
          )}
          {formCriteriaType === "minTotalSpent" && (
            <div className="space-y-1.5">
              <Label>إجمالي إنفاق ≥ (جنيه / وحدة العملة)</Label>
              <Input
                type="number"
                min={0}
                value={formCriteria.amount ?? 1000}
                onChange={(e) => onCriteriaFieldChange("amount", parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          {formCriteriaType === "minOrdersCount" && (
            <div className="space-y-1.5">
              <Label>عدد الطلبات ≥</Label>
              <Input
                type="number"
                min={1}
                value={formCriteria.count ?? 2}
                onChange={(e) => onCriteriaFieldChange("count", parseInt(e.target.value) || 1)}
              />
            </div>
          )}
          {formCriteriaType === "all" && (
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              ستشمل هذه القائمة جميع العملاء النشطين.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-4 py-3">
          {(() => {
            const preset = SMART_PRESETS.find((p) => p.value === formCriteria.preset);
            return (
              <>
                {preset ? (
                  <preset.icon className="size-4 text-[color:var(--color-primary)]" />
                ) : (
                  <Sparkles className="size-4 text-[color:var(--color-primary)]" />
                )}
                <span className="text-sm font-medium text-[color:var(--color-foreground)]">
                  {preset ? preset.label : "قالب جاهز"} —{" "}
                  {preset ? preset.hint : "سيتم تطبيق المعايير الذكية تلقائياً"}
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
              onValueChange={(v) =>
                onCriteriaFieldChange(
                  "excludeContactedInDays",
                  v === "0" ? undefined : parseInt(v || "0", 10),
                )
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="بدون استثناء" />
              </SelectTrigger>
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
    </>
  );
};
