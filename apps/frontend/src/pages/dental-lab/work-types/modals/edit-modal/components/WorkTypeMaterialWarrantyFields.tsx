import React from "react";
import { useTranslation } from "react-i18next";
import {
  COMMON_BRANDS,
  COMMON_MATERIALS,
  type WorkTypeForm,
} from "../../../types/workTypeTypes";

interface WorkTypeMaterialWarrantyFieldsProps {
  modal: WorkTypeForm;
  setModal: (val: WorkTypeForm) => void;
  inputCls: string;
  labelCls: string;
}

export const WorkTypeMaterialWarrantyFields: React.FC<
  WorkTypeMaterialWarrantyFieldsProps
> = ({ modal, setModal, inputCls, labelCls }) => {
  const { t } = useTranslation();

  return (
    <>
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
    </>
  );
};

export default WorkTypeMaterialWarrantyFields;
