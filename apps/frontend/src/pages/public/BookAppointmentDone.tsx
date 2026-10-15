import React from "react";
import { CheckCircle2 } from "lucide-react";

interface BookingResult {
  customerName: string;
  customerPhone: string;
  branchName: string;
  serviceName?: string;
  appointmentDate: string;
  startTime: string;
}

interface BookAppointmentDoneProps {
  bookingResult: BookingResult;
  onReset: () => void;
}

export const BookAppointmentDone: React.FC<BookAppointmentDoneProps> = ({
  bookingResult,
  onReset,
}) => {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs text-center space-y-3 text-xs">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <h2 className="text-base font-bold text-foreground">تم تسجيل الموعد بنجاح</h2>
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 text-right space-y-1.5 font-mono">
        <p><span className="text-muted-foreground font-sans">الاسم:</span> <strong className="text-foreground">{bookingResult.customerName}</strong></p>
        <p><span className="text-muted-foreground font-sans">الهاتف:</span> <span>{bookingResult.customerPhone}</span></p>
        <p><span className="text-muted-foreground font-sans">الفرع:</span> <span>{bookingResult.branchName}</span></p>
        {bookingResult.serviceName && <p><span className="text-muted-foreground font-sans">الخدمة:</span> <span>{bookingResult.serviceName}</span></p>}
        <p><span className="text-muted-foreground font-sans">التاريخ:</span> <span>{bookingResult.appointmentDate}</span></p>
        <p><span className="text-muted-foreground font-sans">التوقيت:</span> <span>{bookingResult.startTime}</span></p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
      >
        حجز موعد آخر
      </button>
    </div>
  );
};
