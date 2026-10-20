import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  BarChart3, RefreshCw, Download, Filter, 
  RotateCcw, AlertTriangle, Users, FileText, 
  ClipboardCheck, Banknote, Package, Clock 
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { downloadCsv } from '../../utils/procurementCsvExport';

import { AgingReportTab } from './reports/AgingReportTab';
import { SuppliersReportTab } from './reports/SuppliersReportTab';
import { OrdersReportTab } from './reports/OrdersReportTab';
import { InvoicesReportTab } from './reports/InvoicesReportTab';
import { PaymentsReportTab } from './reports/PaymentsReportTab';
import { ProductsReportTab } from './reports/ProductsReportTab';
import {
  AgingReportData,
  SupplierReportRow,
  PurchaseOrderReportRow,
  InvoiceReportRow,
  PaymentReportRow,
  ProductReportRow,
  SupplierOption,
} from './reports/reportTypes';

const getDefaultDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

export default function ProcurementReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'aging';

  const defaultDates = useMemo(() => getDefaultDates(), []);
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [supplierId, setSupplierId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');

  // Suppliers lookup for filter
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  // Report States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agingData, setAgingData] = useState<AgingReportData | null>(null);
  const [suppliersData, setSuppliersData] = useState<SupplierReportRow[]>([]);
  const [ordersData, setOrdersData] = useState<{ summary: any; orders: PurchaseOrderReportRow[] }>({ summary: null, orders: [] });
  const [invoicesData, setInvoicesData] = useState<{ summary: any; invoices: InvoiceReportRow[] }>({ summary: null, invoices: [] });
  const [paymentsData, setPaymentsData] = useState<{ summary: any; payments: PaymentReportRow[] }>({ summary: null, payments: [] });
  const [productsData, setProductsData] = useState<ProductReportRow[]>([]);

  // Date validation
  const isDateInverted = Boolean(startDate && endDate && endDate < startDate);

  const setTab = (newTab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    });
  };

  // Load suppliers list once
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await apiClient.get('/procurement/suppliers');
        const list = Array.isArray(res.data?.suppliers)
          ? res.data.suppliers
          : Array.isArray(res.data)
          ? res.data
          : [];
        setSuppliers(list.map((s: any) => ({ id: s.id, name: s.name })));
      } catch (err) {
        console.warn('Could not load suppliers for filter:', err);
      }
    };
    fetchSuppliers();
  }, []);

  const handleResetFilters = () => {
    const def = getDefaultDates();
    setStartDate(def.startDate);
    setEndDate(def.endDate);
    setSupplierId('all');
    setStatus('all');
    setPaymentMethod('all');
  };

  const fetchCurrentReport = useCallback(async () => {
    if (isDateInverted) return;
    setLoading(true);
    setError(null);

    const baseParams: Record<string, string> = {};
    if (startDate) baseParams.startDate = startDate;
    if (endDate) {
      // Append end-of-day boundary so records created on the last day are included
      baseParams.endDate = `${endDate}T23:59:59.999Z`;
    }
    if (supplierId && supplierId !== 'all') {
      baseParams.supplierId = supplierId;
    }

    try {
      if (activeTab === 'aging') {
        const res = await apiClient.get('/procurement/reports/aging');
        setAgingData(res.data?.aging || null);
      } else if (activeTab === 'suppliers') {
        const res = await apiClient.get('/procurement/reports/suppliers', { params: baseParams });
        setSuppliersData(res.data?.report || []);
      } else if (activeTab === 'orders') {
        const params: Record<string, string> = { ...baseParams };
        if (status && status !== 'all') params.status = status;
        const res = await apiClient.get('/procurement/reports/purchase-orders', { params });
        setOrdersData({ summary: res.data?.summary || null, orders: res.data?.orders || [] });
      } else if (activeTab === 'invoices') {
        const params: Record<string, string> = { ...baseParams };
        if (status && status !== 'all') params.status = status;
        const res = await apiClient.get('/procurement/reports/invoices', { params });
        setInvoicesData({ summary: res.data?.summary || null, invoices: res.data?.invoices || [] });
      } else if (activeTab === 'payments') {
        const params: Record<string, string> = { ...baseParams };
        if (paymentMethod && paymentMethod !== 'all') params.paymentMethod = paymentMethod;
        const res = await apiClient.get('/procurement/reports/payments', { params });
        setPaymentsData({ summary: res.data?.summary || null, payments: res.data?.payments || [] });
      } else if (activeTab === 'products') {
        const res = await apiClient.get('/procurement/reports/products', { params: baseParams });
        setProductsData(res.data?.productSummary || []);
      }
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setError(err?.response?.data?.message || 'تعذر تحميل بيانات التقرير');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, supplierId, status, paymentMethod, isDateInverted]);

  useEffect(() => {
    fetchCurrentReport();
  }, [fetchCurrentReport]);

  // Client-Side CSV Export
  const handleExportCsv = () => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (activeTab === 'aging' && agingData) {
      const headers = ['رقم الفاتورة', 'المورد', 'تاريخ الاستحقاق', 'أيام التأخير', 'المبلغ المتبقي (ج.م)'];
      const rows: (string | number)[][] = [];
      const buckets = [agingData.current, agingData.days30, agingData.days60, agingData.days90, agingData.over90];
      buckets.forEach((b) => {
        (b?.invoices || []).forEach((inv) => {
          rows.push([
            inv.invoiceNumber,
            inv.supplierName || '—',
            inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ar-EG') : '—',
            inv.daysPastDue,
            Number(inv.remainingAmount) || 0,
          ]);
        });
      });
      downloadCsv({ filename: `aging_debt_report_${todayStr}.csv`, headers, rows });
    } else if (activeTab === 'suppliers') {
      const headers = ['اسم المورد', 'جهة الاتصال', 'الهاتف', 'عدد الأوامر', 'إجمالي الأوامر (ج.م)', 'عدد الفواتير', 'إجمالي الفواتير (ج.م)', 'عدد السدادات', 'إجمالي المسدد (ج.م)', 'الرصيد الحالي (ج.م)'];
      const rows = suppliersData.map((s) => [
        s.supplierName,
        s.contactPerson || '',
        s.phone || '',
        s.totalOrders,
        Number(s.totalOrderAmount) || 0,
        s.totalInvoices,
        Number(s.totalInvoiceAmount) || 0,
        s.totalPayments,
        Number(s.totalPaidAmount) || 0,
        Number(s.currentBalance) || 0,
      ]);
      downloadCsv({ filename: `suppliers_report_${todayStr}.csv`, headers, rows });
    } else if (activeTab === 'orders') {
      const headers = ['رقم الأمر', 'المورد', 'تاريخ الطلب', 'تاريخ التسليم', 'عدد الأصناف', 'الإجمالي (ج.م)', 'الحالة'];
      const rows = ordersData.orders.map((o) => [
        o.orderNumber,
        o.supplier?.name || '—',
        o.orderDate ? new Date(o.orderDate).toLocaleDateString('ar-EG') : '—',
        o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString('ar-EG') : '—',
        o.purchaseOrderItems?.length || 0,
        Number(o.totalAmount) || 0,
        o.status,
      ]);
      downloadCsv({ filename: `purchase_orders_report_${todayStr}.csv`, headers, rows });
    } else if (activeTab === 'invoices') {
      const headers = ['رقم الفاتورة', 'المورد', 'تاريخ الفاتورة', 'تاريخ الاستحقاق', 'الإجمالي (ج.م)', 'المدفوع (ج.م)', 'المتبقي (ج.م)', 'الحالة'];
      const rows = invoicesData.invoices.map((inv) => [
        inv.invoiceNumber,
        inv.supplier?.name || '—',
        inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('ar-EG') : '—',
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ar-EG') : '—',
        Number(inv.totalAmount) || 0,
        Number(inv.paidAmount) || 0,
        Number(inv.remainingAmount) || 0,
        inv.status,
      ]);
      downloadCsv({ filename: `purchase_invoices_report_${todayStr}.csv`, headers, rows });
    } else if (activeTab === 'payments') {
      const headers = ['رقم الدفعة', 'المورد', 'الفاتورة', 'تاريخ الدفع', 'طريقة الدفع', 'المرجع', 'المبلغ (ج.م)'];
      const rows = paymentsData.payments.map((p) => [
        p.paymentNumber,
        p.supplier?.name || '—',
        p.purchaseInvoice?.invoiceNumber || '',
        p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('ar-EG') : '—',
        p.paymentMethod,
        p.referenceNumber || '',
        Number(p.amount) || 0,
      ]);
      downloadCsv({ filename: `supplier_payments_report_${todayStr}.csv`, headers, rows });
    } else if (activeTab === 'products') {
      const headers = ['اسم المنتج', 'إجمالي الكمية', 'إجمالي المشتريات (ج.م)', 'عدد الطلبيات'];
      const rows = productsData.map((p) => [
        p.productName,
        Number(p.totalQuantity) || 0,
        Number(p.totalAmount) || 0,
        p.orders?.length || 0,
      ]);
      downloadCsv({ filename: `product_purchases_report_${todayStr}.csv`, headers, rows });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">تقارير المشتريات</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            التحليلات المالية والتشغيلية للموردين وفواتير الشراء وأعمار الديون
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCurrentReport}
            disabled={loading || isDateInverted}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCsv}
            disabled={loading}
            className="gap-2"
          >
            <Download className="size-3.5" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Date inversion warning */}
      {isDateInverted && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <AlertTriangle className="size-4 shrink-0" />
          <span>تنبيه: تاريخ النهاية يسبق تاريخ البداية. يرجى تصحيح نطاق التاريخ لعرض التقرير.</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Filter className="size-3.5" /> فلاتر التقرير
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="size-3" /> إعادة تعيين
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Start Date */}
          <div>
            <Label htmlFor="rep-start" className="text-xs">من تاريخ</Label>
            <Input
              id="rep-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 h-9 text-xs"
              disabled={activeTab === 'aging'}
            />
          </div>

          {/* End Date */}
          <div>
            <Label htmlFor="rep-end" className="text-xs">إلى تاريخ</Label>
            <Input
              id="rep-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 h-9 text-xs"
              disabled={activeTab === 'aging'}
            />
          </div>

          {/* Supplier Filter (not applied in aging or products) */}
          {activeTab !== 'aging' && activeTab !== 'products' && (
            <div>
              <Label htmlFor="rep-supplier" className="text-xs">المورد</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="rep-supplier" className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="كل الموردين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الموردين</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Order Status Filter */}
          {activeTab === 'orders' && (
            <div>
              <Label htmlFor="rep-status-po" className="text-xs">حالة أمر الشراء</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="rep-status-po" className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="DRAFT">مسودة</SelectItem>
                  <SelectItem value="ORDERED">تم الطلب</SelectItem>
                  <SelectItem value="PARTIALLY_RECEIVED">مستلم جزئياً</SelectItem>
                  <SelectItem value="RECEIVED">مستلم بالكامل</SelectItem>
                  <SelectItem value="CANCELLED">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Invoice Status Filter */}
          {activeTab === 'invoices' && (
            <div>
              <Label htmlFor="rep-status-inv" className="text-xs">حالة الفاتورة</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="rep-status-inv" className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="PENDING">معلقة</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">مدفوعة جزئياً</SelectItem>
                  <SelectItem value="PAID">مدفوعة بالكامل</SelectItem>
                  <SelectItem value="CANCELLED">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Method Filter */}
          {activeTab === 'payments' && (
            <div>
              <Label htmlFor="rep-method" className="text-xs">طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="rep-method" className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="كل الطرق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الطرق</SelectItem>
                  <SelectItem value="CASH">نقدي</SelectItem>
                  <SelectItem value="BANK_TRANSFER">تحويل بنكي</SelectItem>
                  <SelectItem value="CHECK">شيك</SelectItem>
                  <SelectItem value="VODAFONE_CASH">محفظة إلكترونية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {activeTab === 'aging' && (
          <p className="text-[11px] text-muted-foreground">
            * تقرير أعمار الديون لحظي ويحسب الذمم المالية المتبقية للفواتير المعلقة طبقاً لتاريخ اليوم.
          </p>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchCurrentReport} className="h-7 text-xs">
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Tabs Switcher */}
      <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-xl bg-muted p-1 text-muted-foreground w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="aging" className="gap-2 text-xs">
              <Clock className="size-3.5" /> أعمار الديون
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2 text-xs">
              <Users className="size-3.5" /> الموردين
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 text-xs">
              <FileText className="size-3.5" /> أوامر الشراء
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2 text-xs">
              <ClipboardCheck className="size-3.5" /> الفواتير
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 text-xs">
              <Banknote className="size-3.5" /> المدفوعات
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2 text-xs">
              <Package className="size-3.5" /> حسب المنتج
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="aging">
          <AgingReportTab data={agingData} loading={loading} />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersReportTab data={suppliersData} loading={loading} />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersReportTab orders={ordersData.orders} summary={ordersData.summary} loading={loading} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesReportTab invoices={invoicesData.invoices} summary={invoicesData.summary} loading={loading} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsReportTab payments={paymentsData.payments} summary={paymentsData.summary} loading={loading} />
        </TabsContent>

        <TabsContent value="products">
          <ProductsReportTab products={productsData} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
