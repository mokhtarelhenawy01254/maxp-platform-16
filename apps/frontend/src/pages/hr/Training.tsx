import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  Plus,
  Calendar,
  Clock,
  User,
  Edit2,
  RotateCcw,
  Search,
  DollarSign,
  Award,
  BookOpen,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { tToast } from "../../utils/i18n-toast";

interface TrainingItem {
  id: string;
  trainingName: string;
  provider?: string;
  type?: string;
  startDate: string;
  endDate?: string;
  status: string;
  cost?: number;
  duration?: number;
  score?: number;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber?: string;
  } | null;
}

const statusMap: Record<string, { label: string; class: string }> = {
  ONGOING: { label: "قيد التنفيذ", class: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  COMPLETED: { label: "مكتمل", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  PLANNED: { label: "مخطط", class: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  CANCELLED: { label: "ملغي", class: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
};

const Training: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTrainings();
  }, [employeeId]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const url = employeeId ? `/hr/trainings/employee/${employeeId}` : "/hr/trainings";
      const response = await api.get(url);
      setTrainings(response.data.trainings || []);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      tToast.error("Training.failed_fetch_8c5b");
    } finally {
      setLoading(false);
    }
  };

  const filteredTrainings = useMemo(() => {
    return trainings.filter((t) => {
      const matchStatus = selectedStatus === "ALL" || t.status === selectedStatus;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.trainingName.toLowerCase().includes(q) ||
        (t.provider && t.provider.toLowerCase().includes(q)) ||
        (t.employee?.firstName && t.employee.firstName.toLowerCase().includes(q)) ||
        (t.employee?.lastName && t.employee.lastName.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [trainings, selectedStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = trainings.length;
    const ongoing = trainings.filter((t) => t.status === "ONGOING").length;
    const completed = trainings.filter((t) => t.status === "COMPLETED").length;
    const totalCost = trainings.reduce((acc, t) => acc + (t.cost || 0), 0);
    const scoredList = trainings.filter((t) => t.score !== undefined && t.score !== null);
    const avgScore = scoredList.length
      ? Math.round(scoredList.reduce((acc, t) => acc + (t.score || 0), 0) / scoredList.length)
      : 0;
    return { total, ongoing, completed, totalCost, avgScore };
  }, [trainings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono">جاري تحميل سجلات البرامج التدريبية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      {/* Top Chassis Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">التدريب والتطوير</h1>
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono tabular-nums bg-muted/40 border-border/70 text-muted-foreground">
              {filteredTrainings.length} برنامج
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            إدارة البرامج التدريبية، قياس الأثر المهني، وتوثيق استثمار المهارات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTrainings} className="h-8 gap-1.5 text-xs border-border/70">
            <RotateCcw className="h-3.5 w-3.5" />
            تحديث
          </Button>
          <Button size="sm" onClick={() => navigate("/hr/training/new")} className="h-8 gap-1.5 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" />
            إضافة برنامج تدريب
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي البرامج</span>
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">{stats.total}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>قيد التنفيذ</span>
            <Clock className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-blue-500">{stats.ongoing}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>مكتمل</span>
            <GraduationCap className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">{stats.completed}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي الاستثمار</span>
            <DollarSign className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.totalCost.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>متوسط التقييم</span>
            <Award className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-500">
            {stats.avgScore > 0 ? `${stats.avgScore}%` : "—"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-border/60 bg-muted/20 w-fit">
          {[
            { key: "ALL", label: "الكل" },
            { key: "ONGOING", label: "قيد التنفيذ" },
            { key: "PLANNED", label: "مخطط" },
            { key: "COMPLETED", label: "مكتمل" },
            { key: "CANCELLED", label: "ملغي" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedStatus === tab.key
                  ? "bg-card text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="بحث عن برنامج أو موظف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pr-8 text-xs border-border/70 bg-card"
          />
        </div>
      </div>

      {/* Trainings Cards Grid */}
      {filteredTrainings.length === 0 ? (
        <div className="rounded-lg border border-border/70 bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm font-semibold text-foreground">لا توجد برامج تدريبية مطابقة</p>
          <p className="text-muted-foreground">لم يتم العثور على أي برامج تدريبية تتطابق مع معايير البحث والفلترة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTrainings.map((item) => {
            const status = statusMap[item.status] || { label: item.status, class: "bg-muted text-muted-foreground border-border/60" };
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/hr/training/${item.id}`)}
                className="rounded-lg border border-border/70 bg-card p-3.5 hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-1.5 rounded-md bg-muted/30 border border-border/60 text-primary">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${status.class}`}>
                      {status.label}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-1">{item.trainingName}</h3>
                    {item.provider && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">الجهة: {item.provider}</p>}
                  </div>
                  {item.employee && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 p-1.5 px-2 rounded border border-border/50">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">{item.employee.firstName} {item.employee.lastName}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> تاريخ البدء
                      </div>
                      <div className="font-mono text-[11px] text-foreground mt-0.5">
                        {new Date(item.startDate).toLocaleDateString("ar-EG")}
                      </div>
                    </div>
                    {item.duration ? (
                      <div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> المدة
                        </div>
                        <div className="font-mono text-[11px] text-foreground mt-0.5">{item.duration} ساعة</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {item.cost ? (
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground">الاستثمار: </span>
                        <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                          {item.cost.toLocaleString()} ج.م
                        </span>
                      </div>
                    ) : <div />}
                    {item.score !== undefined && item.score !== null ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono tabular-nums bg-amber-500/10 text-amber-500 border-amber-500/20">
                        التقييم: {item.score}%
                      </Badge>
                    ) : null}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs border-border/70 hover:bg-muted/40 gap-1.5 mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/hr/training/${item.id}`);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                    عرض وتعديل التفاصيل
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Training;
