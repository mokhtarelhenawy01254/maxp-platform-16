import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Building2, Phone, Mail, MapPin, 
  CreditCard, Calendar, Clock, PlusCircle, AlertCircle, RefreshCw 
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StatementEntry {
  date: string;
  type: 'OPENING_BALANCE' | 'INVOICE' | 'PAYMENT';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AgingBuckets {
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
}

interface SupplierDetailData {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  openingBalance: number;
  currentBalance: number;
  creditLimit?: number;
  isActive: boolean;
  aging: AgingBuckets;
  statement: StatementEntry[];
}

interface TreasuryAccount {
  id: string;
  name: string;
  balance: number;
}

export default function SupplierDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SupplierDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    treasuryAccountId: '',
    notes: '',
  });

  const fetchSupplierDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/procurement/suppliers/${id}`);
      setSupplier(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذر تحميل بيانات المورد');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSupplierDetails();
  }, [fetchSupplierDetails]);

  const fetchTreasuries = async () => {
    try {
      const res = await apiClient.get('/treasury/accounts');
      const list = Array.isArray(res.data?.accounts) ? res.data.accounts : (Array.isArray(res.data) ? res.data : []);
      setTreasuryAccounts(list);
      if (list.length > 0 && !paymentForm.treasuryAccountId) {
        setPaymentForm(prev => ({ ...prev, treasuryAccountId: list[0].id }));
      }
    } catch (err) {
      console.warn('Could not load treasury accounts:', err);
    }
  };

  const handleOpenPayment = () => {
    fetchTreasuries();
    setPaymentForm({
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      treasuryAccountId: treasuryAccounts[0]?.id || '',
      notes: '',
    });
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    setSubmittingPayment(true);
    try {
      await apiClient.post('/procurement/supplier-payments', {
        supplierId: id,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        treasuryAccountId: paymentForm.treasuryAccountId || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPaymentModalOpen(false);
      await fetchSupplierDetails();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold">{error || 'المورد غير موجود'}</h2>
        <Button variant="outline" onClick={() => navigate('/procurement/suppliers')}>
          العودة لقائمة الموردين
        </Button>
      </div>
    );
  }

  const { aging, statement } = supplier;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/procurement/suppliers')}
            className="rounded-full"
          >
            <ArrowRight className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{supplier.name}</h1>
              <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                {supplier.isActive ? 'نشط' : 'معطل'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              كشف الحساب وتفاصيل المديونية وأعمار الديون
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenPayment} className="gap-2">
            <PlusCircle className="size-4" />
            تسجيل دفعة
          </Button>
        </div>
      </div>

      {/* Supplier Info & Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Info Card */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2 text-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">بيانات المورد</div>
          {supplier.contactPerson && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="size-4 shrink-0" />
              <span>المسؤول: {supplier.contactPerson}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4 shrink-0" />
              <span className="tabular-nums">{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              <span>{supplier.email}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>{supplier.address}</span>
            </div>
          )}
        </div>

        {/* Opening Balance */}
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">الرصيد الافتتاحي</span>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {(supplier.openingBalance || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ج.م</span>
          </div>
          <span className="text-xs text-muted-foreground mt-1">الرصيد عند بدء التعامل بالنظام</span>
        </div>

        {/* Current Balance */}
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col justify-between border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">الرصيد الحالي المستحق</span>
          <div className={`mt-2 text-2xl font-bold tabular-nums ${supplier.currentBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {(supplier.currentBalance || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ج.م</span>
          </div>
          <span className="text-xs text-muted-foreground mt-1">
            {supplier.currentBalance > 0 ? 'مستحق للمورد' : 'لا توجد مستحقات'}
          </span>
        </div>
      </div>

      {/* Debt Aging Grid (P3 Spec) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Clock className="size-4" /> أعمار الديون (Aging)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/50 bg-card/60 p-3">
            <span className="text-xs text-muted-foreground">1 - 30 يوم</span>
            <div className="text-lg font-semibold tabular-nums mt-1">
              {(aging?.days1To30 || 0).toLocaleString()} ج.م
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/60 p-3">
            <span className="text-xs text-muted-foreground">31 - 60 يوم</span>
            <div className="text-lg font-semibold tabular-nums mt-1 text-amber-500">
              {(aging?.days31To60 || 0).toLocaleString()} ج.م
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/60 p-3">
            <span className="text-xs text-muted-foreground">61 - 90 يوم</span>
            <div className="text-lg font-semibold tabular-nums mt-1 text-orange-500">
              {(aging?.days61To90 || 0).toLocaleString()} ج.م
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/60 p-3">
            <span className="text-xs text-muted-foreground">+90 يوم</span>
            <div className="text-lg font-semibold tabular-nums mt-1 text-rose-500">
              {(aging?.days90Plus || 0).toLocaleString()} ج.م
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Statement Table (P3 Spec) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Calendar className="size-4" /> كشف الحساب الزمني (Running Balance)
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {statement?.length || 0} حركة
          </span>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase border-b border-border/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">النوع</th>
                  <th className="px-4 py-3 font-semibold">المرجع</th>
                  <th className="px-4 py-3 font-semibold">البيان</th>
                  <th className="px-4 py-3 font-semibold text-left">مدين (فواتير)</th>
                  <th className="px-4 py-3 font-semibold text-left">دائن (سدادات)</th>
                  <th className="px-4 py-3 font-semibold text-left">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {(!statement || statement.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      لا توجد حركات مسجلة لهذا المورد حتى الآن
                    </td>
                  </tr>
                ) : (
                  statement.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-xs">
                        {entry.date ? new Date(entry.date).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {entry.type === 'INVOICE' && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                            فاتورة مشتريات
                          </Badge>
                        )}
                        {entry.type === 'PAYMENT' && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                            دفعة نقدية
                          </Badge>
                        )}
                        {entry.type === 'OPENING_BALANCE' && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                            رصيد افتتاحي
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs font-mono">
                        {entry.reference || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate text-muted-foreground">
                        {entry.description || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-left font-medium">
                        {entry.debit > 0 ? `${entry.debit.toLocaleString()} ج.م` : '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-left font-medium text-emerald-500">
                        {entry.credit > 0 ? `${entry.credit.toLocaleString()} ج.م` : '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-left font-bold">
                        {entry.balance.toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Payment Dialog (P3 Spec) */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة للمورد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <Label htmlFor="pay-amount">المبلغ (ج.م) *</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={paymentForm.amount}
                onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="أدخل قيمة الدفعة"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pay-date">تاريخ الدفع *</Label>
                <Input
                  id="pay-date"
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={e => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="pay-method">طريقة الدفع *</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={val => setPaymentForm(prev => ({ ...prev, paymentMethod: val }))}
                >
                  <SelectTrigger id="pay-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">نقدي</SelectItem>
                    <SelectItem value="BANK_TRANSFER">تحويل بنكي</SelectItem>
                    <SelectItem value="CHECK">شيك</SelectItem>
                    <SelectItem value="VODAFONE_CASH">محفظة إلكترونية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {treasuryAccounts.length > 0 && (
              <div>
                <Label htmlFor="pay-treasury">الخزينة المسحوب منها *</Label>
                <Select
                  value={paymentForm.treasuryAccountId}
                  onValueChange={val => setPaymentForm(prev => ({ ...prev, treasuryAccountId: val }))}
                >
                  <SelectTrigger id="pay-treasury">
                    <SelectValue placeholder="اختر الخزينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {treasuryAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance.toLocaleString()} ج.م)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="pay-notes">ملاحظات</Label>
              <Textarea
                id="pay-notes"
                rows={2}
                value={paymentForm.notes}
                onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="رقم الشيك أو رقم التحويل البنكي أو أي تفاصيل..."
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submittingPayment}>
                {submittingPayment ? 'جاري التسجيل...' : 'تأكيد السداد'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
