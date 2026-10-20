import React from "react";
import {
  PRIORITY_CONFIG,
  type DentalCasePriority,
} from "../../../../shared";

interface CaseCreateMaterialDatesSectionProps {
  material: string;
  setMaterial: (val: string) => void;
  materialBrand: string;
  setMaterialBrand: (val: string) => void;
  lotNumber: string;
  setLotNumber: (val: string) => void;
  warrantyYears: number;
  setWarrantyYears: (val: number) => void;
  receivedDate: string;
  setReceivedDate: (val: string) => void;
  dueDate: string;
  setDueDate: (val: string) => void;
  priority: DentalCasePriority;
  setPriority: (val: DentalCasePriority) => void;
  inputCls: string;
  labelCls: string;
}

export const CaseCreateMaterialDatesSection: React.FC<
  CaseCreateMaterialDatesSectionProps
> = ({
  material,
  setMaterial,
  materialBrand,
  setMaterialBrand,
  lotNumber,
  setLotNumber,
  warrantyYears,
  setWarrantyYears,
  receivedDate,
  setReceivedDate,
  dueDate,
  setDueDate,
  priority,
  setPriority,
  inputCls,
  labelCls,
}) => {
  return (
    <>
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
            className={`${inputCls} tabular-nums font-mono`}
            value={warrantyYears}
            onChange={(e) =>
              setWarrantyYears(Math.max(0, parseInt(e.target.value, 10) || 0))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>تاريخ الاستلام</label>
          <input
            type="date"
            className={`${inputCls} tabular-nums font-mono`}
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>تاريخ التسليم المتوقع</label>
          <input
            type="date"
            className={`${inputCls} tabular-nums font-mono`}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>أولوية التشغيل</label>
          <select
            className={inputCls}
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as DentalCasePriority)
            }
          >
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};

export default CaseCreateMaterialDatesSection;
