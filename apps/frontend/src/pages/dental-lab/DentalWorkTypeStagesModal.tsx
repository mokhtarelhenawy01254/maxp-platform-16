import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Coins,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Workflow,
  X as XMarkIcon,
} from "lucide-react";
import {
  DentalWorkType,
  WorkTypeStageTemplateItem,
  DentalTechnicianRole,
  ROLE_CONFIG,
  fetchWorkTypeStages,
  saveWorkTypeStages,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  fmtMoney,
} from "./shared";

interface Props {
  workType: DentalWorkType;
  onClose: () => void;
  onSaved?: () => void;
}

const CANONICAL_PRESETS: WorkTypeStageTemplateItem[] = [
  { name: "الاستلام", requiredRole: "RECEPTION_LOGISTICS", slaHours: 12, stageWage: 0, isRequired: true, sortOrder: 0 },
  { name: "التصميم", requiredRole: "CAD_DESIGNER", slaHours: 24, stageWage: 0, isRequired: true, sortOrder: 1 },
  { name: "التصنيع", requiredRole: "CERAMIST", slaHours: 48, stageWage: 0, isRequired: true, sortOrder: 2 },
  { name: "مراجعة الجودة", requiredRole: "QC_INSPECTOR", slaHours: 12, stageWage: 0, isRequired: true, sortOrder: 3 },
  { name: "التسليم", requiredRole: "RECEPTION_LOGISTICS", slaHours: 12, stageWage: 0, isRequired: true, sortOrder: 4 },
];

