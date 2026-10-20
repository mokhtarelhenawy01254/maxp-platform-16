import type { Dispatch, SetStateAction } from "react";
import {
  MODAL_INPUT_CLS,
  ROLE_CONFIG,
  type DentalTechnician,
  type DentalTechnicianRole,
} from "../../../../shared";
import type { TechnicianForm } from "../../types/technicianTypes";

interface TechnicianBasicFieldsProps {
  modal: TechnicianForm;
  setModal: Dispatch<SetStateAction<TechnicianForm | null>>;
  rows: DentalTechnician[];
}

export function TechnicianBasicFields({ modal, setModal, rows }: TechnicianBasicFieldsProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <>
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
    </>
  );
}
