import { Package, Loader2, X as XMarkIcon } from "lucide-react";
import { fmtDate, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "../../shared";
import type { MaterialConsumeModalProps } from "../types/dentalCaseDetailTypes";

export function DentalCaseMaterialConsumeModal({
  isOpen,
  materialBusy,
  materialsList,
  selectedMatId,
  selectedStockId,
  consumeUnits,
  consumeNotes,
  setSelectedMatId,
  setSelectedStockId,
  setConsumeUnits,
  setConsumeNotes,
  onClose,
  onSubmit,
}: MaterialConsumeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={() => !materialBusy && onClose()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-lg w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-3">
          <h3 className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            تسجيل استهلاك خامات وتتبع التشغيلة (Lot Traceability)
          </h3>
          <button
            type="button"
            onClick={() => !materialBusy && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              المادة الخام المستهلكة *
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={selectedMatId}
              onChange={(e) => {
                const mId = e.target.value;
                setSelectedMatId(mId);
                const mat = materialsList.find((m) => m.id === mId);
                const stocks = mat?.stocks || [];
                setSelectedStockId(stocks.length > 0 ? stocks[0].id : "");
              }}
            >
              <option value="">— اختر المادة الخام —</option>
              {materialsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category}) {m.shade ? `· لون: ${m.shade}` : ""}{" "}
                  · الرصيد: {m.currentStock} {m.unit}
                </option>
              ))}
            </select>
          </div>

          {selectedMatId && (
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                التشغيلة أو القرص المحدد (Lot / Disc) *
              </label>
              {(() => {
                const mat = materialsList.find((m) => m.id === selectedMatId);
                const stocks = mat?.stocks || [];
                if (stocks.length === 0) {
                  return (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs">
                      لا توجد شحنات مسجلة برقم تشغيلة لهذه الخامة. سيتم الصرف
                      مباشرة من الرصيد العام.
                    </div>
                  );
                }
                return (
                  <select
                    className={MODAL_INPUT_CLS}
                    value={selectedStockId}
                    onChange={(e) => setSelectedStockId(e.target.value)}
                  >
                    <option value="">
                      — خصم من الرصيد العام بدون تشغيلة محددة —
                    </option>
                    {stocks.map((s) => (
                      <option key={s.id} value={s.id}>
                        Lot: {s.lotNumber || "عام"} · المتبقي: {s.remainingUnits}{" "}
                        {mat?.unit}{" "}
                        {s.expiryDate
                          ? `· انتهاء: ${fmtDate(s.expiryDate)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              الكمية المستهلكة (عدد التيجان / الجرامات / الوحدات) *
            </label>
            <input
              className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
              type="number"
              min="0.1"
              step="0.1"
              value={consumeUnits}
              onChange={(e) => setConsumeUnits(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات الاستهلاك (اختياري)
            </label>
            <input
              className={MODAL_INPUT_CLS}
              value={consumeNotes}
              onChange={(e) => setConsumeNotes(e.target.value)}
              placeholder="مثال: تفريز جسر 3 وحدات فك علوي..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={materialBusy}
            className="px-4 py-2 border rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={materialBusy || !selectedMatId}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {materialBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            تسجيل وخصم من المخزن
          </button>
        </div>
      </div>
    </div>
  );
}