export default function DentalWorkTypeStagesModal({ workType, onClose, onSaved }: Props) {
  const [stages, setStages] = useState<WorkTypeStageTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchWorkTypeStages(workType.id);
        if (active) {
          setStages(data && data.length > 0 ? data : CANONICAL_PRESETS);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "فشل جلب قالب المراحل");
          setStages(CANONICAL_PRESETS);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workType.id]);

  const updateStage = (index: number, updates: Partial<WorkTypeStageTemplateItem>) => {
    setStages(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const addStage = () => {
    setStages(prev => [
      ...prev,
      {
        name: "",
        requiredRole: "GENERAL_TECHNICIAN",
        slaHours: 24,
        stageWage: 0,
        isRequired: true,
        sortOrder: prev.length,
      },
    ]);
  };

  const removeStage = (index: number) => {
    setStages(prev => prev.filter((_, idx) => idx !== index));
  };

  const moveStage = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    setStages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy.map((st, i) => ({ ...st, sortOrder: i }));
    });
  };

  const handleSave = async () => {
    if (saving) return;
    const cleanStages = stages
      .map((st, idx) => ({
        ...st,
        name: st.name.trim(),
        sortOrder: idx,
        slaHours: Number(st.slaHours) > 0 ? Number(st.slaHours) : 24,
        stageWage: Number(st.stageWage) >= 0 ? Number(st.stageWage) : 0,
      }))
      .filter(st => st.name.length > 0);

    if (cleanStages.length === 0) {
      setError("يجب أن يحتوي القالب على مرحلة واحدة على الأقل باسم صالح.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveWorkTypeStages(workType.id, cleanStages);
      toast.success(`تم حفظ ${cleanStages.length} مراحل بنجاح لنوع الشغل`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ في حفظ القالب");
    } finally {
      setSaving(false);
    }
  };

  const totalSlaHours = stages.reduce((acc, s) => acc + (Number(s.slaHours) || 0), 0);
  const totalWages = stages.reduce((acc, s) => acc + (Number(s.stageWage) || 0), 0);
  const totalDays = (totalSlaHours / 24).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[92vh] flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center border border-blue-500/20">
              <Workflow className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                قالب مراحل الإنتاج — {workType.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تسلسل المحطات الفنية، الدور المطلوب (requiredRole)، الحد الأقصى للإنجاز (SLA Hours)، وأجر المرحلة
              </p>
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Summary Bar */}
        <div className="bg-gray-50 dark:bg-gray-900/60 px-4 py-2.5 border-b dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5 text-blue-500" />
              <span>المراحل:</span>
              <strong className="font-mono tabular-nums text-gray-900 dark:text-gray-100">{stages.length}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>إجمالي SLA:</span>
              <strong className="font-mono tabular-nums text-gray-900 dark:text-gray-100">{totalSlaHours} ساعة ({totalDays} يوم)</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-500" />
              <span>إجمالي أجور المراحل:</span>
              <strong className="font-mono tabular-nums text-gray-900 dark:text-gray-100">{fmtMoney(totalWages)} ج.م</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setStages(CANONICAL_PRESETS)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            استعادة الـ 5 مراحل المعتمدة
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Stages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : stages.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Workflow className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد مراحل مسجلة لهذا النوع.</p>
            </div>
          ) : (
            stages.map((st, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800/80 border dark:border-gray-700/70 rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3 shadow-xs hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                {/* Reorder and Index */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-mono font-bold flex items-center justify-center tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStage(idx, -1)}
                      className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === stages.length - 1}
                      onClick={() => moveStage(idx, 1)}
                      className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stage Name */}
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    اسم المرحلة *
                  </label>
                  <input
                    type="text"
                    value={st.name}
                    onChange={e => updateStage(idx, { name: e.target.value })}
                    placeholder="مثال: التصميم"
                    className={`${MODAL_INPUT_CLS} text-sm py-1.5`}
                  />
                </div>

                {/* Required Role */}
                <div className="w-full md:w-56 shrink-0">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    الدور الفني المطلوب (requiredRole)
                  </label>
                  <select
                    value={st.requiredRole || "GENERAL_TECHNICIAN"}
                    onChange={e => updateStage(idx, { requiredRole: e.target.value })}
                    className={`${MODAL_INPUT_CLS} text-xs py-1.5`}
                  >
                    <option value="CAD_DESIGNER">مصمم CAD/CAM (تصميم)</option>
                    <option value="CERAMIST">فني سيراميك وبورسلين (تصنيع)</option>
                    <option value="MODEL_WAX">فني كاستات وشمع (Model & Wax)</option>
                    <option value="METAL_CASTING">فني صب معادن وسباكة (Casting)</option>
                    <option value="FINISHING_POLISHING">فني فينشنج وتلميع (Finishing)</option>
                    <option value="QC_INSPECTOR">أخصائي مراقبة جودة (QC)</option>
                    <option value="RECEPTION_LOGISTICS">استقبال ولوجستيات (تسليم/استلام)</option>
                    <option value="SUPERVISOR">مشرف الإنتاج (Master Tech)</option>
                    <option value="GENERAL_TECHNICIAN">فني أسنان عام (General)</option>
                  </select>
                </div>

                {/* SLA Hours */}
                <div className="w-24 shrink-0">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    المدة (SLA س)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={st.slaHours || 24}
                    onChange={e => updateStage(idx, { slaHours: Number(e.target.value) || 1 })}
                    className={`${MODAL_INPUT_CLS} text-xs py-1.5 text-center font-mono tabular-nums`}
                  />
                </div>

                {/* Stage Wage */}
                <div className="w-24 shrink-0">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    أجر المرحلة (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={st.stageWage ?? 0}
                    onChange={e => updateStage(idx, { stageWage: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className={`${MODAL_INPUT_CLS} text-xs py-1.5 text-center font-mono tabular-nums`}
                  />
                </div>

                {/* Required toggle and Delete */}
                <div className="flex items-center gap-2 shrink-0 md:pt-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer" title="مرحلة إلزامية في تسلسل الحالة">
                    <input
                      type="checkbox"
                      checked={st.isRequired !== false}
                      onChange={e => updateStage(idx, { isRequired: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-[11px]">إلزامية</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => removeStage(idx)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="حذف المرحلة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          <button
            type="button"
            onClick={addStage}
            className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            إضافة محطة / مرحلة إنتاجية جديدة
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900/40">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
            أي حالة جديدة يتم إنشاؤها لهذا النوع ستأخذ تسلسل المراحل هذا تلقائياً مع أدوارها وSLA المحددة.
          </p>
          <div className="flex items-center gap-2.5 ms-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              حفظ قالب المراحل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
