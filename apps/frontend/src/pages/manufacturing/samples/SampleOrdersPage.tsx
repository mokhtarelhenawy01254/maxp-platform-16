import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  FlaskConical,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  Calendar,
  Layers,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, SampleOrder, SampleOrderStatus } from '../manufacturingApi';
import { SampleMetricsBar } from './SampleMetricsBar';
import { SampleStatusBadge, MaterialSourceBadge } from './SampleStatusBadge';
import { CreateSampleModal } from './CreateSampleModal';
import { SampleDetailDrawer } from './SampleDetailDrawer';

export const SampleOrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [samples, setSamples] = useState<SampleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');

  // Modals & Drawer
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<SampleOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      const res = await manufacturingApi.listSampleOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        materialSource: materialFilter !== 'ALL' ? materialFilter : undefined,
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
  }, [statusFilter, materialFilter, searchTerm, searchParams, selectedSample?.id]);

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
                  <th className="py-3 px-4">مصدر الخامة</th>
                  <th className="py-3 px-4">الكمية والمقاس</th>
                  <th className="py-3 px-4">التكلفة / السعر</th>
                  <th className="py-3 px-4">المراحل</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {samples.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
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

                {samples.map((s) => {
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
                        <div className="font-medium text-foreground">{s.customerName || 'عميل غير مسجل'}</div>
                        {s.brandName && (
                          <span className="text-[11px] text-muted-foreground font-mono">{s.brandName}</span>
                        )}
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

                      {/* Fee */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium tabular-nums">
                        {s.fee ? `${Number(s.fee).toLocaleString()} ج.م` : '-'}
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
