import React from "react";
import OdontogramChart from "../../../../OdontogramChart";

interface CaseCreateOdontogramSectionProps {
  selectedTeeth: string[];
  onTeethChange: (teeth: string[]) => void;
  teeth: string;
  setTeeth: (val: string) => void;
  setSelectedTeeth: (teeth: string[]) => void;
  unitsCount: number;
  setUnitsCount: (count: number) => void;
  shade: string;
  setShade: (val: string) => void;
  inputCls: string;
  labelCls: string;
}

export const CaseCreateOdontogramSection: React.FC<
  CaseCreateOdontogramSectionProps
> = ({
  selectedTeeth,
  onTeethChange,
  teeth,
  setTeeth,
  setSelectedTeeth,
  unitsCount,
  setUnitsCount,
  shade,
  setShade,
  inputCls,
  labelCls,
}) => {
  return (
    <>
      {/* Interactive Odontogram chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls}>
            مخطط الأسنان التفاعلي (FDI 2-Digit)
          </label>
          {selectedTeeth.length > 0 && (
            <button
              type="button"
              onClick={() => onTeethChange([])}
              className="text-xs text-rose-500 hover:underline"
            >
              مسح الأسنان المحددة (
              <span className="tabular-nums font-mono">
                {selectedTeeth.length}
              </span>
              )
            </button>
          )}
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
          <OdontogramChart
            selectedTeeth={selectedTeeth}
            onChange={onTeethChange}
          />
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
              const parsed = e.target.value
                .split(/[,،\s]+/)
                .filter(Boolean);
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
            className={`${inputCls} tabular-nums font-mono`}
            value={unitsCount}
            onChange={(e) =>
              setUnitsCount(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
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
    </>
  );
};

export default CaseCreateOdontogramSection;
