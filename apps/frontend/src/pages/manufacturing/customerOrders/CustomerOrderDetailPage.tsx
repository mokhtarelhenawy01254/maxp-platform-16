import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  RotateCw,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  DollarSign,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import {
  manufacturingApi,
  CustomerOrder,
  CustomerOrderPayment,
  CustomerOrderStatus,
  ProductionOrder,
} from '../manufacturingApi';
import { RecordPaymentModal } from './modals/RecordPaymentModal';
import { AddPaymentModal } from './modals/AddPaymentModal';
import { LinkChildOrderModal } from './modals/LinkChildOrderModal';

export const CustomerOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [payments, setPayments] = useState<CustomerOrderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CustomerOrderPayment | null>(null);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [linkChildModalOpen, setLinkChildModalOpen] = useState(false);

  const loadOrderDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await manufacturingApi.getCustomerOrder(id);
      setOrder(data);
      setPayments(data.payments || []);
    } catch (err: any) {
      console.error('Failed to load customer order details', err);
      setError('تعذر تحميل تفاصيل أمر العميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [id]);

  const handleStatusChange = async (newStatus: CustomerOrderStatus) => {
    if (!id) return;
    try {
      setActionLoading(true);
      const updated = await manufacturingApi.updateCustomerOrder(id, { status: newStatus });
      setOrder(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل تحديث حالة العقد');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateDefaultPayments = async () => {
    if (!id) return;
    if (payments.length > 0) {
      if (!window.confirm('يوجد جدول دفعات مسجل بالفعل. هل تريد إعادة توليد الجدول الافتراضي (70% - 20% - 10%)؟')) {
        return;
      }
    }

    try {
      setActionLoading(true);
      const generated = await manufacturingApi.generateDefaultPayments(id);
      setPayments(generated);
      // Refresh order to recalculate totals
      await loadOrderDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل توليد جدول الدفعات');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: CustomerOrderStatus) => {
    const config: Record<CustomerOrderStatus, { label: string; class: string }> = {
      DRAFT: { label: 'مسودة عقد', class: 'bg-muted text-muted-foreground border-border' },
      CONFIRMED: { label: 'مؤكد ومعتمد', class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
      IN_PRODUCTION: { label: 'قيد التشغيل والإنتاج', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
      READY: { label: 'جاهز للتسليم', class: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' },
      DELIVERED: { label: 'تم التسليم بالكامل', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
      CANCELLED: { label: 'ملغي', class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
    };
    const c = config[status] || { label: status, class: 'bg-muted text-muted-foreground border-border' };
    return (
      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${c.class}`}>
        {c.label}
      </span>
    );
  };

  const getOrderTypeBadge = (type?: string) => {
    switch (type) {
      case 'FULL_PACKAGE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">حزمة كاملة</span>;
      case 'CMT':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">تشغيل CMT</span>;
      case 'CUSTOMER_MATERIALS':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">خامات عميل</span>;
      case 'OUTSOURCED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">تشغيل خارجي</span>;
      case 'SAMPLE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">عينة</span>;
      case 'REWORK':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">إعادة تشغيل</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border">حزمة كاملة</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-8" dir="rtl">
        <div className="text-center space-y-2">
          <RotateCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground">جاري تحميل بيانات العقد وأوامر التشغيل...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans p-6" dir="rtl">
        <div className="max-w-md mx-auto p-6 rounded-xl bg-card border border-border/70 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-xs text-destructive">{error || 'العقد غير موجود'}</p>
          <Link
            to="/manufacturing/customer-orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لقائمة أوامر العملاء</span>
          </Link>
        </div>
      </div>
    );
  }

  const childOrders = order.orders || [];
  const totalAmount = order.totalAmount || 0;
  const paidAmount = order.paidAmount || 0;
  const remainingAmount = order.remainingAmount !== undefined ? order.remainingAmount : Math.max(0, totalAmount - paidAmount);
  const percentCollected = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <ManufacturingHeader
        title={`عقد العميل: ${order.orderNumber}`}
        subtitle={`${order.brandName || 'براند غير محدد'} — متابعة أوامر التشغيل وجدول الدفعات`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/manufacturing/customer-orders"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/50 transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للقائمة</span>
            </Link>

            {order.status === 'DRAFT' && (
              <button
                onClick={() => handleStatusChange('CONFIRMED')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition active:scale-[0.98]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>اعتماد وتأكيد العقد (CONFIRM)</span>
              </button>
            )}

            {order.status === 'CONFIRMED' && (
              <button
                onClick={() => handleStatusChange('IN_PRODUCTION')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition active:scale-[0.98]"
              >
                <span>بدء الإنتاج الفعلي</span>
              </button>
            )}

            {order.status === 'IN_PRODUCTION' && (
              <button
                onClick={() => handleStatusChange('READY')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 shadow-sm transition active:scale-[0.98]"
              >
                <span>جاهز للتسليم (READY)</span>
              </button>
            )}

            {order.status === 'READY' && (
              <button
                onClick={() => handleStatusChange('DELIVERED')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition active:scale-[0.98]"
              >
                <span>تسليم العقد بالكامل (DELIVERED)</span>
              </button>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Top Cockpit Header Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-xl text-foreground">{order.orderNumber}</span>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>البراند: <strong className="text-foreground">{order.brandName || '—'}</strong></span>
                {order.customer?.name && <span>• العميل: <strong className="text-foreground">{order.customer.name}</strong></span>}
                {order.customerCountry && <span>• الدولة: <strong className="text-foreground">{order.customerCountry}</strong></span>}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] text-muted-foreground block mb-0.5">تاريخ التسليم المستهدف</span>
              <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString('ar-EG') : 'غير محدد'}</span>
              </div>
            </div>
          </div>

          {/* Metrics Strip */}
          <div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">إجمالي قيمة العقد</span>
              <span className="font-mono font-bold text-base text-foreground tabular-nums">
                {totalAmount.toLocaleString()} {order.currency || 'EGP'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">المحصل فعلياً</span>
              <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                {paidAmount.toLocaleString()} {order.currency || 'EGP'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">المتبقي للتحصيل</span>
              <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400 tabular-nums">
                {remainingAmount.toLocaleString()} {order.currency || 'EGP'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">الكمية الإجمالية المخططة</span>
              <span className="font-mono font-bold text-base text-foreground tabular-nums">
                {(order.plannedQuantity || 0).toLocaleString()} قطعة
              </span>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">أوامر التشغيل المرتبطة</span>
              <span className="font-mono font-bold text-base text-foreground tabular-nums">
                {childOrders.length} أمر
              </span>
            </div>
          </div>

          {/* Collection Progress Bar */}
          {totalAmount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">نسبة التحصيل من العقد</span>
                <span className="font-mono font-bold text-foreground tabular-nums">{percentCollected}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${percentCollected}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Child Production Orders */}
        <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">أوامر التشغيل والإنتاج المرتبطة بالعقد (Work Orders)</h3>
                <p className="text-[11px] text-muted-foreground">توزيع الكميات والموديلات وأنماط التصنيع وأسعار البيع</p>
              </div>
            </div>

            <button
              onClick={() => setLinkChildModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة / ربط أمر تشغيل</span>
            </button>
          </div>

          {childOrders.length === 0 ? (
            <div className="p-8 text-center rounded-lg bg-muted/20 border border-border/60 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">لا توجد أوامر تشغيل مرتبطة بهذا العقد حتى الآن</p>
              <button
                onClick={() => setLinkChildModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                ربط أو إنشاء أول أمر تشغيل
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground font-medium">
                    <th className="py-2.5 px-3">رقم أمر التشغيل</th>
                    <th className="py-2.5 px-3">الموديل / الـ BOM</th>
                    <th className="py-2.5 px-3">نمط التصنيع</th>
                    <th className="py-2.5 px-3 text-left">الكمية المخططة</th>
                    <th className="py-2.5 px-3 text-left">سعر بيع القطعة</th>
                    <th className="py-2.5 px-3 text-left">إجمالي القيمة</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3 text-center">الكوكبيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {childOrders.map((co) => {
                    const price = co.salePricePerUnit || 0;
                    const val = (co.plannedQuantity || 0) * price;
                    return (
                      <tr key={co.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                          <Link
                            to={`/manufacturing/orders/${co.id}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <span>{co.orderNumber}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-foreground font-medium">
                          {co.bom?.name || 'موديل غير مسمى'}
                        </td>
                        <td className="py-2.5 px-3">
                          {getOrderTypeBadge(co.orderType)}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-foreground tabular-nums">
                          {co.plannedQuantity} قطعة
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-foreground tabular-nums">
                          {price.toLocaleString()} {order.currency || 'EGP'}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-primary tabular-nums">
                          {val.toLocaleString()} {order.currency || 'EGP'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border">
                            {co.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => navigate(`/manufacturing/orders/${co.id}`)}
                            className="p-1 rounded-md hover:bg-muted text-primary"
                            title="فتح كوكبيت أمر الإنتاج"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Payment Schedule & Collection */}
        <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">جدول الدفعات والتحصيل التعاقدي (Payment Schedule)</h3>
                <p className="text-[11px] text-muted-foreground">جدولة الدفعات (70% عند التأكيد، 20% عند البدء، 10% عند التسليم) ومتابعة السداد</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerateDefaultPayments}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>توليد سياسة الدفعات (70% - 20% - 10%)</span>
              </button>

              <button
                onClick={() => setAddPaymentModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted/50 transition active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة دفعة مخصصة</span>
              </button>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center rounded-lg bg-muted/20 border border-border/60 space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">لم يتم إنشاء جدول دفعات لهذا العقد بعد</p>
              <button
                onClick={handleGenerateDefaultPayments}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                توليد جدول الدفعات الافتراضي الآن
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground font-medium">
                    <th className="py-2.5 px-3">الدفعة</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3 text-center">النسبة</th>
                    <th className="py-2.5 px-3 text-left">المبلغ المستحق</th>
                    <th className="py-2.5 px-3">شرط الاستحقاق</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3 text-left">المدفوع ووسيلة الدفع</th>
                    <th className="py-2.5 px-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payments.map((p) => {
                    const isPaid = p.status === 'PAID';
                    return (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {p.label || (p.kind === 'DEPOSIT' ? 'دفعة مقدمة' : p.kind === 'FINAL' ? 'دفعة نهائية' : 'دفعة تشغيل')}
                        </td>

                        <td className="py-2.5 px-3 text-muted-foreground">
                          {p.kind}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-foreground tabular-nums">
                          {p.percent ? `${p.percent}%` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-left font-mono font-bold text-foreground tabular-nums">
                          {p.amount.toLocaleString()} {order.currency || 'EGP'}
                        </td>

                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {p.dueTrigger === 'ON_CONFIRMATION' && 'عند تأكيد العقد'}
                          {p.dueTrigger === 'ON_START' && 'عند بدء التشغيل'}
                          {p.dueTrigger === 'ON_DELIVERY' && 'عند التسليم'}
                          {p.dueTrigger === 'ON_STAGE' && 'مرتبط بمرحلة'}
                          {p.dueTrigger === 'MANUAL' && (p.dueDate ? new Date(p.dueDate).toLocaleDateString('ar-EG') : 'يدوي')}
                        </td>

                        <td className="py-2.5 px-3">
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              تم السداد ✓
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              بانتظار السداد
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-left">
                          {isPaid ? (
                            <div className="space-y-0.5 font-mono text-[11px]">
                              <span className="font-bold text-emerald-600 block tabular-nums">
                                {(p.paidAmount || p.amount).toLocaleString()} {order.currency || 'EGP'}
                              </span>
                              <span className="text-muted-foreground text-[10px] block">
                                {p.method} • {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ar-EG') : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {!isPaid ? (
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setRecordModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition active:scale-[0.98]"
                            >
                              تسجيل السداد
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-[11px] font-semibold">مسدد</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={recordModalOpen}
        onClose={() => {
          setRecordModalOpen(false);
          setSelectedPayment(null);
        }}
        customerOrderId={order.id}
        payment={selectedPayment}
        currency={order.currency}
        onPaymentUpdated={(res) => {
          setOrder(res.customerOrder);
          setPayments(res.customerOrder.payments || []);
        }}
      />

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={addPaymentModalOpen}
        onClose={() => setAddPaymentModalOpen(false)}
        customerOrderId={order.id}
        totalContractValue={totalAmount}
        currency={order.currency}
        onPaymentAdded={() => {
          loadOrderDetail();
        }}
      />

      {/* Link Child Order Modal */}
      <LinkChildOrderModal
        isOpen={linkChildModalOpen}
        onClose={() => setLinkChildModalOpen(false)}
        customerOrderId={order.id}
        brandName={order.brandName}
        customerId={order.customerId}
        currency={order.currency}
        onChildLinked={() => {
          loadOrderDetail();
        }}
      />
    </div>
  );
};

export default CustomerOrderDetailPage;
