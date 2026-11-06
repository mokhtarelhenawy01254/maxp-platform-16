import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, PackageCheck, FileEdit, Sparkles } from 'lucide-react';
import { ExtraServicesTab } from './ExtraServicesTab';
import { OpenPackageRequestsTab } from './OpenPackageRequestsTab';
import { OrderChangeRequestsTab } from './OrderChangeRequestsTab';

export const ShippingServicesPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [activeTab, setActiveTab] = useState<'services' | 'open_package' | 'order_change'>('services');

  const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? window.localStorage.getItem('token') || window.localStorage.getItem('accessToken') || ''
    : '';

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };

  const tabs = [
    {
      id: 'services' as const,
      label: isEn ? 'Extra Services & Fees' : 'الخدمات والرسوم الإضافية',
      icon: Layers,
    },
    {
      id: 'open_package' as const,
      label: isEn ? 'Open Package Requests' : 'طلبات فتح الشحنة',
      icon: PackageCheck,
    },
    {
      id: 'order_change' as const,
      label: isEn ? 'Order Change Requests' : 'طلبات تعديل الأوردر',
      icon: FileEdit,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEn ? 'Extra Services & Change Requests' : 'الخدمات الإضافية والطلبات'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              SHIP-T3
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? 'Configure extra billing services, approve package inspection requests, and manage active order changes'
              : 'إدارة تسعير الخدمات الإضافية، واعتماد طلبات معاينة وفتح الشحنات، وإدارة طلبات تعديل الأوردرات'}
          </p>
        </div>
      </div>

      {/* Main Single-Surface Chassis */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 pt-3 flex items-center gap-2 overflow-x-auto bg-slate-50/50 dark:bg-slate-800/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'services' && (
            <ExtraServicesTab authHeaders={authHeaders} isEn={isEn} />
          )}
          {activeTab === 'open_package' && (
            <OpenPackageRequestsTab authHeaders={authHeaders} isEn={isEn} />
          )}
          {activeTab === 'order_change' && (
            <OrderChangeRequestsTab authHeaders={authHeaders} isEn={isEn} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingServicesPage;
