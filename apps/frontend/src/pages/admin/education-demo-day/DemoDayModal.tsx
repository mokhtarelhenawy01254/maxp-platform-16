import React, { useState, useEffect } from "react";
import { X, Calendar, MapPin, Link2, Check, AlertCircle, Building2, ExternalLink } from "lucide-react";
import { DemoDayEvent } from "./types";
import { educationBranchesService, EducationBranch, Classroom } from "../../../services/educationBranchesService";

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
  const [branchId, setBranchId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState(20);
  const [status, setStatus] = useState<"SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("SCHEDULED");
  const [notes, setNotes] = useState("");
  const [branches, setBranches] = useState<EducationBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches
  useEffect(() => {
    if (!isOpen) return;
    educationBranchesService
      .getBranches()
      .then((res) => {
        setBranches(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load branches for demo day modal:", err);
      });
  }, [isOpen]);

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
      setBranchId(event.branchId || "");
      setClassroomId(event.classroomId || "");
      setGoogleMapsUrl(event.googleMapsUrl || event.branchGoogleMapsUrl || "");
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
      setBranchId("");
      setClassroomId("");
      setGoogleMapsUrl("");
      setRoom("");
      setCapacity(20);
      setStatus("SCHEDULED");
      setNotes("");
    }
    setError(null);
  }, [event, isOpen]);

  const selectedBranch = branches.find((b) => b.id === branchId);
  const availableClassrooms: Classroom[] = selectedBranch?.classrooms || [];

  const handleBranchChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    setClassroomId("");
    const branch = branches.find((b) => b.id === newBranchId);
    if (branch) {
      if (branch.googleMapsUrl) {
        setGoogleMapsUrl(branch.googleMapsUrl);
      }
      if (branch.classrooms && branch.classrooms.length === 1) {
        const single = branch.classrooms[0];
        setClassroomId(single.id);
        setRoom(single.name);
        if (single.capacity) setCapacity(single.capacity);
      } else if (!room) {
        setRoom(branch.name);
      }
    }
  };

  const handleClassroomChange = (newClassroomId: string) => {
    setClassroomId(newClassroomId);
    const roomObj = availableClassrooms.find((c) => c.id === newClassroomId);
    if (roomObj) {
      setRoom(roomObj.name);
      if (roomObj.capacity) {
        setCapacity(roomObj.capacity);
      }
    }
  };

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
        meetingLink: locationType === "ONLINE" ? (meetingLink.trim() || null) : null,
        branchId: locationType === "OFFLINE" ? (branchId || null) : null,
        classroomId: locationType === "OFFLINE" ? (classroomId || null) : null,
        googleMapsUrl: locationType === "OFFLINE" ? (googleMapsUrl.trim() || null) : null,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-card border border-border/80 shadow-2xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {event
                  ? isEn ? "Edit Demo Day Workshop" : "تعديل يوم العرض التوضيحي (ديمو داي)"
                  : isEn ? "Create New Demo Day Workshop" : "جدولة يوم تجريبي جديد (ديمو داي)"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            aria-label="إغلاق"
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
                  <Building2 className="w-3.5 h-3.5" />
                  {isEn ? "In-Person (Branch)" : "حضوري بمقر الفرع"}
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
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? "Branch / Center *" : "الفرع / المقر التدريبي *"}</span>
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    aria-label="الفرع التدريبي"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">{isEn ? "-- Select Branch --" : "-- اختر فرع المركز --"}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.city ? `(${b.city})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {isEn ? "Classroom / Lab" : "القاعة أو المعمل"}
                  </label>
                  <select
                    value={classroomId}
                    onChange={(e) => handleClassroomChange(e.target.value)}
                    disabled={availableClassrooms.length === 0}
                    aria-label="القاعة أو المعمل"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
                  >
                    <option value="">{availableClassrooms.length > 0 ? (isEn ? "-- Select Classroom --" : "-- اختر القاعة أو المعمل --") : (isEn ? "No classrooms defined" : "لا توجد قاعات مضافة للفرع")}</option>
                    {availableClassrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.capacity ? `(سعة ${c.capacity} طالب)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {isEn ? "Room / Hall Name" : "اسم القاعة / رقم الغرفة"}
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder={isEn ? "e.g. Lab 1 / Main Hall" : "مثال: معمل البرمجة 1 / القاعة الكبرى"}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{isEn ? "Google Maps Link" : "رابط خرائط Google"}</span>
                    </label>
                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                      >
                        <span>فتح الرابط</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                    dir="ltr"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {isEn ? "Short Description / Highlights" : "وصف مختصر أو محاور اليوم التجريبي"}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isEn ? "What kids or parents will experience..." : "ما سيتعلمه الطفل خلال الورشة التجريبية..."}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Event Status" : "حالة الفعالية"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                aria-label={isEn ? "Event status" : "حالة الفعالية"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="SCHEDULED">{isEn ? "Scheduled" : "مجدولة وقادمة"}</option>
                <option value="IN_PROGRESS">{isEn ? "In Progress" : "جارية الآن"}</option>
                <option value="COMPLETED">{isEn ? "Completed" : "مكتملة ومنتهية"}</option>
                <option value="CANCELLED">{isEn ? "Cancelled" : "ملغاة"}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Internal Notes" : "ملاحظات داخلية للمشرفين"}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isEn ? "e.g. Ensure 15 laptops ready" : "مثال: تجهيز 15 لابتوب وشاشات عرض"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-2xs active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{event ? (isEn ? "Save Changes" : "حفظ التعديلات") : (isEn ? "Create Demo Day" : "إنشاء الديمو داي")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
