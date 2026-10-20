import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DollarSign, Loader2, User, X as XMarkIcon } from "lucide-react";
import DentalCaseEditWorkSection from "./DentalCaseEditWorkSection";
import type { EditCaseModalProps } from "../types/dentalCaseDetailTypes";
import {
  CASE_STATUSES,
  PRIORITY_CONFIG,
  advanceCase,
  updateCase,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  type DentalCasePriority,
  type DentalCaseStatus,
} from "../../shared";

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function DentalCaseEditModal({
  caseData,
  doctors,
  workTypes,
  onClose,
  onSaved,
}: EditCaseModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState(caseData.doctorId || "");
  const [patientName, setPatientName] = useState(caseData.patientName || "");
  const [patientPhone, setPatientPhone] = useState(caseData.patientPhone || "");
  const [workTypeId, setWorkTypeId] = useState(caseData.workTypeId || "");
  const [workTypeName, setWorkTypeName] = useState(caseData.workTypeName || "");
  const [unitsCount, setUnitsCount] = useState<number>(caseData.unitsCount || 1);
  const [unitPrice, setUnitPrice] = useState<number>(caseData.unitPrice || 0);
  const [priceSnapshot, setPriceSnapshot] = useState<number>(caseData.priceSnapshot || 0);
  const [discount, setDiscount] = useState<number>(caseData.discount || 0);
  const [receivedDate, setReceivedDate] = useState(
    caseData.receivedDate ? caseData.receivedDate.slice(0, 10) : ""
  );
  const [dueDate, setDueDate] = useState(caseData.dueDate ? caseData.dueDate.slice(0, 10) : "");
  const [priority, setPriority] = useState<DentalCasePriority>(
    (caseData.priority as DentalCasePriority) || "NORMAL"
  );
  const [status, setStatus] = useState<DentalCaseStatus>(
    (caseData.status as DentalCaseStatus) || "RECEIVED"
  );
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(
    caseData.teeth ? caseData.teeth.split(/[,،\s]+/).filter(Boolean) : []
  );
  const [teeth, setTeeth] = useState(caseData.teeth || "");
  const [shade, setShade] = useState(caseData.shade || "");
  const [material, setMaterial] = useState(caseData.material || "");
  const [lotNumber, setLotNumber] = useState(caseData.lotNumber || "");
  const [materialBrand, setMaterialBrand] = useState(caseData.materialBrand || "");
  const [warrantyYears, setWarrantyYears] = useState(caseData.warrantyYears || 0);
  const [notes, setNotes] = useState(caseData.notes || "");

  const onWorkTypeChange = (wtId: string) => {
    setWorkTypeId(wtId);
    const wt = workTypes.find((w) => w.id === wtId);
    if (wt) {
      setWorkTypeName(wt.name);
      const pr = Number(wt.price) || 0;
      setUnitPrice(pr);
      setPriceSnapshot(round2(pr * (unitsCount || 1)));
      if (wt.defaultMaterial && !material) setMaterial(wt.defaultMaterial);
      if (wt.materialBrand && !materialBrand) setMaterialBrand(wt.materialBrand);
      if (wt.defaultWarrantyYears != null && !warrantyYears)
        setWarrantyYears(wt.defaultWarrantyYears);
    }
  };

  const handleUnitsCountChange = (count: number) => {
    const validCount = Math.max(1, count);
    setUnitsCount(validCount);
    if (unitPrice > 0) {
      setPriceSnapshot(round2(validCount * unitPrice));
    }
  };

  const handleUnitPriceChange = (price: number) => {
    const validPrice = Math.max(0, price);
    setUnitPrice(validPrice);
    if (unitsCount > 0) {
      setPriceSnapshot(round2(unitsCount * validPrice));
    }
  };

  const save = async () => {
    if (saving) return;
    if (!patientName.trim()) {
      toast.error(t("dentalLab.common.name"));
      return;
    }
    setSaving(true);
    try {
      if (status !== caseData.status) {
        await advanceCase(caseData.id, { status: status as DentalCaseStatus });
      }
      await updateCase(caseData.id, {
        doctorId: doctorId || undefined,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        workTypeId: workTypeId || undefined,
        workTypeName: workTypeName.trim() || undefined,
        unitsCount: Math.max(1, Number(unitsCount) || 1),
        unitPrice: Math.max(0, Number(unitPrice) || 0),
        priceSnapshot: Math.max(0, Number(priceSnapshot) || 0),
        discount: Math.max(0, Number(discount) || 0),
        receivedDate: receivedDate || undefined,
        dueDate: dueDate || undefined,
        priority: priority as DentalCasePriority,
        teeth: teeth.trim() || undefined,
        shade: shade.trim() || undefined,
        material: material.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        materialBrand: materialBrand.trim() || undefined,
        warrantyYears: Number(warrantyYears) >= 0 ? Number(warrantyYears) : 0,
        notes: notes.trim() || undefined,
      });
      toast.success(t("dentalLab.common.saved"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const labelCls = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1";
  const sectionTitleCls =
    "text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-700 pb-2 mb-3";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={() => !saving && onClose()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b dark:border-gray-700 pb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              تعديل بيانات الحالة بالكامل
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              رقم الحالة:{" "}
              <span className="font-mono font-semibold tabular-nums">{caseData.caseNumber}</span>
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-sm">
          {/* Section 1: Doctor & Patient */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700/60">
            <h4 className={sectionTitleCls}>
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>بيانات الطبيب والمريض</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>الطبيب المعالج *</label>
                <select
                  className={MODAL_INPUT_CLS}
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  <option value="">— اختر الطبيب —</option>
                  {doctors
                    .filter((d) => d.isActive)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.clinicName ? `(${d.clinicName})` : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>اسم المريض *</label>
                <input
                  className={MODAL_INPUT_CLS}
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="اسم المريض"
                />
              </div>
              <div>
                <label className={labelCls}>هاتف المريض</label>
                <input
                  className={MODAL_INPUT_CLS}
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Work & Units (Extracted) */}
          <DentalCaseEditWorkSection
            workTypeId={workTypeId}
            workTypes={workTypes}
            unitsCount={unitsCount}
            unitPrice={unitPrice}
            shade={shade}
            material={material}
            materialBrand={materialBrand}
            lotNumber={lotNumber}
            warrantyYears={warrantyYears}
            selectedTeeth={selectedTeeth}
            onWorkTypeChange={onWorkTypeChange}
            onUnitsCountChange={handleUnitsCountChange}
            onUnitPriceChange={handleUnitPriceChange}
            onShadeChange={setShade}
            onMaterialChange={setMaterial}
            onMaterialBrandChange={setMaterialBrand}
            onLotNumberChange={setLotNumber}
            onWarrantyYearsChange={setWarrantyYears}
            onTeethChange={(arr) => {
              setSelectedTeeth(arr);
              setTeeth(arr.join(", "));
            }}
          />

          {/* Section 3: Financial & Dates */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700/60">
            <h4 className={sectionTitleCls}>
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>الأسعار والجدولة</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>الإجمالي قبل الخصم</label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="number"
                  min="0"
                  value={priceSnapshot}
                  onChange={(e) => setPriceSnapshot(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>قيمة الخصم</label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>تاريخ الدخول / الاستلام</label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>تاريخ التسليم المتوقع</label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>الأولوية</label>
                <select
                  className={MODAL_INPUT_CLS}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as DentalCasePriority)}
                >
                  {(Object.keys(PRIORITY_CONFIG) as (keyof typeof PRIORITY_CONFIG)[]).map((k) => (
                    <option key={k} value={k}>
                      {PRIORITY_CONFIG[k].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>حالة الشغل العامة</label>
              <select
                className={MODAL_INPUT_CLS}
                value={status}
                onChange={(e) => setStatus(e.target.value as DentalCaseStatus)}
              >
                {CASE_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <label className={labelCls}>ملاحظات وتعليمات الشغل</label>
            <textarea
              className={`${MODAL_INPUT_CLS} min-h-[70px] resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="إرشادات التحضير، تفاصيل خاصة..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-sm"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
