import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Plus,
  Flag,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  DevGoalItemCard,
  type Goal,
} from "./DevGoalItemCard";
import { DevGoalsFilterBar } from "./DevGoalsFilterBar";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

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

export default function DevGoalsList() {
  const navigate = useNavigate();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
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
    void fetchData();
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
        void fetchData();
      } else {
        alert(data.error || "فشل حذف الهدف");
      }
    } catch {
      alert("حدث خطأ أثناء محاولة حذف الهدف");
    }
  };

  const filteredGoals = goals.filter((goal) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      goal.title.toLowerCase().includes(s) ||
      goal.description?.toLowerCase().includes(s) ||
      goal.owner?.name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir={i18n.dir()}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Flag className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              الأهداف والنتائج الرئيسية (OKRs)
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {stats?.totalGoals || goals.length} هدف
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            تتبع أهداف الفريق والمشاريع والاستراتيجية الفصلية والسنوية
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/super-admin/dev-goals/alignment")}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <BarChart3 className="size-3.5 text-muted-foreground" />
            <span>شجرة المحاذاة</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/super-admin/dev-goals/new")}
            className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>هدف جديد</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Stats Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">إجمالي الأهداف</p>
              <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
                {stats.totalGoals}
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">مسجلة بالمنصة</p>
            </div>
            <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Flag className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">متوسط التقدم</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                {stats.avgProgress}%
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">إنجاز كلي</p>
            </div>
            <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-blue-600 dark:text-blue-400">النتائج المكتملة</p>
              <p className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5">
                {stats.completedKeyResults} / {stats.totalKeyResults}
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">نتيجة رئيسية (KR)</p>
            </div>
            <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">في دائرة الخطر</p>
              <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-0.5">
                {stats.atRiskCount}
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">بحاجة لتدخل</p>
            </div>
            <div className="size-7 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-600">
              <AlertTriangle className="size-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* Control Toolbar & Filters */}
      <DevGoalsFilterBar
        search={search}
        setSearch={setSearch}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        filterQuarter={filterQuarter}
        setFilterQuarter={setFilterQuarter}
      />

      {/* Goals List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="bg-card rounded-lg border border-border/70 p-8 text-center shadow-xs">
            <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-2.5">
              <Flag className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1 font-mono">
              لا توجد أهداف مطابقة
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-3">
              لم يتم العثور على أهداف بالمعايير المحددة. يمكنك إنشاء هدف جديد أو تعديل خيارات التصفية.
            </p>
            <Button
              size="sm"
              onClick={() => navigate("/super-admin/dev-goals/new")}
              className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]"
            >
              <Plus className="size-3.5" />
              <span>هدف جديد</span>
            </Button>
          </div>
        ) : (
          filteredGoals.map((goal) => (
            <DevGoalItemCard
              key={goal.id}
              goal={goal}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
