/**
 * 🤖 Automation Rules Management
 *
 * صفحة إدارة قواعد الأتمتة للإعلانات
 * v22.0 Feature
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Zap,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { facebookAdsService } from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";

// ============================================
// Types
// ============================================

interface AutomationRule {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  entityType: "CAMPAIGN" | "ADSET" | "AD";
  actionType: string;
  conditions: RuleCondition[];
  schedule: string;
  createdAt: string;
  lastTriggered?: string;
}

interface RuleCondition {
  field: string;
  operator: string;
  value: number;
}

interface CreateRuleForm {
  name: string;
  entityType: "CAMPAIGN" | "ADSET" | "AD";
  actionType: string;
  conditions: RuleCondition[];
  schedule: string;
}

// ============================================
// Constants
// ============================================

const ENTITY_TYPES = [
  { value: "CAMPAIGN", label: "الحملات" },
  { value: "ADSET", label: "المجموعات الإعلانية" },
  { value: "AD", label: "الإعلانات" },
];

const ACTION_TYPES = [
  { value: "PAUSE", label: "إيقاف مؤقت", icon: <Pause className="w-4 h-4" /> },
  { value: "UNPAUSE", label: "استئناف", icon: <Play className="w-4 h-4" /> },
  {
    value: "INCREASE_BUDGET",
    label: "زيادة الميزانية",
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    value: "DECREASE_BUDGET",
    label: "تقليل الميزانية",
    icon: <TrendingDown className="w-4 h-4" />,
  },
  {
    value: "SEND_NOTIFICATION",
    label: "إرسال إشعار",
    icon: <AlertCircle className="w-4 h-4" />,
  },
];

const CONDITION_FIELDS = [
  { value: "cost_per_result", label: "تكلفة النتيجة" },
  { value: "ctr", label: "معدل النقر (CTR)" },
  { value: "cpc", label: "تكلفة النقرة (CPC)" },
  { value: "cpm", label: "تكلفة الألف ظهور (CPM)" },
  { value: "spend", label: "الإنفاق" },
  { value: "impressions", label: "مرات الظهور" },
  { value: "clicks", label: "النقرات" },
  { value: "conversions", label: "التحويلات" },
  { value: "frequency", label: "التكرار" },
  { value: "roas", label: "العائد على الإنفاق (ROAS)" },
];

const OPERATORS = [
  { value: "GREATER_THAN", label: "أكبر من" },
  { value: "LESS_THAN", label: "أقل من" },
  { value: "EQUAL", label: "يساوي" },
  { value: "IN_RANGE", label: "في النطاق" },
];

const SCHEDULES = [
  { value: "SEMI_HOURLY", label: "كل 30 دقيقة" },
  { value: "HOURLY", label: "كل ساعة" },
  { value: "DAILY", label: "يومياً" },
  { value: "WEEKLY", label: "أسبوعياً" },
];

// ============================================
// Component
// ============================================

const AutomationRules: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState<CreateRuleForm>({
    name: "",
    entityType: "CAMPAIGN",
    actionType: "PAUSE",
    conditions: [
      { field: "cost_per_result", operator: "GREATER_THAN", value: 0 },
    ],
    schedule: "DAILY",
  });

  // Load rules
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await facebookAdsService.getAutomatedRules();
      setRules(data);
    } catch (error: any) {
      console.error("Error loading rules:", error);
      tToast.error("AutomationRules.failed_load_3df3");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!formData.name.trim()) {
      tToast.error("AutomationRules.name_required_4c30");
      return;
    }

    try {
      setCreating(true);
      await facebookAdsService.createAutomatedRule({
        name: formData.name,
        entityType: formData.entityType,
        actionType: formData.actionType,
        evaluationSpec: {
          evaluationType: formData.schedule,
          filters: formData.conditions.map((c) => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
          })),
        },
        executionSpec: {
          executionType: formData.actionType,
        },
      });

      tToast.success("AutomationRules.success_create_b833");
      setShowCreateModal(false);
      resetForm();
      await loadRules();
    } catch (error: any) {
      console.error("Error creating rule:", error);
      toast.error(error?.response?.data?.error || "فشل في إنشاء القاعدة");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه القاعدة؟")) return;

    try {
      await facebookAdsService.deleteAutomatedRule(ruleId);
      tToast.success("AutomationRules.success_delete_5fdc");
      await loadRules();
    } catch (error: any) {
      tToast.error("AutomationRules.failed_delete_4c17");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      entityType: "CAMPAIGN",
      actionType: "PAUSE",
      conditions: [
        { field: "cost_per_result", operator: "GREATER_THAN", value: 0 },
      ],
      schedule: "DAILY",
    });
  };

  const addCondition = () => {
    setFormData((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: "ctr", operator: "LESS_THAN", value: 0 },
      ],
    }));
  };

  const removeCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateCondition = (
    index: number,
    field: keyof RuleCondition,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    }));
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">جاري تحميل القواعد...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-[#f8fafc] px-4 py-8 dark:bg-[#030712] sm:px-6 lg:px-8">
      <FacebookAdsModuleNav />
      {/* Elite Command Bar */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              قواعد <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">الأتمتة</span>
            </h1>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
            أتمتة إدارة الحملات. أنشئ قواعد لإيقاف الإعلانات الخاسرة، زيادة ميزانية الإعلانات الرابحة، أو إرسال إشعارات.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-md shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-lg dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:shadow-none"
          >
            <Plus className="h-5 w-5" />
            قاعدة جديدة
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="border-b border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">القواعد النشطة</h2>
        </div>

        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Zap className="h-10 w-10" />
            </div>
            <h3 className="mt-6 text-xl font-black text-slate-900 dark:text-white">لا توجد قواعد أتمتة</h3>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm">
              قم بإنشاء قاعدة جديدة لتبدأ في إدارة حملاتك آلياً وحماية ميزانيتك على مدار الساعة.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 font-bold text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600 hover:shadow-lg dark:shadow-none"
            >
              <Plus className="h-5 w-5" />
              إنشاء قاعدة
            </button>
          </div>
        ) : (
          <div className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white p-6 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${rule.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"}`}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{rule.name}</h3>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {ENTITY_TYPES.find((e) => e.value === rule.entityType)?.label}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {SCHEDULES.find((s) => s.value === rule.schedule)?.label}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${rule.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${rule.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                    {rule.status === "ACTIVE" ? "نشط" : "متوقف"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="border-b border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">إنشاء قاعدة أتمتة جديدة</h2>
            </div>

            <div className="space-y-6 p-6">
              {/* Form styling adapted from existing */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">اسم القاعدة</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: إيقاف الإعلانات الخاسرة"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">تطبيق على</label>
                <select
                  value={formData.entityType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, entityType: e.target.value as any }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">الإجراء المستهدف</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ACTION_TYPES.map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, actionType: action.value }))}
                      className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition-all ${formData.actionType === action.value ? "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-900/20 dark:text-amber-400" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700"}`}
                    >
                      {action.icon}
                      <span className="truncate">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">الشروط</label>
                <div className="space-y-3">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(index, "field", e.target.value)}
                        className="flex-1 min-w-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        {CONDITION_FIELDS.map((field) => (
                          <option key={field.value} value={field.value}>{field.label}</option>
                        ))}
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, "operator", e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, "value", parseFloat(e.target.value))}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      {formData.conditions.length > 1 && (
                        <button
                          onClick={() => removeCondition(index)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addCondition}
                    className="mt-2 flex items-center gap-2 text-sm font-bold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة شرط آخر
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">التكرار (معدل الفحص)</label>
                <select
                  value={formData.schedule}
                  onChange={(e) => setFormData((prev) => ({ ...prev, schedule: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {SCHEDULES.map((schedule) => (
                    <option key={schedule.value} value={schedule.value}>{schedule.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="rounded-xl bg-slate-200 px-6 py-2.5 font-bold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateRule}
                disabled={creating}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                إنشاء القاعدة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRules;
