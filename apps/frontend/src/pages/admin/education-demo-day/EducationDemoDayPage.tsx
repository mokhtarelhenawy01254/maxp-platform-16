import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Presentation,
  Calendar,
  Users,
  UserCheck,
  TrendingUp,
  Plus,
  Search,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  ExternalLink,
  Copy,
} from "lucide-react";
import { DemoDayEvent, DemoDayAttendee, DemoDayStats } from "./types";
import {
  fetchDemoDays,
  fetchDemoDayDetail,
  saveDemoDay,
  deleteDemoDay,
  registerAttendee,
  updateAttendeeStatus,
  convertAttendeeToStudent,
  deleteAttendee,
  fetchEducationLookup,
} from "./api";
import { DemoDayEventsList } from "./DemoDayEventsList";
import { DemoDayAttendeesTable } from "./DemoDayAttendeesTable";
import { DemoDayModal } from "./DemoDayModal";
import { AddAttendeeModal } from "./AddAttendeeModal";
import { ConvertLeadModal } from "./ConvertLeadModal";

export default function EducationDemoDayPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [events, setEvents] = useState<DemoDayEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState<(DemoDayEvent & { attendees: DemoDayAttendee[] }) | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Filters & Tabs
  const [viewTab, setViewTab] = useState<"EVENTS" | "ATTENDEES">("EVENTS");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Lookups
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [packages, setPackages] = useState<{ id: string; name: string; price: number; hoursCount: number }[]>([]);

  // Modals state
  const [eventModalOpen, setEventModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<DemoDayEvent | null>(null);
  const [addAttendeeModalOpen, setAddAttendeeModalOpen] = useState<boolean>(false);
  const [targetEventForAttendee, setTargetEventForAttendee] = useState<DemoDayEvent | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState<boolean>(false);
  const [targetAttendeeForConvert, setTargetAttendeeForConvert] = useState<DemoDayAttendee | null>(null);

  // Debounce search so typing does not fire an API call per keystroke
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, lookups] = await Promise.all([
        fetchDemoDays({ status: statusFilter, search: debouncedSearch }),
        fetchEducationLookup().catch(() => ({ subjects: [], teachers: [], packages: [] })),
      ]);
      setEvents(eventsData);
      setSubjects(lookups.subjects || []);
      setTeachers(lookups.teachers || []);
      setPackages(lookups.packages || []);

      if (eventsData.length) {
        setSelectedEventId((prev) => prev ?? eventsData[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to load Demo Day data" : "فشل تحميل بيانات الديمو داي"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, isEn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load selected event details
  const loadEventDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchDemoDayDetail(id);
      setSelectedEventDetail(detail);
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to load attendees" : "تعذر جلب تفاصيل الحضور"));
    } finally {
      setLoadingDetail(false);
    }
  }, [isEn]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventDetail(selectedEventId);
    } else {
      setSelectedEventDetail(null);
    }
  }, [selectedEventId, loadEventDetail]);

  // Telemetry KPIs
  const stats: DemoDayStats = useMemo(() => {
    const totalEvents = events.length;
    const now = new Date();
    const upcomingEvents = events.filter((e) => new Date(e.scheduledAt) >= now && e.status !== "CANCELLED").length;
    const totalAttendees = events.reduce((acc, e) => acc + (e.totalAttendees || 0), 0);
    const attendedCount = events.reduce((acc, e) => acc + (e.attendedCount || 0), 0);
    const convertedCount = events.reduce((acc, e) => acc + (e.convertedCount || 0), 0);
    const conversionRate = totalAttendees > 0 ? Math.round((convertedCount / totalAttendees) * 100) : 0;

    return {
      totalEvents,
      upcomingEvents,
      totalAttendees,
      attendedCount,
      convertedCount,
      conversionRate,
    };
  }, [events]);

  // Event handlers
  const handleSaveEvent = async (data: Partial<DemoDayEvent>) => {
    await saveDemoDay(data, editingEvent?.id);
    toast.success(editingEvent ? (isEn ? "Event updated" : "تم تحديث الفعالية بنجاح") : (isEn ? "Event created" : "تم جدولة الفعالية بنجاح"));
    await loadData();
    if (editingEvent && selectedEventId === editingEvent.id) {
      loadEventDetail(editingEvent.id);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDemoDay(id);
      toast.success(isEn ? "Event deleted" : "تم حذف الفعالية");
      if (selectedEventId === id) setSelectedEventId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Delete failed" : "فشل الحذف"));
    }
  };

  const handleRegisterAttendee = async (attendeeData: any) => {
    const eventId = targetEventForAttendee?.id || selectedEventId;
    if (!eventId) return;
    await registerAttendee(eventId, attendeeData);
    toast.success(isEn ? "Attendee registered and captured as Lead!" : "تم تسجيل الحاضر وقيده كعميل محتمل (Lead) في الـ CRM!");
    await loadData();
    if (selectedEventId === eventId) {
      loadEventDetail(eventId);
    }
  };

  const handleUpdateAttendeeStatus = async (attendeeId: string, update: any) => {
    try {
      await updateAttendeeStatus(attendeeId, update);
      toast.success(isEn ? "Status updated" : "تم تحديث الحالة");
      if (selectedEventId) loadEventDetail(selectedEventId);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to update status" : "فشل تحديث الحالة"));
    }
  };

  const handleConvertLead = async (convertData: any) => {
    if (!targetAttendeeForConvert) return;
    try {
      await convertAttendeeToStudent(targetAttendeeForConvert.id, convertData);
      toast.success(isEn ? "Lead successfully converted to official enrolled student!" : "تم تحويل العميل المحتمل إلى طالب رسمي وباقة بنجاح!");
      if (selectedEventId) loadEventDetail(selectedEventId);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Conversion failed" : "فشل التحويل"));
    }
  };

  const handleDeleteAttendee = async (attendeeId: string) => {
    try {
      await deleteAttendee(attendeeId);
      toast.success(isEn ? "Attendee deleted" : "تم حذف الحاضر");
      if (selectedEventId) loadEventDetail(selectedEventId);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Delete failed" : "فشل الحذف"));
    }
  };

  const copyPublicLink = (eventId: string) => {
    const url = `${window.location.origin}/education/demo/${eventId}`;
    navigator.clipboard.writeText(url);
    toast.success(isEn ? "Public registration link copied!" : "تم نسخ رابط التسجيل الخارجي للمشاركة بالإعلانات!");
  };

  return (
    <div
      className={`w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 font-sans ${isEn ? "ltr" : "rtl"}`}
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border/80">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Presentation className="w-3.5 h-3.5" />
            {isEn ? "Demo Day & Open Sessions" : "الديمو داي والفعاليات التجريبية"}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {isEn ? "Demo Day & Lead Conversion" : "إدارة فعاليات الديمو داي وتحويل العملاء المحتملين"}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={loadData}
            title={isEn ? "Refresh data" : "تحديث البيانات"}
            aria-label={isEn ? "Refresh data" : "تحديث البيانات"}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              setEventModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? "New Demo Day" : "جدولة ديمو داي"}</span>
          </button>
        </div>
      </div>

      {/* KPI Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            {isEn ? "Total Events" : "إجمالي الفعاليات"}
          </span>
          <div className="text-lg sm:text-xl font-bold text-foreground font-mono tabular-nums">
            {stats.totalEvents}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            {isEn ? "Upcoming Events" : "الفعاليات القادمة"}
          </span>
          <div className="text-lg sm:text-xl font-bold text-foreground font-mono tabular-nums">
            {stats.upcomingEvents}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            {isEn ? "Total Leads (Attendees)" : "إجمالي المسجلين (Leads)"}
          </span>
          <div className="text-lg sm:text-xl font-bold text-foreground font-mono tabular-nums">
            {stats.totalAttendees}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {isEn ? "Attended Session" : "حضروا الجلسة"}
          </span>
          <div className="text-lg sm:text-xl font-bold text-foreground font-mono tabular-nums">
            {stats.attendedCount}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {isEn ? "Conversion Rate" : "نسبة التحويل لاشتراكات"}
          </span>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums flex items-baseline gap-1">
            <span>{stats.conversionRate}%</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              ({stats.convertedCount} {isEn ? "enrolled" : "مشترك"})
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setViewTab("EVENTS")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              viewTab === "EVENTS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {isEn ? "Scheduled Events" : "جدول فعاليات الديمو"}
            <span className="text-[10px] opacity-80 font-mono tabular-nums">({events.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab("ATTENDEES")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              viewTab === "ATTENDEES"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {isEn ? "Attendees & Leads" : "المسجلين والعملاء المحتملين"}
            {selectedEventDetail && (
              <span className="text-[10px] opacity-80 font-mono tabular-nums">
                ({selectedEventDetail.attendees.length})
              </span>
            )}
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search events…" : "بحث في الفعاليات…"}
              className="w-full bg-background border border-input rounded-xl pr-8 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label={isEn ? "Search events" : "بحث في الفعاليات"}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={isEn ? "Filter by status" : "تصفية حسب الحالة"}
            className="bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="ALL">{isEn ? "All Statuses" : "كل الحالات"}</option>
            <option value="SCHEDULED">{isEn ? "Scheduled" : "مجدول"}</option>
            <option value="IN_PROGRESS">{isEn ? "In Progress" : "جاري الآن"}</option>
            <option value="COMPLETED">{isEn ? "Completed" : "مكتمل"}</option>
            <option value="CANCELLED">{isEn ? "Cancelled" : "ملغي"}</option>
          </select>
        </div>
      </div>

      {/* Tab Content */}
      {viewTab === "EVENTS" ? (
        <div className="space-y-4">
          <DemoDayEventsList
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={(id) => {
              setSelectedEventId(id);
              setViewTab("ATTENDEES");
            }}
            onEditEvent={(evt) => {
              setEditingEvent(evt);
              setEventModalOpen(true);
            }}
            onDeleteEvent={handleDeleteEvent}
            onAddAttendee={(evt) => {
              setTargetEventForAttendee(evt);
              setAddAttendeeModalOpen(true);
            }}
            isEn={isEn}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Event Banner */}
          {selectedEventDetail ? (
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {selectedEventDetail.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {selectedEventDetail.attendees.length} / {selectedEventDetail.capacity} {isEn ? "seats" : "مقعد"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedEventDetail.description || (isEn ? "Demo Day prospective student leads" : "قائمة الحضور والعملاء المحتملين لهذه الجلسة")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyPublicLink(selectedEventDetail.id)}
                  aria-label={isEn ? "Copy public registration link" : "نسخ رابط التسجيل الخارجي"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEn ? "Copy Public Form Link" : "نسخ رابط التسجيل الخارجي"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetEventForAttendee(selectedEventDetail);
                    setAddAttendeeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? "Register Attendee" : "إضافة حاضر"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-muted/40 text-xs text-muted-foreground text-center">
              {isEn ? "Select an event to view attendees" : "يرجى اختيار فعالية لعرض قائمة المسجلين والحضور"}
            </div>
          )}

          {/* Attendees Table */}
          <DemoDayAttendeesTable
            attendees={selectedEventDetail?.attendees || []}
            onUpdateStatus={handleUpdateAttendeeStatus}
            onConvertLead={(att) => {
              setTargetAttendeeForConvert(att);
              setConvertModalOpen(true);
            }}
            onDeleteAttendee={handleDeleteAttendee}
            isEn={isEn}
          />
        </div>
      )}

      {/* Modals */}
      <DemoDayModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        onSave={handleSaveEvent}
        event={editingEvent}
        subjects={subjects}
        teachers={teachers}
        isEn={isEn}
      />

      <AddAttendeeModal
        isOpen={addAttendeeModalOpen}
        onClose={() => setAddAttendeeModalOpen(false)}
        onRegister={handleRegisterAttendee}
        demoDayTitle={targetEventForAttendee?.title || selectedEventDetail?.title || ""}
        isEn={isEn}
      />

      <ConvertLeadModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        onConvert={handleConvertLead}
        attendee={targetAttendeeForConvert}
        packages={packages}
        teachers={teachers}
        isEn={isEn}
      />
    </div>
  );
}
