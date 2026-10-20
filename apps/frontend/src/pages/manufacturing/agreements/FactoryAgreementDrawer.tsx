import React, { useState, useEffect } from 'react';
import {
  X,
  FileSignature,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Trash2,
  Plus,
  Sparkles,
  Paperclip,
  Check,
  FileText,
  Upload,
} from 'lucide-react';
import {
  manufacturingApi,
  FactoryAgreement,
  FactoryAgreementPayment,
  FactoryAgreementFile,
} from '../manufacturingApi';

interface FactoryAgreementDrawerProps {
  agreementId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const FactoryAgreementDrawer: React.FC<FactoryAgreementDrawerProps> = ({
  agreementId,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [agreement, setAgreement] = useState<FactoryAgreement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'terms' | 'files'>('payments');

  // Payment creation modal
  const [showAddPaymentModal, setShowAddPaymentModal] = useState<boolean>(false);
  const [paymentLabel, setPaymentLabel] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDueDate, setPaymentDueDate] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Pay modal
  const [payingPayment, setPayingPayment] = useState<FactoryAgreementPayment | null>(null);
  const [payReference, setPayReference] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // File upload state
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  const fetchAgreement = async () => {
    if (!agreementId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await manufacturingApi.getFactoryAgreement(agreementId);
      setAgreement(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'تعذر تحميل بيانات الاتفاقية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && agreementId) {
      fetchAgreement();
    } else {
      setAgreement(null);
    }
  }, [isOpen, agreementId]);

  if (!isOpen) return null;

  // Activation handler
  const handleActivate = async () => {
    if (!agreement) return;
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.activateAgreement(agreement.id);
      await fetchAgreement();
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تفعيل الاتفاقية');
    } finally {
      setActionLoading(false);
    }
  };

  // Close agreement handler
  const handleCloseAgreement = async () => {
    if (!agreement) return;
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.closeAgreement(agreement.id);
      await fetchAgreement();
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل إغلاق الاتفاقية');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel agreement handler
  const handleCancelAgreement = async () => {
    if (!agreement) return;
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء هذه الاتفاقية؟')) return;
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.cancelAgreement(agreement.id);
      await fetchAgreement();
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل إلغاء الاتفاقية');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete draft handler
  const handleDeleteDraft = async () => {
    if (!agreement) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه المسودة نهائياً؟')) return;
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.deleteFactoryAgreement(agreement.id);
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل حذف المسودة');
      setActionLoading(false);
    }
  };

  // Generate 70/20/10 schedule
  const handleGenerateDefaultPayments = async () => {
    if (!agreement) return;
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.generateAgreementPayments(agreement.id);
      await fetchAgreement();
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل توليد جدول الدفعات');
    } finally {
      setActionLoading(false);
    }
  };

