import { useState, useEffect, useMemo } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";

const getCompanyId = (): string | null => {
  try { return JSON.parse(localStorage.getItem("user") || "{}").companyId || null; } catch { return null; }
};
const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
};
const api = (path: string) => {
  const base = buildApiUrl(`education/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "مجدولة", color: "bg-blue-100 text-blue-800 border-blue-300" },
  CONFIRMED: { label: "مؤكدة", color: "bg-green-100 text-green-800 border-green-300" },
  CANCELLED: { label: "ملغية", color: "bg-red-100 text-red-800 border-red-300" },
};

interface Teacher { id: string; name: string; phone?: string; subjectRates?: { subject: { name: string } }[]; }
interface Session { id: string; teacherId: string; teacher?: { id: string; name: string }; student?: { firstName: string; lastName?: string }; subject?: { name: string }; scheduledAt: string; plannedDuration: number; actualDuration?: number; status: string; }

export default function EducationTeacherSchedulePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + weekOffset * 7 - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const weekStart = weekDays[0]?.toISOString().split("T")[0];
  const weekEnd = weekDays[6]?.toISOString().split("T")[0];

  useEffect(() => { fetchTeachers(); }, []);

  useEffect(() => {
    if (weekStart && weekEnd) fetchSessions();
  }, [weekStart, weekEnd, selectedTeacher]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch(api("teachers"), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTeachers(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: weekStart!, to: weekEnd! });
      if (selectedTeacher) params.append("teacherId", selectedTeacher);
      const res = await fetch(api(`sessions?${params}`), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setSessions(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getSessionsForDay = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    return sessions.filter(s => s.scheduledAt?.startsWith(dayStr));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">جدول المدرسين</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">عرض الحصص الأسبوعية للمدرسين</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          className="border dark:border-gray-600 rounded-lg px-4 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 min-w-[200px]"
          value={selectedTeacher}
          onChange={e => setSelectedTeacher(e.target.value)}
        >
          <option value="">كل المدرسين</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">← الأسبوع السابق</button>
          <span className="text-sm font-medium px-4">
            {weekDays[0]?.toLocaleDateString("ar-EG")} - {weekDays[6]?.toLocaleDateString("ar-EG")}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">الأسبوع التالي →</button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">هذا الأسبوع</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const daySessions = getSessionsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={`border dark:border-gray-700 rounded-xl overflow-hidden ${isToday ? "ring-2 ring-blue-500" : ""}`}>
                <div className={`text-center py-3 font-bold text-sm ${isToday ? "bg-blue-600 text-white" : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>
                  <div>{DAYS[i]}</div>
                  <div className="text-lg">{day.getDate()}</div>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {daySessions.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">—</p>
                  )}
                  {daySessions.map(s => {
                    const st = SESSION_STATUS[s.status];
                    return (
                      <div key={s.id} className={`p-2 rounded-lg border text-xs ${st?.color || "bg-gray-100"}`}>
                        <div className="font-bold mb-1">{formatTime(s.scheduledAt)}</div>
                        <div className="font-medium">{s.teacher?.name || "—"}</div>
                        <div className="text-gray-600">{s.student?.firstName} {s.student?.lastName || ""}</div>
                        <div className="text-gray-500">{s.subject?.name || "—"}</div>
                        <div className="mt-1 font-medium">{st?.label || s.status}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
