import React from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Link2,
  Users,
  Copy,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  TrendingUp,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { DemoDayEvent } from "./types";

interface DemoDayEventsListProps {
  events: DemoDayEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onEditEvent: (event: DemoDayEvent) => void;
  onDeleteEvent: (id: string) => void;
  onAddAttendee: (event: DemoDayEvent) => void;
  isEn?: boolean;
}

export function DemoDayEventsList({
  events,
  selectedEventId,
  onSelectEvent,
  onEditEvent,
  onDeleteEvent,
  onAddAttendee,
  isEn = false,
}: DemoDayEventsListProps) {
  const copyPublicLink = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/education/demo/${eventId}`;
    navigator.clipboard.writeText(url);
    toast.success(isEn ? "Public registration link copied!" : "تم نسخ رابط التسجيل الخارجي للمشاركة بالإعلانات!");
  };

  if (!events.length) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground">
            {isEn ? "No Demo Day events scheduled yet" : "لا توجد فعاليات ديمو داي مجدولة حالياً"}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {isEn
              ? "Schedule your first open day or trial workshop to start collecting student leads."
              : "قم بجدولة أول يوم تجريبي أو ورشة عمل تعريفية لبدء استقبال تسجيلات الطلاب والعملاء المحتملين."}
          </p>
        </div>
      </div>
    );
  }

  const formatDateTime = (dtStr: string) => {
    try {
      const d = new Date(dtStr);
      // -u-nu-latn keeps digits Latin so dates match the tabular KPI numerals
      return d.toLocaleDateString(isEn ? "en-US" : "ar-EG-u-nu-latn", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dtStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return {
          label: isEn ? "Scheduled" : "مجدول",
          cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      case "IN_PROGRESS":
        return {
          label: isEn ? "Live Now" : "جاري الآن",
          cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 animate-pulse",
        };
      case "COMPLETED":
        return {
          label: isEn ? "Completed" : "مكتمل",
          cls: "bg-muted text-muted-foreground border-border",
        };
      case "CANCELLED":
        return {
          label: isEn ? "Cancelled" : "ملغي",
          cls: "bg-destructive/10 text-destructive border-destructive/20",
        };
      default:
        return { label: status, cls: "bg-muted text-muted-foreground border-border" };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {events.map((evt) => {
        const isSelected = selectedEventId === evt.id;
        const total = evt.totalAttendees || 0;
        const capacity = evt.capacity || 20;
        const fillPercent = Math.min(100, Math.round((total / capacity) * 100));
        const statusMeta = getStatusBadge(evt.status);
        const converted = evt.convertedCount || 0;

        return (
          <div
            key={evt.id}
            role="button"
            tabIndex={0}
            aria-label={`${evt.title}${isEn ? " — open attendees" : " — فتح قائمة الحضور"}`}
            onClick={() => onSelectEvent(evt.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectEvent(evt.id);
              }
            }}
            className={`group p-4 bg-card rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3.5 shadow-2xs hover:shadow-xs relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected
                ? "border-primary ring-1 ring-primary bg-primary/2"
                : "border-border/80 hover:border-primary/40"
            }`}
          >
            {/* Top Bar: Status + Actions */}
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>

              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => copyPublicLink(evt.id, e)}
                  title={isEn ? "Copy public registration link" : "نسخ رابط التسجيل الخارجي"}
                  aria-label={isEn ? "Copy public registration link" : "نسخ رابط التسجيل الخارجي"}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditEvent(evt);
                  }}
                  title={isEn ? "Edit event" : "تعديل الفعالية"}
                  aria-label={isEn ? "Edit event" : "تعديل الفعالية"}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(isEn ? "Delete this Demo Day event?" : "هل أنت متأكد من حذف هذه الفعالية؟")) {
                      onDeleteEvent(evt.id);
                    }
                  }}
                  title={isEn ? "Delete event" : "حذف الفعالية"}
                  aria-label={isEn ? "Delete event" : "حذف الفعالية"}
                  className="p-1.5 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Event Title & Meta */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {evt.title}
              </h3>
              {evt.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {evt.description}
                </p>
              )}
            </div>

            {/* Time & Location */}
            <div className="space-y-1 text-xs text-muted-foreground border-t border-border/40 pt-2.5">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{formatDateTime(evt.scheduledAt)}</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  ({evt.durationMinutes} {isEn ? "min" : "دقيقة"})
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  {evt.locationType === "ONLINE" ? (
                    <>
                      <Link2 className="w-3 h-3 text-purple-500" />
                      <span>{isEn ? "Online (Webinar/Room)" : "أونلاين"}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span>{evt.room || (isEn ? "In-Person Center" : "حضوري بالمقر")}</span>
                    </>
                  )}
                </span>
                {evt.teacherName && (
                  <span className="truncate max-w-[120px] text-muted-foreground">
                    {evt.teacherName}
                  </span>
                )}
              </div>
            </div>

            {/* Capacity & Lead Telemetry */}
            <div className="space-y-1.5 border-t border-border/40 pt-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1 text-muted-foreground text-[11px]">
                  <Users className="w-3.5 h-3.5" />
                  {isEn ? "Registrants (Leads):" : "المسجلين (Leads):"}
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {total} / {capacity}
                  <span className="text-[10px] text-muted-foreground mr-1">({fillPercent}%)</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    fillPercent >= 100
                      ? "bg-rose-500"
                      : fillPercent >= 80
                      ? "bg-amber-500"
                      : "bg-primary"
                  }`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>

              {/* Converted Leads Stats */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <UserCheck className="w-3 h-3" />
                  {isEn ? `${converted} Converted Students` : `${converted} تم تحويلهم لطلاب`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAttendee(evt);
                  }}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-semibold active:scale-[0.97] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                >
                  <Plus className="w-3 h-3" />
                  {isEn ? "Add Attendee" : "تسجيل حاضر"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
