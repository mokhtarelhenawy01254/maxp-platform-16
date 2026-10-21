import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/apiClient';
import { envConfig } from '../../../config/environment';
import { type ShippingCompany } from '../types';
import { useShippingCompanyForm } from './useShippingCompanyForm';

export const useShippingCompaniesData = () => {
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { all: 'true' };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (modeFilter !== 'ALL') params.integrationMode = modeFilter;

      const res = await apiClient.get('/shipping-companies', { params });
      if (res.data?.success) {
        setCompanies(res.data.data || []);
      }
    } catch (err: unknown) {
      console.error('Failed to load shipping companies:', err);
      toast.error('تعذر تحميل قائمة شركات الشحن');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, modeFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const formOps = useShippingCompanyForm(fetchCompanies);

  const handleToggleActive = async (company: ShippingCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(company.id);
    try {
      const res: any = await apiClient.patch(`/shipping-companies/${company.id}/toggle`, {
        isActive: !company.isActive,
      });
      if (res.data?.success) {
        toast.success(
          company.isActive ? `تم إيقاف ${company.name}` : `تم تفعيل ${company.name} للعمل`
        );
        await fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'حدث خطأ أثناء تغيير الحالة');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (company: ShippingCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف شركة الشحن "${company.name}"؟`)) {
      try {
        const res: any = await apiClient.delete(`/shipping-companies/${company.id}`);
        if (res.data?.success) {
          toast.success('تم حذف شركة الشحن بنجاح');
          await fetchCompanies();
        } else {
          toast.error(res.data?.error || 'فشل الحذف');
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'تعذر الحذف');
      }
    }
  };

  const displayedCompanies = useMemo(() => {
    const seenStandardKeys = new Set<string>();
    const result: ShippingCompany[] = [];

    const priorityWeight = (item: ShippingCompany) => {
      if (item.providerKey === 'QP_EXPRESS') return 1;
      if (item.providerKey === 'BOSTA') return 2;
      if (item.providerKey === 'TURBO') return 3;
      return 10;
    };

    const sorted = [...companies].sort((a, b) => {
      const diff = priorityWeight(a) - priorityWeight(b);
      if (diff !== 0) return diff;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    for (const c of sorted) {
      if (c.providerKey && ['QP_EXPRESS', 'BOSTA', 'TURBO'].includes(c.providerKey)) {
        if (seenStandardKeys.has(c.providerKey)) continue;
        seenStandardKeys.add(c.providerKey);
      }
      result.push(c);
    }

    return result;
  }, [companies]);

  const copyWebhookUrl = () => {
    const webhookUrl = `${envConfig.backendUrl}/api/v1/shipments/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success('تم نسخ رابط الـ Webhook');
  };

  const stats = useMemo(() => {
    const total = displayedCompanies.length;
    const active = displayedCompanies.filter((c) => c.isActive).length;
    const live = displayedCompanies.filter((c) => c.integrationMode === 'LIVE').length;
    const manual = displayedCompanies.filter(
      (c) => c.integrationMode === 'MANUAL' || !c.integrationMode
    ).length;
    return { total, active, live, manual };
  }, [displayedCompanies]);

  return {
    companies,
    displayedCompanies,
    loading,
    viewMode,
    setViewMode,
    togglingId,
    testingConnection: formOps.testingConnection,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    modeFilter,
    setModeFilter,
    showModal: formOps.showModal,
    setShowModal: formOps.setShowModal,
    editingCompany: formOps.editingCompany,
    showAdvanced: formOps.showAdvanced,
    setShowAdvanced: formOps.setShowAdvanced,
    testedProfile: formOps.testedProfile,
    formData: formOps.formData,
    setFormData: formOps.setFormData,
    stats,
    fetchCompanies,
    handleToggleActive,
    handleTestConnection: formOps.handleTestConnection,
    handleOpenSettings: formOps.handleOpenSettings,
    handleOpenNewModal: formOps.handleOpenNewModal,
    handleSubmit: formOps.handleSubmit,
    handleDelete,
    copyWebhookUrl,
  };
};
