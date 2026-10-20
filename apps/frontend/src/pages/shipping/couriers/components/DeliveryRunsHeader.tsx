import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';

interface DeliveryRunsHeaderProps {
  onOpenCreateRun: () => void;
}

export const DeliveryRunsHeader: React.FC<DeliveryRunsHeaderProps> = ({ onOpenCreateRun }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
      <div>
        <div className="flex items-center gap-2">
          <Link to="/shipping/couriers" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            المناديب ←
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">رحلات التوزيع والمانيفست الميداني</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          إصدار أذون خروج الطرود، تتبع مأموريات المناديب، طباعة البوالص، ومطابقة تسليمات الميدان
        </p>
      </div>
      <div className="flex items-center flex-wrap gap-2">
        <button
          onClick={onOpenCreateRun}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition active:scale-95"
        >
          <PlusIcon className="w-4 h-4" />
          إنشاء مأمورية توزيع جديدة
        </button>
        <Link
          to="/orders/preparation"
          className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          صالة تجهيز الطلبات
        </Link>
        <Link
          to="/shipping/courier-settlements"
          className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition active:scale-95"
        >
          شاشة التوريد وتسوية الخزينة
        </Link>
      </div>
    </div>
  );
};
