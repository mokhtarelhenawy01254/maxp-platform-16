import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { useTheme } from "../../hooks/useTheme";
import {
  ArrowRightIcon,
  FlagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

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
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ON_HOLD: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const confidenceColors: Record<string, string> = {
  ON_TRACK: "bg-green-500",
  AT_RISK: "bg-yellow-500",
  OFF_TRACK: "bg-red-500",
};

const GoalNodeComponent: React.FC<{
  goal: GoalNode;
  level: number;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ goal, level, navigate }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = goal.children && goal.children.length > 0;

  return (
    <div style={{ marginRight: `${level * 32}px` }}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-3 hover:shadow-md transition-shadow ${
          level > 0 ? "border-r-4 border-r-indigo-400" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasChildren && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {expanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}

            <div
              className="cursor-pointer"
              onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
            >
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                  {goal.title}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[goal.status] || ""}`}>
                  {goal.status}
                </span>
                {goal.confidence && (
                  <span className="flex items-center gap-1 text-xs">
                    <span className={`w-2 h-2 rounded-full ${confidenceColors[goal.confidence] || ""}`} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                {goal.owner && <span> المسؤول: {goal.owner.name}</span>}
                <span>{goal._count.linkedTasks} مهمة</span>
                <span>{goal.keyResults.length} نتائج رئيسية</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* KR mini bars */}
            {goal.keyResults.length > 0 && (
              <div className="hidden md:flex items-center gap-1">
                {goal.keyResults.slice(0, 5).map((kr) => {
                  const krProg = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
                  return (
                    <div key={kr.id} className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${krProg >= 80 ? "bg-green-500" : krProg >= 50 ? "bg-blue-500" : "bg-yellow-500"}`}
                        style={{ width: `${Math.min(krProg, 100)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-left min-w-[60px]">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {goal.progress}%
              </div>
              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    goal.progress >= 80 ? "bg-green-500" : goal.progress >= 50 ? "bg-blue-500" : "bg-yellow-500"
                  }`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/super-admin/dev-goals")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ChartBarIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            شجرة محاذاة الأهداف
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            كيف ترتبط أهداف الفريق بالأهداف الاستراتيجية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الأترام</option>
            <option value="Q1-2026">Q1 2026</option>
            <option value="Q2-2026">Q2 2026</option>
            <option value="Q3-2026">Q3 2026</option>
            <option value="Q4-2026">Q4 2026</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalGoals}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الأهداف</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{avgProgress}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">متوسط التقدم</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tree.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">أهداف رئيسية</p>
        </div>
      </div>

      {/* Tree */}
      {tree.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FlagIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            لا توجد أهداف
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            ابدأ بإنشاء أهداف لرؤية شجرة المحاذاة
          </p>
          <button
            onClick={() => navigate("/super-admin/dev-goals/new")}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            هدف جديد
          </button>
        </div>
      ) : (
        <div>
          {tree.map((goal) => (
            <GoalNodeComponent key={goal.id} goal={goal} level={0} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DevGoalAlignmentTree;
