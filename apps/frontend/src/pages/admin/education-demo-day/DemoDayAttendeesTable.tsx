import { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  MessageSquare,
  UserCheck,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { DemoDayAttendee } from "./types";

interface DemoDayAttendeesTableProps {
  attendees: DemoDayAttendee[];
  onUpdateStatus: (attendeeId: string, update: { attendanceStatus?: string; conversionStatus?: string; notes?: string }) => Promise<void>;
  onConvertLead: (attendee: DemoDayAttendee) => void;
  onDeleteAttendee: (attendeeId: string) => Promise<void>;
  isEn?: boolean;
}

function parseAttribution(notes?: string | null, fallbackLeadSource?: string | null) {
  if (notes && notes.includes("[ATTR:")) {
    try {
      const match = notes.match(/\[ATTR:\s*({.*?})\]/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (_) {}
  }
  if (fallbackLeadSource) {
    const src = fallbackLeadSource.toUpperCase();
    return {
      source: src,
      campaign: src === "WHATSAPP" ? "محادثات الواتساب" : src === "FACEBOOK" ? "إعلانات فيسبوك" : src === "WEBSITE" ? "الموقع ولاندينج بيج" : "تسجيل مباشر / هاتف",
    };
  }
  return {
    source: "OTHER",
    campaign: "تسجيل مباشر / الإدارة",
  };
}

function cleanNotes(notes?: string | null) {
  if (!notes) return "";
  return notes.replace(/\[ATTR:\s*{.*?}\]/g, "").trim();
}

export function DemoDayAttendeesTable({
  attendees,
  onUpdateStatus,
  onConvertLead,
  onDeleteAttendee,
  isEn = false,
}: DemoDayAttendeesTableProps) {
  const [pendingDelete, setPendingDelete] = useState<DemoDayAttendee | null>(null);

  if (!attendees.length) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-2.5">
        <div className="w-10 h-10 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
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
      isEn
        ? `Hello, regarding the Demo Day reservation for student ${studentName}…`
        : `أهلاً بك، بخصوص حجز اليوم التجريبي (الديمو داي) للطالب ${studentName}…`
    );
    window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
  };

  const attendanceSelectCls = (att: DemoDayAttendee) =>
    `text-[11px] font-semibold px-2 py-1 rounded-lg w-full focus:outline-none cursor-pointer transition-colors ${
      att.attendanceStatus === "ATTENDED"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : att.attendanceStatus === "ABSENT"
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "bg-muted text-muted-foreground"
    }`;

  const leadSelectCls = (att: DemoDayAttendee) =>
    `text-[11px] font-semibold px-2 py-1 rounded-lg w-full focus:outline-none cursor-pointer transition-colors ${
      att.conversionStatus === "CONVERTED"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
        : att.conversionStatus === "NOT_INTERESTED"
        ? "bg-muted text-muted-foreground"
        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    }`;

  const whatsappBtn = (att: DemoDayAttendee, size: string) => (
    <button
      type="button"
      onClick={() => openWhatsApp(att.phone, att.studentName)}
      title={isEn ? "Chat on WhatsApp" : "مراسلة عبر واتساب"}
      aria-label={isEn ? `Chat with ${att.studentName} on WhatsApp` : `مراسلة ${att.studentName} عبر واتساب`}
      className={`p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${size}`}
    >
      <MessageSquare className="w-3.5 h-3.5" />
    </button>
  );

  const convertBtn = (att: DemoDayAttendee, withLabel: boolean) =>
    !withLabel ? (
      <button
        type="button"
        onClick={() => onConvertLead(att)}
        title={isEn ? "Convert lead to official student" : "تحويل العميل المحتمل إلى طالب رسمي"}
        aria-label={isEn ? `Convert ${att.studentName} to official student` : `تحويل ${att.studentName} إلى طالب رسمي`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary hover:bg-primary/90 active:scale-[0.97] text-primary-foreground shadow-2xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <UserCheck className="w-3.5 h-3.5" />
        <span>{isEn ? "Convert" : "تحويل لطالب"}</span>
      </button>
    ) : (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {isEn ? "Enrolled" : "مشترك"}
      </span>
    );

  const deleteBtn = (att: DemoDayAttendee, size: string) => (
    <button
      type="button"
      onClick={() => setPendingDelete(att)}
      title={isEn ? "Delete attendee" : "حذف الحاضر"}
      aria-label={isEn ? `Delete attendee ${att.studentName}` : `حذف الحاضر ${att.studentName}`}
      className={`p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive ${size}`}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <>
      {/* Desktop table (md+) */}
      <div className="hidden md:block w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right divide-y divide-border/60">
            <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap">{isEn ? "Student / Guardian" : "الطالب / ولي الأمر"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{isEn ? "Phone & WhatsApp" : "الهاتف والواتساب"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{isEn ? "Age / Grade" : "السن والمرحلة"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{isEn ? "Attendance" : "حالة الحضور"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{isEn ? "Lead Status" : "حالة العميل المحتمل"}</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-foreground">
              {attendees.map((att) => {
                const isConverted = att.conversionStatus === "CONVERTED";
                return (
                  <tr key={att.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{att.studentName}</span>
                          {isConverted && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {isEn ? "Student" : "طالب مقيد"}
                            </span>
                          )}
                        </div>
                        {att.guardianName && (
                          <div className="text-[11px] text-muted-foreground">
                            {isEn ? "Guardian:" : "ولي الأمر:"} {att.guardianName}
                          </div>
                        )}
                        {(() => {
                          const attr = parseAttribution(att.notes, att.leadSource);
                          if (!attr) return null;
                          return (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                              <span>{attr.source === "WHATSAPP" ? "💬 واتساب" : attr.source === "FACEBOOK" ? "⚡ فيسبوك" : attr.source === "MESSENGER" ? "💬 ماسنجر" : "🌐 الموقع"}</span>
                              {attr.campaign && <span>• {attr.campaign}</span>}
                              {attr.adId && <span className="font-mono text-[9px] text-muted-foreground opacity-80">({attr.adId})</span>}
                            </div>
                          );
                        })()}
                        {cleanNotes(att.notes) && (
                          <div className="text-[10px] text-muted-foreground/80 italic line-clamp-1">{cleanNotes(att.notes)}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 tabular-nums">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">{att.phone}</span>
                        {whatsappBtn(att, "")}
                      </div>
                      {att.email && (
                        <div className="text-[10px] text-muted-foreground font-sans truncate max-w-[140px]">{att.email}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-muted-foreground">
                      <div>{att.grade || "-"}</div>
                      {att.age && (
                        <div className="text-[10px] tabular-nums">
                          {att.age} {isEn ? "yrs" : "سنة"}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <select
                        value={att.attendanceStatus}
                        onChange={(e) => onUpdateStatus(att.id, { attendanceStatus: e.target.value })}
                        aria-label={isEn ? `Attendance status of ${att.studentName}` : `حالة حضور ${att.studentName}`}
                        className={attendanceSelectCls(att)}
                      >
                        <option value="REGISTERED">{isEn ? "Registered" : "مسجل"}</option>
                        <option value="ATTENDED">{isEn ? "Attended" : "حضر الديمو"}</option>
                        <option value="ABSENT">{isEn ? "Absent" : "غائب"}</option>
                        <option value="CANCELLED">{isEn ? "Cancelled" : "ملغي"}</option>
                      </select>
                    </td>
                    <td className="py-3 px-3.5">
                      <select
                        value={att.conversionStatus}
                        onChange={(e) => onUpdateStatus(att.id, { conversionStatus: e.target.value })}
                        aria-label={isEn ? `Lead status of ${att.studentName}` : `حالة العميل المحتمل ${att.studentName}`}
                        className={leadSelectCls(att)}
                      >
                        <option value="PENDING">{isEn ? "Lead (Pending)" : "عميل محتمل (متابعة)"}</option>
                        <option value="FOLLOW_UP">{isEn ? "Follow-Up" : "مهتم - إعادة تواصل"}</option>
                        <option value="CONVERTED">{isEn ? "Converted (Student)" : "مشترك (تم التحويل)"}</option>
                        <option value="NOT_INTERESTED">{isEn ? "Not Interested" : "غير مهتم حالياً"}</option>
                      </select>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {convertBtn(att, isConverted)}
                        {deleteBtn(att, "")}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards (< md) */}
      <div className="md:hidden rounded-2xl border border-border/80 bg-card shadow-2xs divide-y divide-border/40">
        {attendees.map((att) => {
          const isConverted = att.conversionStatus === "CONVERTED";
          return (
            <div key={att.id} className="p-3.5 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">{att.studentName}</span>
                    {isConverted && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {isEn ? "Student" : "طالب مقيد"}
                      </span>
                    )}
                  </div>
                  {att.guardianName && (
                    <div className="text-[11px] text-muted-foreground truncate">
                      {isEn ? "Guardian:" : "ولي الأمر:"} {att.guardianName}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {whatsappBtn(att, "")}
                  {deleteBtn(att, "")}
                </div>
              </div>

              <div className="flex items-center gap-2 tabular-nums text-[11px] flex-wrap">
                <span className="text-foreground font-medium">{att.phone}</span>
                {att.age && <span className="text-muted-foreground">{att.age} {isEn ? "yrs" : "سنة"}</span>}
                {att.grade && <span className="text-muted-foreground truncate">{att.grade}</span>}
                {(() => {
                  const attr = parseAttribution(att.notes, att.leadSource);
                  if (!attr) return null;
                  return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                      <span>{attr.source === "WHATSAPP" ? "💬 واتساب" : attr.source === "FACEBOOK" ? "⚡ فيسبوك" : "🌐 الموقع"}</span>
                      {attr.campaign && <span>• {attr.campaign}</span>}
                    </span>
                  );
                })()}
              </div>

              {cleanNotes(att.notes) && (
                <div className="text-[10px] text-muted-foreground/80 italic">{cleanNotes(att.notes)}</div>
              )}

              <div className="grid grid-cols-1 gap-2">
                <select
                  value={att.attendanceStatus}
                  onChange={(e) => onUpdateStatus(att.id, { attendanceStatus: e.target.value })}
                  aria-label={isEn ? `Attendance status of ${att.studentName}` : `حالة حضور ${att.studentName}`}
                  className={attendanceSelectCls(att)}
                >
                  <option value="REGISTERED">{isEn ? "Registered" : "مسجل"}</option>
                  <option value="ATTENDED">{isEn ? "Attended" : "حضر الديمو"}</option>
                  <option value="ABSENT">{isEn ? "Absent" : "غائب"}</option>
                  <option value="CANCELLED">{isEn ? "Cancelled" : "ملغي"}</option>
                </select>
                <select
                  value={att.conversionStatus}
                  onChange={(e) => onUpdateStatus(att.id, { conversionStatus: e.target.value })}
                  aria-label={isEn ? `Lead status of ${att.studentName}` : `حالة العميل المحتمل ${att.studentName}`}
                  className={leadSelectCls(att)}
                >
                  <option value="PENDING">{isEn ? "Lead (Pending)" : "عميل محتمل (متابعة)"}</option>
                  <option value="FOLLOW_UP">{isEn ? "Follow-Up" : "مهتم - إعادة تواصل"}</option>
                  <option value="CONVERTED">{isEn ? "Converted (Student)" : "مشترك (تم التحويل)"}</option>
                  <option value="NOT_INTERESTED">{isEn ? "Not Interested" : "غير مهتم حالياً"}</option>
                </select>
              </div>

              {!isConverted && (
                <button
                  type="button"
                  onClick={() => onConvertLead(att)}
                  className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground shadow-2xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {isEn ? "Convert to Student" : "تحويل لطالب"}
                </button>
              )}
              {att.notes && (
                <div className="text-[10px] text-muted-foreground/80 italic">{att.notes}</div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={isEn ? "Delete attendee?" : "حذف الحاضر؟"}
        content={
          isEn
            ? `Remove ${pendingDelete?.studentName || ""} from this Demo Day attendance list?`
            : `سيتم حذف ${pendingDelete?.studentName || ""} من قائمة حضور هذا اليوم التجريبي.`
        }
        confirmLabel={isEn ? "Delete" : "حذف"}
        cancelLabel={isEn ? "Cancel" : "إلغاء"}
        confirmColor="error"
        onConfirm={() => {
          if (pendingDelete) {
            void onDeleteAttendee(pendingDelete.id);
            toast.success(isEn ? "Attendee removed" : "تم حذف الحاضر");
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default DemoDayAttendeesTable;
