import { Settings } from "lucide-react";
import OdontogramChart from "../../OdontogramChart";
import { MODAL_INPUT_CLS, type DentalWorkType } from "../../shared";

interface DentalCaseEditWorkSectionProps {
  workTypeId: string;
  workTypes: DentalWorkType[];
  unitsCount: number;
  unitPrice: number;
  shade: string;
  material: string;
  materialBrand: string;
  lotNumber: string;
  warrantyYears: number;
  selectedTeeth: string[];
  onWorkTypeChange: (id: string) => void;
  onUnitsCountChange: (units: number) => void;
  onUnitPriceChange: (price: number) => void;
  onShadeChange: (shade: string) => void;
  onMaterialChange: (material: string) => void;
  onMaterialBrandChange: (brand: string) => void;
  onLotNumberChange: (lot: string) => void;
  onWarrantyYearsChange: (years: number) => void;
  onTeethChange: (teethArr: string[]) => void;
}

export default function DentalCaseEditWorkSection({
  workTypeId,
  workTypes,
  unitsCount,
  unitPrice,
  shade,
  material,
  materialBrand,
  lotNumber,
  warrantyYears,
  selectedTeeth,
  onWorkTypeChange,
  onUnitsCountChange,
  onUnitPriceChange,
  onShadeChange,
  onMaterialChange,
  onMaterialBrandChange,
  onLotNumberChange,
  onWarrantyYearsChange,
  onTeethChange,
}: DentalCaseEditWorkSectionProps) {
  const labelCls = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1";
  const sectionTitleCls =
    "text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-700 pb-2 mb-3";

  return (
    <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700/60">
      <h4 className={sectionTitleCls}>
        <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>مواصفات الشغل والأسنان</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div>
          <label className={labelCls}>نوع الشغل *</label>
          <select
            className={MODAL_INPUT_CLS}
            value={workTypeId}
            onChange={(e) => onWorkTypeChange(e.target.value)}
          >
            <option value="">— اختر نوع الشغل —</option>
            {workTypes
              .filter((w) => w.isActive)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>عدد الوحدات / الأسنان</label>
          <input
            className={MODAL_INPUT_CLS}
            type="number"
            min="1"
            value={unitsCount}
            onChange={(e) => onUnitsCountChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>سعر الوحدة</label>
          <input
            className={MODAL_INPUT_CLS}
            type="number"
            min="0"
            value={unitPrice}
            onChange={(e) => onUnitPriceChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>اللون (Shade)</label>
          <input
            className={MODAL_INPUT_CLS}
            value={shade}
            onChange={(e) => onShadeChange(e.target.value)}
            placeholder="مثال: A1, A2, BL2"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className={labelCls}>تحديد الأسنان بالخريطة التفاعلية (FDI Odontogram)</label>
        <OdontogramChart selectedTeeth={selectedTeeth} onChange={onTeethChange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>الخامة (Material)</label>
          <input
            className={MODAL_INPUT_CLS}
            value={material}
            onChange={(e) => onMaterialChange(e.target.value)}
            placeholder="زيركون، إيماكس، PFM..."
          />
        </div>
        <div>
          <label className={labelCls}>الشركة المصنعة / الماركة</label>
          <input
            className={MODAL_INPUT_CLS}
            value={materialBrand}
            onChange={(e) => onMaterialBrandChange(e.target.value)}
            placeholder="Ivoclar, Wieland, Aidite..."
          />
        </div>
        <div>
          <label className={labelCls}>رقم التشغيلة (Lot #)</label>
          <input
            className={MODAL_INPUT_CLS}
            value={lotNumber}
            onChange={(e) => onLotNumberChange(e.target.value)}
            placeholder="LOT-2026-XXXX"
          />
        </div>
        <div>
          <label className={labelCls}>سنوات الضمان</label>
          <input
            className={MODAL_INPUT_CLS}
            type="number"
            min="0"
            max="20"
            value={warrantyYears}
            onChange={(e) => onWarrantyYearsChange(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
