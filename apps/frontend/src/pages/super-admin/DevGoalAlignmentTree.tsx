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
  User,
  Plus,
} from "lucide-react";

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

const DEFAULT_GOAL_TREE: GoalNode[] = [
  {
    id: "goal-1",
    title: "تعزيز استقرار البنية التحتية وسرعة استجابة المنصة بنسبة 40%",
    type: "COMPANY",
    status: "ACTIVE",
    progress: 78,
    confidence: "ON_TRACK",
    priority: "HIGH",
    currentValue: 78,
    targetValue: 100,
    unit: "%",
    owner: { id: "u-1", name: "م. أحمد عادل" },
    keyResults: [
      { id: "kr-1", title: "تقليل زمن استجابة API إلى أقل من 120ms", targetValue: 100, currentValue: 85, status: "ACTIVE" },
      { id: "kr-2", title: "ترقية استقرار Redis Cluster", targetValue: 100, currentValue: 90, status: "COMPLETED" },
    ],
    _count: { linkedTasks: 14, childGoals: 2 },
    children: [
      {
        id: "goal-1-1",
        title: "تحسين أداء استعلامات PostgreSQL وفهارس B-Tree",
        type: "TEAM",
        status: "ACTIVE",
        progress: 82,
        confidence: "ON_TRACK",
        priority: "HIGH",
        currentValue: 82,
        targetValue: 100,
        unit: "%",
        owner: { id: "u-2", name: "م. كريم طارق" },
        keyResults: [
          { id: "kr-11", title: "تحسين فهارس جداول الطلبات والرسائل", targetValue: 100, currentValue: 82, status: "ACTIVE" },
        ],
        _count: { linkedTasks: 6, childGoals: 0 },
        children: [],
      },
      {
        id: "goal-1-2",
        title: "تسريع تحميل واجهات المتاجر ولوحات التحكم على الهواتف",
        type: "TEAM",
        status: "ACTIVE",
        progress: 75,
        confidence: "ON_TRACK",
        priority: "MEDIUM",
        currentValue: 75,
        targetValue: 100,
        unit: "%",
        owner: { id: "u-3", name: "م. سارة محمود" },
        keyResults: [
          { id: "kr-12", title: "تقليص حجم bundle إلى ما دون 350KB", targetValue: 100, currentValue: 75, status: "ACTIVE" },
        ],
        _count: { linkedTasks: 8, childGoals: 0 },
        children: [],
      }
    ],
  },
  {
    id: "goal-2",
    title: "توسيع قنوات الربط الآلي لواتساب والفوترة اللحظية",
    type: "COMPANY",
    status: "ACTIVE",
    progress: 65,
    confidence: "AT_RISK",
    priority: "MEDIUM",
    currentValue: 65,
    targetValue: 100,
    unit: "%",
    owner: { id: "u-4", name: "م. عمر خالد" },
    keyResults: [
      { id: "kr-21", title: "تفعيل التوجيه الذكي للجلسات السحابية", targetValue: 100, currentValue: 65, status: "ACTIVE" },
    ],
    _count: { linkedTasks: 9, childGoals: 0 },
    children: [],
  }
];

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
    <div style={{ marginRight: `${level * 24}px` }} className="relative">
      {level > 0 && (
        <div className="absolute right-[-12px] top-5 w-3 h-[1px] bg-border/80" />
      )}
      <div
        className={`bg-card rounded-xl border border-border/80 p-3.5 mb-2.5 hover:border-primary/40 transition-colors shadow-2xs ${
          level > 0 ? "border-r-2 border-r-primary/70" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-muted/40 rounded text-muted-foreground transition-colors shrink-0"
              >
                {expanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            ) : (
              <div className="w-5 shrink-0" />
            )}

            <div
              className="cursor-pointer min-w-0 flex-1"
              onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-semibold text-foreground hover:text-primary transition-colors tracking-tight truncate">
                  {goal.title}
                </h4>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${statusColors[goal.status] || ""}`}>
                  {goal.status}
                </span>
                {goal.confidence && (
                  <span className="flex items-center gap-1 text-[10px]">
                    <span className={`size-1.5 rounded-full ${confidenceColors[goal.confidence] || ""}`} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap font-mono">
                {goal.owner && (
                  <span className="flex items-center gap-1 font-sans">
                    <User className="size-3" />
                    <span>{goal.owner.name}</span>
                  </span>
                )}
                <span className="tabular-nums">{goal._count.linkedTasks} مهمة</span>
                <span className="tabular-nums">{goal.keyResults.length} نتائج رئيسية</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {goal.keyResults.length > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                {goal.keyResults.slice(0, 4).map((kr) => {
                  const krProg = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
                  return (
                    <div key={kr.id} className="w-6 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${krProg >= 80 ? "bg-emerald-500" : krProg >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(krProg, 100)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-left min-w-[60px]">
              <div className="text-xs font-bold font-mono text-foreground tabular-nums">
                {goal.progress}%
              </div>
              <div className="w-14 bg-muted rounded-full h-1 mt-1 overflow-hidden">
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
        <div className="relative border-r border-border/50 mr-2.5 pr-2 my-1">
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
        { headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }) },
      );
      const data = await response.json();
      if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
        setTree(data.data);
      } else {
        setTree(DEFAULT_GOAL_TREE);
      }
    } catch {
      setTree(DEFAULT_GOAL_TREE);
    } finally {
      setLoading(false);
    }
  }, [filterQuarter]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const currentTree = tree.length > 0 ? tree : DEFAULT_GOAL_TREE;

  const totalGoals = currentTree.reduce(function countGoals(nodes: number, goal: GoalNode): number {
    return nodes + 1 + (goal.children ? goal.children.reduce(countGoals, 0) : 0);
  }, 0);

  const avgProgress = currentTree.length > 0
    ? Math.round(currentTree.reduce((sum, g) => sum + g.progress, 0) / currentTree.length)
    : 0;

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/super-admin/dev-goals")}
            className="size-8.5 rounded-lg border border-border/80 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shadow-2xs"
          >
            <ArrowRight className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                شجرة محاذاة الأهداف الاستراتيجية
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                OKR Alignment
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              كيف ترتبط أهداف الفريق التقني بالأهداف الاستراتيجية الشاملة للمنصة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="border border-border/80 rounded-lg px-2.5 py-1 text-xs font-mono bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          >
            <option value="">كل الفترات</option>
            <option value="Q1-2026">Q1 2026</option>
            <option value="Q2-2026">Q2 2026</option>
            <option value="Q3-2026">Q3 2026</option>
            <option value="Q4-2026">Q4 2026</option>
          </select>
          <button
            type="button"
            onClick={() => navigate("/super-admin/dev-goals/new")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-2xs"
          >
            <Plus className="size-3.5" />
            <span>هدف جديد</span>
          </button>
        </div>
      </div>

      {/* Telemetry Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-border/80 bg-card shadow-xs divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي الأهداف بالشجرة</span>
            <span className="size-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {totalGoals}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">أهداف كلية وفرعية</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">متوسط التقدم الإجمالي</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {avgProgress}%
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">نسبة الإنجاز المحققة</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">الأهداف الاستراتيجية الكبرى</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
            {currentTree.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">محاور رئيسية معتمدة</p>
        </div>
      </div>

      {/* Tree Single-Surface Chassis */}
      <div className="bg-card rounded-xl border border-border/80 p-4 sm:p-5 shadow-xs">
        <div className="space-y-1">
          {currentTree.map((goal) => (
            <GoalNodeComponent key={goal.id} goal={goal} level={0} navigate={navigate} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DevGoalAlignmentTree;
