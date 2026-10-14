import React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  platformSignupCouponService,
  type PlatformSignupCoupon,
  type PlatformSignupCouponBenefits,
  type PlatformSignupCouponFormPayload,
} from "../../services/platformSignupCouponService";

export const createDefaultFormState = (): PlatformSignupCouponFormPayload => {
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

export const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export const mapCouponToForm = (
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

interface CouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCoupon: PlatformSignupCoupon | null;
  formState: PlatformSignupCouponFormPayload;
  setFormState: React.Dispatch<React.SetStateAction<PlatformSignupCouponFormPayload>>;
  saving: boolean;
  onSave: () => void;
}

export function CouponFormDialog({
  open,
  onOpenChange,
  editingCoupon,
  formState,
  setFormState,
  saving,
  onSave,
}: CouponFormDialogProps) {
  const updateBenefitField = (
    key: keyof PlatformSignupCouponBenefits,
    value: string,
  ) => {
    setFormState((previous) => ({
      ...previous,
      [key]: Math.max(0, Number.parseInt(value || "0", 10) || 0),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-card border-border/80">
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
                onChange={(e) => setFormState((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="مثال: START2026"
                className="h-8 text-xs font-mono uppercase bg-muted/20 border-border/70"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">اسم الحملة / الكوبون</Label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                placeholder="مثال: عرض إطلاق المنصة"
                className="h-8 text-xs bg-muted/20 border-border/70"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">الوصف (داخلي)</Label>
            <Input
              value={formState.description}
              onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
              placeholder="ملاحظات توضيحية عن الكوبون"
              className="h-8 text-xs bg-muted/20 border-border/70"
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
                  onChange={(e) => updateBenefitField("trialDays", e.target.value)}
                  className="h-7 text-xs font-mono bg-background"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">مستخدمون إضافيون</label>
                <Input
                  type="number"
                  value={formState.bonusUsers || ""}
                  onChange={(e) => updateBenefitField("bonusUsers", e.target.value)}
                  className="h-7 text-xs font-mono bg-background"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">منتجات إضافية</label>
                <Input
                  type="number"
                  value={formState.bonusProducts || ""}
                  onChange={(e) => updateBenefitField("bonusProducts", e.target.value)}
                  className="h-7 text-xs font-mono bg-background"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">طلبات إضافية شهرياً</label>
                <Input
                  type="number"
                  value={formState.bonusOrdersPerMonth || ""}
                  onChange={(e) => updateBenefitField("bonusOrdersPerMonth", e.target.value)}
                  className="h-7 text-xs font-mono bg-background"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">عملاء إضافيون</label>
                <Input
                  type="number"
                  value={formState.bonusCustomers || ""}
                  onChange={(e) => updateBenefitField("bonusCustomers", e.target.value)}
                  className="h-7 text-xs font-mono bg-background"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">الحد الأقصى للاستخدام</label>
                <Input
                  type="number"
                  value={formState.usageLimit ?? ""}
                  onChange={(e) => setFormState((p) => ({ ...p, usageLimit: e.target.value ? Number(e.target.value) : null }))}
                  className="h-7 text-xs font-mono bg-background"
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
                onChange={(e) => setFormState((p) => ({ ...p, validFrom: e.target.value }))}
                className="h-8 text-xs font-mono bg-muted/20 border-border/70"
              />
            </div>
            <div>
              <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">تاريخ الانتهاء</Label>
              <Input
                type="datetime-local"
                value={formState.validTo}
                onChange={(e) => setFormState((p) => ({ ...p, validTo: e.target.value }))}
                className="h-8 text-xs font-mono bg-muted/20 border-border/70"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="flex items-center gap-2">
              <Switch
                id="active-toggle"
                checked={formState.isActive}
                onCheckedChange={(c) => setFormState((p) => ({ ...p, isActive: c }))}
              />
              <Label htmlFor="active-toggle" className="text-xs cursor-pointer">
                تفعيل الكوبون فوراً
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs font-mono border-border/70">
            إلغاء
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving} className="h-8 text-xs font-mono">
            {saving ? "جاري الحفظ..." : "حفظ الكوبون"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CouponDeleteDialogProps {
  coupon: PlatformSignupCoupon | null;
  onClose: () => void;
  removing: boolean;
  onConfirm: () => void;
}

export function CouponDeleteDialog({ coupon, onClose, removing, onConfirm }: CouponDeleteDialogProps) {
  return (
    <Dialog open={!!coupon} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md bg-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">تأكيد حذف الكوبون</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            هل أنت متأكد من حذف الكوبون <strong className="text-foreground font-mono">{coupon?.code}</strong>؟ لن تتمكن الشركات الجديدة من استخدامه.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs font-mono border-border/70">
            إلغاء
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={removing} className="h-8 text-xs font-mono">
            {removing ? "جاري الحذف..." : "حذف نهائي"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
