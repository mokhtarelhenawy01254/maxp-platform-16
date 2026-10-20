import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import type { FinancialPostingItem, TreasuryAccount, FinancialPoliciesState } from '../types';

export function useDentalFinancialPolicies() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [treasuries, setTreasuries] = useState<TreasuryAccount[]>([]);
  const [pendingPostings, setPendingPostings] = useState<FinancialPostingItem[]>([]);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const [financialPolicies, setFinancialPolicies] = useState<FinancialPoliciesState>({
    defaultTreasuryId: '',
    postings: {
      caseInvoice: 'CONFIRM',
      supplierPayment: 'CONFIRM',
      technicianPayout: 'CONFIRM',
      caseBomConsumption: 'CONFIRM',
      outsourceExpense: 'CONFIRM',
    },
    autoEnabledAt: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, treRes, postRes] = await Promise.all([
        apiClient.get('/dental-lab/policies'),
        apiClient.get('/treasury/accounts').catch(() => ({ data: [] })),
        apiClient.get('/dental-lab/financial/postings/pending').catch(() => ({ data: { data: [] } })),
      ]);

      if (polRes.data?.data?.financial) {
        setFinancialPolicies(prev => ({
          ...prev,
          ...polRes.data.data.financial,
          postings: { ...prev.postings, ...(polRes.data.data.financial.postings || {}) },
        }));
      }

      const tList = Array.isArray(treRes.data?.accounts)
        ? treRes.data.accounts
        : Array.isArray(treRes.data)
        ? treRes.data
        : [];
      setTreasuries(tList);

      const pList = Array.isArray(postRes.data?.data) ? postRes.data.data : [];
      setPendingPostings(pList);
    } catch (err) {
      console.warn('Error loading financial settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSavePolicies = async () => {
    setSaving(true);
    try {
      await apiClient.put('/dental-lab/policies', { financial: financialPolicies });
      alert('تم حفظ إعدادات الطبقة المالية بنجاح');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      alert(errorObj?.response?.data?.error || 'حدث خطأ في حفظ السياسات المالية');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPosting = async (id: string) => {
    setActionBusyId(id);
    try {
      await apiClient.post(`/dental-lab/financial/postings/${id}/confirm`, {
        treasuryAccountId: financialPolicies.defaultTreasuryId || undefined,
      });
      setPendingPostings(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      alert(errorObj?.response?.data?.error || 'فشل تأكيد الترحيل');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleVoidPosting = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الترحيل المالي؟')) return;
    setActionBusyId(id);
    try {
      await apiClient.post(`/dental-lab/financial/postings/${id}/void`, { reason: 'إلغاء يدوي من الإعدادات' });
      setPendingPostings(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      alert(errorObj?.response?.data?.error || 'فشل إلغاء الترحيل');
    } finally {
      setActionBusyId(null);
    }
  };

  const isGracePeriodActive = Boolean(
    financialPolicies.autoEnabledAt &&
      Date.now() - new Date(financialPolicies.autoEnabledAt).getTime() < 7 * 24 * 60 * 60 * 1000
  );

  return {
    loading,
    saving,
    treasuries,
    pendingPostings,
    actionBusyId,
    financialPolicies,
    setFinancialPolicies,
    handleSavePolicies,
    handleConfirmPosting,
    handleVoidPosting,
    isGracePeriodActive,
  };
}
