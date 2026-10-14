import React from "react";
import { Edit3, Trash2 } from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import type { PlatformSignupCoupon } from "../../services/platformSignupCouponService";

export type CouponStateFilter =
  | "all"
  | "live"
  | "scheduled"
  | "expired"
  | "inactive"
  | "depleted";

export const stateOptions: Array<{
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

export const formatDate = (value?: string | null) => {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const buildBenefitList = (coupon: PlatformSignupCoupon) =>
  [
    coupon.trialDays > 0 ? `${coupon.trialDays} يوم مجاني` : null,
    coupon.bonusUsers > 0 ? `${coupon.bonusUsers} مستخدم` : null,
    coupon.bonusProducts > 0 ? `${coupon.bonusProducts} منتج` : null,
    coupon.bonusOrdersPerMonth > 0 ? `${coupon.bonusOrdersPerMonth} طلب/شهر` : null,
    coupon.bonusCustomers > 0 ? `${coupon.bonusCustomers} عميل` : null,
  ].filter(Boolean) as string[];

export const stateBadgeClassName = (state: PlatformSignupCoupon["state"]) => {
  if (state === "live") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (state === "scheduled") return "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400";
  if (state === "expired") return "border-border/60 bg-muted text-muted-foreground";
  if (state === "depleted") return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "border-destructive/20 bg-destructive/10 text-destructive";
};

export const stateLabel = (state: PlatformSignupCoupon["state"]) => {
  if (state === "live") return "فعّال الآن";
  if (state === "scheduled") return "مجدول";
  if (state === "expired") return "منتهي";
  if (state === "depleted") return "مستهلك";
  return "موقوف";
};

interface PlatformSignupCouponsTableProps {
  loading: boolean;
  coupons: PlatformSignupCoupon[];
  onEdit: (coupon: PlatformSignupCoupon) => void;
  onRemove: (coupon: PlatformSignupCoupon) => void;
}

export function PlatformSignupCouponsTable({
  loading,
  coupons,
  onEdit,
  onRemove,
}: PlatformSignupCouponsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="border-b border-border/70 hover:bg-transparent">
            <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الكوبون / الحملة</TableHead>
            <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الرمز (Code)</TableHead>
            <TableHead className="text-center text-[11px] font-mono text-muted-foreground">الحالة</TableHead>
            <TableHead className="text-right text-[11px] font-mono text-muted-foreground">المزايا والحوافز</TableHead>
            <TableHead className="text-center text-[11px] font-mono text-muted-foreground">الاستخدام</TableHead>
            <TableHead className="text-right text-[11px] font-mono text-muted-foreground">فترة الصلاحية</TableHead>
            <TableHead className="text-left text-[11px] font-mono text-muted-foreground w-16">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-xs font-mono text-muted-foreground">
                <LoadingSpinner size="lg" />
              </TableCell>
            </TableRow>
          ) : coupons.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-xs font-mono text-muted-foreground">
                لا توجد كوبونات مطابقة للبحث
              </TableCell>
            </TableRow>
          ) : (
            coupons.map((coupon) => {
              const benefits = buildBenefitList(coupon);
              return (
                <TableRow key={coupon.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors text-xs">
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{coupon.name}</span>
                      {coupon.description && (
                        <span className="text-[10px] text-muted-foreground line-clamp-1">{coupon.description}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted/50 border border-border/70" dir="ltr">
                      {coupon.code}
                    </code>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${stateBadgeClassName(coupon.state)}`}>
                      {stateLabel(coupon.state)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
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
                        onClick={() => onEdit(coupon)}
                        title="تعديل الكوبون"
                      >
                        <Edit3 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => onRemove(coupon)}
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
  );
}
