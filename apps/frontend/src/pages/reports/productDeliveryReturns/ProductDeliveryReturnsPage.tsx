import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, AlertCircle, Package, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PeriodSelector, { PeriodRange } from '../../../components/common/PeriodSelector';
import analyticsService from '../../../services/analyticsService';
import { ProductDeliveryReturnsKpis } from './ProductDeliveryReturnsKpis';
import { ProductDeliveryReturnsTable } from './ProductDeliveryReturnsTable';
import { ProductReturnReasonsDrawer } from './ProductReturnReasonsDrawer';
import {
  ProductDeliveryReturnsItem,
  ProductDeliveryReturnsReportResponse,
  ProductDeliveryReturnsSummary
} from './productDeliveryReturns.types';

export const ProductDeliveryReturnsPage: React.FC = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState<PeriodRange | null>(() => ({
    period: '30',
    startDate: '',
    endDate: ''
  }));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('totalShipped');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProduct, setSelectedProduct] = useState<ProductDeliveryReturnsItem | null>(null);

  const query = useQuery({
    queryKey: [
      'product-delivery-returns-report',
      range?.period,
      range?.startDate,
      range?.endDate,
      search,
      statusFilter,
      sortBy,
      sortOrder
    ],
    queryFn: async (): Promise<ProductDeliveryReturnsReportResponse> => {
      return (await analyticsService.getProductDeliveryReturnsReport({
        period: range?.period,
        startDate: range?.startDate,
        endDate: range?.endDate,
        search,
        statusFilter,
        sortBy,
        sortOrder
      })) as ProductDeliveryReturnsReportResponse;
    },
    enabled: Boolean(range),
    staleTime: 30_000
  });

  const rawData: any = query.data;
  const reportData = rawData?.data?.summary ? rawData.data : (rawData?.summary ? rawData : rawData?.data);
  const summary: ProductDeliveryReturnsSummary = reportData?.summary ?? {
    totalProductsCount: 0,
    totalShippedQuantity: 0,
    totalDeliveredQuantity: 0,
    totalReturnedQuantity: 0,
    totalInTransitQuantity: 0,
    overallDeliveryRate: 0,
    overallReturnRate: 0,
    overallCollectionRate: 0,
    totalExpectedRevenue: 0,
    totalCollectedRevenue: 0,
    totalLostRevenue: 0,
    totalLostShipping: 0,
    criticalCount: 0,
    warningCount: 0,
    healthyCount: 0
  };
  const products: ProductDeliveryReturnsItem[] = Array.isArray(reportData?.products) ? reportData.products : [];

  const handleSortChange = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  const handleExportCsv = () => {
    if (!products.length) return;
    const headers = [
      'المنتج',
      'SKU',
      'القسم',
      'إجمالي_المشحون',
      'تم_التسليم',
      'نسبة_التسليم_%',
      'الكاش_المحصل',
      'نسبة_التحصيل_%',
      'القطع_المرتجعة',
      'نسبة_المرتجع_%',
      'الخسارة_المالية',
      'شحن_مهدر',
      'الحالة_التشغيلية',
      'العائق_الرئيسي',
      'التوصية_التشغيلية'
    ];

    const rows = products.map((p) => [
      `"${p.productName.replace(/"/g, '""')}"`,
      `"${p.productSku || ''}"`,
      `"${p.categoryName || ''}"`,
      p.shippedQuantity,
      p.deliveredQuantity,
      `${p.deliveryRate}%`,
      p.collectedRevenue,
      `${p.collectionRate}%`,
      p.returnedQuantity,
      `${p.returnRate}%`,
      p.lostRevenue,
      p.lostShippingCost,
      p.healthStatus === 'CRITICAL' ? 'حرج' : p.healthStatus === 'WARNING' ? 'تحذير' : 'سليم',
      p.primaryBottleneck,
      `"${p.operationalRecommendation.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `product_delivery_returns_${range?.startDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold">
              <Package className="h-4 w-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              تقرير أداء وتسليم المنتجات التشغيلي
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            نسب التسليم والتحصيل لكل منتج مع تفصيل أسباب المرتجعات لمعالجة الاختناقات التشغيلية
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <PeriodSelector onRangeChange={setRange} onChange={setRange} />
          <button
            onClick={handleExportCsv}
            disabled={!products.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500" />
            <span>تصدير CSV</span>
          </button>
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {query.isError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            حدث خطأ أثناء تحميل تقرير تسليم وتحصيل المنتجات.
          </div>
          <button
            onClick={() => query.refetch()}
            className="px-2.5 py-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 text-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {query.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <ProductDeliveryReturnsKpis
            summary={summary}
            onFilterCritical={() => setStatusFilter(statusFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          />

          {/* Detailed Product Table */}
          <ProductDeliveryReturnsTable
            products={products}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        </>
      )}

      {/* Slide-over Drawer for Product Return Reasons */}
      <ProductReturnReasonsDrawer
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};

export default ProductDeliveryReturnsPage;
