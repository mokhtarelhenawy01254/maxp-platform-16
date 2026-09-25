import React, { useEffect, useState } from 'react';
import { 
  DollarSign, ShieldCheck, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, Save, ArrowDownLeft, ArrowUpRight, Clock, Building2 
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface FinancialPostingItem {
  id: string;
  sourceType: string;
  sourceId: string;
  account: string;
  direction: 'INCOME' | 'EXPENSE';
  amount: number;
  status: 'PENDING' | 'POSTED' | 'VOID';
  partyName?: string;
  notes?: string;
  createdAt: string;
}

export default function DentalFinancialPoliciesSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [pendingPostings, setPendingPostings] = useState<FinancialPostingItem[]>([]);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const [financialPolicies, setFinancialPolicies] = useState({
    defaultTreasuryId: '',
    postings: {
      caseInvoice: 'CONFIRM',
      supplierPayment: 'CONFIRM',
      technicianPayout: 'CONFIRM',
      caseBomConsumption: 'CONFIRM',
      outsourceExpense: 'CONFIRM',
    },
    autoEnabledAt: null as string | null,
  });

  const loadData = async () => {
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

      const tList = Array.isArray(treRes.data?.accounts) ? treRes.data.accounts : (Array.isArray(treRes.data) ? treRes.data : []);
      setTreasuries(tList);

      const pList = Array.isArray(postRes.data?.data) ? postRes.data.data : [];
      setPendingPostings(pList);
    } catch (err) {
      console.warn('Error loading financial settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePolicies = async () => {
    setSaving(true);
    try {
      await apiClient.put('/dental-lab/policies', { financial: financialPolicies });
      alert('تم حفظ إعدادات الطبقة المالية بنجاح');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'حدث خطأ في حفظ السياسات المالية');
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
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل تأكيد الترحيل');
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
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل إلغاء الترحيل');
    } finally {
      setActionBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate 7-day grace period status
  const isGracePeriodActive = financialPolicies.autoEnabledAt && (
    Date.now() - new Date(financialPolicies.autoEnabledAt).getTime() < 7 * 24 * 60 * 60 * 1000
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="size-5 text-emerald-500" />
            الطبقة المالية والترحيل الموحّد (Financial Posting)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ربط ومزامنة فواتير الحالات وسدادات الموردين ومستحقات الفنيين وتكاليف الأوت سورس مع الخزينة
          </p>
        </div>
        <Button size="sm" onClick={handleSavePolicies} disabled={saving} className="gap-1.5">
          {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          حفظ إعدادات الترحيل
        </Button>
      </div>

      {/* Safety Guard 7-Day Grace Banner (Spec P1 / P9) */}
      {isGracePeriodActive && (
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex items-center gap-3">
          <ShieldCheck className="size-5 text-blue-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-blue-700 dark:text-blue-300">
              فترة الأمان التجريبية (Grace Period) مفعّلة حالياً
            </span>
            <p className="text-muted-foreground mt-0.5">
              تم تحويل بعض الأوضاع إلى AUTO. بحسب معايير الأمان المالية، تخضع الحركات أول 7 أيام لوضع CONFIRM (موافقة بنقرة واحدة) للتأكد من استقرار الأرقام قبل الترحيل الآلي الكامل.
            </p>
          </div>
        </div>
      )}

      {/* Default Treasury Account Selection */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          الخزينة الافتراضية للمعاملات
        </h3>
        <div className="max-w-md">
          <Label className="text-xs">اختر الخزينة / الحساب البنكي الافتراضي</Label>
          <select
            className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-2"
            value={financialPolicies.defaultTreasuryId}
            onChange={(e) => setFinancialPolicies(p => ({ ...p, defaultTreasuryId: e.target.value }))}
          >
            <option value="">خزينة المعمل الافتراضية</option>
            {treasuries.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({Number(acc.balance || 0).toLocaleString()} ج.م)
              </option>
            ))}
          </select>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            الحساب الذي تُرحل إليه تحصيلات الحالات وتُخصم منه مصروفات التشغيل
          </span>
        </div>
      </div>

      {/* Posting Modes Grid */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-500" />
          أوضاع ترحيل المعاملات (Posting Modes)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {/* 1. Case Invoices */}
          <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
            <span className="font-semibold text-xs block">فواتير الحالات (Case Invoices)</span>
            <select
              className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
              value={financialPolicies.postings.caseInvoice}
              onChange={(e) => setFinancialPolicies(p => ({
                ...p,
                postings: { ...p.postings, caseInvoice: e.target.value }
              }))}
            >
              <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
              <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
              <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">ترحيل إيرادات الحالات المسددة للخزينة</p>
          </div>

          {/* 2. Supplier Payments */}
          <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
            <span className="font-semibold text-xs block">سداد دفعات الموردين (Suppliers)</span>
            <select
              className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
              value={financialPolicies.postings.supplierPayment}
              onChange={(e) => setFinancialPolicies(p => ({
                ...p,
                postings: { ...p.postings, supplierPayment: e.target.value }
              }))}
            >
              <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
              <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
              <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">خصم مدفوعات الخامات والمشتريات من الخزينة</p>
          </div>

          {/* 3. Technician Payouts */}
          <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
            <span className="font-semibold text-xs block">صرف أجور الفنيين (Technician Payouts)</span>
            <select
              className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
              value={financialPolicies.postings.technicianPayout}
              onChange={(e) => setFinancialPolicies(p => ({
                ...p,
                postings: { ...p.postings, technicianPayout: e.target.value }
              }))}
            >
              <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
              <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
              <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">تسجيل سداد مستحقات الفني كمصروف خزينة</p>
          </div>

          {/* 4. Case BOM Consumption */}
          <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
            <span className="font-semibold text-xs block">خصم مخزون الوصفة الفنية (BOM)</span>
            <select
              className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
              value={financialPolicies.postings.caseBomConsumption}
              onChange={(e) => setFinancialPolicies(p => ({
                ...p,
                postings: { ...p.postings, caseBomConsumption: e.target.value }
              }))}
            >
              <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
              <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
              <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">خصم الخامات المستهلكة من المخزن وحساب تكلفتها</p>
          </div>

          {/* 5. Outsource Expenses */}
          <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
            <span className="font-semibold text-xs block">تكلفة التشغيل الخارجي (Outsource)</span>
            <select
              className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
              value={financialPolicies.postings.outsourceExpense}
              onChange={(e) => setFinancialPolicies(p => ({
                ...p,
                postings: { ...p.postings, outsourceExpense: e.target.value }
              }))}
            >
              <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
              <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
              <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">ترحيل تكاليف مراكز الميلنج والمعامل الخارجية</p>
          </div>
        </div>
      </div>

      {/* Pending Postings Review (P1 Acceptance Criterion) */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-500" />
            <h3 className="text-sm font-semibold">الحركات المالية المعلقة بانتظار التأكيد (Pending Postings)</h3>
          </div>
          <Badge variant="outline" className="tabular-nums text-xs">
            {pendingPostings.length} حركة معلقة
          </Badge>
        </div>

        {pendingPostings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            لا توجد حركات مالية معلقة بانتظار الاعتماد حالياً ✅
          </p>
        ) : (
          <div className="border border-border/40 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/30">
                <tr>
                  <th className="p-2.5">التاريخ</th>
                  <th className="p-2.5">نوع الحركة</th>
                  <th className="p-2.5">الجهة / الطرف</th>
                  <th className="p-2.5">الاتجاه</th>
                  <th className="p-2.5">المبلغ</th>
                  <th className="p-2.5">البيان</th>
                  <th className="p-2.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {pendingPostings.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/10">
                    <td className="p-2.5 tabular-nums">{new Date(p.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="p-2.5">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {p.sourceType}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-medium">{p.partyName || '—'}</td>
                    <td className="p-2.5">
                      {p.direction === 'INCOME' ? (
                        <span className="text-emerald-500 inline-flex items-center gap-1 font-bold">
                          <ArrowDownLeft className="size-3" /> وارد
                        </span>
                      ) : (
                        <span className="text-rose-500 inline-flex items-center gap-1 font-bold">
                          <ArrowUpRight className="size-3" /> منصرف
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-bold tabular-nums">{p.amount.toLocaleString()} ج.م</td>
                    <td className="p-2.5 max-w-xs truncate text-muted-foreground">{p.notes || '—'}</td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 gap-1"
                          disabled={actionBusyId === p.id}
                          onClick={() => handleConfirmPosting(p.id)}
                        >
                          <CheckCircle2 className="size-3" /> تأكيد الترحيل
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          disabled={actionBusyId === p.id}
                          onClick={() => handleVoidPosting(p.id)}
                        >
                          <XCircle className="size-3" /> إلغاء
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
