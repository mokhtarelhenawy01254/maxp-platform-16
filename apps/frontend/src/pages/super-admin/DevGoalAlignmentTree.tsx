import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowRight,
  Flag,
  ChevronDown,
  ChevronRight,
  BarChart3,
  TrendingUp,
  User,
  CheckCircle2,
  Plus,
} from "lucide-react";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

interface GoalNode {
  id: string;
  title: string;
  type: string;
  status: string;
  progress: number;
  confidence: string | null;
  priority: string;
  currentValue: number;
  targetValue: number;
  unit: string | null;
  owner: { id: string; name: string } | null;
  keyResults: Array<{ id: string; title: string; targetValue: number; currentValue: number; status: string }>;
  _count: { linkedTasks: number; childGoals: number };
  children: GoalNode[];
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  ON_HOLD: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
};

const confidenceColors: Record<string, string> = {
  ON_TRACK: "bg-emerald-500",
  AT_RISK: "bg-amber-500",
  OFF_TRACK: "bg-rose-500",
};

const GoalNodeComponent: React.FC<{
  goal: GoalNode;
  level: number;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ goal, level, navigate }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = goal.children && goal.children.length > 0;

  return (
    <div style={{ marginRight: `${level * 28}px` }} className="relative">
      {level > 0 && (
        <div className="absolute right-[-14px] top-6 w-3.5 h-[1px] bg-border" />
      )}
      <div
        className={`bg-card rounded-xl border border-border p-4 mb-2.5 hover:border-primary/40 transition-colors shadow-sm ${
          level > 0 ? "border-r-2 border-r-primary/70" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors shrink-0"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6 shrink-0" />
            )}

            <div
              className="cursor-pointer min-w-0 flex-1"
              onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground hover:text-primary transition-colors tracking-tight truncate">
                  {goal.title}
                </h4>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${statusColors[goal.status] || ""}`}>
                  {goal.status}
                </span>
                {goal.confidence && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${confidenceColors[goal.confidence] || ""}`} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                {goal.owner && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{goal.owner.name}</span>
                  </span>
                )}
                <span className="tabular-nums">{goal._count.linkedTasks} مهمة</span>
                <span className="tabular-nums">{goal.keyResults.length} نتائج رئيسية</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* KR mini bars */}
            {goal.keyResults.length > 0 && (
              <div className="hidden md:flex items-center gap-1">
                {goal.keyResults.slice(0, 5).map((kr) => {
                  const krProg = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
                  return (
                    <div key={kr.id} className="w-7 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${krProg >= 80 ? "bg-emerald-500" : krProg >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(krProg, 100)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-left min-w-[70px]">
              <div className="text-sm font-bold text-foreground tabular-nums">
                {goal.progress}%
              </div>
              <div className="w-16 bg-muted rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className={`h-1 rounded-full ${
                    goal.progress >= 80 ? "bg-emerald-500" : goal.progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="relative border-r border-border/40 mr-3 pr-2 my-1">
          {goal.children.map((child) => (
            <GoalNodeComponent key={child.id} goal={child} level={level + 1} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};

const DevGoalAlignmentTree: React.FC = () => {
  const navigate = useNavigate();
  const [tree, setTree] = useState<GoalNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuarter, setFilterQuarter] = useState("Q2-2026");

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterQuarter) params.append("quarter", filterQuarter);

      const response = await fetch(
        buildApiUrl(`super-admin/dev/goals/alignment-tree?${params.toString()}`),
        { headers: getAuthHeaders({ "Content-Type": "application/json" }) },
      );
      const data = await response.json();
      if (data.success) setTree(data.data);
    } catch (err) {
      console.error("Error fetching alignment tree:", err);
    } finally {
      setLoading(false);
    }
  }, [filterQuarter]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const totalGoals = tree.reduce(function countGoals(nodes: number, goal: GoalNode): number {
    return nodes + 1 + (goal.children ? goal.children.reduce(countGoals, 0) : 0);
  }, 0);

  const avgProgress = tree.length > 0
    ? Math.round(tree.reduce((sum, g) => sum + g.progress, 0) / tree.length)
    : 0;

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/super-admin/dev-goals")}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span>شجرة محاذاة الأهداف</span>
            </h1>
            <p className="text-muted-foreground text-xs mt-1">
              كيف ترتبط أهداف الفريق بالأهداف الاستراتيجية الشاملة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          >
            <option value="">كل الفترات</option>
            <option value="Q1-2026">Q1 2026</option>
            <option value="Q2-2026">Q2 2026</option>
            <option value="Q3-2026">Q3 2026</option>
            <option value="Q4-2026">Q4 2026</option>
          </select>
          <button
            onClick={() => navigate("/super-admin/dev-goals/new")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>هدف جديد</span>
          </button>
        </div>
      </div>

      {/* Telemetry Stats Ribbon */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center shadow-sm">
          <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{totalGoals}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">إجمالي الأهداف</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center shadow-sm">
          <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">{avgProgress}%</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">متوسط التقدم</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center shadow-sm">
          <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">{tree.length}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">أهداف رئيسية</p>
        </div>
      </div>

      {/* Tree Area */}
      {tree.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
            <Flag className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            لا توجد أهداف في هذه الفترة
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            ابدأ بإنشاء أهداف استراتيجية لربطها وتصور شجرة المحاذاة.
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
        <div className="bg-card/40 rounded-xl border border-border p-4 sm:p-5">
          {tree.map((goal) => (
            <GoalNodeComponent key={goal.id} goal={goal} level={0} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DevGoalAlignmentTree;
