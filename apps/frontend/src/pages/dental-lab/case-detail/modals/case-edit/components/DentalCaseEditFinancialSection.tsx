import React from "react";
import { DollarSign } from "lucide-react";
import type { DentalCasePriority, DentalCaseStatus } from "../../../../shared";
import {
  CASE_STATUSES,
  PRIORITY_CONFIG,
  MODAL_INPUT_CLS,
} from "../../../../shared";

export interface DentalCaseEditFinancialSectionProps {
  priceSnapshot: number;
  setPriceSnapshot: (n: number) => void;
  discount: number;
  setDiscount: (n: number) => void;
  receivedDate: string;
  setReceivedDate: (d: string) => void;
  dueDate: string;
  setDueDate: (d: string) => void;
  priority: DentalCasePriority;
  setPriority: (p: DentalCasePriority) => void;
  status: DentalCaseStatus;
  setStatus: (s: DentalCaseStatus) => void;
}

const labelCls = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1";
const sectionTitleCls =
  "text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-700 pb-2 mb-3";

export const DentalCaseEditFinancialSection: React.FC<DentalCaseEditFinancialSectionProps> = ({
  priceSnapshot,
  setPriceSnapshot,
  discount,
  setDiscount,
  receivedDate,
  setReceivedDate,
  dueDate,
  setDueDate,
  priority,
  setPriority,
  status,
  setStatus,
}) => {
  return (
    <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700/60">
      <h4 className={sectionTitleCls}>
        <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>الأسعار والجدولة</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label htmlFor="edit-case-price-snapshot" className={labelCls}>
            الإجمالي قبل الخصم
          </label>
          <input
            id="edit-case-price-snapshot"
            className={MODAL_INPUT_CLS}
            type="number"
            min="0"
            value={priceSnapshot}
            onChange={(e) => setPriceSnapshot(Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="edit-case-discount" className={labelCls}>
            قيمة الخصم
          </label>
          <input
            id="edit-case-discount"
            className={MODAL_INPUT_CLS}
            type="number"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="edit-case-received-date" className={labelCls}>
            تاريخ الدخول / الاستلام
          </label>
          <input
            id="edit-case-received-date"
            className={MODAL_INPUT_CLS}
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="edit-case-due-date" className={labelCls}>
            تاريخ التسليم المتوقع
          </label>
          <input
            id="edit-case-due-date"
            className={MODAL_INPUT_CLS}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="edit-case-priority" className={labelCls}>
            الأولوية
          </label>
          <select
            id="edit-case-priority"
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
        <label htmlFor="edit-case-status" className={labelCls}>
          حالة الشغل العامة
        </label>
        <select
          id="edit-case-status"
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
  );
};
