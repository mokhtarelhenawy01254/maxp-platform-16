import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Users, GraduationCap, Clock } from "lucide-react";

interface DashboardData {
  children: number;
  totalEnrollments: number;
  activeEnrollments: number;
  upcomingSessions: number;
  totalSessions: number;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  enrollments: Array<{
    id: string;
    remainingHours: number;
    package: { name: string; hoursCount: number } | null;
    teacher: { name: string } | null;
  }>;
}

const ParentDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) return;
    Promise.all([
      fetch('/api/v1/education/parent-portal/dashboard', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/v1/education/parent-portal/children', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([dashRes, childRes]) => {
      if (dashRes.success) setDashboard(dashRes.data);
      if (childRes.success) setChildren(childRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" /></div>;

  const stats = [
    { label: 'الأبناء', value: dashboard?.children ?? 0, icon: Users, color: 'text-blue-600 bg-blue-100' },
    { label: 'تسجيلات نشطة', value: dashboard?.activeEnrollments ?? 0, icon: GraduationCap, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'حصص قادمة', value: dashboard?.upcomingSessions ?? 0, icon: CalendarDays, color: 'text-amber-600 bg-amber-100' },
    { label: 'إجمالي الحصص', value: dashboard?.totalSessions ?? 0, icon: Clock, color: 'text-purple-600 bg-purple-100' },
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
                <div className={`p-3 rounded-lg ${s.color}`}><Icon size={24} /></div>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold mb-4">أبنائي</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map(child => (
          <Link key={child.id} to={`/parent/children/${child.id}`}
            className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{child.firstName} {child.lastName}</h3>
              <Users size={20} className="text-gray-400" />
            </div>
            <div className="space-y-2">
              {child.enrollments.length === 0 && <p className="text-sm text-gray-400">لا يوجد تسجيلات نشطة</p>}
              {child.enrollments.slice(0, 2).map(e => (
                <div key={e.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{e.package?.name || 'باقة'}</span>
                  <span className="font-medium">{e.remainingHours}/{e.package?.hoursCount || 0} س</span>
                </div>
              ))}
              {child.enrollments.length > 2 && <p className="text-xs text-gray-400">+{child.enrollments.length - 2} تسجيلات أخرى</p>}
            </div>
          </Link>
        ))}
        {children.length === 0 && <p className="text-gray-500 col-span-2">لا يوجد أبناء مسجلين</p>}
      </div>
    </div>
  );
};

export default ParentDashboardPage;
