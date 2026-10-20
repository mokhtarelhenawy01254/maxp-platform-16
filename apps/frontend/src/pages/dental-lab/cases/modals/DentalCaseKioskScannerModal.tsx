import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, ScanLine, X as XMarkIcon } from "lucide-react";
import type { DentalTechnician } from "../../shared";
import {
  kioskScanCase,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  ROLE_CONFIG,
} from "../../shared";

export interface DentalCaseKioskScannerModalProps {
  technicians: DentalTechnician[];
  onClose: () => void;
  onScanned: () => void;
}

export function DentalCaseKioskScannerModal({
  technicians,
  onClose,
  onScanned,
}: DentalCaseKioskScannerModalProps) {
  const [barcode, setBarcode] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<{
    caseNumber?: string;
    patientName?: string;
    doctorName?: string;
    newStatus: string;
    completedStage?: string;
    technicianName?: string;
  } | null>(null);
  const [scanHistory, setScanHistory] = useState<
    Array<{
      code: string;
      time: string;
      newStatus: string;
      caseNumber?: string;
      success: boolean;
      error?: string;
    }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code || scanning) return;

    setScanning(true);
    try {
      const res = await kioskScanCase({
        barcode: code,
        technicianId: technicianId || undefined,
      });
      toast.success(`تم مسح الحالة ${res.case?.caseNumber || code} وترقيتها بنجاح`);
      setLastScanned({
        caseNumber: res.case?.caseNumber,
        patientName: res.case?.patientName,
        doctorName: res.case?.doctorName || undefined,
        newStatus: res.newStatus,
        completedStage: res.completedStage,
        technicianName: res.technicianName,
      });
      setScanHistory((prev) => [
        {
          code,
          time: new Date().toLocaleTimeString("ar-EG"),
          newStatus: res.newStatus,
          caseNumber: res.case?.caseNumber,
          success: true,
        },
        ...prev.slice(0, 19),
      ]);
      setBarcode("");
      onScanned();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "رمز غير موجود";
      toast.error(msg);
      setScanHistory((prev) => [
        {
          code,
          time: new Date().toLocaleTimeString("ar-EG"),
          newStatus: "فشل",
          success: false,
          error: msg,
        },
        ...prev.slice(0, 19),
      ]);
    } finally {
      setScanning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={() => !scanning && onClose()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} !max-w-2xl max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-600 text-white">
              <ScanLine className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold">محطة المسح السريع بالباركود (Barcode Kiosk)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                مرر قارئ الباركود على ملصق الحالة لترقية المرحلة فوراً
              </p>
            </div>
          </div>
          <button
            onClick={() => !scanning && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              الفني المنفذ الحالي:
            </label>
            <select
              className={`${MODAL_INPUT_CLS} !w-auto flex-1 text-sm`}
              value={technicianId}
              onChange={(e) => {
                setTechnicianId(e.target.value);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
            >
              <option value="">تلقائي (حسب المرحلة الحالية للحالة)</option>
              {technicians
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (
                    {String(ROLE_CONFIG[t.role]?.label || t.role || "").replace(
                      /\s*\/\s*(Master|QC)\s*$/i,
                      ""
                    )}
                    )
                  </option>
                ))}
            </select>
          </div>

          <form onSubmit={handleScan} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="امسح الباركود أو اكتب رقم الحالة ثم اضغط Enter..."
              className="w-full text-lg font-mono px-4 py-3 border-2 border-blue-500 rounded-xl focus:ring-4 focus:ring-blue-100 dark:bg-gray-800 dark:border-blue-400 dark:text-gray-100 placeholder:text-sm placeholder:font-sans"
              autoFocus
              disabled={scanning}
            />
            <button
              type="submit"
              disabled={scanning || !barcode.trim()}
              className="absolute left-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}{" "}
              مسح
            </button>
          </form>

          {lastScanned && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 animate-in fade-in duration-200 tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                  آخر حالة ممسوحة بنجاح
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                  {lastScanned.newStatus}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-900 dark:text-gray-100 font-semibold flex flex-wrap gap-4">
                <span>
                  رقم: <b className="font-mono">{lastScanned.caseNumber}</b>
                </span>
                <span>
                  المريض: <b>{lastScanned.patientName || "—"}</b>
                </span>
                {lastScanned.doctorName && (
                  <span>
                    الطبيب: <b>{lastScanned.doctorName}</b>
                  </span>
                )}
                {lastScanned.completedStage && (
                  <span>
                    المرحلة المكتملة: <b>{lastScanned.completedStage}</b>
                  </span>
                )}
                {lastScanned.technicianName && (
                  <span>
                    الفني: <b>{lastScanned.technicianName}</b>
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 font-mono">
              سجل المسح في هذه الجلسة ({scanHistory.length})
            </h4>
            {scanHistory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 border dark:border-gray-800 rounded-lg">
                لم يتم مسح أي حالة بعد في هذه الجلسة
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs tabular-nums">
                {scanHistory.map((sh, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg flex items-center justify-between border ${
                      sh.success
                        ? "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                        {sh.caseNumber || sh.code}
                      </span>
                      <span className="text-gray-400 font-mono">{sh.time}</span>
                      {sh.error && <span className="text-red-500 font-medium">({sh.error})</span>}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sh.success
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {sh.newStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium"
          >
            إغلاق المحطة
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalCaseKioskScannerModal;
