import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ScanLine, RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { scanKioskBarcode } from "../shared";

interface DentalTechKioskTabProps {
  onSuccessScan?: () => Promise<void>;
  onBackToBench?: () => void;
}

export const DentalTechKioskTab: React.FC<DentalTechKioskTabProps> = ({
  onSuccessScan,
  onBackToBench,
}) => {
  const [kioskInput, setKioskInput] = useState("");
  const [kioskLoading, setKioskLoading] = useState(false);
  const [kioskResult, setKioskResult] = useState<any | null>(null);
  const kioskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    kioskInputRef.current?.focus();
  }, []);

  const handleKioskScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = kioskInput.trim();
    if (!barcode) return;
    setKioskLoading(true);
    setKioskResult(null);
    try {
      const res = await scanKioskBarcode({ barcode });
      setKioskResult(res);
      toast.success((res as any)?.message || "تم تسجيل ونقل الحالة بنجاح");
      setKioskInput("");
      if (onSuccessScan) {
        await onSuccessScan();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر قراءة الباركود أو تحديث الحالة");
    } finally {
      setKioskLoading(false);
      setTimeout(() => kioskInputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 py-4">
      {onBackToBench && (
        <button
          onClick={onBackToBench}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>العودة لطاولة الحالات</span>
        </button>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs text-center space-y-4">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
          <ScanLine className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            محطة المسح السريع بالباركود
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            وجّه قارئ الباركود نحو تيكيت الحالة أو اكتب كود الحالة ثم اضغط Enter لنقلها لمرحلتك فوراً
          </p>
        </div>

        <form onSubmit={handleKioskScan} className="max-w-md mx-auto space-y-3">
          <div className="relative">
            <input
              ref={kioskInputRef}
              type="text"
              value={kioskInput}
              onChange={(e) => setKioskInput(e.target.value)}
              placeholder="امسح الباركود أو اكتب رقم الحالة..."
              className="w-full text-center text-sm sm:text-base font-mono py-3 px-4 rounded-xl border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 outline-hidden"
              disabled={kioskLoading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!kioskInput.trim() || kioskLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {kioskLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            <span>تسجيل واستلام الحالة</span>
          </button>
        </form>

        {kioskResult && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-right space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تمت العملية بنجاح!</span>
            </div>
            {kioskResult.case && (
              <div className="text-gray-700 dark:text-gray-300 space-y-1">
                <p>
                  رقم الحالة: <b>#{kioskResult.case.caseNumber}</b>
                </p>
                <p>
                  المرحلة الحالية: <b>{kioskResult.nextStatus || kioskResult.case.status}</b>
                </p>
                <p>
                  الطبيب: <b>{kioskResult.case.doctor?.name || "—"}</b>
                </p>
              </div>
            )}
            {kioskResult.case?.id && (
              <div className="pt-2">
                <Link
                  to={`/dental-lab/cases/${kioskResult.case.id}`}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  فتح تفاصيل الحالة كاملة ←
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DentalTechKioskTab;
