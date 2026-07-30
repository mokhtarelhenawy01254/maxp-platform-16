import React, { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Clock, User, Book } from 'lucide-react';

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

interface Session {
  id: string; scheduledAt: string; plannedDuration: number; actualDuration: number | null;
  status: string; topic: string | null;
  student: { firstName: string; lastName: string };
  teacher: { name: string };
  subject: { name: string };
}

const EducationCalendarPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const from = new Date(currentYear, currentMonth, 1).toISOString();
        const to = new Date(currentYear, currentMonth + 1, 0, 23, 59).toISOString();
        const res = await fetch(`/api/v1/education/sessions?from=${from}&to=${to}&limit=500`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setSessions(json.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchSessions();
  }, [currentMonth, currentYear]);

  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  }, []);

  const prevMonth = useCallback(() => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }, [currentMonth]);

  const firstDayOfWeek = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();
  const today = new Date();

  const getSessionsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return sessions.filter(s => s.scheduledAt.startsWith(dateStr));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">التقويم</h1>
        <div className="flex items-center gap-3">
          <button onClick={goToday} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors">اليوم</button>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} /></button>
            <span className="text-lg font-semibold min-w-[200px] text-center">{MONTHS_AR[currentMonth]} {currentYear}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {DAYS_AR.map(d => (
              <div key={d} className="p-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 border-l last:border-l-0">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] border-b border-l last:border-l-0 p-2 bg-gray-50/50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const daySessions = getSessionsForDay(day);
              const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
              return (
                <div key={day} className={`min-h-[120px] border-b border-l last:border-l-0 p-2 ${isToday ? 'bg-red-50' : ''}`}>
                  <div className={`text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-red-600 text-white' : 'text-gray-700'}`}>{day}</div>
                  <div className="space-y-1">
                    {daySessions.slice(0, 3).map(s => (
                      <button key={s.id} onClick={() => setSelectedSession(s)}
                        className={`w-full text-right text-xs px-2 py-1 rounded-md border truncate block ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-700'}`}>
                        {s.scheduledAt.slice(11, 16)} {s.student.firstName}
                      </button>
                    ))}
                    {daySessions.length > 3 && (
                      <button className="text-xs text-red-600 font-medium px-2">+{daySessions.length - 3} المزيد</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedSession && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelectedSession(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تفاصيل الحصة</h3>
              <button onClick={() => setSelectedSession(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User size={20} className="text-gray-400" />
                <div><p className="font-medium">{selectedSession.student.firstName} {selectedSession.student.lastName}</p><p className="text-xs text-gray-500">طالب</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User size={20} className="text-gray-400" />
                <div><p className="font-medium">{selectedSession.teacher.name}</p><p className="text-xs text-gray-500">مدرس</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <BookOpen size={20} className="text-gray-400" />
                <div><p className="font-medium">{selectedSession.subject.name}</p><p className="text-xs text-gray-500">المادة</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Clock size={20} className="text-gray-400" />
                <div>
                  <p className="font-medium">{new Date(selectedSession.scheduledAt).toLocaleDateString('ar-EG')} — {selectedSession.scheduledAt.slice(11, 16)}</p>
                  <p className="text-xs text-gray-500">{selectedSession.actualDuration || selectedSession.plannedDuration} دقيقة</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl border">
                <span className="text-sm text-gray-500">الحالة</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[selectedSession.status] || ''}`}>
                  {selectedSession.status === 'SCHEDULED' ? 'مجدولة' : selectedSession.status === 'CONFIRMED' ? 'مؤكدة' : 'ملغية'}
                </span>
              </div>
              {selectedSession.topic && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">الموضوع</p>
                  <p className="font-medium">{selectedSession.topic}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationCalendarPage;
