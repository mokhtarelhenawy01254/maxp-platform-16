import React, { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { ProposalPackage } from "../types";

interface ProposalAcceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: ProposalPackage | null;
  currency: string;
  defaultContactPerson?: string;
  defaultPhone?: string;
  onConfirmAccept: (payload: {
    packageId: string;
    contactName: string;
    contactPhone: string;
    clientNotes: string;
  }) => Promise<void>;
}

export const ProposalAcceptModal: React.FC<ProposalAcceptModalProps> = ({
  open,
  onOpenChange,
  selectedPackage,
  currency = "ج.م",
  defaultContactPerson = "",
  defaultPhone = "",
  onConfirmAccept,
}) => {
  const [name, setName] = useState(defaultContactPerson);
  const [phone, setPhone] = useState(defaultPhone);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    setLoading(true);
    try {
      await onConfirmAccept({
        packageId: selectedPackage.id,
        contactName: name,
        contactPhone: phone,
        clientNotes: notes,
      });
      onOpenChange(false);
    } catch {
      // Error handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6" dir="rtl">
        <DialogHeader className="space-y-2 text-right">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-5" />
            <DialogTitle className="text-lg font-black">
              اعتماد خطة العمل وبدء التشغيل
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            سيتم تسجيل اعتمادكم للباقة المحددة والتواصل معكم فوراً لبدء المرحلة الأولى من خريطة الطريق.
          </DialogDescription>
        </DialogHeader>

        {selectedPackage && (
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1 text-xs">
            <span className="font-bold text-foreground">الباقة المختارة:</span>
            <div className="flex items-center justify-between">
              <span className="font-black text-primary text-sm">{selectedPackage.name}</span>
              <span className="font-bold text-foreground">
                <span className="tabular-nums">{selectedPackage.price.toLocaleString()}</span> {currency} / {selectedPackage.period}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">اسم المسؤول للتواصل</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: م. باسم فخري"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">رقم الهاتف / واتساب</label>
            <Input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="text-xs h-9 font-mono"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">ملاحظات أو موعد مفضل لبدء الإطلاق (اختياري)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل خاصة ترغبون في إضافتها لبداية العمل..."
              className="text-xs resize-none"
              rows={3}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-9"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5 px-4"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              تأكيد الاعتماد والبدء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
