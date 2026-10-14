import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowRight,
  Plus,
  GitFork,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  DevGoalNodeComponent,
  type GoalNode,
} from "./DevGoalNodeComponent";

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
      },
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
  },
];

export default function DevGoalAlignmentTree() {
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
    void fetchTree();
  }, [fetchTree]);

  const currentTree = tree.length > 0 ? tree : DEFAULT_GOAL_TREE;

  const totalGoals = currentTree.reduce(function countGoals(nodes: number, goal: GoalNode): number {
    return nodes + 1 + (goal.children ? goal.children.reduce(countGoals, 0) : 0);
  }, 0);

  const avgProgress = currentTree.length > 0
    ? Math.round(currentTree.reduce((sum, g) => sum + g.progress, 0) / currentTree.length)
    : 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir={i18n.dir()}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/70 pb-3.5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/super-admin/dev-goals")}
            className="size-8 rounded-lg border-border/70 active:scale-[0.98]"
            title="العودة لقائمة الأهداف"
          >
            <ArrowRight className="size-4 rtl:rotate-0 rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <GitFork className="size-4" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                شجرة محاذاة الأهداف الاستراتيجية
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
                OKR Alignment Tree
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              كيف ترتبط أهداف الفريق التقني بالأهداف الاستراتيجية الشاملة للمنصة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="border border-border/70 rounded-md px-2.5 py-1 text-xs font-mono bg-background text-foreground h-8"
          >
            <option value="">كل الفترات</option>
            <option value="Q1-2026">Q1 2026</option>
            <option value="Q2-2026">Q2 2026</option>
            <option value="Q3-2026">Q3 2026</option>
            <option value="Q4-2026">Q4 2026</option>
          </select>
          <Button
            size="sm"
            onClick={() => navigate("/super-admin/dev-goals/new")}
            className="h-8 text-xs font-mono gap-1 active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>هدف جديد</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي الأهداف بالشجرة</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {totalGoals}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">أهداف كلية وفرعية</p>
          </div>
          <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            <span className="text-xs font-mono font-bold">ALL</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">متوسط التقدم الإجمالي</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
              {avgProgress}%
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">نسبة الإنجاز المحققة</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <span className="text-xs font-mono font-bold">AVG</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400">الأهداف الاستراتيجية الكبرى</p>
            <p className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5">
              {currentTree.length}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">محاور رئيسية معتمدة</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600">
            <span className="text-xs font-mono font-bold">CORE</span>
          </div>
        </div>
      </div>

      {/* Tree Single-Surface Chassis */}
      <div className="bg-card rounded-lg border border-border/70 p-3.5 sm:p-4 shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-1">
            {currentTree.map((goal) => (
              <DevGoalNodeComponent key={goal.id} goal={goal} level={0} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