  // Add manual payment
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreement) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setError('يرجى إدخال مبلغ صحيح للدفعة');
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.createAgreementPayment(agreement.id, {
        label: paymentLabel.trim() || undefined,
        amount: Number(paymentAmount),
        dueDate: paymentDueDate || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      setShowAddPaymentModal(false);
      setPaymentLabel('');
      setPaymentAmount('');
      setPaymentDueDate('');
      setPaymentNotes('');
      await fetchAgreement();
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل إضافة الدفعة');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark payment as paid
  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreement || !payingPayment) return;
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.payAgreementPayment(agreement.id, payingPayment.id, {
        reference: payReference.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      setPayingPayment(null);
      setPayReference('');
      setPayNotes('');
      await fetchAgreement();
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تسجيل السداد');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel payment
  const handleCancelPayment = async (paymentId: string) => {
    if (!agreement) return;
    if (!window.confirm('هل أنت متأكد من إلغاء هذه الدفعة؟')) return;
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.cancelAgreementPayment(agreement.id, paymentId);
      await fetchAgreement();
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل إلغاء الدفعة');
    } finally {
      setActionLoading(false);
    }
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!agreement || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingFile(true);
      setError(null);
      await manufacturingApi.uploadAgreementFile(agreement.id, formData);
      await fetchAgreement();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل رفع الملف');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // File delete
  const handleDeleteFile = async (fileId: string) => {
    if (!agreement) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف؟')) return;
    try {
      setActionLoading(true);
      setError(null);
      await manufacturingApi.deleteAgreementFile(agreement.id, fileId);
      await fetchAgreement();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل حذف الملف');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background/80 backdrop-blur-sm">
      <div className="absolute inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl bg-card border-r border-border shadow-2xl flex flex-col">
          {/* Drawer Top Control Bar */}
          <div className="px-5 py-3.5 border-b border-border/70 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {agreement?.code || 'FA-....'}
                  </span>
                  {agreement && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        agreement.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : agreement.status === 'DRAFT'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : agreement.status === 'CLOSED'
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {agreement.status === 'ACTIVE'
                        ? 'نشطة (ACTIVE)'
                        : agreement.status === 'DRAFT'
                        ? 'مسودة (DRAFT)'
                        : agreement.status === 'CLOSED'
                        ? 'مغلقة (CLOSED)'
                        : 'ملغاة (CANCELLED)'}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
                  {agreement?.title || 'تفاصيل الاتفاقية'}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mx-5 mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drawer Quick Action Bar */}
          {agreement && (
            <div className="px-5 py-2.5 bg-muted/10 border-b border-border/50 flex items-center justify-between gap-2 overflow-x-auto text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span className="font-medium text-foreground">{agreement.partnerFactory?.name}</span>
                {agreement.order && (
                  <span className="text-muted-foreground font-mono">
                    • أمر تشغيل: {agreement.order.orderNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {agreement.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={handleActivate}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-transform active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تفعيل الاتفاقية
                    </button>
                    <button
                      onClick={handleDeleteDraft}
                      disabled={actionLoading}
                      className="px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف
                    </button>
                  </>
                )}

                {agreement.status === 'ACTIVE' && (
                  <button
                    onClick={handleCloseAgreement}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    إغلاق الاتفاقية
                  </button>
                )}

                {agreement.status !== 'CANCELLED' && agreement.status !== 'CLOSED' && (
                  <button
                    onClick={handleCancelAgreement}
                    disabled={actionLoading}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-muted/50 text-xs"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Financial Summary Bento Strip */}
          {agreement && (
            <div className="px-5 py-3 border-b border-border/60 bg-card grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-[11px] text-muted-foreground block">قيمة الاتفاقية:</span>
                <strong className="text-sm font-bold text-foreground font-mono tabular-nums">
                  {agreement.totalValue?.toLocaleString('en-US')} {agreement.currency}
                </strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  تسعير: {agreement.pricingMode}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-[11px] text-muted-foreground block">المسدد فعلياً:</span>
                <strong className="text-sm font-bold text-emerald-600 font-mono tabular-nums">
                  {agreement.paidAmount?.toLocaleString('en-US')} {agreement.currency}
                </strong>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                  {agreement.paidPercent}% مسدد
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-[11px] text-muted-foreground block">قيد الانتظار:</span>
                <strong className="text-sm font-bold text-amber-600 font-mono tabular-nums">
                  {agreement.pendingAmount?.toLocaleString('en-US')} {agreement.currency}
                </strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  باقي دفعات مجدولة
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-[11px] text-muted-foreground block">المتبقي غير مجدول:</span>
                <strong className="text-sm font-bold text-foreground font-mono tabular-nums">
                  {agreement.remainingAmount?.toLocaleString('en-US')} {agreement.currency}
                </strong>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${agreement.paidPercent || 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="px-5 border-b border-border/60 bg-muted/10 flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              جدول الدفعات ({agreement?.payments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'terms'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              البنود التعاقدية (العشرة)
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'files'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              المرفقات والعقود ({agreement?.files?.length || 0})
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* TAB 1: PAYMENTS */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                {/* Actions row */}
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground">
                    دفعات المصنع المستحقة ومواعيد السداد
                  </h4>
                  <div className="flex items-center gap-2">
                    {(!agreement?.payments || agreement.payments.length === 0) && (
                      <button
                        onClick={handleGenerateDefaultPayments}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        توليد تلقائي (70/20/10)
                      </button>
                    )}
                    <button
                      onClick={() => setShowAddPaymentModal(true)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة دفعة يدوية
                    </button>
                  </div>
                </div>

                {/* Payments Table */}
                {agreement?.payments && agreement.payments.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">#</th>
                          <th className="py-2.5 px-3 font-semibold">المسمى</th>
                          <th className="py-2.5 px-3 font-semibold">القيمة</th>
                          <th className="py-2.5 px-3 font-semibold">النسبة</th>
                          <th className="py-2.5 px-3 font-semibold">الاستحقاق</th>
                          <th className="py-2.5 px-3 font-semibold">الحالة</th>
                          <th className="py-2.5 px-3 font-semibold text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {agreement.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-3 font-mono text-muted-foreground">{p.seq}</td>
                            <td className="py-3 px-3 font-medium text-foreground">{p.label}</td>
                            <td className="py-3 px-3 font-mono font-bold text-foreground tabular-nums">
                              {Number(p.amount).toLocaleString('en-US')} ج.م
                            </td>
                            <td className="py-3 px-3 font-mono text-muted-foreground tabular-nums">
                              {p.percent ? `${p.percent}%` : '-'}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">
                              {p.dueDate ? new Date(p.dueDate).toLocaleDateString('ar-EG') : '-'}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  p.status === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : p.status === 'PENDING'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {p.status === 'PAID'
                                  ? 'مدفوعة (PAID)'
                                  : p.status === 'PENDING'
                                  ? 'قيد الانتظار'
                                  : 'ملغاة'}
                              </span>
                              {p.paidAt && (
                                <span className="block text-[9px] text-muted-foreground mt-0.5 font-mono">
                                  سُددت في: {new Date(p.paidAt).toLocaleDateString('ar-EG')}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {p.status === 'PENDING' && (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setPayingPayment(p)}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors"
                                  >
                                    تسجيل سداد
                                  </button>
                                  <button
                                    onClick={() => handleCancelPayment(p.id)}
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                                    title="إلغاء الدفعة"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center border-2 border-dashed border-border/70 rounded-xl">
                    <p className="text-xs text-muted-foreground">لم يتم توليد أو إضافة أي دفعات لهذه الاتفاقية بعد</p>
                    <button
                      onClick={handleGenerateDefaultPayments}
                      className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-transform active:scale-[0.98]"
                    >
                      توليد جدول الدفعات التلقائي (70/20/10)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TERMS */}
            {activeTab === 'terms' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    1. نطاق العمليات (Scope of Operations)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.scopeOfOperations || 'لم يتم تحديد شروط تفصيلية'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    2. وصف المنتجات (Products Description)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.productsDesc || 'لم يتم تحديد شروط تفصيلية'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    3. ملاحظات الكميات والتشغيل (Quantities Notes)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.quantitiesNotes || 'لم يتم تحديد شروط تفصيلية'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    4. شروط ومعايير الجودة ومستوى الفحص (Quality Terms)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.qualityTerms || 'لم يتم تحديد شروط تفصيلية'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    5. ملكية الخامات والتوريدات (Material Ownership)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.materialOwnership || 'الخامات المسلمة للمصنع ملكية حصرية للشركة'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    6. سياسة الهالك ونسب التفاوت المسموحة (Waste Policy)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.wastePolicy || 'نسبة الهالك حسب المعيار الفني وما زاد يتحمله المصنع'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    7. شروط ومواعيد التسليم (Delivery Terms)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.deliveryTerms || 'التسليم في مخازن الشركة بعد الفحص النهائي'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    8. سياسة إعادة التشغيل والإصلاح (Rework Policy)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.reworkPolicy || 'إعادة تشغيل العيوب على نفقة المصنع الشريك'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-[11px] font-bold text-primary block mb-1">
                    9. ملاحظات عامة وإضافية (General Notes)
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {agreement?.notes || 'لا توجد ملاحظات إضافية'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: FILES */}
            {activeTab === 'files' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">
                    المرفقات والمستندات الموقعة
                  </h4>
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition-transform active:scale-[0.98]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingFile ? 'جاري الرفع...' : 'رفع مستند جديد'}</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {agreement?.files && agreement.files.length > 0 ? (
                  <div className="space-y-2">
                    {agreement.files.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Paperclip className="w-4 h-4 text-primary" />
                          <div>
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-foreground hover:underline"
                            >
                              {f.fileName}
                            </a>
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {f.uploadedAt ? new Date(f.uploadedAt).toLocaleString('ar-EG') : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFile(f.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                          title="حذف الملف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center border-2 border-dashed border-border/70 rounded-xl">
                    <p className="text-xs text-muted-foreground">لا توجد ملفات مرفقة بهذه الاتفاقية بعد</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground">إضافة دفعة مالية جديدة</h3>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">مسمى الدفعة</label>
                <input
                  type="text"
                  placeholder="مثال: دفعة فحص الجودة والتسليم الجزئي"
                  value={paymentLabel}
                  onChange={(e) => setPaymentLabel(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">
                  المبلغ (ج.م) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="مثال: 3000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-foreground font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">ملاحظات</label>
                <input
                  type="text"
                  placeholder="أي تفاصيل حول شروط استحقاق الدفعة..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  إضافة الدفعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Confirmation Modal */}
      {payingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground">
                تسجيل سداد الدفعة: {payingPayment.label}
              </h3>
              <button
                onClick={() => setPayingPayment(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmPay} className="space-y-3 text-xs">
              <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block">مبلغ الدفعة المطلوب سداده:</span>
                <strong className="text-base font-bold text-emerald-600 font-mono tabular-nums">
                  {Number(payingPayment.amount).toLocaleString('en-US')} ج.م
                </strong>
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">
                  رقم الإيصال / الشيك / الحوالة (المرجع)
                </label>
                <input
                  type="text"
                  placeholder="مثال: CHK-9901 أو إيصال تحويل بنكي"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">ملاحظات السداد</label>
                <input
                  type="text"
                  placeholder="ملاحظات الحسابات وتأكيد التحويل للمصنع..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingPayment(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  تأكيد سداد الدفعة (PAID)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactoryAgreementDrawer;
