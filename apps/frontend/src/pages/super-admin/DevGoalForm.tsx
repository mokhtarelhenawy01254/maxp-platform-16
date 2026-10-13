import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowRight,
  Plus,
  X,
  Trash2,
  Flag,
  Target,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

interface KeyResultDraft {
  id: string;
  title: string;
  description: string;
  targetType: string;
  targetValue: number;
  unit: string;
  weight: number;
}

const DevGoalForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "TEAM",
    priority: "MEDIUM",
    targetType: "NUMBER",
    targetValue: 0,
    unit: "",
    startDate: "",
    endDate: "",
    ownerId: "",
    parentGoalId: "",
    projectId: "",
    quarter: "Q2-2026",
    tags: "",
  });

  const [keyResults, setKeyResults] = useState<KeyResultDraft[]>([]);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [parentGoals, setParentGoals] = useState<Array<{ id: string; title: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchDropdownData();
    if (isEditing && id) fetchGoal();
  }, [id]);

  const fetchDropdownData = async () => {
    try {
      const [teamRes, projectsRes, goalsRes] = await Promise.all([
        fetch(buildApiUrl("super-admin/dev/team"), { headers: getAuthHeaders() }),
        fetch(buildApiUrl("super-admin/dev/projects"), { headers: getAuthHeaders() }),
        fetch(buildApiUrl("super-admin/dev/goals"), { headers: getAuthHeaders() }),
      ]);

      const teamData = await teamRes.json();
      const projectsData = await projectsRes.json();
      const goalsData = await goalsRes.json();

      if (teamData.success) setTeamMembers(teamData.data.map((m: any) => ({ id: m.id, name: m.name })));
      if (projectsData.success) setProjects(projectsData.data.map((p: any) => ({ id: p.id, name: p.name })));
      if (goalsData.success) setParentGoals(goalsData.data.map((g: any) => ({ id: g.id, title: g.title })));
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchGoal = async () => {
    try {
      const response = await fetch(buildApiUrl(`super-admin/dev/goals/${id}`), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        const goal = data.data;
        setFormData({
          title: goal.title,
          description: goal.description || "",
          type: goal.type,
          priority: goal.priority,
          targetType: goal.targetType,
          targetValue: goal.targetValue,
          unit: goal.unit || "",
          startDate: goal.startDate?.split("T")[0] || "",
          endDate: goal.endDate?.split("T")[0] || "",
          ownerId: goal.ownerId || "",
          parentGoalId: goal.parentGoalId || "",
          projectId: goal.projectId || "",
          quarter: goal.quarter || "",
          tags: goal.tags?.join(", ") || "",
        });
        if (goal.keyResults) {
          setKeyResults(goal.keyResults.map((kr: any) => ({
            id: kr.id,
            title: kr.title,
            description: kr.description || "",
            targetType: kr.targetType,
            targetValue: kr.targetValue,
            unit: kr.unit || "",
            weight: kr.weight || 1,
          })));
        }
      }
    } catch (err) {
      console.error("Error fetching goal:", err);
    }
  };

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      {
        id: `new_${Date.now()}`,
        title: "",
        description: "",
        targetType: "NUMBER",
        targetValue: 0,
        unit: "",
        weight: 1,
      },
    ]);
  };

  const updateKeyResult = (index: number, field: string, value: any) => {
    const updated = [...keyResults];
    (updated[index] as any)[field] = value;
    setKeyResults(updated);
  };

  const removeKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.startDate || !formData.endDate) {
      alert(i18n.t("DevGoalForm.msg_2fbd"));
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        targetValue: parseFloat(formData.targetValue as any) || 0,
        keyResults: keyResults.filter((kr) => kr.title.trim()).map((kr) => ({
          title: kr.title,
          description: kr.description || null,
          targetType: kr.targetType,
          targetValue: kr.targetValue,
          unit: kr.unit || null,
          weight: kr.weight,
        })),
        ownerId: formData.ownerId || null,
        parentGoalId: formData.parentGoalId || null,
        projectId: formData.projectId || null,
      };

      const url = isEditing
        ? buildApiUrl(`super-admin/dev/goals/${id}`)
        : buildApiUrl("super-admin/dev/goals");

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        navigate(`/super-admin/dev-goals/${data.data.id}`);
      } else {
        alert(data.error || i18n.t("DevGoalForm.failed_save_7680"));
      }
    } catch (err) {
      alert(i18n.t("DevGoalForm.msg_58e7"));
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Flag className="h-5 w-5" />
              </div>
              <span>{isEditing ? "تعديل الهدف" : "هدف استراتيجي جديد (OKR)"}</span>
            </h1>
            <p className="text-muted-foreground text-xs mt-1">
              تحديد الأهداف والنتائج الرئيسية القابلة للقياس
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/60 pb-2.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>المعلومات الأساسية</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                عنوان الهدف <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground text-sm font-medium transition-colors"
                placeholder="مثال: رفع معدل سرعة الاستجابة بنسبة 30%"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground text-xs leading-relaxed resize-none transition-colors"
                placeholder="وصف تفصيلي للهدف والدافع الاستراتيجي..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">نوع الهدف</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="COMPANY">هدف شركة</option>
                  <option value="TEAM">هدف فريق</option>
                  <option value="INDIVIDUAL">هدف فردي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">الأولوية</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="LOW">منخفضة</option>
                  <option value="MEDIUM">متوسطة</option>
                  <option value="HIGH">عالية</option>
                  <option value="CRITICAL">حرجة</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">الفترة (Quarter)</label>
                <select
                  value={formData.quarter}
                  onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="Q1-2026">Q1 2026</option>
                  <option value="Q2-2026">Q2 2026</option>
                  <option value="Q3-2026">Q3 2026</option>
                  <option value="Q4-2026">Q4 2026</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Target */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/60 pb-2.5">
            <Target className="h-4 w-4 text-primary" />
            <span>الهدف الكمي الإجمالي</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">نوع القيمة</label>
              <select
                value={formData.targetType}
                onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="NUMBER">رقم</option>
                <option value="CURRENCY">عملة</option>
                <option value="BOOLEAN">صحيح/خطأ</option>
                <option value="TASK_COMPLETION">إتمام مهام</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">القيمة المستهدفة</label>
              <input
                type="number"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-muted/20 focus:bg-background text-foreground tabular-nums focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">الوحدة</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-muted/20 focus:bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="عميل، ساعة، جنيه..."
              />
            </div>
          </div>
        </div>

        {/* Dates & Assignment */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/60 pb-2.5">
            <Calendar className="h-4 w-4 text-primary" />
            <span>التواريخ والتعيين والمشروع</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                تاريخ البدء <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                تاريخ الانتهاء <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">المالك / المسؤول</label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">غير محدد</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">المشروع</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">بدون مشروع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1.5">الهدف الأعلى (المحاذاة الشجرية)</label>
              <select
                value={formData.parentGoalId}
                onChange={(e) => setFormData({ ...formData, parentGoalId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">هدف رئيسي (أعلى الهرم)</option>
                {parentGoals.filter((g) => g.id !== id).map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Key Results */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>النتائج الرئيسية (Key Results)</span>
            </h2>
            <button
              type="button"
              onClick={addKeyResult}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة نتيجة</span>
            </button>
          </div>

          {keyResults.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              لم تتم إضافة نتائج رئيسية بعد. أضف نتائج فرعية لقياس التقدم بدقة.
            </p>
          ) : (
            <div className="space-y-3">
              {keyResults.map((kr, index) => (
                <div key={kr.id} className="p-3.5 bg-muted/20 rounded-lg border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">نتيجة رئيسية #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyResult(index)}
                      className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={kr.title}
                      onChange={(e) => updateKeyResult(index, "title", e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      placeholder="عنوان النتيجة الرئيسية (مثال: تحقيق 100 اشتراك مدفوع)"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={kr.targetValue}
                        onChange={(e) => updateKeyResult(index, "targetValue", parseFloat(e.target.value) || 0)}
                        className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-xs tabular-nums focus:ring-1 focus:ring-primary focus:outline-none"
                        placeholder="القيمة المستهدفة"
                      />
                      <input
                        type="text"
                        value={kr.unit}
                        onChange={(e) => updateKeyResult(index, "unit", e.target.value)}
                        className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                        placeholder="الوحدة"
                      />
                      <input
                        type="number"
                        value={kr.weight}
                        onChange={(e) => updateKeyResult(index, "weight", parseInt(e.target.value) || 1)}
                        className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-xs tabular-nums focus:ring-1 focus:ring-primary focus:outline-none"
                        placeholder="الوزن (1-10)"
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? "جاري الحفظ..." : isEditing ? "تحديث الهدف" : "إنشاء الهدف"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DevGoalForm;
