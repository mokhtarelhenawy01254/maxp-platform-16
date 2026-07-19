import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { useTheme } from "../../hooks/useTheme";
import {
  ArrowRightIcon,
  FlagIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "نشط", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
  COMPLETED: { label: "مكتمل", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  ON_HOLD: { label: "معلق", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" },
  CANCELLED: { label: "ملغي", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
};

const confidenceConfig: Record<string, { label: string; color: string; bg: string }> = {
  ON_TRACK: { label: "على المسار", color: "text-green-600", bg: "bg-green-500" },
  AT_RISK: { label: "في خطر", color: "text-yellow-600", bg: "bg-yellow-500" },
  OFF_TRACK: { label: "خارج المسار", color: "text-red-600", bg: "bg-red-500" },
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
  parentGoal: { id: string; title: string } | null;
  childGoals: Array<{ id: string; title: string; status: string; progress: number; priority: string; type: string }>;
  keyResults: KeyResult[];
  linkedTasks: Array<{ id: string; title: string; status: string; priority: string; assigneeId: string | null }>;
  _count: { keyResults: number; linkedTasks: number; childGoals: number };
}

interface KeyResult {
  id: string;
  title: string;
  description: string | null;
  targetType: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  weight: number;
  confidence: string | null;
  status: string;
}

interface CheckIn {
  id: string;
  content: string;
  confidence: string | null;
  progressValue: number | null;
  blockers: string | null;
  createdAt: string;
  member: { id: string; name: string; userId: string };
}

const DevGoalDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "key-results" | "tasks" | "check-ins">("overview");

  // KR Modal
  const [showKRModal, setShowKRModal] = useState(false);
  const [editingKR, setEditingKR] = useState<KeyResult | null>(null);
  const [krForm, setKrForm] = useState({
    title: "",
    description: "",
    targetType: "NUMBER",
    targetValue: 0,
    currentValue: 0,
    unit: "",
    weight: 1,
  });

  // Check-in Modal
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInForm, setCheckInForm] = useState({
    content: "",
    confidence: "ON_TRACK",
    progressValue: 0,
    blockers: "",
    keyResultId: "",
  });

  const fetchGoal = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`super-admin/dev/goals/${id}`), {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });
      const data = await response.json();
      if (data.success) setGoal(data.data);
    } catch (err) {
      console.error("Error fetching goal:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCheckIns = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(buildApiUrl(`super-admin/dev/goals/${id}/check-ins`), {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });
      const data = await response.json();
      if (data.success) setCheckIns(data.data);
    } catch (err) {
      console.error("Error fetching check-ins:", err);
    }
  }, [id]);

  useEffect(() => {
    fetchGoal();
    fetchCheckIns();
  }, [fetchGoal, fetchCheckIns]);

  const handleAddKR = async () => {
    if (!id || !krForm.title.trim()) return;
    try {
      const url = editingKR
        ? buildApiUrl(`super-admin/dev/goals/key-results/${editingKR.id}`)
        : buildApiUrl(`super-admin/dev/goals/${id}/key-results`);
      const response = await fetch(url, {
        method: editingKR ? "PUT" : "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(krForm),
      });
      const data = await response.json();
      if (data.success) {
        setShowKRModal(false);
        setEditingKR(null);
        setKrForm({ title: "", description: "", targetType: "NUMBER", targetValue: 0, currentValue: 0, unit: "", weight: 1 });
        fetchGoal();
      }
    } catch (err) {
      alert("فشل حفظ النتيجة الرئيسية");
    }
  };

  const handleDeleteKR = async (krId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه النتيجة الرئيسية؟")) return;
    try {
      const response = await fetch(buildApiUrl(`super-admin/dev/goals/key-results/${krId}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) fetchGoal();
    } catch (err) {
      alert("فشل الحذف");
    }
  };

  const handleAddCheckIn = async () => {
    if (!id || !checkInForm.content.trim()) return;
    try {
      const response = await fetch(buildApiUrl("super-admin/dev/goals/check-ins"), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...checkInForm, goalId: id, memberId: goal?.owner?.id }),
      });
      const data = await response.json();
      if (data.success) {
        setShowCheckInModal(false);
        setCheckInForm({ content: "", confidence: "ON_TRACK", progressValue: 0, blockers: "", keyResultId: "" });
        fetchCheckIns();
        fetchGoal();
      }
    } catch (err) {
      alert("فشل إضافة المراجعة");
    }
  };

  const handleUpdateKRProgress = async (krId: string, currentValue: number) => {
    try {
      const response = await fetch(buildApiUrl(`super-admin/dev/goals/key-results/${krId}`), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ currentValue }),
      });
      const data = await response.json();
      if (data.success) fetchGoal();
    } catch (err) {
      alert("فشل تحديث التقدم");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <FlagIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">الهدف غير موجود</h3>
        <button onClick={() => navigate("/super-admin/dev-goals")} className="mt-4 text-indigo-600 hover:underline">
          العودة للأهداف
        </button>
      </div>
    );
  }

  const statusInfo = statusConfig[goal.status] || statusConfig.ACTIVE;
  const confidenceInfo = goal.confidence ? confidenceConfig[goal.confidence] : null;

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/super-admin/dev-goals")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {confidenceInfo && (
              <span className="flex items-center gap-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${confidenceInfo.bg}`} />
                {confidenceInfo.label}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{goal.title}</h1>
          {goal.description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{goal.description}</p>
          )}
        </div>
        <div className="text-left">
          <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{goal.progress}%</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">التقدم</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              goal.progress >= 80 ? "bg-green-500" : goal.progress >= 50 ? "bg-blue-500" : goal.progress >= 30 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{goal.currentValue} / {goal.targetValue}{goal.unit ? ` ${goal.unit}` : ""}</span>
          <span>{new Date(goal.startDate).toLocaleDateString("ar-EG")} → {new Date(goal.endDate).toLocaleDateString("ar-EG")}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          {[
            { key: "overview", label: "نظرة عامة" },
            { key: "key-results", label: `النتائج الرئيسية (${goal.keyResults.length})` },
            { key: "tasks", label: `المهام المرتبطة (${goal.linkedTasks.length})` },
            { key: "check-ins", label: `المراجعات (${checkIns.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">تفاصيل الهدف</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">المالك</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{goal.owner?.name || "غير محدد"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">المشروع</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{goal.project?.name || "غير محدد"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">الهدف الأعلى</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{goal.parentGoal?.title || "هدف رئيسي"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">الترم</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{goal.quarter || "غير محدد"}</p>
                </div>
              </div>
            </div>

            {/* Child Goals */}
            {(goal.childGoals?.length ?? 0) > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">الأهداف الفرعية</h3>
                <div className="space-y-3">
                  {(goal.childGoals ?? []).map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => navigate(`/super-admin/dev-goals/${child.id}`)}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{child.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{child.type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[child.status]?.color || ""}`}>
                          {statusConfig[child.status]?.label || child.status}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{child.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">الإحصائيات</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">النتائج الرئيسية</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{goal.keyResults?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">المهام المرتبطة</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{goal.linkedTasks?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">الأهداف الفرعية</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{goal.childGoals?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">الأولوية</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{goal.priority}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {goal.tags && goal.tags.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">التصنيفات</h3>
                <div className="flex flex-wrap gap-2">
                  {goal.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">إجراءات سريعة</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/super-admin/dev-goals/${goal.id}/edit`)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                >
                  <PencilIcon className="h-4 w-4" />
                  تعديل الهدف
                </button>
                <button
                  onClick={() => setShowCheckInModal(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-sm"
                >
                  <ChatBubbleLeftIcon className="h-4 w-4" />
                  إضافة مراجعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "key-results" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingKR(null); setKrForm({ title: "", description: "", targetType: "NUMBER", targetValue: 0, currentValue: 0, unit: "", weight: 1 }); setShowKRModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5" />
              نتيجة رئيسية جديدة
            </button>
          </div>

          {goal.keyResults.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <ChartBarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">لا توجد نتائج رئيسية بعد</p>
            </div>
          ) : (
            goal.keyResults.map((kr) => {
              const krProgress = kr.targetValue > 0 ? Math.min((kr.currentValue / kr.targetValue) * 100, 100) : 0;
              return (
                <div key={kr.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{kr.title}</h4>
                      {kr.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{kr.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingKR(kr);
                          setKrForm({ title: kr.title, description: kr.description || "", targetType: kr.targetType, targetValue: kr.targetValue, currentValue: kr.currentValue, unit: kr.unit || "", weight: kr.weight });
                          setShowKRModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteKR(kr.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-gray-500 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">{kr.currentValue} / {kr.targetValue}{kr.unit ? ` ${kr.unit}` : ""}</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(krProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${krProgress >= 80 ? "bg-green-500" : krProgress >= 50 ? "bg-blue-500" : "bg-yellow-500"}`}
                          style={{ width: `${krProgress}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">وزن: {kr.weight}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {(goal.linkedTasks?.length ?? 0) === 0 ? (
            <div className="p-12 text-center">
              <LinkIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">لا توجد مهام مرتبطة بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {(goal.linkedTasks ?? []).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => navigate(`/super-admin/dev-tasks/${task.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      task.status === "DONE" ? "bg-green-500" :
                      task.status === "IN_PROGRESS" ? "bg-blue-500" :
                      task.status === "IN_REVIEW" ? "bg-purple-500" :
                      "bg-gray-400"
                    }`} />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{task.title}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{task.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "check-ins" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCheckInModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5" />
              مراجعة جديدة
            </button>
          </div>

          {checkIns.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">لا توجد مراجعات بعد</p>
            </div>
          ) : (
            checkIns.map((ci) => (
              <div key={ci.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{ci.member.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(ci.createdAt).toLocaleDateString("ar-EG")}</p>
                    </div>
                  </div>
                  {ci.confidence && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ci.confidence === "ON_TRACK" ? "bg-green-100 text-green-700" :
                      ci.confidence === "AT_RISK" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {ci.confidence === "ON_TRACK" ? "على المسار" : ci.confidence === "AT_RISK" ? "في خطر" : "خارج المسار"}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-2">{ci.content}</p>
                {ci.blockers && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                    <strong>معوقات:</strong> {ci.blockers}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* KR Modal */}
      {showKRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingKR ? "تعديل النتيجة الرئيسية" : "نتيجة رئيسية جديدة"}
              </h2>
              <button onClick={() => { setShowKRModal(false); setEditingKR(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان *</label>
                <input
                  type="text"
                  value={krForm.title}
                  onChange={(e) => setKrForm({ ...krForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="مثال: زيادة عدد العملاء بنسبة 20%"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القيمة المستهدفة</label>
                  <input
                    type="number"
                    value={krForm.targetValue}
                    onChange={(e) => setKrForm({ ...krForm, targetValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القيمة الحالية</label>
                  <input
                    type="number"
                    value={krForm.currentValue}
                    onChange={(e) => setKrForm({ ...krForm, currentValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوحدة</label>
                  <input
                    type="text"
                    value={krForm.unit}
                    onChange={(e) => setKrForm({ ...krForm, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="عميل، ساعة، جنيه..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوزن</label>
                  <input
                    type="number"
                    value={krForm.weight}
                    onChange={(e) => setKrForm({ ...krForm, weight: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => { setShowKRModal(false); setEditingKR(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">إلغاء</button>
                <button onClick={handleAddKR} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editingKR ? "تحديث" : "إضافة"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">إضافة مراجعة</h2>
              <button onClick={() => setShowCheckInModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المحتوى *</label>
                <textarea
                  value={checkInForm.content}
                  onChange={(e) => setCheckInForm({ ...checkInForm, content: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="كيف التقدم في الهدف؟"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مستوى الثقة</label>
                <select
                  value={checkInForm.confidence}
                  onChange={(e) => setCheckInForm({ ...checkInForm, confidence: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="ON_TRACK">على المسار</option>
                  <option value="AT_RISK">في خطر</option>
                  <option value="OFF_TRACK">خارج المسار</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المعوقات (اختياري)</label>
                <input
                  type="text"
                  value={checkInForm.blockers}
                  onChange={(e) => setCheckInForm({ ...checkInForm, blockers: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="أي عوائق تواجه العمل؟"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowCheckInModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">إلغاء</button>
                <button onClick={handleAddCheckIn} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">إضافة</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevGoalDetails;
