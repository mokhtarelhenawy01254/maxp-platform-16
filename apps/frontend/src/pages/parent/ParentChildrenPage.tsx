import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, RefreshCw, ChevronLeft } from "lucide-react";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  grade?: string;
}

export const ParentChildrenPage: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChildren = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("parentToken");
      const res = await fetch("/api/v1/education/parent-portal/children", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setChildren(data.data);
      } else {
        setChildren([]);
      }
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل قائمة الأبناء...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              STUDENT PROFILES
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              إجمالي {children.length} أبناء مسجلين
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">ملفات أبنائي الأكاديمية</h1>
          <p className="text-xs text-muted-foreground">
            متابعة الحصص التعليمية، المعلمين، ورصيد الساعات المتبقية لكل طالب
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchChildren}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Children Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map((child) => (
          <Link
            key={child.id}
            to={`/parent/children/${child.id}`}
            className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 hover:border-border transition-all flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">
                  {child.firstName} {child.lastName}
                </h3>
                {child.grade && (
                  <p className="text-xs text-muted-foreground">{child.grade}</p>
                )}
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {child.firstName[0]}
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-primary font-medium">
              <span>عرض تفاصيل الحصص والتسجيلات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}

        {children.length === 0 && (
          <div className="col-span-2 rounded-xl border border-border/70 bg-card p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا يوجد أطفال مسجلون</p>
            <p className="text-xs text-muted-foreground">يمكنك إضافة أبنائك والتسجيل عبر الأكاديمية</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentChildrenPage;
