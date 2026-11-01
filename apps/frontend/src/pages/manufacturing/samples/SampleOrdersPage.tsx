import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  FlaskConical,
  RefreshCw,
  ChevronLeft,
  Calendar,
  Layers,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, SampleOrder, PartnerFactory } from '../manufacturingApi';
import { SampleMetricsBar } from './SampleMetricsBar';
import { SampleStatusBadge, MaterialSourceBadge } from './SampleStatusBadge';
import { CreateSampleModal } from './CreateSampleModal';
import { EditSampleModal } from './EditSampleModal';
import { SampleDetailDrawer } from './SampleDetailDrawer';

const customerDisplayName = (s: SampleOrder) => {
  if (s.customer) {
    const fullName = [s.customer.firstName, s.customer.lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    if (s.customer.name) return s.customer.name;
  }
  return s.customerName || 'عميل غير مسجل';
};

export const SampleOrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [samples, setSamples] = useState<SampleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [factories, setFactories] = useState<PartnerFactory[]>([]);
  const [factoryFilter, setFactoryFilter] = useState<string>('ALL');
  const [receiptFilter, setReceiptFilter] = useState<string>('ALL'); // 'ALL' | 'RECEIVED' | 'PENDING'
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);

  // Modals & Drawer
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<SampleOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    manufacturingApi
      .listPartnerFactories()
      .then((res: any) => {
        setFactories(Array.isArray(res) ? res : (res?.items || []));
      })
      .catch(() => {});
  }, []);

  const customerFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    samples.forEach((s) => {
      if (s.customerId) {
        const name = customerDisplayName(s);
        map.set(s.customerId, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [samples]);

  const displayedSamples = useMemo(() => {
    return samples.filter((s) => {
      if (customerFilter === 'ALL') return true;
      if (customerFilter === 'LINKED') return Boolean(s.customerId);
      if (customerFilter === 'UNLINKED') return !s.customerId;
      return s.customerId === customerFilter;
    });
  }, [samples, customerFilter]);

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      const res = await manufacturingApi.listSampleOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        materialSource: materialFilter !== 'ALL' ? materialFilter : undefined,
        partnerFactoryId: factoryFilter !== 'ALL' ? factoryFilter : undefined,
        sampleReceived: receiptFilter === 'RECEIVED' ? true : (receiptFilter === 'PENDING' ? false : undefined),
        overdue: overdueOnly ? true : undefined,
        search: searchTerm.trim() || undefined,
      });
      setSamples(res.items || []);

      // If URL had sample ID or selectedSample was active, update it
      const targetId = searchParams.get('id') || selectedSample?.id;
      if (targetId && res.items) {
        const found = res.items.find((s) => s.id === targetId);
        if (found) {
          setSelectedSample(found);
          setIsDrawerOpen(true);
        }
      }
    } catch (err) {
      // error handled gracefully
    } finally {
      setLoading(false);
    }
  }, [statusFilter, materialFilter, factoryFilter, receiptFilter, overdueOnly, searchTerm, searchParams, selectedSample?.id]);

  const handleQuickToggleReceipt = async (e: React.MouseEvent, sampleId: string, currentStatus?: boolean) => {
    e.stopPropagation();
    try {
      await manufacturingApi.markSampleReceived(sampleId, { received: !currentStatus });
      fetchSamples();
    } catch (_) {}
  };

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const handleOpenDrawer = (sample: SampleOrder) => {
    setSelectedSample(sample);
    setIsDrawerOpen(true);
    setSearchParams({ id: sample.id });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSample(null);
    setSearchParams({});
  };

  const statusTabs: Array<{ id: string; label: string }> = [
    { id: 'ALL', label: 'الكل' },
    { id: 'DRAFT', label: 'مسودة' },
    { id: 'IN_PROGRESS', label: 'قيد التنفيذ' },
    { id: 'APPROVED', label: 'معتمدة' },
    { id: 'CONVERTED', label: 'تم التحويل' },
    { id: 'REJECTED', label: 'مرفوضة' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <ManufacturingHeader
        title="أوامر تصنيع العينات المستقلة (Sample Orders)"
        subtitle="إدارة وتتبع دورة حياة العينات، المراحل المعملية، واعتماد وتحويل العينة إلى أمر تشغيل كامل"
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ أمر عينة جديد</span>
          </button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-4">
        {/* KPI Metrics */}
        <SampleMetricsBar samples={samples} />

        {/* Filter and Search Bar */}
        <div className="bg-card border border-border/80 rounded-xl p-3 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b sm:border-b-0 pb-2 sm:pb-0">
              {statusTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setStatusFilter(t.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                    statusFilter === t.id
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Material Source Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">الخامة:</span>
              <select
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background outline-none text-foreground"
              >
                <option value="ALL">جميع المصادر</option>
                <option value="CUSTOMER">خامة العميل (CMT)</option>
                <option value="COMPANY">خامة من المصنع</option>
              </select>
            </div>

            {/* Customer Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">العميل:</span>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background outline-none text-foreground"
              >
                <option value="ALL">جميع العملاء</option>
                <option value="LINKED">عملاء مسجلين (مربوط)</option>
                <option value="UNLINKED">عملاء غير مسجلين</option>
                {customerFilterOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Factory Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">المصنع:</span>
              <select
                value={factoryFilter}
                onChange={(e) => setFactoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background outline-none text-foreground"
              >
                <option value="ALL">جميع المصانع</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Receipt Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">الاستلام:</span>
              <select
                value={receiptFilter}
                onChange={(e) => setReceiptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background outline-none text-foreground"
              >
                <option value="ALL">جميع حالات الاستلام</option>
                <option value="RECEIVED">مستلمة (✓)</option>
                <option value="PENDING">في انتظار الاستلام</option>
              </select>
            </div>

            {/* Overdue Filter */}
            <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-foreground select-none px-2 py-1 rounded-lg border border-border/80 hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
              />
              <span className={overdueOnly ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-muted-foreground'}>
                متأخرة فقط
              </span>
            </label>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/60">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث برقم العينة (SMP-...)، اسم المنتج، العميل، أو البراند..."
                className="w-full pr-9 pl-4 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5" />
            </div>
            <button
              onClick={fetchSamples}
              className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Samples Table / List */}
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">رقم العينة</th>
                  <th className="py-3 px-4">المنتج والمواصفة</th>
                  <th className="py-3 px-4">العميل / البراند</th>
                  <th className="py-3 px-4">المصنع / الاستلام</th>
                  <th className="py-3 px-4">مصدر الخامة</th>
                  <th className="py-3 px-4">الكمية والمقاس</th>
                  <th className="py-3 px-4">المدفوع / المتبقي</th>
                  <th className="py-3 px-4">المراحل</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayedSamples.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      <FlaskConical className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-medium">لا توجد أوامر عينات مطابقة للمعايير المحددة</p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-3 px-4 py-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg font-semibold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> إنشاء أول أمر عينة
                      </button>
                    </td>
                  </tr>
                )}

                {displayedSamples.map((s) => {
                  const completedStages = s.stages?.filter((st) => st.status === 'COMPLETED').length || 0;
                  const totalStages = s.stages?.length || 0;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleOpenDrawer(s)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      {/* Sample Number */}
                      <td className="py-3 px-4 font-bold text-primary tabular-nums whitespace-nowrap">
                        {s.sampleNumber}
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{s.productName}</div>
                        {s.bom && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            <span>{s.bom.code || s.bom.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Customer / Brand */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-foreground">{customerDisplayName(s)}</span>
                          {s.customerId && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              مربوط
                            </span>
                          )}
                        </div>
                        {s.brandName && (
                          <span className="text-[11px] text-muted-foreground font-mono">{s.brandName}</span>
                        )}
                      </td>

                      {/* Partner Factory & Expected Delivery */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {s.partnerFactory?.name || <span className="text-muted-foreground">بدون مصنع</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>
                            {s.expectedDeliveryAt
                              ? new Date(s.expectedDeliveryAt).toLocaleDateString('ar-EG')
                              : '—'}
                          </span>
                          {s.sampleReceived ? (
                            <span
                              onClick={(e) => handleQuickToggleReceipt(e, s.id, s.sampleReceived)}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                              title={`تم الاستلام ${s.receivedAt ? `(${new Date(s.receivedAt).toLocaleDateString('ar-EG')})` : ''} - اضغط للإلغاء`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مستلمة</span>
                            </span>
                          ) : (
                            <>
                              {s.isOverdue && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  متأخر {s.overdueDays ? `${s.overdueDays} يوم` : ''}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleQuickToggleReceipt(e, s.id, s.sampleReceived)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-colors"
                                title="اضغط لتأكيد استلام العينة"
                              >
                                <span>استلام؟</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Material Source */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <MaterialSourceBadge source={s.materialSource} />
                      </td>

                      {/* Quantity & Size/Color */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold tabular-nums">{s.plannedQuantity} قطعة</span>
                        {(s.size || s.color) && (
                          <div className="text-[11px] text-muted-foreground">
                            {s.size || '-'} / {s.color || '-'}
                          </div>
                        )}
                      </td>

                      {/* Paid / Remaining */}
                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        {(() => {
                          const total = s.totalAmount !== null && s.totalAmount !== undefined ? Number(s.totalAmount) : (s.fee !== null && s.fee !== undefined ? Number(s.fee) : null);
                          const paid = Number(s.paidAmount || 0);
                          const remaining = s.remaining !== undefined ? Number(s.remaining) : (total !== null ? total - paid : 0);
                          if (total === null) return <span className="text-muted-foreground">—</span>;
                          return (
                            <div>
                              <div className="font-semibold text-foreground">
                                {paid.toLocaleString()} / {total.toLocaleString()} ج.م
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                المتبقي: <span className={remaining > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-emerald-600 font-medium'}>{remaining.toLocaleString()} ج.م</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Stages Progress */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="tabular-nums font-medium text-foreground">
                            {completedStages}/{totalStages}
                          </span>
                          <span className="text-[11px] text-muted-foreground">مرحلة</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <SampleStatusBadge status={s.status} />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-left whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDrawer(s)}
                          className="px-3 py-1 rounded-md text-xs font-semibold bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1"
                        >
                          <span>عرض</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Sample Modal */}
      <CreateSampleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchSamples}
      />

      {/* Detail Slide-over Drawer */}
      <SampleDetailDrawer
        sample={selectedSample}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onRefresh={fetchSamples}
      />
    </div>
  );
};

export default SampleOrdersPage;
