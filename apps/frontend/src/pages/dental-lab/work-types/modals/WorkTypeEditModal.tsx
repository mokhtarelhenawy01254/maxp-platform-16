import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileText, X as XMarkIcon } from "lucide-react";
import {
  createWorkType,
  updateWorkType,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "../../shared";
import {
  type WorkTypeForm,
  COMMON_MATERIALS,
  COMMON_BRANDS,
  CATEGORY_OPTIONS,
} from "../types/workTypeTypes";
import { WorkTypeLivePreview } from "../components/WorkTypeLivePreview";

interface WorkTypeEditModalProps {
  modal: WorkTypeForm;
  onClose: () => void;
  onSaved: () => void;
}

export function WorkTypeEditModal({
  modal: initialModal,
  onClose,
  onSaved,
}: WorkTypeEditModalProps) {
  const { t } = useTranslation();
  const [modal, setModal] = useState<WorkTypeForm>(initialModal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving) return;
    setError(null);
    if (!modal.name.trim()) {
      setError(t("dentalLab.common.name"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        category: modal.category || "OTHER",
        pricingMode: modal.pricingMode,
        price: Number(modal.price) || 0,
        costPrice: Number(modal.costPrice) || 0,
        leadTimeDays: Number(modal.leadTimeDays) || 0,
        urgentLeadTimeDays: Number(modal.urgentLeadTimeDays) || 0,
        defaultMaterial: modal.defaultMaterial.trim() || undefined,
        materialBrand: modal.materialBrand.trim() || undefined,
        instructions: modal.instructions.trim() || undefined,
        defaultWarrantyYears: Number(modal.defaultWarrantyYears) || 0,
        defaultCrownCount: Math.max(1, Number(modal.defaultCrownCount) || 1),
        sortOrder: Number(modal.sortOrder) || 0,
      };
      if (modal.id) {
        await updateWorkType(modal.id, { ...payload, isActive: modal.isActive });
        toast.success(t("dentalLab.workTypes.updated"));
      } else {
        await createWorkType({ ...payload, isActive: true });
        toast.success(t("dentalLab.workTypes.created"));
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  // Live calculations for the active modal
  const liveProfit = Math.max(
    0,
    (Number(modal.price) || 0) - (Number(modal.costPrice) || 0)
  );
  const liveMarginPct =
    Number(modal.price) > 0
      ? Math.round((liveProfit / Number(modal.price)) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3"
      onClick={() => !saving && onClose()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[92vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">
              {modal.id
                ? "تعديل نوع الشغل"
                : "إضافة نوع شغل جديد (2026 Ready)"}
            </h3>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Modal Body with 2-column layout: Form & Live Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className={labelCls}>{t("dentalLab.common.name")} *</label>
              <input
                className={inputCls}
                placeholder="مثال: تاج زيركون متعدد الطبقات (Zirconia Multilayer Crown)"
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  {t("dentalLab.workTypes.category")}
                </label>
                <select
                  className={inputCls}
                  value={modal.category}
                  onChange={(e) =>
                    setModal({ ...modal, category: e.target.value })
                  }
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>طريقة التسعير *</label>
                <select
                  className={inputCls}
                  value={modal.pricingMode}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      pricingMode: e.target.value as "PER_UNIT" | "FLAT",
                    })
                  }
                >
                  <option value="PER_UNIT">تسعير لكل وحدة (Per Unit)</option>
                  <option value="FLAT">سعر ثابت للخدمة كاملة (Flat Rate)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  {modal.pricingMode === "PER_UNIT"
                    ? "سعر الوحدة للعيادة (ج.م) *"
                    : "السعر الإجمالي للخدمة (ج.م) *"}
                </label>
                <input
                  className={`${inputCls} font-mono tabular-nums`}
                  type="number"
                  min="0"
                  value={modal.price}
                  onChange={(e) =>
                    setModal({ ...modal, price: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <label className={labelCls}>التكلفة التقديرية للمعمل (ج.م)</label>
                <input
                  className={`${inputCls} font-mono tabular-nums`}
                  type="number"
                  min="0"
                  placeholder="تكلفة البلوك والمواد"
                  value={modal.costPrice}
                  onChange={(e) =>
                    setModal({ ...modal, costPrice: Number(e.target.value) })
                  }
                />
              </div>

              {modal.pricingMode === "PER_UNIT" && (
                <div>
                  <label className={labelCls}>عدد الوحدات الافتراضي</label>
                  <input
                    className={`${inputCls} font-mono tabular-nums`}
                    type="number"
                    min="1"
                    value={modal.defaultCrownCount}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        defaultCrownCount: Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </div>
              )}

              <div>
                <label className={labelCls}>
                  {t("dentalLab.workTypes.leadTimeDays")} (أيام العمل العادية)
                </label>
                <input
                  className={`${inputCls} font-mono tabular-nums`}
                  type="number"
                  min="1"
                  value={modal.leadTimeDays}
                  onChange={(e) =>
                    setModal({ ...modal, leadTimeDays: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <label className={labelCls}>مدة الإنجاز المستعجل (أيام)</label>
                <input
                  className={`${inputCls} font-mono tabular-nums`}
                  type="number"
                  min="0"
                  value={modal.urgentLeadTimeDays}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      urgentLeadTimeDays: Number(e.target.value),
                    })
                  }
                  placeholder="فارغ = حسب السياسة العامة"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>الخامة الطبية الافتراضية</label>
                <input
                  list="common-materials"
                  className={inputCls}
                  placeholder="اختر أو اكتب الخامة"
                  value={modal.defaultMaterial}
                  onChange={(e) =>
                    setModal({ ...modal, defaultMaterial: e.target.value })
                  }
                />
                <datalist id="common-materials">
                  {COMMON_MATERIALS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={labelCls}>
                  الماركة / الشركة المصنعة المعتمدة
                </label>
                <input
                  list="common-brands"
                  className={inputCls}
                  placeholder="مثال: Aidite 3D Pro / Katana"
                  value={modal.materialBrand}
                  onChange={(e) =>
                    setModal({ ...modal, materialBrand: e.target.value })
                  }
                />
                <datalist id="common-brands">
                  {COMMON_BRANDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>سنوات الضمان الافتراضية</label>
                <input
                  className={`${inputCls} font-mono tabular-nums`}
                  type="number"
                  min="0"
                  placeholder="مثال: 5 سنوات"
                  value={modal.defaultWarrantyYears}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      defaultWarrantyYears: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className={labelCls}>
                  {t("dentalLab.workTypes.sortOrder")}
                </label>
                <input
                  className={`${inputCls} font-mono tabular-nums`}
                  type="number"
                  value={modal.sortOrder}
                  onChange={(e) =>
                    setModal({ ...modal, sortOrder: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                إرشادات التحضير للعيادة وملاحظات الفنيين (Guidelines)
              </label>
              <textarea
                className={`${inputCls} min-h-[60px] resize-y`}
                placeholder="تعليمات تحضير الشامفر، الحد الأدنى للسمك، زوايا التحضير، أو توجيهات التصميم..."
                value={modal.instructions}
                onChange={(e) =>
                  setModal({ ...modal, instructions: e.target.value })
                }
              />
            </div>

            {modal.id && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="worktype-active"
                  checked={modal.isActive}
                  onChange={(e) =>
                    setModal({ ...modal, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                />
                <label
                  htmlFor="worktype-active"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {t("dentalLab.common.active")} (متاح لاختياره في الحالات والطلبات
                  الجديدة)
                </label>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Card Preview & Margin Analyzer */}
          <WorkTypeLivePreview
            modal={modal}
            liveProfit={liveProfit}
            liveMarginPct={liveMarginPct}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 shrink-0">
          <button
            onClick={() => onClose()}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-sm"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving || !modal.name.trim()}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm"
          >
            {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkTypeEditModal;
