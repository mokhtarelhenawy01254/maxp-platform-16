import type { QcCheckKey } from "../types";

const QC_LABEL_MAP: Record<QcCheckKey, string> = {
  quantity: "مراجعة الكمية",
  variant: "مراجعة المقاس / اللون",
  packaging: "سلامة التغليف",
  accessories: "الملحقات",
  invoiceSlip: "الورقة الداخلية",
};

interface PreparationOrderQcChecklistProps {
  orderNumber: string;
  enabledQcChecks: QcCheckKey[];
  qcChecklist: Partial<Record<QcCheckKey, boolean>> | undefined;
  qcCompleted: boolean;
  onQcCheckToggle: (
    orderNumber: string,
    key: QcCheckKey,
    checked: boolean,
  ) => void;
}

const PreparationOrderQcChecklist = ({
  orderNumber,
  enabledQcChecks,
  qcChecklist,
  qcCompleted,
  onQcCheckToggle,
}: PreparationOrderQcChecklistProps) => {
  if (enabledQcChecks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h4 className="font-semibold text-cyan-900">Checklist فحص الجودة</h4>
          <p className="mt-1 text-xs text-cyan-800">
            يجب استكمال العناصر المطلوبة قبل اعتماد التغليف.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            qcCompleted
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {qcCompleted ? "الفحص مكتمل" : "الفحص غير مكتمل"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {enabledQcChecks.map((key) => (
          <label
            key={`${orderNumber}-${key}`}
            className="flex items-center gap-3 rounded-xl border border-white bg-white px-4 py-3 text-sm text-gray-700"
          >
            <input
              type="checkbox"
              checked={qcChecklist?.[key] === true}
              onChange={(event) =>
                onQcCheckToggle(orderNumber, key, event.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            {QC_LABEL_MAP[key]}
          </label>
        ))}
      </div>
    </div>
  );
};

export default PreparationOrderQcChecklist;
