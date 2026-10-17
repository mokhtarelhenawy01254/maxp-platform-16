/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  TruckIcon,
  BoltIcon,
  UserIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../../../hooks/useCurrency";
import { ShippingCompany, CourierMode } from "./shippingCardTypes";

interface ShippingCarrierSelectorProps {
  order: any;
  courierMode: CourierMode;
  setCourierMode: (mode: CourierMode) => void;
  setIsManualCourier: (isManual: boolean) => void;
  turboCompany?: ShippingCompany;
  qpCompany?: ShippingCompany;
  bostaCompany?: ShippingCompany;
  customCompanies: ShippingCompany[];
  qpSettings: any;
  qpNotes: string;
  setQpNotes: (notes: string) => void;
  manualTracking: string;
  setManualTracking: (tracking: string) => void;
  manualNotes: string;
  setManualNotes: (notes: string) => void;
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  loading: boolean;
  onTurboDirectShipment: () => void;
  onQpExpressDirectShipment: () => void;
  onBostaDirectShipment: () => void;
  onCreateShipment: () => void;
}

export const ShippingCarrierSelector: React.FC<ShippingCarrierSelectorProps> = ({
  order,
  courierMode,
  setCourierMode,
  setIsManualCourier,
  turboCompany,
  qpCompany,
  bostaCompany,
  customCompanies,
  qpSettings,
  qpNotes,
  setQpNotes,
  manualTracking,
  setManualTracking,
  manualNotes,
  setManualNotes,
  selectedCompanyId,
  setSelectedCompanyId,
  loading,
  onTurboDirectShipment,
  onQpExpressDirectShipment,
  onBostaDirectShipment,
  onCreateShipment,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="space-y-4">
      {/* Active Carriers Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-medium">
        {turboCompany && (
          <button
            type="button"
            onClick={() => {
              setCourierMode("turbo");
              setIsManualCourier(false);
            }}
            className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
              courierMode === "turbo"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TruckIcon className="h-3.5 w-3.5 text-blue-500" />
            <span>تربو (Turbo)</span>
          </button>
        )}

        {qpCompany && (
          <button
            type="button"
            onClick={() => {
              setCourierMode("qp");
              setIsManualCourier(false);
            }}
            className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
              courierMode === "qp"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BoltIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>كيو بي (QP Express)</span>
          </button>
        )}

        {bostaCompany && (
          <button
            type="button"
            onClick={() => {
              setCourierMode("bosta");
              setIsManualCourier(false);
            }}
            className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
              courierMode === "bosta"
                ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TruckIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>بوستا (Bosta)</span>
          </button>
        )}

        {customCompanies.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCourierMode("custom");
              setIsManualCourier(false);
            }}
            className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
              courierMode === "custom"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TruckIcon className="h-3.5 w-3.5" />
            <span>الشركات المفعلة الأخرى</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setCourierMode("manual");
            setIsManualCourier(true);
          }}
          className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
            courierMode === "manual"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          <span>شحن يدوي / خاص</span>
        </button>
      </div>

      {/* 1. Turbo Direct Mode */}
      {courierMode === "turbo" && turboCompany && (
        <div className="p-3.5 rounded-lg border border-blue-100 dark:border-blue-950/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <TruckIcon className="h-4 w-4 text-blue-600" />
              إرسال فوري إلى شركة تربو (Turbo Courier)
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              الحساب مفعل وجاهز
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            سيتم إرسال بيانات العميل والمنتجات ومبلغ التحصيل (<span className="font-mono tabular-nums font-semibold">{formatPrice(order?.total || 0)}</span>) فوراً إلى حسابك لدى تربو وتوليد رقم التتبع وبوليصة الشحن.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={onTurboDirectShipment}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
            >
              <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
              <span>{loading ? "جاري الإرسال لتربو وتوليد البوليصة..." : "إرسال إلى شركة تربو وتوليد البوليصة"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. QP Express Direct Mode */}
      {courierMode === "qp" && qpCompany && (
        <div className="p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-900 dark:text-indigo-300">
              إرسال فوري إلى شركة كيو بي إكسبريس (QP Express)
            </span>
            {qpSettings?.customerId ? (
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                عميل رقم: #{qpSettings.customerId}
              </span>
            ) : (
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                متصل
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات المعاينة والتسليم للمندوب:
            </label>
            <input
              type="text"
              value={qpNotes}
              onChange={(e) => setQpNotes(e.target.value)}
              placeholder="مثال: المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={onQpExpressDirectShipment}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
            >
              <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
              <span>{loading ? "جاري الإرسال وتوليد البوليصة..." : "إرسال إلى كيو بي إكسبريس وتوليد البوليصة"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Bosta Direct Mode */}
      {courierMode === "bosta" && bostaCompany && (
        <div className="p-3.5 rounded-lg border border-amber-100 dark:border-amber-950/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-900 dark:text-amber-300">
              إرسال فوري إلى شركة بوستا (Bosta)
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              مفتاح الـ API مسجل
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            سيتم إرسال عنوان العميل، المحافظة، والمنتجات، ومبلغ التحصيل فوراً لتوليد بوليصة بوستا الرسمية (AWB).
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={onBostaDirectShipment}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
            >
              <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
              <span>{loading ? "جاري الإرسال وتوليد البوليصة..." : "إرسال إلى بوستا وتوليد البوليصة"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Other Active Custom Companies */}
      {courierMode === "custom" && customCompanies.length > 0 && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              اختر شركة الشحن
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {customCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.integrationMode ? `(${c.integrationMode})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={onCreateShipment}
              disabled={loading || !selectedCompanyId}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
            >
              <TruckIcon className="h-4 w-4" />
              <span>{loading ? "جاري إنشاء الشحنة..." : "إنشاء الشحنة وتسليم للشركة"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Manual Courier */}
      {courierMode === "manual" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                رقم البوليصة أو التتبع (اختياري)
              </label>
              <input
                type="text"
                placeholder="مثال: EXP-982341"
                value={manualTracking}
                onChange={(e) => setManualTracking(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                اسم المندوب أو ملاحظات التسليم
              </label>
              <input
                type="text"
                placeholder="اسم المندوب ورقم هاتفه"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={onCreateShipment}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
            >
              <TruckIcon className="h-4 w-4" />
              <span>{loading ? "جاري حفظ الشحنة..." : "حفظ بيانات الشحن اليدوي"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCarrierSelector;
