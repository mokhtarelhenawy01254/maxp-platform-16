import React from "react";
import { useTranslation } from "react-i18next";
import {
  CATEGORY_OPTIONS,
  type WorkTypeForm,
} from "../../../types/workTypeTypes";

interface WorkTypeBasicPricingFieldsProps {
  modal: WorkTypeForm;
  setModal: (val: WorkTypeForm) => void;
  inputCls: string;
  labelCls: string;
}

export const WorkTypeBasicPricingFields: React.FC<
  WorkTypeBasicPricingFieldsProps
> = ({ modal, setModal, inputCls, labelCls }) => {
  const { t } = useTranslation();

  return (
    <>
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
            onChange={(e) => setModal({ ...modal, category: e.target.value })}
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
    </>
  );
};

export default WorkTypeBasicPricingFields;
