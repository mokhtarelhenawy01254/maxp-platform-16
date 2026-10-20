import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import {
  Lock,
  Mail,
  Palmtree,
  Plus,
  ShieldCheck,
  Trash2,
  X as XMarkIcon,
} from "lucide-react";
import {
  DAYS_OF_WEEK,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  ROLE_CONFIG,
  type DentalTechnician,
  type DentalTechnicianRole,
} from "../../shared";
import type { TechnicianForm } from "../types/technicianTypes";

export interface TechnicianEditModalProps {
  modal: TechnicianForm;
  setModal: Dispatch<SetStateAction<TechnicianForm | null>>;
  rows: DentalTechnician[];
  saving: boolean;
  error: string | null;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export function TechnicianEditModal({
  modal,
  setModal,
  rows,
  saving,
  error,
  onSave,
  onClose,
}: TechnicianEditModalProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className={`${MODAL_CONTENT_CLS} max-w-lg w-full max-h-[92vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-gray-700">
          <h3 className="font-semibold text-lg">
            {modal.id ? "تعديل بيانات عضو فريق العمل" : "إضافة فني جديد وحساب المنصة"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>اسم الفني / العضو *</label>
            <input
              className={inputCls}
              value={modal.name}
              onChange={(e) => setModal({ ...modal, name: e.target.value })}
              placeholder="مثال: أحمد مصطفى"
            />
          </div>
          <div>
            <label className={labelCls}>رقم الهاتف</label>
            <input
              className={`${inputCls} font-mono`}
              value={modal.phone}
              onChange={(e) => setModal({ ...modal, phone: e.target.value })}
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelCls}>التخصص / المحطة التشغيلية</label>
            <select
              className={inputCls}
              value={modal.role}
              onChange={(e) =>
                setModal({ ...modal, role: e.target.value as DentalTechnicianRole })
              }
            >
              <option value="CAD_DESIGNER">مصمم CAD/CAM (تصميم ثلاثي الأبعاد)</option>
              <option value="CERAMIST">فني سيراميك وبورسلين (Ceramist)</option>
              <option value="MODEL_WAX">فني كاستات وشمع (Model & Wax)</option>
              <option value="METAL_CASTING">فني صب معادن وسباكة (Casting)</option>
              <option value="FINISHING_POLISHING">فني فينشنج وتلميع (Finishing & Polish)</option>
              <option value="QC_INSPECTOR">أخصائي مراقبة جودة (QC Inspector)</option>
              <option value="RECEPTION_LOGISTICS">استقبال ولوجستيات (Reception)</option>
              <option value="SUPERVISOR">مشرف الإنتاج / Master Tech</option>
              <option value="GENERAL_TECHNICIAN">فني أسنان عام (General)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>أجر المرحلة المكتملة (ج.م)</label>
            <input
              className={`${inputCls} font-mono tabular-nums`}
              type="number"
              min="0"
              value={modal.wagePerStage}
              onChange={(e) => setModal({ ...modal, wagePerStage: e.target.value })}
              placeholder="فارغ = المعدل الافتراضي"
            />
          </div>
          <div>
            <label className={labelCls}>سقف الحالات اليومي (Daily Cap)</label>
            <input
              className={`${inputCls} font-mono tabular-nums`}
              type="number"
              min="0"
              value={modal.dailyCap}
              onChange={(e) => setModal({ ...modal, dailyCap: e.target.value })}
              placeholder="0 = غير محدود"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>الفني البديل المفضل (عند الغياب أو اكتمال السقف)</label>
            <select
              className={inputCls}
              value={modal.backupTechnicianId}
              onChange={(e) =>
                setModal({ ...modal, backupTechnicianId: e.target.value })
              }
            >
              <option value="">بدون فني بديل مخصص (توزيع آلي عام)</option>
              {rows
                .filter((t) => !modal.id || t.id !== modal.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({ROLE_CONFIG[t.role]?.nameAr || t.role})
                  </option>
                ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>أيام العمل الأسبوعية (Working Schedule)</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DAYS_OF_WEEK.map(({ day, label }) => {
                const isSelected = modal.workingDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => {
                      const next = isSelected
                        ? modal.workingDays.filter((d) => d !== day)
                        : [...modal.workingDays, day].sort();
                      setModal({ ...modal, workingDays: next });
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              إذا لم يتم اختيار أي يوم، يُعتبر الفني متاحاً طوال أيام الأسبوع حسب سياسة المعمل.
            </p>
          </div>

          {/* Exceptional Vacations Section */}
          <div className="sm:col-span-2 border-t dark:border-gray-700/80 pt-4 mt-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  الإجازات الاستثنائية والتفرغ (Exceptional Vacations)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setModal({
                    ...modal,
                    vacations: [
                      ...modal.vacations,
                      { startDate: today, endDate: today, reason: "" },
                    ],
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة فترة إجازة</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
              يتم استبعاد الفني آلياً من التوزيع الذكي والمحرك خلال فترات الإجازة المحددة لحماية سلاسة العمل.
            </p>

            {modal.vacations.length === 0 ? (
              <div className="p-3 text-center border border-dashed rounded-lg border-gray-200 dark:border-gray-700/80 text-xs text-gray-400 dark:text-gray-500">
                لا توجد إجازات استثنائية مسجلة حالياً (الفني متاح للعمل حسب جدوله الأسبوعي).
              </div>
            ) : (
              <div className="space-y-2">
                {modal.vacations.map((vac, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-800/40"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">من تاريخ *</span>
                        <input
                          type="date"
                          className={`${inputCls} py-1 text-xs font-mono`}
                          value={vac.startDate}
                          onChange={(e) => {
                            const next = [...modal.vacations];
                            next[idx] = { ...next[idx], startDate: e.target.value };
                            setModal({ ...modal, vacations: next });
                          }}
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">إلى تاريخ *</span>
                        <input
                          type="date"
                          className={`${inputCls} py-1 text-xs font-mono`}
                          value={vac.endDate}
                          onChange={(e) => {
                            const next = [...modal.vacations];
                            next[idx] = { ...next[idx], endDate: e.target.value };
                            setModal({ ...modal, vacations: next });
                          }}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex-[1.5]">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">السبب / ملاحظات</span>
                      <input
                        type="text"
                        className={`${inputCls} py-1 text-xs`}
                        placeholder="سبب الإجازة (اختياري، مثلاً: راحة مرضية، سفر، ظرف عائلي)"
                        value={vac.reason || ""}
                        onChange={(e) => {
                          const next = [...modal.vacations];
                          next[idx] = { ...next[idx], reason: e.target.value };
                          setModal({ ...modal, vacations: next });
                        }}
                      />
                    </div>
                    <div className="sm:self-end flex justify-end pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next = modal.vacations.filter((_, i) => i !== idx);
                          setModal({ ...modal, vacations: next });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                        title="حذف هذه الإجازة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct User Account Section */}
          <div className="sm:col-span-2 border-t dark:border-gray-700/80 pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                بيانات تسجيل الدخول لحساب الفني بالمنصة (Portal Login Account)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>البريد الإلكتروني / اسم الدخول *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none" />
                  <input
                    className={`${inputCls} pr-9 font-mono`}
                    type="email"
                    value={modal.email}
                    onChange={(e) => setModal({ ...modal, email: e.target.value })}
                    placeholder="technician@lab.com"
                    dir="ltr"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  {modal.id ? "تحديث كلمة المرور (فارغ للإبقاء)" : "كلمة المرور للدخول *"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none" />
                  <input
                    className={`${inputCls} pr-9 font-mono`}
                    type="password"
                    value={modal.password}
                    onChange={(e) => setModal({ ...modal, password: e.target.value })}
                    placeholder={modal.id ? "•••••••• (فارغ للإبقاء)" : "6 أحرف على الأقل"}
                    dir="ltr"
                    required={!modal.id}
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
              يتم إنشاء وتفعيل حساب المستخدم فورياً لتمكين الفني من الدخول لبوابة المعمل ومسح باركود الحالات وتتبع مهامه.
            </p>
          </div>

          {modal.id && (
            <div className="sm:col-span-2 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="tech-active"
                checked={modal.isActive}
                onChange={(e) => setModal({ ...modal, isActive: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="tech-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                عضو نشط (متاح لتعيين مراحل الشغل له)
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t pt-3 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            onClick={onSave}
            disabled={saving || !modal.name.trim()}
            className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm"
          >
            {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TechnicianEditModal;
