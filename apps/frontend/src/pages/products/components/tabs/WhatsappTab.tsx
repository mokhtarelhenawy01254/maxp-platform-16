import React from "react";
import { MegaphoneIcon } from "@heroicons/react/24/outline";

interface WhatsappTabProps {
  whatsappNotify: {
    enabled: boolean;
    audience: "all" | "withOrders" | "newCustomers" | "activeCustomers";
    templateName: string;
    customMessage: string;
  };
  setWhatsappNotify: React.Dispatch<React.SetStateAction<{
    enabled: boolean;
    audience: "all" | "withOrders" | "newCustomers" | "activeCustomers";
    templateName: string;
    customMessage: string;
  }>>;
}

export const WhatsappTab: React.FC<WhatsappTabProps> = ({
  whatsappNotify,
  setWhatsappNotify,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-3.5 sm:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
        <MegaphoneIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">حملة واتساب ترويجية</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">أرسل هذا المنتج لعملائك فور حفظه</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <div>
            <h4 className="font-bold text-indigo-900 dark:text-indigo-200">تفعيل الإرسال التلقائي</h4>
            <p className="text-sm text-indigo-700 dark:text-indigo-400">سيتم بدء الحملة مباشرة بعد الضغط على "حفظ المنتج"</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappNotify.enabled}
              onChange={(e) => setWhatsappNotify({ ...whatsappNotify, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {whatsappNotify.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">لمن تريد الإرسال؟</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  { id: 'all', label: 'كل العملاء', icon: '👥' },
                  { id: 'withOrders', label: 'أصحاب الطلبات', icon: '🛒' },
                  { id: 'newCustomers', label: 'العملاء الجدد', icon: '🆕' },
                  { id: 'activeCustomers', label: 'النشطون', icon: '🔥' }
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setWhatsappNotify({ ...whatsappNotify, audience: item.id })}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${whatsappNotify.audience === item.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">رسالة ترويجية (اختياري)</label>
              <textarea
                value={whatsappNotify.customMessage}
                onChange={(e) => setWhatsappNotify({ ...whatsappNotify, customMessage: e.target.value })}
                placeholder="اكتب رسالة مخصصة تظهر مع صورة المنتج وسعره..."
                className="w-full h-32 p-3 border-2 border-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:border-indigo-500 outline-none transition-all resize-none text-sm text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                * سيتم إدراج اسم العميل، اسم المنتج، والسعر تلقائياً في الرسالة.
              </p>
            </div>
          </div>
        )}

        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 flex gap-3">
          <div className="text-xl">💡</div>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            نصيحة: تأكد من أن جلسة الواتساب متصلة في صفحة الإشعارات قبل الحفظ لضمان بدء الحملة فوراً.
          </p>
        </div>
      </div>
    </div>
  );
};
