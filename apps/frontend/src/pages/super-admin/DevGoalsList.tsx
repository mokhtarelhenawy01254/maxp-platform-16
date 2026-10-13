import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { useTheme } from "../../hooks/useTheme";
import {
  Plus,
  Flag,
  Filter,
  Search,
  BarChart3,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Eye,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Link,
  Edit,
} from "lucide-react";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const goalTypeLabels: Record<string, string> = {
  COMPANY: "هدف شركة",
  TEAM: "هدف فريق",
  INDIVIDUAL: "هدف فردي",
};

const goalTypeColors: Record<string, string> = {
  COMPANY: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  TEAM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  INDIVIDUAL: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "نشط",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  COMPLETED: {
    label: "مكتمل",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    icon: <Flag className="h-3.5 w-3.5" />,
  },
  ON_HOLD: {
    label: "معلق",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    label: "ملغي",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

const confidenceConfig: Record<string, { label: string; color: string }> = {
  ON_TRACK: { label: "على المسار", color: "bg-green-500" },
  AT_RISK: { label: "في خطر", color: "bg-yellow-500" },
  OFF_TRACK: { label: "خارج المسار", color: "bg-red-500" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "منخفضة", color: "bg-gray-400" },
  MEDIUM: { label: "متوسطة", color: "bg-yellow-500" },
  HIGH: { label: "عالية", color: "bg-orange-500" },
  CRITICAL: { label: "حرجة", color: "bg-red-500" },
};

interface Goal {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  targetType: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  progress: number;
  confidence: string | null;
  startDate: string;
  endDate: string;
  quarter: string | null;
  tags: string[];
  owner: { id: string; name: string; userId: string } | null;
  project: { id: string; name: string; color: string } | null;
  _count: { keyResults: number; linkedTasks: number; childGoals: number };
}

interface DashboardStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  atRiskCount: number;
  totalKeyResults: number;
  completedKeyResults: number;
  totalLinkedTasks: number;
}

const DevGoalsList: React.FC = () => {
  const navigate = useNavigate();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>("endDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      if (filterStatus) params.append("status", filterStatus);
      if (filterPriority) params.append("priority", filterPriority);
      if (filterQuarter) params.append("quarter", filterQuarter);

      const [goalsRes, statsRes] = await Promise.all([
        fetch(buildApiUrl(`super-admin/dev/goals?${params.toString()}`), {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        }),
        fetch(buildApiUrl(`super-admin/dev/goals/dashboard?${params.toString()}`), {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        }),
      ]);

      const goalsData = await goalsRes.json();
      const statsData = await statsRes.json();

      if (goalsData.success) setGoals(goalsData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error("Error fetching goals:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterPriority, filterQuarter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`super-admin/dev/goals/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setDeleteConfirm(null);
        fetchData();
      } else {
        alert(data.error || i18n.t("DevGoalsList.failed_delete_5bfb"));
      }
    } catch (err) {
      alert(i18n.t("DevGoalsList.msg_6e3a"));
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  const filteredGoals = goals
    .filter((goal) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        goal.title.toLowerCase().includes(s) ||
        goal.description?.toLowerCase().includes(s) ||
        goal.owner?.name.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      const aVal = sortBy === "progress" ? a.progress : sortBy === "endDate" ? new Date(a.endDate).getTime() : a.priority.length;
      const bVal = sortBy === "progress" ? b.progress : sortBy === "endDate" ? new Date(b.endDate).getTime() : b.priority.length;
      return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Flag className="h-5 w-5" />
            </div>
            <span>الأهداف والنتائج الرئيسية (OKRs)</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            تتبع أهداف الفريق والمشاريع والاستراتيجية الفصلية والسنوية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/super-admin/dev-goals/alignment")}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/60 bg-card text-foreground transition-colors shadow-sm"
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span>شجرة المحاذاة</span>
          </button>
          <button
            onClick={() => navigate("/super-admin/dev-goals/new")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>هدف جديد</span>
          </button>
        </div>
      </div>

      {/* Telemetry Stats Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">إجمالي الأهداف</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">{stats.totalGoals}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Flag className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">متوسط التقدم</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {stats.avgProgress}%
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">النتائج الرئيسية المكتملة</p>
                <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
                  {stats.completedKeyResults} <span className="text-xs text-muted-foreground font-normal">/ {stats.totalKeyResults}</span>
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">في دائرة الخطر</p>
                <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1 tabular-nums">{stats.atRiskCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Toolbar & Filters */}
      <div className="bg-card rounded-xl border border-border p-3 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث في الأهداف والمسؤولين..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs border border-border rounded-lg bg-muted/30 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">كل الأنواع</option>
            <option value="COMPANY">هدف شركة</option>
            <option value="TEAM">هدف فريق</option>
            <option value="INDIVIDUAL">هدف فردي</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">كل الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="COMPLETED">مكتمل</option>
            <option value="ON_HOLD">معلق</option>
            <option value="CANCELLED">ملغي</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">كل الأولويات</option>
            <option value="LOW">منخفضة</option>
            <option value="MEDIUM">متوسطة</option>
            <option value="HIGH">عالية</option>
            <option value="CRITICAL">حرجة</option>
          </select>

          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">كل الفترات (Quarters)</option>
            <option value="Q1-2026">Q1 2026</option>
            <option value="Q2-2026">Q2 2026</option>
            <option value="Q3-2026">Q3 2026</option>
            <option value="Q4-2026">Q4 2026</option>
          </select>

          {(filterType || filterStatus || filterPriority || filterQuarter || search) && (
            <button
              onClick={() => {
                setFilterType("");
                setFilterStatus("");
                setFilterPriority("");
                setFilterQuarter("");
                setSearch("");
              }}
              className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {filteredGoals.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-10 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <Flag className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              لا توجد أهداف مطابقة
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              لم يتم العثور على أهداف بالمعايير المحددة. يمكنك إنشاء هدف جديد أو تعديل خيارات التصفية.
            </p>
            <button
              onClick={() => navigate("/super-admin/dev-goals/new")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>هدف جديد</span>
            </button>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const statusInfo = statusConfig[goal.status] || statusConfig.ACTIVE;
            const confidenceInfo = goal.confidence ? confidenceConfig[goal.confidence] : null;
            const isOverdue = new Date(goal.endDate) < new Date() && goal.status === "ACTIVE";

            return (
              <div
                key={goal.id}
                className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-colors shadow-sm"
              >
                {/* Slim Linear Progress Bar Header */}
                <div className="h-1 bg-muted">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor(goal.progress)}`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>

                <div className="p-4 sm:p-5">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${goalTypeColors[goal.type] || ""}`}>
                          {goalTypeLabels[goal.type] || goal.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                        {confidenceInfo && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border">
                            <span className={`w-1.5 h-1.5 rounded-full ${confidenceInfo.color}`} />
                            {confidenceInfo.label}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            متأخر
                          </span>
                        )}
                      </div>
                      <h3
                        className="text-base font-semibold text-foreground cursor-pointer hover:text-primary transition-colors tracking-tight"
                        onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
                      >
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 text-left shrink-0">
                      <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {goal.progress}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">%</span>
                    </div>
                  </div>

                  {/* Metrics Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center">
                    <div className="bg-muted/30 border border-border/50 rounded-lg p-2">
                      <p className="text-[11px] text-muted-foreground font-medium">النتائج الرئيسية</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 tabular-nums">
                        {goal._count.keyResults}
                      </p>
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-lg p-2">
                      <p className="text-[11px] text-muted-foreground font-medium">المهام المرتبطة</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 tabular-nums">
                        {goal._count.linkedTasks}
                      </p>
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-lg p-2">
                      <p className="text-[11px] text-muted-foreground font-medium">أهداف فرعية</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 tabular-nums">
                        {goal._count.childGoals}
                      </p>
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-lg p-2">
                      <p className="text-[11px] text-muted-foreground font-medium">القيمة المستهدفة</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 tabular-nums">
                        {goal.currentValue} / {goal.targetValue}
                        {goal.unit ? ` ${goal.unit}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Footer Info & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/60 flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {goal.owner && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          <span>{goal.owner.name}</span>
                        </span>
                      )}
                      {goal.project && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.project.color }} />
                          <span>{goal.project.name}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="tabular-nums">
                          {new Date(goal.startDate).toLocaleDateString("ar-EG")} - {new Date(goal.endDate).toLocaleDateString("ar-EG")}
                        </span>
                      </span>
                      {goal.quarter && (
                        <span className="px-2 py-0.5 bg-muted rounded text-[11px] font-medium border border-border/60">
                          {goal.quarter}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="عرض"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/super-admin/dev-goals/${goal.id}/edit`)}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="تعديل"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {deleteConfirm === goal.id ? (
                        <div className="flex items-center gap-1 bg-destructive/10 p-0.5 rounded-lg border border-destructive/20">
                          <button
                            onClick={() => handleDelete(goal.id)}
                            className="px-2 py-0.5 bg-destructive text-destructive-foreground text-[11px] font-medium rounded hover:bg-destructive/90 transition-colors"
                          >
                            تأكيد
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-0.5 bg-muted text-foreground text-[11px] font-medium rounded hover:bg-muted/80 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(goal.id)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DevGoalsList;
