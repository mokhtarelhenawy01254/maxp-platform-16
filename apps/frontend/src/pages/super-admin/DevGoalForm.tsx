import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import {
  ArrowRightIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

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

  useEffect(() => {
    if (isEditing) fetchGoal();
  }, [id]);

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
      alert("العنوان والتواريخ مطلوبة");
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
        alert(data.error || "فشل حفظ الهدف");
      }
    } catch (err) {
      alert("فشل في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditing ? "تعديل الهدف" : "هدف جديد"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">المعلومات الأساسية</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                عنوان الهدف <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="مثال: زيادة رضا العملاء بنسبة 25%"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="وصف تفصيلي للهدف..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الهدف</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="COMPANY">هدف شركة</option>
                  <option value="TEAM">هدف فريق</option>
                  <option value="INDIVIDUAL">هدف فردي</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="LOW">منخفضة</option>
                  <option value="MEDIUM">متوسطة</option>
                  <option value="HIGH">عالية</option>
                  <option value="CRITICAL">حرجة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الترم</label>
                <select
                  value={formData.quarter}
                  onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">الهدف الكمي</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع القيمة</label>
              <select
                value={formData.targetType}
                onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="NUMBER">رقم</option>
                <option value="CURRENCY">عملة</option>
                <option value="BOOLEAN">صحيح/خطأ</option>
                <option value="TASK_COMPLETION">إتمام مهام</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القيمة المستهدفة</label>
              <input
                type="number"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوحدة</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="عميل، ساعة، جنيه..."
              />
            </div>
          </div>
        </div>

        {/* Dates & Assignment */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">التواريخ والتعيين</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ البدء *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الانتهاء *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المالك</label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">غير محدد</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المشروع</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">غير محدد</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهدف الأعلى</label>
              <select
                value={formData.parentGoalId}
                onChange={(e) => setFormData({ ...formData, parentGoalId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">هدف رئيسي</option>
                {parentGoals.filter((g) => g.id !== id).map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Key Results */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">النتائج الرئيسية</h2>
            <button
              type="button"
              onClick={addKeyResult}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-200"
            >
              <PlusIcon className="h-4 w-4" />
              إضافة نتيجة
            </button>
          </div>

          {keyResults.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-6">
              لم تتم إضافة نتائج رئيسية بعد. أضف نتائج لقياس التقدم.
            </p>
          ) : (
            <div className="space-y-4">
              {keyResults.map((kr, index) => (
                <div key={kr.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">نتيجة {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyResult(index)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={kr.title}
                      onChange={(e) => updateKeyResult(index, "title", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="عنوان النتيجة الرئيسية"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="number"
                        value={kr.targetValue}
                        onChange={(e) => updateKeyResult(index, "targetValue", parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="القيمة المستهدفة"
                      />
                      <input
                        type="text"
                        value={kr.unit}
                        onChange={(e) => updateKeyResult(index, "unit", e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="الوحدة"
                      />
                      <input
                        type="number"
                        value={kr.weight}
                        onChange={(e) => updateKeyResult(index, "weight", parseInt(e.target.value) || 1)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="الوزن"
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
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : isEditing ? "تحديث الهدف" : "إنشاء الهدف"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DevGoalForm;
