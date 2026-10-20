import type { ChangeEvent, DragEvent } from "react";
import {
  CheckCircle2,
  Loader2,
  Trash2,
  Upload,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  fmtMoney,
  MODAL_INPUT_CLS,
  PRIORITY_CONFIG,
  ROLE_CONFIG,
  type DentalTechnicianRole,
} from "../../shared";
import { fileIcon, fmtBytes, type QuickOrderStepPatientFilesProps } from "../types/quickOrderTypes";

export function QuickOrderStepPatientFiles({
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
  technicians,
  selectedTechnicianId,
  onSelectedTechnicianIdChange,
  selectedTechnicianRole,
  onSelectedTechnicianRoleChange,
  notes,
  onNotesChange,
  files,
  onFilesChange,
  fileInputRef,
  dragOver,
  onDragOverChange,
  upStatus,
  selectedDoctor,
  primaryWorkType,
  selectedTeeth,
  unitsCount,
  shade,
  customShade,
  priceSnapshot,
  discount,
}: QuickOrderStepPatientFilesProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  const addFiles = (picked: FileList | File[]) => {
    const arr = Array.from(picked);
    if (arr.length === 0) return;
    onFilesChange([...files, ...arr]);
  };

  const removeFile = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDragOverChange(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const netTotal = Math.max(0, (Number(priceSnapshot) || 0) - (Number(discount) || 0));

  return (
    <div className="space-y-4">
      {/* Patient & Date Details */}
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

      {/* Notes */}
      <div>
        <label className={labelCls}>ملاحظات فنية إضافية للمعمل</label>
        <textarea
          className={`${inputCls} min-h-[55px] resize-y`}
          placeholder="تعليمات الطبيب، تفاصيل الإطباق، تشريح الحواف..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      {/* Technician Assignment */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>إسناد أمر الشغل لفني المعمل (اختياري)</span>
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            يظهر فوراً في بوابة الفني
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>الفني المسؤول</label>
            <select
              className={inputCls}
              value={selectedTechnicianId}
              onChange={(e) => {
                const id = e.target.value;
                onSelectedTechnicianIdChange(id);
                const tech = technicians.find((t) => t.id === id);
                if (tech?.role) onSelectedTechnicianRoleChange(tech.role);
              }}
            >
              <option value="">-- بدون إسناد (سيتم التعيين لاحقاً) --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{" "}
                  {t.role && ROLE_CONFIG[t.role]?.label
                    ? `(${ROLE_CONFIG[t.role].label})`
                    : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>دور الفني في هذه الحالة</label>
            <select
              className={inputCls}
              disabled={!selectedTechnicianId}
              value={selectedTechnicianRole}
              onChange={(e) =>
                onSelectedTechnicianRoleChange(
                  e.target.value as DentalTechnicianRole
                )
              }
            >
              <option value="CAD_DESIGNER">تصميم كاد (CAD Designer)</option>
              <option value="CAM_OPERATOR">تفريز وكام (CAM Operator)</option>
              <option value="CERAMIST">خزف وسيراميك (Ceramist)</option>
              <option value="ORTHODONTIC">تقويم (Orthodontic)</option>
              <option value="CASTING_WAX">صب وشمع (Wax & Casting)</option>
              <option value="MODEL_MAKER">صب قوالب (Model Maker)</option>
              <option value="FINISHING_POLISHING">فينشنج وتلميع (Finishing & Polish)</option>
              <option value="QC_INSPECTOR">مراقبة جودة (QC Inspector)</option>
              <option value="GENERAL_TECHNICIAN">فني أسنان عام (General)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Multi-file drop zone */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls + " mb-0"}>
            رفع ملفات المسح ثلاثي الأبعاد والصور (STL, PLY, PDF)
          </label>
          <span className="text-[11px] text-gray-400">سحب وإفلات الملفات هنا</span>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            onDragOverChange(true);
          }}
          onDragLeave={() => onDragOverChange(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={[
            "rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition",
            dragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800",
          ].join(" ")}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Upload className="w-6 h-6 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
          <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
            انقر لاختيار ملفات الـ STL، صور الكاميرا الفموية، أو الـ PDF
          </p>
        </div>

        {files.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto">
            {files.map((f, idx) => {
              const st = upStatus[f.name];
              return (
                <li
                  key={`${f.name}-${idx}`}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {fileIcon(f.name)}
                    <span className="truncate">{f.name}</span>
                    <span
                      className="text-gray-400 shrink-0 font-mono tabular-nums"
                      dir="ltr"
                    >
                      {fmtBytes(f.size)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {st === "done" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    )}
                    {st === "uploading" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Order Summary & Pricing Breakdown */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 space-y-2 text-xs">
        <div className="font-bold text-blue-900 dark:text-blue-100 flex items-center justify-between border-b border-blue-200/60 dark:border-blue-800/60 pb-1.5">
          <span>ملخص أمر الشغل النهائي</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm tabular-nums">
            صافي الإجمالي: {fmtMoney(netTotal)} ج.م
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-700 dark:text-gray-300">
          <div>
            <span className="text-gray-400">الطبيب: </span>
            {selectedDoctor?.name || "—"}
          </div>
          <div>
            <span className="text-gray-400">الخدمة: </span>
            {primaryWorkType?.name || "—"}
          </div>
          <div>
            <span className="text-gray-400">الأسنان: </span>
            {selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "—"}
          </div>
          <div>
            <span className="text-gray-400">عدد الوحدات: </span>
            <span className="font-mono tabular-nums">{unitsCount}</span>
          </div>
          <div>
            <span className="text-gray-400">اللون: </span>
            {customShade || shade || "غير محدد"}
          </div>
          <div>
            <span className="text-gray-400">الخصم: </span>
            <span className="font-mono tabular-nums">{fmtMoney(discount)} ج.م</span>
          </div>
          <div>
            <span className="text-gray-400">الأولوية: </span>
            {PRIORITY_CONFIG[priority]?.label || priority}
          </div>
          <div>
            <span className="text-gray-400">تاريخ التسليم: </span>
            <span className="font-mono tabular-nums">{dueDate || "غير محدد"}</span>
          </div>
          <div>
            <span className="text-gray-400">الفني المسند: </span>
            {technicians.find((t) => t.id === selectedTechnicianId)?.name || "غير مسند"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickOrderStepPatientFiles;
