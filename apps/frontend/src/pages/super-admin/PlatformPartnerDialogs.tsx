import React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";

interface RankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTitle: string;
  setNewTitle: (title: string) => void;
  onConfirm: () => void;
}

export function PartnerRankDialog({ open, onOpenChange, newTitle, setNewTitle, onConfirm }: RankDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">تعديل رتبة الشريك</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-xs">
          <Select value={newTitle} onValueChange={setNewTitle}>
            <SelectTrigger className="h-8 text-xs font-mono bg-background">
              <SelectValue placeholder="اختر الرتبة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PARTNER" className="text-xs">Partner (شريك)</SelectItem>
              <SelectItem value="SENIOR_PARTNER" className="text-xs">Senior Partner (شريك متقدم)</SelectItem>
              <SelectItem value="EXECUTIVE_PARTNER" className="text-xs">Executive Partner (شريك تنفيذي)</SelectItem>
              <SelectItem value="REGIONAL_DIRECTOR" className="text-xs">Regional Director (مدير إقليمي)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            الرتبة تحدد تلقائياً عمق مستويات العمولات المستحقة في شجرة الإحالة.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            إلغاء
          </Button>
          <Button size="sm" className="text-xs" onClick={onConfirm}>
            حفظ الرتبة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  newRate: string;
  setNewRate: (rate: string) => void;
  onConfirm: () => void;
}

export function PartnerRateDialog({ open, onOpenChange, partnerName, newRate, setNewRate, onConfirm }: RateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            نسبة عمولة مخصصة — {partnerName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
            اترك الحقل فارغاً لاستخدام النسبة العامة للمستوى الأول. تطبق النسبة المخصصة على كل اشتراك جديد يجلبه هذا الشريك.
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">نسبة المستوى الأول (L1) %</Label>
            <div className="flex items-center gap-1.5 max-w-xs">
              <Input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                min={0}
                max={100}
                step={0.5}
                placeholder="مثال: 30"
                className="h-8 text-xs font-mono bg-background"
              />
              <span className="text-xs font-mono text-muted-foreground">%</span>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            إلغاء
          </Button>
          <Button size="sm" className="text-xs" onClick={onConfirm}>
            حفظ النسبة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: any;
  payoutStatus: string;
  setPayoutStatus: (status: string) => void;
  onConfirm: () => void;
}

export function PartnerPayoutDialog({ open, onOpenChange, payout, payoutStatus, setPayoutStatus, onConfirm }: PayoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">تحديث حالة طلب السحب</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold mb-1 block">الحالة الجديدة للطلب</Label>
            <Select value={payoutStatus} onValueChange={setPayoutStatus}>
              <SelectTrigger className="h-8 text-xs font-mono bg-background">
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETED" className="text-xs">مكتمل (تم التحويل)</SelectItem>
                <SelectItem value="REJECTED" className="text-xs">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {payout && (
            <p className="text-[11px] text-muted-foreground">
              تأكيد العملية للمستفيد: {payout.partner?.user?.firstName} بمبلغ {payout.amount} ج.م.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            إلغاء
          </Button>
          <Button size="sm" className="text-xs" onClick={onConfirm}>
            تأكيد التحديث
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
