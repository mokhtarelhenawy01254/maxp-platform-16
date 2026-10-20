import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSignature,
  Plus,
  Search,
  Filter,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, FactoryAgreement, FactoryAgreementStatus } from '../manufacturingApi';
import CreateFactoryAgreementModal from './CreateFactoryAgreementModal';
import FactoryAgreementDrawer from './FactoryAgreementDrawer';

export const FactoryAgreementsPage: React.FC = () => {
  const [agreements, setAgreements] = useState<FactoryAgreement[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Drawer & Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [activeAgreementId, setActiveAgreementId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    activeCount: 0,
    totalValue: 0,
    totalPaid: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [agrRes, factRes] = await Promise.all([
        manufacturingApi.listFactoryAgreements({
          partnerFactoryId: selectedFactoryId !== 'ALL' ? selectedFactoryId : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          search: search.trim() || undefined,
        }),
        manufacturingApi.listPartnerFactories({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      setAgreements(agrRes.data || []);
      if (agrRes.metrics) {
        setMetrics(agrRes.metrics);
      }
      setFactories(factRes.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'تعذر تحميل اتفاقيات المصانع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFactoryId, selectedStatus]);

  // Handle client-side search filtering
  const filteredAgreements = useMemo(() => {
    if (!search.trim()) return agreements;
    const q = search.toLowerCase().trim();
    return agreements.filter(
      (a) =>
        a.code?.toLowerCase().includes(q) ||
        a.title?.toLowerCase().includes(q) ||
        a.partnerFactory?.name?.toLowerCase().includes(q) ||
        a.order?.orderNumber?.toLowerCase().includes(q)
    );
  }, [agreements, search]);

  const handleOpenDrawer = (agreementId: string) => {
    setActiveAgreementId(agreementId);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Platform Standard Manufacturing Header */}
      <ManufacturingHeader
        title="اتفاقيات المصانع الشركاء ودفعاتها"
        subtitle="عقود تشغيل مستقلة مع المصانع الخارجية ببنودها العشرة وجدول دفعاتها المنفصل لحماية الهامش الحقيقي"
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 hover:bg-primary/90 transition-transform active:scale-[0.98] shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء اتفاقية مصنع جديدة</span>
          </button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">
        {/* KPI Summary Bento Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">إجمالي الاتفاقيات</span>
              <strong className="text-xl sm:text-2xl font-bold text-foreground font-mono tabular-nums">
                {metrics.totalCount}
              </strong>
              <span className="text-[10px] text-muted-foreground block mt-0.5">عقد تشغيل مسجل</span>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <FileSignature className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">الاتفاقيات النشطة</span>
              <strong className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono tabular-nums">
                {metrics.activeCount}
              </strong>
              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">سارية وقيد التشغيل</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">إجمالي قيمة الاتفاقيات</span>
              <strong className="text-xl sm:text-2xl font-bold text-foreground font-mono tabular-nums">
                {metrics.totalValue?.toLocaleString('en-US')} ج.م
              </strong>
              <span className="text-[10px] text-muted-foreground block mt-0.5">التزامات للمصانع الشركاء</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">المسدد فعلياً</span>
              <strong className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono tabular-nums">
                {metrics.totalPaid?.toLocaleString('en-US')} ج.م
              </strong>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {metrics.totalValue > 0
                  ? `نسبة السداد العامة ${Math.round((metrics.totalPaid / metrics.totalValue) * 100)}%`
                  : '0% سداد'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="البحث بالكود، مسمى الاتفاقية، أو اسم المصنع..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs py-2 pr-9 pl-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            {/* Factory Filter */}
            <select
              value={selectedFactoryId}
              onChange={(e) => setSelectedFactoryId(e.target.value)}
              className="text-xs py-2 px-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="ALL">جميع المصانع الشركاء</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs py-2 px-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="DRAFT">مسودة (DRAFT)</option>
              <option value="ACTIVE">نشطة (ACTIVE)</option>
              <option value="CLOSED">مغلقة (CLOSED)</option>
              <option value="CANCELLED">ملغاة (CANCELLED)</option>
            </select>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Agreements Table Container */}
        <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>جاري تحميل قائمة الاتفاقيات...</span>
            </div>
          ) : filteredAgreements.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border mx-auto flex items-center justify-center text-muted-foreground">
                <FileSignature className="w-6 h-6" />
              </div>
              <p className="font-medium text-foreground">لا توجد اتفاقيات مصانع مطابقة للشروط</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-transform active:scale-[0.98]"
              >
                إنشاء أول اتفاقية مصنع
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">كود الاتفاقية</th>
                    <th className="py-3 px-4 font-semibold">المصنع الشريك</th>
                    <th className="py-3 px-4 font-semibold">عنوان الاتفاقية</th>
                    <th className="py-3 px-4 font-semibold">أمر التشغيل</th>
                    <th className="py-3 px-4 font-semibold">نوع التسعير</th>
                    <th className="py-3 px-4 font-semibold">القيمة الإجمالية</th>
                    <th className="py-3 px-4 font-semibold">الحالة</th>
                    <th className="py-3 px-4 font-semibold">نسبة المسدد</th>
                    <th className="py-3 px-4 font-semibold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredAgreements.map((agr) => (
                    <tr
                      key={agr.id}
                      onClick={() => handleOpenDrawer(agr.id)}
                      className="hover:bg-muted/20 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                        {agr.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">
                          {agr.partnerFactory?.name || 'مصنع مجهول'}
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          {agr.partnerFactory?.specialty || 'تخصص عام'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">
                        {agr.title}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {agr.order ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] text-foreground">
                            {agr.order.orderNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/50">
                          {agr.pricingMode === 'PER_PIECE'
                            ? 'بالقطعة'
                            : agr.pricingMode === 'PER_STAGE'
                            ? 'بالمرحلة'
                            : agr.pricingMode === 'HOURLY'
                            ? 'بالساعة'
                            : 'مقطوعية'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground tabular-nums">
                        {agr.totalValue ? `${agr.totalValue.toLocaleString('en-US')} ${agr.currency}` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            agr.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : agr.status === 'DRAFT'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : agr.status === 'CLOSED'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {agr.status === 'ACTIVE'
                            ? 'نشطة (ACTIVE)'
                            : agr.status === 'DRAFT'
                            ? 'مسودة (DRAFT)'
                            : agr.status === 'CLOSED'
                            ? 'مغلقة (CLOSED)'
                            : 'ملغاة'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-emerald-600 font-mono tabular-nums">
                              مسدد {agr.paidPercent || 0}%
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                              {agr.paidAmount?.toLocaleString('en-US')} ج.م
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${agr.paidPercent || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer(agr.id);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <span>عرض</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <CreateFactoryAgreementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
          setIsCreateModalOpen(false);
        }}
      />

      {/* Drawer */}
      <FactoryAgreementDrawer
        isOpen={isDrawerOpen}
        agreementId={activeAgreementId}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={loadData}
      />
    </div>
  );
};

export default FactoryAgreementsPage;
