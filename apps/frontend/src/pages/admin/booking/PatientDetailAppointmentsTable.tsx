import { Calendar } from "lucide-react";
import { BookingAppointment, STATUS_MAP, tryParseJSON } from "./shared";

interface Props {
  appointments?: (BookingAppointment & {
    branch?: { id: string; name: string };
    doctor?: { id: string; title: string; name: string };
  })[];
}

const renderVitals = (v: unknown): string => {
  const parsed = tryParseJSON<Record<string, unknown>>(v);
  if (!parsed || Object.keys(parsed).length === 0) return "";
  const labels: Record<string, string> = {
    pressure: "الضغط", weight: "الوزن", temp: "الحرارة", pulse: "النبض", sugar: "السكر",
  };
  return Object.entries(parsed).map(([k, val]) => `${labels[k] || k}: ${String(val)}`).join(" · ");
};

export default function PatientDetailAppointmentsTable({ appointments = [] }: Props) {
  return (
    <div className="space-y-2">
      <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-primary" />
        <span>تاريخ الزيارات السريرية ({appointments.length})</span>
      </h4>
      {appointments.length === 0 ? (
        <p className="text-center py-8 text-xs text-muted-foreground bg-muted/20 border border-border/60 rounded-xl">
          لا توجد زيارات أو حجوزات سابقة مسجلة
        </p>
      ) : (
        <div className="overflow-x-auto border border-border/70 rounded-xl bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
                {["التاريخ", "الوقت", "الفرع", "الطبيب", "الخدمة", "العلامات الحيوية", "التشخيص", "الحالة", "الدفع"].map((h) => (
                  <th key={h} className="text-right py-2 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-foreground">
                    {String(a.appointmentDate).split("T")[0]}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-muted-foreground">
                    {a.startTime}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{a.branch?.name || "—"}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    {(a.doctor ? `${a.doctor.title || ""} ${a.doctor.name || ""}` : a.doctorName || "—").trim()}
                  </td>
                  <td className="py-2.5 px-3 text-foreground">{a.serviceName || "—"}</td>
                  <td className="py-2.5 px-3 text-[11px] text-muted-foreground font-mono tabular-nums">
                    {renderVitals(a.vitals) || "—"}
                  </td>
                  <td className="py-2.5 px-3 max-w-[200px]">
                    {a.diagnosis ? (
                      <div>
                        <p className="truncate font-medium text-foreground" title={a.diagnosis}>{a.diagnosis}</p>
                        {(a.treatmentPlan || a.prescription) && (
                          <p className="text-[11px] text-muted-foreground truncate" title={`${a.treatmentPlan || ""} ${a.prescription || ""}`}>
                            {a.treatmentPlan ? `خطة: ${a.treatmentPlan}` : ""}
                            {a.treatmentPlan && a.prescription ? " · " : ""}
                            {a.prescription ? `وصفة: ${a.prescription}` : ""}
                          </p>
                        )}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_MAP[a.status]?.color || "bg-muted text-muted-foreground"}`}>
                      {STATUS_MAP[a.status]?.label || a.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {a.paymentRequired || a.paymentStatus ? (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        a.paymentStatus === "paid"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : a.paymentStatus === "partial"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}>
                        {a.paymentStatus === "paid" ? "مدفوع" : a.paymentStatus === "partial" ? "جزئي" : "غير مدفوع"}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
