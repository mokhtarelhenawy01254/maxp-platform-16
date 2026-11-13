import React from "react";
import { toast } from "sonner";
import {
  Users,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Trash2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { DemoDayAttendee } from "./types";

interface DemoDayAttendeesTableProps {
  attendees: DemoDayAttendee[];
  onUpdateStatus: (attendeeId: string, update: { attendanceStatus?: string; conversionStatus?: string; notes?: string }) => Promise<void>;
  onConvertLead: (attendee: DemoDayAttendee) => void;
  onDeleteAttendee: (attendeeId: string) => Promise<void>;
  isEn?: boolean;
}

export function DemoDayAttendeesTable({
  attendees,
  onUpdateStatus,
  onConvertLead,
  onDeleteAttendee,
  isEn = false,
}: DemoDayAttendeesTableProps) {
  if (!attendees.length) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-2.5">
        <div className="w-10 h-10 rounded-2xl bg-muted text-muted-foreground border border-border flex items-center justify-center mx-auto">
          <Users className="w-5 h-5" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {isEn ? "No attendees registered for this Demo Day yet" : "لا يوجد مسجلين في هذا اليوم التجريبي حتى الآن"}
        </p>
      </div>
    );
  }

  const openWhatsApp = (phone: string, studentName: string) => {
    let clean = phone.replace(/[^\d]/g, "");
    if (clean.startsWith("01")) clean = "20" + clean.slice(1);
    const msg = encodeURIComponent(
      `أهلاً بك، بخصوص حجز اليوم التجريبي (الديمو داي) للطالب ${studentName}...`
    );
    window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right divide-y divide-border/60">
          <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold">
            <tr>
              <th className="py-3 px-3.5">{isEn ? "Student / Guardian" : "الطالب / ولي الأمر"}</th>
              <th className="py-3 px-3.5">{isEn ? "Phone & WhatsApp" : "الهاتف والواتساب"}</th>
              <th className="py-3 px-3.5">{isEn ? "Age / Grade" : "السن والمرحلة"}</th>
              <th className="py-3 px-3.5">{isEn ? "Attendance" : "حالة الحضور"}</th>
              <th className="py-3 px-3.5">{isEn ? "Lead Status" : "حالة العميل المحتمل"}</th>
              <th className="py-3 px-3.5 text-center">{isEn ? "Actions" : "الإجراءات"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-foreground">
            {attendees.map((att) => {
              const isConverted = att.conversionStatus === "CONVERTED";

              return (
                <tr key={att.id} className="hover:bg-muted/30 transition-colors">
                  {/* Student & Guardian */}
                  <td className="py-3 px-3.5">
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <span>{att.studentName}</span>
                        {isConverted && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {isEn ? "Student" : "طالب مقيد"}
                          </span>
                        )}
                      </div>
                      {att.guardianName && (
                        <div className="text-[11px] text-muted-foreground">
                          {isEn ? "Guardian:" : "ولي الأمر:"} {att.guardianName}
                        </div>
                      )}
                      {att.notes && (
                        <div className="text-[10px] text-muted-foreground/80 italic line-clamp-1">
                          {att.notes}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Phone & WhatsApp */}
                  <td className="py-3 px-3.5 font-mono tabular-nums">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">{att.phone}</span>
                      <button
                        type="button"
                        onClick={() => openWhatsApp(att.phone, att.studentName)}
                        title={isEn ? "Chat on WhatsApp" : "مراسلة عبر واتساب"}
                        className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {att.email && (
                      <div className="text-[10px] text-muted-foreground font-sans truncate max-w-[140px]">
                        {att.email}
                      </div>
                    )}
                  </td>

                  {/* Age & Grade */}
                  <td className="py-3 px-3.5 text-muted-foreground">
                    <div>{att.grade || "-"}</div>
                    {att.age && (
                      <div className="text-[10px] font-mono tabular-nums">
                        {att.age} {isEn ? "yrs" : "سنة"}
                      </div>
                    )}
                  </td>

                  {/* Attendance Toggle */}
                  <td className="py-3 px-3.5">
                    <select
                      value={att.attendanceStatus}
                      onChange={(e) => onUpdateStatus(att.id, { attendanceStatus: e.target.value })}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer transition-colors ${
                        att.attendanceStatus === "ATTENDED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : att.attendanceStatus === "ABSENT"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      <option value="REGISTERED">{isEn ? "Registered" : "مسجل"}</option>
                      <option value="ATTENDED">{isEn ? "Attended" : "حضر الديمو"}</option>
                      <option value="ABSENT">{isEn ? "Absent" : "غائب"}</option>
                      <option value="CANCELLED">{isEn ? "Cancelled" : "ملغي"}</option>
                    </select>
                  </td>

                  {/* Lead Status */}
                  <td className="py-3 px-3.5">
                    <select
                      value={att.conversionStatus}
                      onChange={(e) => onUpdateStatus(att.id, { conversionStatus: e.target.value })}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer transition-colors ${
                        att.conversionStatus === "CONVERTED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold"
                          : att.conversionStatus === "NOT_INTERESTED"
                          ? "bg-muted text-muted-foreground border-border"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      }`}
                    >
                      <option value="PENDING">{isEn ? "Lead (Pending)" : "عميل محتمل (متابعة)"}</option>
                      <option value="FOLLOW_UP">{isEn ? "Follow-Up" : "مهتم - إعادة تواصل"}</option>
                      <option value="CONVERTED">{isEn ? "Converted (Student)" : "مشترك (تم التحويل)"}</option>
                      <option value="NOT_INTERESTED">{isEn ? "Not Interested" : "غير مهتم حالياً"}</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {!isConverted ? (
                        <button
                          type="button"
                          onClick={() => onConvertLead(att)}
                          title={isEn ? "Convert lead to official student" : "تحويل العميل المحتمل إلى طالب رسمي"}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isEn ? "Convert" : "تحويل لطالب"}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5">
                          ✓ {isEn ? "Enrolled" : "مشترك"}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(isEn ? "Delete this attendee?" : "هل أنت متأكد من حذف هذا الحاضر؟")) {
                            onDeleteAttendee(att.id);
                          }
                        }}
                        title={isEn ? "Delete attendee" : "حذف الحاضر"}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
