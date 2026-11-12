import React, { useEffect, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuthSimple";
import { apiClient } from "@/services/apiClient";
import type { InboxConversation } from "@/types/inbox.types";

interface StaffOption {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

interface QuickAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: InboxConversation | null;
  onCreated?: (appointment: unknown) => void;
}

const getDefaultStartTime = () => {
  const next = new Date();
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return `${String(next.getHours()).padStart(2, "0")}:00`;
};

const inputCls =
  "w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export const QuickAppointmentDialog: React.FC<QuickAppointmentDialogProps> = ({
  isOpen,
  onClose,
  conversation,
  onCreated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("موعد متابعة");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(getDefaultStartTime);
  const [type, setType] = useState("consultation");
  const [staffId, setStaffId] = useState("");
  const [notes, setNotes] = useState("");
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerName(conversation?.customerName || "");
    setCustomerPhone(conversation?.customerPhone || "");
    setTitle("موعد متابعة");
    setAppointmentDate(new Date().toISOString().slice(0, 10));
    setStartTime(getDefaultStartTime());
    setType("consultation");
    setNotes("");
    setStaffId(user?.id || "");
    apiClient
      .get<{ data?: StaffOption[] }>("/tasks/company-users", { _skipErrorToast: true })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setStaffList(list);
        const hasCurrentUser = Boolean(user?.id && list.some((s) => s.id === user.id));
        if (!hasCurrentUser && list[0]?.id) {
          setStaffId(list[0].id);
        }
      })
      .catch(() => {});
  }, [isOpen, conversation?.customerName, conversation?.customerPhone, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStaffId = staffId || user?.id || staffList[0]?.id || "";
    if (!title.trim() || !customerName.trim() || !appointmentDate || !startTime || !resolvedStaffId) {
      toast.error("يرجى إكمال بيانات الموعد المطلوبة");
      return;
    }
    const staff = staffList.find((s) => s.id === resolvedStaffId);
    const staffName = staff
      ? staff.name || `${staff.firstName || ""} ${staff.lastName || ""}`.trim()
      : `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

    setSubmitting(true);
    try {
      const res = await apiClient.post<{ success?: boolean; data?: unknown; error?: string }>("/appointments", {
        customerId: conversation?.customerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        staffId: resolvedStaffId,
        staffName: staffName || undefined,
        title: title.trim(),
        appointmentDate,
        startTime,
        type,
        notes: notes.trim() || undefined,
        source: "facebook_inbox",
      });
      if (res.data?.success) {
        toast.success("تم حجز الموعد بنجاح");
        onCreated?.(res.data.data);
        onClose();
      } else {
        toast.error(res.data?.error || "تعذر حجز الموعد");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || "تعذر حجز الموعد");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-md rounded-2xl border border-border/60 bg-card p-5 text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Calendar className="h-4 w-4 text-primary" />
            <span>حجز موعد سريع</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-2.5 mt-1">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="عنوان الموعد" required />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} placeholder="اسم العميل" required />
            <input type="tel" dir="ltr" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={`${inputCls} font-mono tabular-nums text-left`} placeholder="01xxxxxxxxx" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className={`${inputCls} font-mono tabular-nums`} required />
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${inputCls} font-mono tabular-nums`} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              <option value="consultation">استشارة / كشف</option>
              <option value="meeting">اجتماع</option>
              <option value="training">جلسة / تدريب</option>
              <option value="demo">معاينة</option>
            </select>
            {staffList.length > 0 && (
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputCls}>
                {staffList.map((m) => (
                  <option key={m.id} value={m.id}>{m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim()}</option>
                ))}
              </select>
            )}
          </div>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-border/60 bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none" placeholder="ملاحظات اختيارية..." />
          <DialogFooter className="mt-2 bg-muted/30 border-border/50">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>إلغاء</Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>تأكيد الحجز</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAppointmentDialog;
