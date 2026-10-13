import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowRight,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Link2,
  X,
  Calendar,
  User,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Folder,
  Tag,
  Check,
} from "lucide-react";
import { Button } from "../../components/ui/button";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const statusConfig: Record<string, { label: string; color: string; border: string }> = {
  ACTIVE: {
    label: "نشط",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  COMPLETED: {
    label: "مكتمل",
    color: "bg-primary/10 text-primary",
    border: "border-primary/20",
  },
  ON_HOLD: {
    label: "معلق",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  CANCELLED: {
    label: "ملغي",
    color: "bg-destructive/10 text-destructive",
    border: "border-destructive/20",
  },
};

const confidenceConfig: Record<string, { label: string; dot: string }> = {
  ON_TRACK: { label: "على المسار", dot: "bg-emerald-500" },
  AT_RISK: { label: "في خطر", dot: "bg-amber-500" },
  OFF_TRACK: { label: "خارج المسار", dot: "bg-destructive" },
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
  childGoals: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
    priority: string;
    type: string;
  }>;
  keyResults: KeyResult[];
  linkedTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeId: string | null;
  }>;
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "key-results" | "tasks" | "check-ins"
  >("overview");

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
      const response = await fetch(
        buildApiUrl(`super-admin/dev/goals/${id}/check-ins`),
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );
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
        setKrForm({
          title: "",
          description: "",
          targetType: "NUMBER",
          targetValue: 0,
          currentValue: 0,
          unit: "",
          weight: 1,
        });
        fetchGoal();
      }
    } catch (err) {
      alert(i18n.t("DevGoalDetails.failed_save_181b"));
    }
  };

  const handleDeleteKR = async (krId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه النتيجة الرئيسية؟")) return;
    try {
      const response = await fetch(
        buildApiUrl(`super-admin/dev/goals/key-results/${krId}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();
      if (data.success) fetchGoal();
    } catch (err) {
      alert(i18n.t("DevGoalDetails.msg_892b"));
    }
  };

  const handleAddCheckIn = async () => {
    if (!id || !checkInForm.content.trim()) return;
    try {
      const response = await fetch(
        buildApiUrl("super-admin/dev/goals/check-ins"),
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            ...checkInForm,
            goalId: id,
            memberId: goal?.owner?.id,
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setShowCheckInModal(false);
        setCheckInForm({
          content: "",
          confidence: "ON_TRACK",
          progressValue: 0,
          blockers: "",
          keyResultId: "",
        });
        fetchCheckIns();
        fetchGoal();
      }
    } catch (err) {
      alert(i18n.t("DevGoalDetails.failed_add_9743"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري تحميل تفاصيل الهدف ومؤشرات الإنجاز...</span>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-8 max-w-md mx-auto rounded-xl border border-border/80 bg-card text-center my-12 shadow-2xs">
        <Target className="size-10 text-muted-foreground/40 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">الهدف غير موجود</h3>
        <p className="text-xs text-muted-foreground mb-4">قد يكون تم حذفه أو ليس لديك صلاحية للوصول إليه.</p>
        <Button
          onClick={() => navigate("/super-admin/dev-goals")}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          العودة لقائمة الأهداف
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[goal.status] || statusConfig.ACTIVE;
  const confidenceInfo = goal.confidence ? confidenceConfig[goal.confidence] : null;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Unified Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/super-admin/dev-goals")}
            className="size-9 rounded-lg border border-border/80 bg-card text-foreground shadow-2xs hover:bg-muted/40"
            title="رجوع"
          >
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {goal.title}
              </h1>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${statusInfo.color} ${statusInfo.border}`}
              >
                {statusInfo.label}
              </span>
              {confidenceInfo && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted/60 text-muted-foreground border border-border/60">
                  <span className={`size-1.5 rounded-full ${confidenceInfo.dot}`} />
                  {confidenceInfo.label}
                </span>
              )}
            </div>
            {goal.description && (
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                {goal.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-left font-mono">
            <div className="text-2xl font-bold tracking-tight text-primary tabular-nums">
              {goal.progress}%
            </div>
            <div className="text-[10px] text-muted-foreground font-sans">نسبة الإنجاز</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/super-admin/dev-goals/${goal.id}/edit`)}
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
          >
            <Pencil className="size-3.5" />
            <span>تعديل الهدف</span>
          </Button>
        </div>
      </div>

      {/* Progress & Milestone Ribbon */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-3.5 shadow-2xs">
        <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
          <span className="text-muted-foreground font-sans">
            الهدف:{" "}
            <strong className="text-foreground font-mono">
              {goal.currentValue} / {goal.targetValue}
              {goal.unit ? ` ${goal.unit}` : ""}
            </strong>
          </span>
          <span className="text-muted-foreground text-[11px]">
            {new Date(goal.startDate).toLocaleDateString("ar-EG")} ←{" "}
            {new Date(goal.endDate).toLocaleDateString("ar-EG")}
          </span>
        </div>
        <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden border border-border/40">
          <div
            className={`h-full rounded-full transition-all ${
              goal.progress >= 80
                ? "bg-emerald-500"
                : goal.progress >= 50
                ? "bg-primary"
                : goal.progress >= 30
                ? "bg-amber-500"
                : "bg-destructive"
            }`}
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Linear Single-Surface Chassis with Tabs */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        {/* Tab Headers */}
        <div className="p-1 sm:p-1.5 border-b border-border/60 bg-muted/20 flex gap-1 overflow-x-auto">
          {[
            { key: "overview", label: "نظرة عامة" },
            {
              key: "key-results",
              label: `النتائج الرئيسية (${goal.keyResults?.length ?? 0})`,
            },
            {
              key: "tasks",
              label: `المهام المرتبطة (${goal.linkedTasks?.length ?? 0})`,
            },
            {
              key: "check-ins",
              label: `المراجعات (${checkIns?.length ?? 0})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-2xs font-semibold border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: Details & Child Goals */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-lg border border-border/60 p-4 bg-muted/10">
                  <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <Target className="size-3.5 text-primary" />
                    <span>مواصفات وتصنيف الهدف</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">المالك</span>
                      <span className="font-medium text-foreground">
                        {goal.owner?.name || "غير محدد"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">المشروع</span>
                      <span className="font-medium text-foreground">
                        {goal.project?.name || "غير محدد"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">الهدف الأعلى</span>
                      <span className="font-medium text-foreground">
                        {goal.parentGoal?.title || "هدف رئيسي"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">الربع السنوي</span>
                      <span className="font-medium text-foreground font-mono">
                        {goal.quarter || "غير محدد"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Child Goals */}
                {(goal.childGoals?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-border/60 p-4 bg-card">
                    <h3 className="text-xs font-semibold text-foreground mb-3">
                      الأهداف الفرعية التابعة
                    </h3>
                    <div className="space-y-2">
                      {goal.childGoals.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-2.5 bg-muted/20 hover:bg-muted/40 border border-border/40 rounded-lg cursor-pointer transition-colors"
                          onClick={() => navigate(`/super-admin/dev-goals/${child.id}`)}
                        >
                          <div>
                            <p className="font-medium text-xs text-foreground">{child.title}</p>
                            <p className="text-[10px] text-muted-foreground">{child.type}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                statusConfig[child.status]?.color || ""
                              } ${statusConfig[child.status]?.border || ""}`}
                            >
                              {statusConfig[child.status]?.label || child.status}
                            </span>
                            <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                              {child.progress}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Telemetry & Tags */}
              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 p-4 bg-muted/10">
                  <h3 className="text-xs font-semibold text-foreground mb-3">
                    إحصائيات الإنجاز
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-border/40">
                    <div className="flex justify-between pt-1.5 first:pt-0">
                      <span className="text-muted-foreground">النتائج الرئيسية</span>
                      <span className="font-mono font-bold text-foreground">
                        {goal.keyResults?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-muted-foreground">المهام المرتبطة</span>
                      <span className="font-mono font-bold text-foreground">
                        {goal.linkedTasks?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-muted-foreground">الأهداف الفرعية</span>
                      <span className="font-mono font-bold text-foreground">
                        {goal.childGoals?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-muted-foreground">الأولوية</span>
                      <span className="font-medium text-foreground font-mono">
                        {goal.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {goal.tags && goal.tags.length > 0 && (
                  <div className="rounded-lg border border-border/60 p-4 bg-card">
                    <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Tag className="size-3 text-muted-foreground" />
                      <span>التصنيفات</span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {goal.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[11px] font-mono border border-border/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border/60 p-3 bg-card space-y-2">
                  <Button
                    onClick={() => setShowCheckInModal(true)}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium gap-1.5 text-primary border-primary/30 hover:bg-primary/5 shadow-2xs"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>إضافة مراجعة سريعة (Check-in)</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* KEY RESULTS TAB */}
          {activeTab === "key-results" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  النتائج القابلة للقياس التي تحدد نجاح هذا الهدف
                </span>
                <Button
                  onClick={() => {
                    setEditingKR(null);
                    setKrForm({
                      title: "",
                      description: "",
                      targetType: "NUMBER",
                      targetValue: 0,
                      currentValue: 0,
                      unit: "",
                      weight: 1,
                    });
                    setShowKRModal(true);
                  }}
                  size="sm"
                  className="h-8 text-xs font-medium gap-1.5 shadow-2xs"
                >
                  <Plus className="size-3.5" />
                  <span>نتيجة رئيسية جديدة</span>
                </Button>
              </div>

              {goal.keyResults.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border/80 rounded-lg">
                  <BarChart3 className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">لا توجد نتائج رئيسية مضافة بعد</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
                  {goal.keyResults.map((kr) => {
                    const krProgress =
                      kr.targetValue > 0
                        ? Math.min((kr.currentValue / kr.targetValue) * 100, 100)
                        : 0;

                    return (
                      <div
                        key={kr.id}
                        className="p-3.5 bg-card hover:bg-muted/20 transition-colors flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-xs text-foreground truncate">
                              {kr.title}
                            </h4>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border/40">
                              وزن: {kr.weight}
                            </span>
                          </div>
                          {kr.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {kr.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="w-36">
                            <div className="flex justify-between text-[11px] font-mono mb-1">
                              <span className="text-muted-foreground">
                                {kr.currentValue}/{kr.targetValue}
                                {kr.unit ? ` ${kr.unit}` : ""}
                              </span>
                              <span className="font-bold text-foreground">
                                {Math.round(krProgress)}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  krProgress >= 80
                                    ? "bg-emerald-500"
                                    : krProgress >= 50
                                    ? "bg-primary"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${krProgress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingKR(kr);
                                setKrForm({
                                  title: kr.title,
                                  description: kr.description || "",
                                  targetType: kr.targetType,
                                  targetValue: kr.targetValue,
                                  currentValue: kr.currentValue,
                                  unit: kr.unit || "",
                                  weight: kr.weight,
                                });
                                setShowKRModal(true);
                              }}
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteKR(kr.id)}
                              className="size-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              {(goal.linkedTasks?.length ?? 0) === 0 ? (
                <div className="p-8 text-center border border-dashed border-border/80 rounded-lg">
                  <Link2 className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">لا توجد مهام مرتبطة بهذا الهدف</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
                  {goal.linkedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-card hover:bg-muted/20 transition-colors flex items-center justify-between cursor-pointer"
                      onClick={() => navigate(`/super-admin/dev-tasks/${task.id}`)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`size-2 rounded-full shrink-0 ${
                            task.status === "DONE"
                              ? "bg-emerald-500"
                              : task.status === "IN_PROGRESS"
                              ? "bg-primary"
                              : task.status === "IN_REVIEW"
                              ? "bg-purple-500"
                              : "bg-muted-foreground/50"
                          }`}
                        />
                        <span className="font-medium text-xs text-foreground truncate">
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/40">
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CHECK-INS TAB */}
          {activeTab === "check-ins" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  سجل التحديثات الدورية وملاحظات التقدم
                </span>
                <Button
                  onClick={() => setShowCheckInModal(true)}
                  size="sm"
                  className="h-8 text-xs font-medium gap-1.5 shadow-2xs"
                >
                  <Plus className="size-3.5" />
                  <span>مراجعة جديدة</span>
                </Button>
              </div>

              {checkIns.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border/80 rounded-lg">
                  <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">لا توجد مراجعات مسجلة بعد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checkIns.map((ci) => (
                    <div
                      key={ci.id}
                      className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold">
                            {ci.member?.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span className="font-medium text-xs text-foreground block">
                              {ci.member?.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(ci.createdAt).toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                        </div>

                        {ci.confidence && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-card border border-border/60 text-muted-foreground font-mono">
                            <span
                              className={`size-1.5 rounded-full ${
                                confidenceConfig[ci.confidence]?.dot || "bg-primary"
                              }`}
                            />
                            {confidenceConfig[ci.confidence]?.label || ci.confidence}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-foreground leading-relaxed">{ci.content}</p>

                      {ci.blockers && (
                        <div className="p-2 rounded bg-destructive/5 border border-destructive/20 text-destructive text-[11px]">
                          <strong>معوقات:</strong> {ci.blockers}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KR Modal */}
      {showKRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full shadow-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                {editingKR ? "تعديل النتيجة الرئيسية" : "نتيجة رئيسية جديدة"}
              </h2>
              <button
                onClick={() => {
                  setShowKRModal(false);
                  setEditingKR(null);
                }}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">العنوان</label>
                <input
                  value={krForm.title}
                  onChange={(e) => setKrForm({ ...krForm, title: e.target.value })}
                  className="w-full h-8 px-2.5 border border-border rounded-md bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                  placeholder="مثال: خفض زمن الاستجابة إلى 200ms"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">الوصف</label>
                <textarea
                  value={krForm.description}
                  onChange={(e) => setKrForm({ ...krForm, description: e.target.value })}
                  className="w-full h-16 p-2 border border-border rounded-md bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                  placeholder="تفاصيل إضافية..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">القيمة المستهدفة</label>
                  <input
                    type="number"
                    value={krForm.targetValue}
                    onChange={(e) =>
                      setKrForm({ ...krForm, targetValue: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 border border-border rounded-md bg-background text-foreground outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">الوحدة</label>
                  <input
                    value={krForm.unit}
                    onChange={(e) => setKrForm({ ...krForm, unit: e.target.value })}
                    className="w-full h-8 px-2.5 border border-border rounded-md bg-background text-foreground outline-none"
                    placeholder="مثال: % أو تذكرة أو يوم"
                  />
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-border flex justify-end gap-2 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowKRModal(false);
                  setEditingKR(null);
                }}
                className="h-8 text-xs"
              >
                إلغاء
              </Button>
              <Button onClick={handleAddKR} size="sm" className="h-8 text-xs">
                حفظ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full shadow-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">إضافة مراجعة (Check-in)</h2>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">تفاصيل المراجعة</label>
                <textarea
                  value={checkInForm.content}
                  onChange={(e) =>
                    setCheckInForm({ ...checkInForm, content: e.target.value })
                  }
                  className="w-full h-20 p-2 border border-border rounded-md bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                  placeholder="ما الذي تم إنجازه؟"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">مستوى الثقة</label>
                  <select
                    value={checkInForm.confidence}
                    onChange={(e) =>
                      setCheckInForm({ ...checkInForm, confidence: e.target.value })
                    }
                    className="w-full h-8 px-2 border border-border rounded-md bg-background text-foreground outline-none"
                  >
                    <option value="ON_TRACK">على المسار</option>
                    <option value="AT_RISK">في خطر</option>
                    <option value="OFF_TRACK">خارج المسار</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">المعوقات (إن وجدت)</label>
                  <input
                    value={checkInForm.blockers}
                    onChange={(e) =>
                      setCheckInForm({ ...checkInForm, blockers: e.target.value })
                    }
                    className="w-full h-8 px-2.5 border border-border rounded-md bg-background text-foreground outline-none"
                    placeholder="أي عوائق تعطل الإنجاز..."
                  />
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-border flex justify-end gap-2 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCheckInModal(false)}
                className="h-8 text-xs"
              >
                إلغاء
              </Button>
              <Button onClick={handleAddCheckIn} size="sm" className="h-8 text-xs">
                حفظ المراجعة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevGoalDetails;
