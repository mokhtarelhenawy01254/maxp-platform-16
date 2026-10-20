import { useNavigate } from "react-router-dom";

export function DashboardQuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          إجراءات سريعة
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          وصول فوري لأهم شاشات الإنتاج والتشغيل في المعمل
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/dental-lab/cases?new=1")}
            className="p-3 text-right rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-semibold transition-colors"
          >
            إنشاء أمر شغل جديد
          </button>
          <button
            type="button"
            onClick={() => navigate("/dental-lab/cases?tab=OVERDUE")}
            className="p-3 text-right rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-semibold transition-colors"
          >
            متابعة الحالات المتأخرة
          </button>
          <button
            type="button"
            onClick={() => navigate("/dental-lab/cases?kiosk=1")}
            className="p-3 text-right rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100/60 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs font-semibold transition-colors"
          >
            محطة مسح الباركود Kiosk
          </button>
          <button
            type="button"
            onClick={() => navigate("/dental-lab/invoices")}
            className="p-3 text-right rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors"
          >
            إصدار وتحصيل الفواتير
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardQuickActions;
