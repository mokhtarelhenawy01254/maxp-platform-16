import React from "react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PlusIcon,
  GlobeAltIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { Settings } from "../types";

interface ConnectionStatusProps {
  settingsList: Settings[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDisconnect: (id: string) => void;
  loading: boolean;
  onSync: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  settingsList,
  selectedId,
  onSelect,
  onDisconnect,
  loading,
  onSync,
}) => {
  // If no sites connected, show a welcoming CTA
  if (settingsList.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 text-center animate-fadeIn shadow-xl shadow-purple-500/5">
        <div className="mx-auto w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex items-center justify-center mb-4">
          <GlobeAltIcon className="h-8 w-8 text-purple-600 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          ابدأ بربط متجرك الآن
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          اربط متجر WooCommerce الخاص بك لمزامنة المنتجات، الطلبات، والمخزون
          بشكل تلقائي وسلس.
        </p>
        <div className="flex justify-center">
          <button
            onClick={() => onSelect('new')}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/30 flex items-center gap-2 hover:scale-105 transition-transform active:scale-95"
          >
            <PlusIcon className="h-5 w-5" />
            إضافة موقع جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      {settingsList.map((site) => {
        const isActive = site.id === selectedId;
        return (
          <div
            key={site.id}
            onClick={() => onSelect(site.id)}
            className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-xl ${isActive
                ? "bg-white dark:bg-gray-800 border-purple-500 shadow-purple-500/10 ring-4 ring-purple-500/5"
                : "bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${site.hasCredentials
                      ? "bg-green-100 text-green-600"
                      : "bg-yellow-100 text-yellow-600"
                    }`}
                >
                  <GlobeAltIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white truncate">
                      {site.storeUrl}
                    </p>
                    {site.hasCredentials ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {isActive
                      ? "الموقع النشط حالياً"
                      : "اضغط للتبديل لهذا الموقع"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisconnect(site.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="حذف الربط"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-2">
                {site.syncEnabled && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-lg flex items-center gap-1 uppercase tracking-wider">
                    <BoltIcon className="h-3 w-3" />
                    المزامنة مفعلة
                  </span>
                )}
                {site.webhookEnabled && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    Webhook
                  </span>
                )}
              </div>

              {isActive && site.hasCredentials && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSync();
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowPathIcon className="h-4 w-4" />
                  )}
                  مزامنة الآن
                </button>
              )}
            </div>

            {isActive && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 rounded-full border-4 border-gray-50 dark:border-gray-900 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              </div>
            )}
          </div>
        );
      })}

      {/* Add New Connection Placeholder */}
      {settingsList.length > 0 && (
        <div
          className="group border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center p-6 hover:border-purple-400/50 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all cursor-pointer min-h-[140px]"
          onClick={() => onSelect("new")}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors flex items-center justify-center mb-2">
            <PlusIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-gray-500 group-hover:text-purple-600 transition-colors">
            إضافة متجر جديد
          </p>
        </div>
      )}
    </div>
  );
};
