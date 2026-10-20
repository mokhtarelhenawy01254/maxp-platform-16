import { useMemo } from "react";
import { CheckCircle2, Loader2, Sparkles, Box, Scan, Layers, Check } from "lucide-react";
import {
  fmtMoney,
  MODAL_INPUT_CLS,
  VITA_SHADES,
  BLEACH_SHADES,
  IMPRESSION_TYPES,
  CASE_INTENTS,
} from "../../shared";
import OdontogramChart from "../../OdontogramChart";
import type { QuickOrderStepWorkTypeProps } from "../types/quickOrderTypes";

export function QuickOrderStepWorkType({
  workTypes,
  selectedServiceIds,
  onToggleService,
  selectedTeeth,
  onTeethChange,
  unitsCount,
  onUnitsCountChange,
  shade,
  onShadeChange,
  customShade,
  onCustomShadeChange,
  material,
  onMaterialChange,
  impressionType,
  onImpressionTypeChange,
  caseIntent,
  onCaseIntentChange,
  priceSnapshot,
  onPriceSnapshotChange,
  primaryService,
  doctorPricingMap = {},
  refsLoading = false,
}: QuickOrderStepWorkTypeProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  const activeWorkTypes = useMemo(
    () => workTypes.filter((w) => w.isActive !== false),
    [workTypes]
  );

  return (
    <div className="space-y-4">
      {/* Service Picker */}
      <div>
        <label className={labelCls}>نوع الشغل والخدمة الأساسية *</label>
        {refsLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border dark:border-gray-700 rounded-xl">
            {activeWorkTypes.map((w) => {
              const checked = selectedServiceIds.includes(w.id);
              const isPrimary = selectedServiceIds[0] === w.id;
              const specialPrice = doctorPricingMap[w.id];
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={(e) =>
                    onToggleService(
                      w.id,
                      e.shiftKey || e.ctrlKey || e.metaKey
                    )
                  }
                  className={[
                    "p-2.5 rounded-lg border text-right transition flex items-center justify-between text-xs",
                    checked
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-bold shadow-sm"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200",
                  ].join(" ")}
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{w.name}</span>
                      {isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-medium shrink-0">
                          الأساسية
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 font-normal font-mono tabular-nums">
                      {specialPrice != null
                        ? `${fmtMoney(specialPrice)} ج.م (خاص)`
                        : w.price
                        ? `${fmtMoney(w.price)} ج.م`
                        : "—"}{" "}
                      {w.pricingMode === "PER_UNIT" ? "/ وحدة" : ""}
                    </div>
                  </div>
                  {checked && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive FDI Odontogram */}
      <div>
        <OdontogramChart
          selectedTeeth={selectedTeeth}
          onChange={onTeethChange}
        />
      </div>

      {/* Shade Selector (VITA & Bleach) */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            دليل ألوان الأسنان (VITA / Bleach)
          </label>
          {(shade || customShade) && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">
              اللون المختار: {customShade || shade}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {VITA_SHADES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onShadeChange(s);
                onCustomShadeChange("");
              }}
              className={[
                "px-2.5 py-1 rounded text-xs font-mono font-bold transition",
                shade === s && !customShade
                  ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/30",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          {BLEACH_SHADES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onShadeChange(s);
                onCustomShadeChange("");
              }}
              className={[
                "px-2 py-1 rounded text-[11px] font-mono font-bold transition",
                shade === s && !customShade
                  ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-300"
                  : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="pt-1">
          <input
            className={inputCls}
            placeholder="أو اكتب لوناً مخصصاً (مثال: 2M2, 3D Master, Gingiva Shade)..."
            value={customShade}
            onChange={(e) => {
              onCustomShadeChange(e.target.value);
              if (e.target.value) onShadeChange(e.target.value);
            }}
          />
        </div>
      </div>

      {/* Impression Type & Case Intent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
            نوع الطبعة المستلمة
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {IMPRESSION_TYPES.map((imp) => (
              <button
                key={imp.id}
                type="button"
                onClick={() => onImpressionTypeChange(imp.id)}
                className={[
                  "p-2 rounded-lg text-start text-xs font-medium border transition flex items-center gap-1.5",
                  impressionType === imp.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-bold"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200",
                ].join(" ")}
              >
                <span className="truncate">{imp.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
            نوع مرحلة التسليم (تجربة / نهائي)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {CASE_INTENTS.map((intent) => (
              <button
                key={intent.id}
                type="button"
                onClick={() => onCaseIntentChange(intent.id)}
                className={[
                  "p-2 rounded-lg text-start text-xs font-medium border transition flex flex-col",
                  caseIntent === intent.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 font-bold"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200",
                ].join(" ")}
              >
                <span className="truncate">{intent.label}</span>
                <span className="text-[10px] text-gray-400 font-normal truncate">
                  {intent.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Material & Live Price */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>الخامة الطبية</label>
          <input
            className={inputCls}
            placeholder="مثال: زيركون Katana"
            value={material}
            onChange={(e) => onMaterialChange(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>عدد الوحدات / الأسنان</label>
          <input
            className={`${inputCls} font-mono tabular-nums`}
            type="number"
            min="1"
            value={unitsCount}
            onChange={(e) => onUnitsCountChange(Number(e.target.value))}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className={labelCls}>سعر الطلب (قبل الخصم)</label>
            {primaryService && doctorPricingMap[primaryService.id] != null && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums">
                سعر خاص ({fmtMoney(doctorPricingMap[primaryService.id])})
              </span>
            )}
          </div>
          <input
            className={`${inputCls} font-mono tabular-nums`}
            type="number"
            value={priceSnapshot}
            onChange={(e) => onPriceSnapshotChange(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

export default QuickOrderStepWorkType;
