import React, { useState } from "react";
import api from "../../services/api";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Loader2, Plus } from "lucide-react";

interface AdvanceRequestDialogProps {
  employeeId: string | null;
  onSuccess: () => void;
}

export const AdvanceRequestDialog: React.FC<AdvanceRequestDialogProps> = ({
  employeeId,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    reason: "",
    repaymentType: "ONE_TIME",
    installmentsCount: "1",
  });

  const handleSubmit = async () => {
    if (!form.amount || !form.reason) {
      tToast.error("MyAdvances.msg_aa97");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        employeeId: employeeId,
        amount: parseFloat(form.amount),
        reason: form.reason,
        repaymentType: form.repaymentType,
        installmentsCount: parseInt(form.installmentsCount) || 1,
      };

      const response = await api.post("/hr/advances", payload);
      if (response.data && response.data.success) {
        tToast.success("MyAdvances.success_send_a21b");
        setOpen(false);
        setForm({
          amount: "",
          reason: "",
          repaymentType: "ONE_TIME",
          installmentsCount: "1",
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error creating advance request:", error);
      toast.error(error.response?.data?.error || "فشل في إنشاء طلب السلفة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 text-xs font-medium">
          <Plus className="h-3.5 w-3.5" />
          طلب سلفة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">طلب سلفة مالية</DialogTitle>
          <DialogDescription className="text-right text-xs">
            أدخل تفاصيل المبلغ المطلوب وخطة السداد لتتم مراجعتها واعتمادها من الإدارة المالية
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-2">
          <div className="space-y-1">
            <Label htmlFor="amount" className="text-xs font-medium">المبلغ المطلوب (ج.م)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              className="text-right font-mono text-xs h-9 border-border/70"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason" className="text-xs font-medium">سبب طلب السلفة</Label>
            <Textarea
              id="reason"
              placeholder="توضيح موجز للغرض من السلفة..."
              className="text-right text-xs border-border/70 min-h-[75px]"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="repaymentType" className="text-xs font-medium">طريقة السداد</Label>
            <Select
              value={form.repaymentType}
              onValueChange={(val) => setForm({ ...form, repaymentType: val })}
            >
              <SelectTrigger className="w-full text-xs h-9 border-border/70">
                <SelectValue placeholder="اختر طريقة السداد" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="ONE_TIME" className="text-xs">خصم دفعة واحدة (مع الراتب القادم)</SelectItem>
                <SelectItem value="INSTALLMENTS" className="text-xs">تقسيط شهري على دفعات</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.repaymentType === "INSTALLMENTS" && (
            <div className="space-y-1">
              <Label htmlFor="installments" className="text-xs font-medium">عدد الأقساط (بالأشهر)</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                max="12"
                className="text-right font-mono text-xs h-9 border-border/70"
                value={form.installmentsCount}
                onChange={(e) => setForm({ ...form, installmentsCount: e.target.value })}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-8 text-xs font-medium">
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin ml-2" />}
            إرسال الطلب للاعتماد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
