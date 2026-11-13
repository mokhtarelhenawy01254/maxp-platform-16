import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, Link2, Users, FileText, Check, AlertCircle } from "lucide-react";
import { DemoDayEvent } from "./types";

interface DemoDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DemoDayEvent>) => Promise<void>;
  event: DemoDayEvent | null;
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  isEn?: boolean;
}

export function DemoDayModal({
  isOpen,
  onClose,
  onSave,
  event,
  subjects,
  teachers,
  isEn = false,
}: DemoDayModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [locationType, setLocationType] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [meetingLink, setMeetingLink] = useState("");
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState(20);
  const [status, setStatus] = useState<"SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("SCHEDULED");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setSubjectId(event.subjectId || "");
      setTeacherId(event.teacherId || "");
      if (event.scheduledAt) {
        try {
          const d = new Date(event.scheduledAt);
          const pad = (n: number) => String(n).padStart(2, "0");
          const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setScheduledAt(localStr);
        } catch {
          setScheduledAt("");
        }
      } else {
        setScheduledAt("");
      }
      setDurationMinutes(event.durationMinutes || 60);
      setLocationType(event.locationType || "ONLINE");
      setMeetingLink(event.meetingLink || "");
      setRoom(event.room || "");
      setCapacity(event.capacity || 20);
      setStatus(event.status || "SCHEDULED");
      setNotes(event.notes || "");
    } else {
      setTitle("");
      setDescription("");
      setSubjectId("");
      setTeacherId("");
      const now = new Date();
      now.setDate(now.getDate() + 3);
      now.setHours(17, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduledAt(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T17:00`);
      setDurationMinutes(60);
      setLocationType("ONLINE");
      setMeetingLink("");
      setRoom("");
      setCapacity(20);
      setStatus("SCHEDULED");
      setNotes("");
    }
    setError(null);
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      setError(isEn ? "Event title and date are required" : "عنوان الفعالية وتاريخ الانعقاد مطلوبان");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        subjectId: subjectId || null,
        teacherId: teacherId || null,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(durationMinutes) || 60,
        locationType,
        meetingLink: meetingLink.trim() || null,
        room: room.trim() || null,
        capacity: Number(capacity) || 20,
        status,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to save Demo Day" : "فشل حفظ فعالية الديمو داي"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {event
                  ? (isEn ? "Edit Demo Day Event" : "تعديل فعالية الديمو داي")
                  : (isEn ? "New Demo Day Event" : "جدولة فعالية ديمو داي جديدة")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Set event details, capacity, and attendance channel" : "حدد تفاصيل اليوم التجريبي والسعة وقناة الانعقاد"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close modal" : "إغلاق النافذة"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {isEn ? "Event Title" : "عنوان اليوم التجريبي / الديمو"} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEn ? "e.g. AI for Kids - Free Demo Workshop" : "مثال: ورشة بايثون والذكاء الاصطناعي للأطفال - ديمو مجاني"}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Subject / Track" : "المادة أو المسار التعليمي"}
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                aria-label={isEn ? "Subject or track" : "المادة أو المسار التعليمي"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">{isEn ? "-- Select Subject (Optional) --" : "-- اختر المادة (اختياري) --"}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Instructor / Presenter" : "المحاضر أو المدرب المسؤول"}
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                aria-label={isEn ? "Instructor or presenter" : "المحاضر أو المدرب المسؤول"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">{isEn ? "-- Select Instructor (Optional) --" : "-- اختر المدرب (اختياري) --"}</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {isEn ? "Date & Time" : "تاريخ ووقت الانعقاد"} <span className="text-destructive">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Duration (Minutes)" : "مدة الجلسة (بالدقائق)"}
              </label>
              <input
                type="number"
                min="15"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {isEn ? "Location Type" : "نوع الانعقاد"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLocationType("ONLINE")}
                  className={`px-3 py-2 text-xs rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    locationType === "ONLINE"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {isEn ? "Online (Zoom/Meet)" : "أونلاين (رابط)"}
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType("OFFLINE")}
                  className={`px-3 py-2 text-xs rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    locationType === "OFFLINE"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {isEn ? "In-Person (Center)" : "حضوري بالمقر"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Maximum Capacity" : "السعة القصوى (المقاعد)"}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono tabular-nums"
              />
            </div>
          </div>

          {locationType === "ONLINE" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Meeting Link (Zoom / Google Meet)" : "رابط البث أو الغرفة (Zoom / Google Meet)"}
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/xyz or https://zoom.us/j/..."
                dir="ltr"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Room / Hall Name" : "القاعة أو رقم الغرفة"}
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder={isEn ? "e.g. Lab 2 / Hall A" : "مثال: معمل 2 أو القاعة الكبرى"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          )}

          {event && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Status" : "حالة الفعالية"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-medium"
              >
                <option value="SCHEDULED">{isEn ? "Scheduled" : "مجدول"}</option>
                <option value="IN_PROGRESS">{isEn ? "In Progress" : "جاري حالياً"}</option>
                <option value="COMPLETED">{isEn ? "Completed" : "مكتمل"}</option>
                <option value="CANCELLED">{isEn ? "Cancelled" : "ملغي"}</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {isEn ? "Description / Objective" : "نبذة عن الفعالية ومحاور الجلسة"}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
                placeholder={isEn ? "What students will learn in this demo session…" : "ما سيتعلمه الطالب خلال هذه الجلسة التجريبية…"}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-border/80 bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {isEn ? "Cancel" : "إلغاء"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {event ? (isEn ? "Save Changes" : "حفظ التعديلات") : (isEn ? "Create Event" : "جدولة الفعالية")}
          </button>
        </div>
      </div>
    </div>
  );
}
