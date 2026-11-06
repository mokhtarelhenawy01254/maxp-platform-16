import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  ShippingServiceItem,
  formatServiceAmount,
} from './shippingServicesTypes';
import { ServiceFormModal } from './ServiceFormModal';

interface ExtraServicesTabProps {
  authHeaders: Record<string, string>;
  isEn?: boolean;
}

export const ExtraServicesTab: React.FC<ExtraServicesTabProps> = ({ authHeaders, isEn }) => {
  const [services, setServices] = useState<ShippingServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliesFilter, setAppliesFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ShippingServiceItem | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (appliesFilter !== 'ALL') params.append('appliesTo', appliesFilter);
      if (statusFilter !== 'ALL') params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

      const res = await fetch(`/api/v1/shipping-portal/services?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setServices(data.data || []);
      } else {
        toast.error(data.message || (isEn ? 'Failed to fetch services' : 'فشل في جلب الخدمات الإضافية'));
      }
    } catch {
      toast.error(isEn ? 'Network error' : 'خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, search, appliesFilter, statusFilter, isEn]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleToggleActive = async (svc: ShippingServiceItem) => {
    try {
      if (svc.isActive) {
        const confirmDeactivate = window.confirm(
          isEn ? `Are you sure you want to deactivate "${svc.name}"?` : `هل أنت متأكد من تعطيل الخدمة "${svc.name}"؟`
        );
        if (!confirmDeactivate) return;
        const res = await fetch(`/api/v1/shipping-portal/services/${svc.id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        const data = await res.json();
        if (data.success) {
          toast.success(isEn ? 'Service deactivated' : 'تم تعطيل الخدمة بنجاح');
          fetchServices();
        } else {
          toast.error(data.message || (isEn ? 'Failed to deactivate' : 'فشل في تعطيل الخدمة'));
        }
      } else {
        const res = await fetch(`/api/v1/shipping-portal/services/${svc.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ isActive: true }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(isEn ? 'Service activated' : 'تم تفعيل الخدمة بنجاح');
          fetchServices();
        } else {
          toast.error(data.message || (isEn ? 'Failed to activate' : 'فشل في تفعيل الخدمة'));
        }
      }
    } catch {
      toast.error(isEn ? 'Network error' : 'خطأ في الاتصال بالخادم');
    }
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? 'Search service code or name...' : 'ابحث بالاسم أو كود الخدمة...'}
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={appliesFilter}
            onChange={(e) => setAppliesFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">{isEn ? 'All Applications' : 'كافة النطاقات'}</option>
            <option value="SHIPMENT">{isEn ? 'Per Shipment' : 'على الشحنة'}</option>
            <option value="ORDER">{isEn ? 'Per Order' : 'على الطلب'}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">{isEn ? 'All Statuses' : 'جميع الحالات'}</option>
            <option value="ACTIVE">{isEn ? 'Active Only' : 'المفعلة فقط'}</option>
            <option value="INACTIVE">{isEn ? 'Inactive Only' : 'المعطلة فقط'}</option>
          </select>
          <button
            onClick={() => fetchServices()}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isEn ? 'Refresh' : 'تحديث'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button
          onClick={() => {
            setSelectedService(null);
            setIsModalOpen(true);
          }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isEn ? 'Add Extra Service' : 'إضافة خدمة جديدة'}</span>
        </button>
      </div>

      {/* Services Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5 font-medium">{isEn ? 'Code' : 'كود الخدمة'}</th>
                <th className="p-2.5 font-medium">{isEn ? 'Service Name' : 'اسم الخدمة'}</th>
                <th className="p-2.5 font-medium">{isEn ? 'Pricing Mode' : 'نمط التسعير'}</th>
                <th className="p-2.5 font-medium text-left">{isEn ? 'Fee / Amount' : 'الرسوم'}</th>
                <th className="p-2.5 font-medium">{isEn ? 'Applies To' : 'نطاق التطبيق'}</th>
                <th className="p-2.5 font-medium">{isEn ? 'Status' : 'الحالة'}</th>
                <th className="p-2.5 font-medium text-center">{isEn ? 'Actions' : 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    {isEn ? 'Loading services...' : 'جارٍ تحميل الخدمات الإضافية...'}
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    {isEn ? 'No extra services configured' : 'لا توجد خدمات إضافية مطابقة'}
                  </td>
                </tr>
              ) : (
                services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {svc.code}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">{svc.name}</div>
                      {svc.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1">{svc.description}</div>
                      )}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {svc.pricingMode === 'PERCENT'
                          ? isEn ? 'Percentage %' : 'نسبة مئوية'
                          : isEn ? 'Fixed Amount' : 'قيمة ثابتة'}
                      </span>
                    </td>
                    <td className="p-2.5 text-left font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatServiceAmount(svc.pricingMode, svc.amount)}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {svc.appliesTo === 'SHIPMENT'
                          ? isEn ? 'Shipment' : 'الشحنة'
                          : isEn ? 'Order' : 'الطلب'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          svc.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {svc.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {isEn ? 'Active' : 'مفعلة'}
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            {isEn ? 'Inactive' : 'معطلة'}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedService(svc);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={isEn ? 'Edit' : 'تعديل'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(svc)}
                          className={`p-1 rounded transition-colors ${
                            svc.isActive
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                          }`}
                          title={svc.isActive ? (isEn ? 'Deactivate' : 'تعطيل') : (isEn ? 'Activate' : 'تفعيل')}
                        >
                          {svc.isActive ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ServiceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={selectedService}
        authHeaders={authHeaders}
        onSuccess={fetchServices}
        isEn={isEn}
      />
    </div>
  );
};
