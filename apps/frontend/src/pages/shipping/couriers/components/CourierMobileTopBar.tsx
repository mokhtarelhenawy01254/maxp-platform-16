import React from 'react';
import { DeliveryRun, DeliveryRunItem } from '../../../../services/courierService';

interface CourierMobileTopBarProps {
  run: DeliveryRun;
  allShipments: DeliveryRunItem[];
  deliveredShipments: DeliveryRunItem[];
  returnedShipments: DeliveryRunItem[];
  pendingShipments: DeliveryRunItem[];
  activeTab: 'pending' | 'delivered' | 'returned';
  setActiveTab: (tab: 'pending' | 'delivered' | 'returned') => void;
}

export const CourierMobileTopBar: React.FC<CourierMobileTopBarProps> = ({
  run,
  allShipments,
  deliveredShipments,
  returnedShipments,
  pendingShipments,
  activeTab,
  setActiveTab,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">مأمورية توصيل</div>
          <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">{run.runNumber}</div>
        </div>
        <div className="text-left">
          <div className="text-[11px] text-slate-400 font-medium">كابتن التوصيل</div>
          <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{run.courier?.name}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>نسبة إنجاز المأمورية</span>
          <span className="tabular-nums font-mono font-semibold">
            {deliveredShipments.length} من {allShipments.length} طرد
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${allShipments.length ? (deliveredShipments.length / allShipments.length) * 100 : 0}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-300"
            style={{ width: `${allShipments.length ? (returnedShipments.length / allShipments.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="grid grid-cols-3 gap-1 mt-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-1.5 rounded-md transition ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-slate-700 shadow-xs font-bold text-slate-900 dark:text-slate-100'
              : 'text-slate-500'
          }`}
        >
          المتبقي <span className="tabular-nums font-mono">({pendingShipments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('delivered')}
          className={`py-1.5 rounded-md transition ${
            activeTab === 'delivered'
              ? 'bg-white dark:bg-slate-700 shadow-xs font-bold text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500'
          }`}
        >
          تم <span className="tabular-nums font-mono">({deliveredShipments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('returned')}
          className={`py-1.5 rounded-md transition ${
            activeTab === 'returned'
              ? 'bg-white dark:bg-slate-700 shadow-xs font-bold text-rose-600 dark:text-rose-400'
              : 'text-slate-500'
          }`}
        >
          مرتجع <span className="tabular-nums font-mono">({returnedShipments.length})</span>
        </button>
      </div>
    </div>
  );
};
