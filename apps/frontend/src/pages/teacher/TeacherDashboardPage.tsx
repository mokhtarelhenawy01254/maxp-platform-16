import React, { useEffect, useState } from "react";
import { Calendar, Clock, DollarSign, Users } from 'lucide-react';

interface DashboardData {
  upcomingSessions: number;
  totalSessions: number;
  thisWeekSessions: number;
  totalPaid: number;
  totalStudents: number;
}

const TeacherDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('teacherToken');
        const res = await fetch('/api/v1/education/teacher-portal/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.message || 'حدث خطأ');
      } catch { setError('فشل الاتصال'); }
      finally { setLoading(false); }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" /></div>;

  if (error) return <div className="text-center py-12 text-red-600">{error}</div>;

  const stats = [
    { label: 'الحصص القادمة', value: data?.upcomingSessions ?? 0, icon: CalendarDays, color: 'text-blue-600 bg-blue-100' },
    { label: 'حصص هذا الأسبوع', value: data?.thisWeekSessions ?? 0, icon: Clock, color: 'text-green-600 bg-green-100' },
    { label: 'إجمالي الحصص', value: data?.totalSessions ?? 0, icon: Users, color: 'text-purple-600 bg-purple-100' },
    { label: 'إجمالي المدفوعات', value: `${data?.totalPaid ?? 0} ج.م`, icon: DollarSign, color: 'text-amber-600 bg-amber-100' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">لوحة التحكم</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${s.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
