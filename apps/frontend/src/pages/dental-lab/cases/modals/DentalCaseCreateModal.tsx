import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Loader2, Pencil, X as XMarkIcon } from "lucide-react";
import type {
  DentalCasePriority,
  DentalLabCase,
  DentalLabDoctor,
  DentalTechnician,
  DentalWorkType,
} from "../../shared";
import {
  fmtMoney,
  MODAL_INPUT_CLS,
  PRIORITY_CONFIG,
  ROLE_CONFIG,
} from "../../shared";
import OdontogramChart from "../../OdontogramChart";
import { useDentalCaseCreateForm } from "../hooks/useDentalCaseCreateForm";

export interface DentalCaseCreateModalProps {
  initial?: DentalLabCase | null;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

export function DentalCaseCreateModal({
  initial,
  doctors,
  workTypes,
  technicians,
  onClose,
  onSaved,
}: DentalCaseCreateModalProps) {
  const { t } = useTranslation();
  const {
    saving,
    doctorId,
    setDoctorId,
    doctorName,
    setDoctorName,
    technicianId,
    setTechnicianId,
    workTypeId,
    priceSnapshot,
    setPriceSnapshot,
    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    teeth,
    setTeeth,
    selectedTeeth,
    setSelectedTeeth,
    unitsCount,
    setUnitsCount,
    shade,
    setShade,
    material,
    setMaterial,
    lotNumber,
    setLotNumber,
    materialBrand,
    setMaterialBrand,
    warrantyYears,
    setWarrantyYears,
    receivedDate,
    setReceivedDate,
    dueDate,
    setDueDate,
    priority,
    setPriority,
    discount,
    setDiscount,
    notes,
    setNotes,
    onWorkTypeChange,
    onTeethChange,
    save,
  } = useDentalCaseCreateForm({ initial, workTypes, onSaved });

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-850 h-full shadow-2xl flex flex-col border-r dark:border-gray-700 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                <Pencil className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {initial
                  ? `تعديل الأوردر ${initial.caseNumber || initial.id.slice(0, 8)}`
                  : t("dentalLab.cases.createTitle")}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {initial
                ? "تعديل تفاصيل وأسنان ومواصفات الحالة السريعة عبر الدرج الجانبي"
                : "إدخال بيانات حالة جديدة في معمل الأسنان"}
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Banner for Deep Case Detail */}
        {initial && (
          <div className="px-6 py-2.5 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 flex items-center justify-between gap-3 text-xs">
            <span className="text-blue-800 dark:text-blue-200">
              تريد إدارة فحص الجودة (QC)، الأشعة ثلاثية الأبعاد (STL)، أو الفواتير الموسعة؟
            </span>
            <Link
              to={`/dental-lab/cases/${initial.id}`}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
              onClick={onClose}
            >
              <span>فتح صفحة الأوردر</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>العيادة / المركز الطبي *</label>
              <select
                className={inputCls}
                value={doctorId}
                onChange={(e) => {
                  const newDocId = e.target.value;
                  setDoctorId(newDocId);
                  const found = doctors.find((d) => d.id === newDocId);
                  if (found) {
                    setDoctorName(found.doctors?.[0]?.name || found.name);
                  } else {
                    setDoctorName("");
                  }
                }}
              >
                <option value="">— اختر العيادة / الحساب —</option>
                {doctors
                  .filter((d) => d.isActive)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.clinicName ? `${d.clinicName} (${d.name})` : d.name}
                    </option>
                  ))}
              </select>
            </div>
            {(() => {
              const selectedClinic = doctors.find((d) => d.id === doctorId);
              if (selectedClinic?.doctors && selectedClinic.doctors.length > 0) {
                return (
                  <div>
                    <label className={labelCls}>الطبيب المعالج داخل العيادة</label>
                    <select
                      className={inputCls}
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    >
                      <option value={selectedClinic.name}>
                        {selectedClinic.name} (الطبيب الرئيسي)
                      </option>
                      {selectedClinic.doctors.map((doc) => (
                        <option key={doc.id} value={doc.name}>
                          {doc.name} {doc.specialty ? `(${doc.specialty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div>
                  <label className={labelCls}>اسم الطبيب المعالج</label>
                  <input
                    className={inputCls}
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="د. اسم الطبيب"
                  />
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("dentalLab.common.patientName")} *</label>
              <input
                className={inputCls}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="اسم المريض"
                required
              />
            </div>
            <div>
              <label className={labelCls}>هاتف المريض</label>
              <input
                className={inputCls}
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>نوع الشغل / التركيبة *</label>
              <select className={inputCls} value={workTypeId} onChange={onWorkTypeChange}>
                <option value="">— اختر نوع الشغل —</option>
                {workTypes
                  .filter((w) => w.isActive)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (
                      {w.pricingMode === "FLAT"
                        ? `${fmtMoney(Number(w.price))} مقطوع`
                        : `${fmtMoney(Number(w.price))} / سن`}
                      )
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>الفني المبدئي (إسناد اختياري)</label>
              <select
                className={inputCls}
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">— بدون إسناد حالياً —</option>
                {technicians
                  .filter((t) => t.active)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({ROLE_CONFIG[t.role]?.label || t.role})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Interactive Odontogram chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>مخطط الأسنان التفاعلي (FDI 2-Digit)</label>
              {selectedTeeth.length > 0 && (
                <button
                  type="button"
                  onClick={() => onTeethChange([])}
                  className="text-xs text-rose-500 hover:underline"
                >
                  مسح الأسنان المحددة ({selectedTeeth.length})
                </button>
              )}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
              <OdontogramChart selectedTeeth={selectedTeeth} onChange={onTeethChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>أرقام الأسنان (يدوي)</label>
              <input
                className={inputCls}
                value={teeth}
                onChange={(e) => {
                  setTeeth(e.target.value);
                  const parsed = e.target.value.split(/[,،\s]+/).filter(Boolean);
                  setSelectedTeeth(parsed);
                  if (parsed.length > 0) setUnitsCount(parsed.length);
                }}
                placeholder="11, 21, 22"
              />
            </div>
            <div>
              <label className={labelCls}>عدد الوحدات (Units) *</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={unitsCount}
                onChange={(e) => setUnitsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
            <div>
              <label className={labelCls}>درجة اللون (Shade)</label>
              <input
                className={inputCls}
                value={shade}
                onChange={(e) => setShade(e.target.value)}
                placeholder="A1, A2, 3D Master..."
              />
            </div>
          </div>

          {/* Material & Warranty info */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                المادة الخام
              </label>
              <input
                className={inputCls}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Zirconia, E-Max..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                البراند / الشركة
              </label>
              <input
                className={inputCls}
                value={materialBrand}
                onChange={(e) => setMaterialBrand(e.target.value)}
                placeholder="Ivoclar, Katana..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                رقم التشغيلة (Lot)
              </label>
              <input
                className={inputCls}
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="LOT-2026-X"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                سنين الضمان
              </label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={warrantyYears}
                onChange={(e) => setWarrantyYears(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>تاريخ الاستلام</label>
              <input
                type="date"
                className={inputCls}
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>تاريخ التسليم المتوقع</label>
              <input
                type="date"
                className={inputCls}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>أولوية التشغيل</label>
              <select
                className={inputCls}
                value={priority}
                onChange={(e) => setPriority(e.target.value as DentalCasePriority)}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <div>
              <label className={labelCls}>السعر المبدئي المحسوب (ج.م)</label>
              <input
                type="number"
                step="any"
                min={0}
                className={inputCls}
                value={priceSnapshot}
                onChange={(e) => setPriceSnapshot(parseFloat(e.target.value) || 0)}
              />
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                محسوب تلقائياً بناءً على تعاقد الطبيب والوحدات
              </span>
            </div>
            <div>
              <label className={labelCls}>الخصم إن وجد (ج.م)</label>
              <input
                type="number"
                step="any"
                min={0}
                className={inputCls}
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>ملاحظات الفني / الطبيب</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل خاصة بتشريح السن أو حواف التحضير أو طريقة التوصيل..."
            />
          </div>
        </div>

        {/* Drawer Actions Footer */}
        <div className="px-6 py-4 border-t dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("dentalLab.common.saving")}</span>
              </>
            ) : (
              <span>{initial ? "حفظ التعديلات" : t("dentalLab.common.save")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalCaseCreateModal;
