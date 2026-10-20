import { toast } from "sonner";
import { MODAL_INPUT_CLS, PRIORITY_CONFIG } from "../../../../shared";

interface QuickOrderPatientDatesFieldsProps {
  patientName: string;
  onPatientNameChange: (v: string) => void;
  patientPhone: string;
  onPatientPhoneChange: (v: string) => void;
  receivedDate: string;
  onReceivedDateChange: (v: string) => void;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  dueDateReason?: string;
  priority: "NORMAL" | "URGENT" | "STAT";
  onPriorityChange: (v: "NORMAL" | "URGENT" | "STAT") => void;
}

export function QuickOrderPatientDatesFields({
  patientName,
  onPatientNameChange,
  patientPhone,
  onPatientPhoneChange,
  receivedDate,
  onReceivedDateChange,
  dueDate,
  onDueDateChange,
  dueDateReason,
  priority,
  onPriorityChange,
}: QuickOrderPatientDatesFieldsProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>اسم المريض *</label>
        <input
          className={inputCls}
          placeholder="اسم المريض ثلاثي"
          value={patientName}
          onChange={(e) => onPatientNameChange(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className={labelCls}>رقم هاتف المريض (اختياري)</label>
        <input
          className={`${inputCls} font-mono`}
          placeholder="01xxxxxxxxx"
          value={patientPhone}
          onChange={(e) => onPatientPhoneChange(e.target.value)}
          dir="ltr"
        />
      </div>
      <div>
        <label className={labelCls}>تاريخ الدخول / الاستلام</label>
        <input
          className={`${inputCls} font-mono`}
          type="date"
          value={receivedDate}
          onChange={(e) => onReceivedDateChange(e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls}>تاريخ التسليم المطلوب</label>
        <input
          className={`${inputCls} font-mono`}
          type="date"
          min={new Date().toISOString().split("T")[0]}
          value={dueDate}
          onChange={(e) => {
            const val = e.target.value;
            const todayStr = new Date().toISOString().split("T")[0];
            if (val && val < todayStr) {
              toast.error("لا يمكن تحديد تاريخ تسليم سابق لتاريخ اليوم");
              return;
            }
            onDueDateChange(val);
          }}
        />
        {dueDateReason && (
          <p className="text-[11px] text-muted-foreground mt-1">
            الموعد المقترح بناءً على: {dueDateReason}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>الأولوية والاستعجال</label>
        <select
          className={inputCls}
          value={priority}
          onChange={(e) =>
            onPriorityChange(e.target.value as "NORMAL" | "URGENT" | "STAT")
          }
        >
          {(
            Object.keys(PRIORITY_CONFIG) as Array<
              keyof typeof PRIORITY_CONFIG
            >
          ).map((k) => (
            <option key={k} value={k}>
              {PRIORITY_CONFIG[k].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
