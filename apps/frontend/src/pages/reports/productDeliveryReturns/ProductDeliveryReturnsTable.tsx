import React from 'react';
import { Package, Search, ChevronDown, ChevronUp, AlertCircle, ArrowUpDown, ChevronRight, Eye } from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';
import { ProductDeliveryReturnsItem, HealthStatus, BottleneckCategory } from './productDeliveryReturns.types';

interface Props {
  products: ProductDeliveryReturnsItem[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  onSelectProduct: (product: ProductDeliveryReturnsItem) => void;
}

const renderBottleneckBadge = (cat: BottleneckCategory) => {
  switch (cat) {
    case 'QUALITY_CATALOG':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          مقاس / جودة
        </span>
      );
    case 'LOGISTICS':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          تأخر شحن
        </span>
      );
    case 'CUSTOMER_SALES':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          عميل / تأكيد
        </span>
      );
    default:
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
          طبيعي
        </span>
      );
  }
};

export const ProductDeliveryReturnsTable: React.FC<Props> = ({
  products,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  onSelectProduct
}) => {
  const { formatPrice } = useCurrency();

  const getSortIcon = (col: string) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-400" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 text-zinc-700 dark:text-zinc-200" /> : <ChevronDown className="h-3 w-3 text-zinc-700 dark:text-zinc-200" />;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      {/* Controls Bar */}
      <div className="p-3 sm:p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث باسم المنتج أو كود SKU..."
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'كافة المنتجات' },
            { id: 'CRITICAL', label: 'حرجة' },
            { id: 'WARNING', label: 'ملاحظة' },
            { id: 'HEALTHY', label: 'سليمة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="py-3 px-4 font-semibold">المنتج</th>
              <th
                onClick={() => onSortChange('totalShipped')}
                className="py-3 px-3 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                <div className="flex items-center gap-1">
                  <span>المشحون</span>
                  {getSortIcon('totalShipped')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('deliveryRate')}
                className="py-3 px-3 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                <div className="flex items-center gap-1">
                  <span>نسبة التسليم</span>
                  {getSortIcon('deliveryRate')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('collectionRate')}
                className="py-3 px-3 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                <div className="flex items-center gap-1">
                  <span>نسبة ومبلغ التحصيل</span>
                  {getSortIcon('collectionRate')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('returnRate')}
                className="py-3 px-3 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200 text-rose-600 dark:text-rose-400"
              >
                <div className="flex items-center gap-1">
                  <span>المرتجع وقيمته</span>
                  {getSortIcon('returnRate')}
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-amber-600 dark:text-amber-400">شحن مهدر</th>
              <th className="py-3 px-3 font-semibold">العائق التشغيلي</th>
              <th className="py-3 px-4 font-semibold text-center">أسباب المرتجع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400">
                  <Package className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                  <p className="text-xs font-medium">لا توجد منتجات تطابق الفلاتر المحددة</p>
                </td>
              </tr>
            ) : (
              products.map((item) => (
                <tr
                  key={item.productId || item.productName}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {/* المنتج */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5 max-w-[240px]">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="h-9 w-9 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate" title={item.productName}>
                          {item.productName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                          {item.productSku && <span className="font-mono">{item.productSku}</span>}
                          {item.categoryName && <span>• {item.categoryName}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* المشحون */}
                  <td className="py-3 px-3 font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                    <span className="font-bold text-sm">{item.shippedQuantity.toLocaleString()}</span>
                    <span className="text-[10px] text-zinc-400 block">{item.totalOrders} أوردر</span>
                  </td>

                  {/* نسبة التسليم */}
                  <td className="py-3 px-3 font-mono tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-sm ${
                        item.deliveryRate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : item.deliveryRate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {item.deliveryRate}%
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block">{item.deliveredQuantity} مسلّم</span>
                  </td>

                  {/* التحصيل */}
                  <td className="py-3 px-3 font-mono tabular-nums">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                      {formatPrice(item.collectedRevenue)}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 block">
                      نسبة التحصيل: {item.collectionRate}%
                    </span>
                  </td>

                  {/* المرتجع وقيمته */}
                  <td className="py-3 px-3 font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    <span className="font-bold text-sm block">
                      {item.returnRate}% ({item.returnedQuantity} ق)
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                      خسارة: {formatPrice(item.lostRevenue)}
                    </span>
                  </td>

                  {/* شحن مهدر */}
                  <td className="py-3 px-3 font-mono tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                    {formatPrice(item.lostShippingCost)}
                  </td>

                  {/* العائق التشغيلي */}
                  <td className="py-3 px-3">
                    {renderBottleneckBadge(item.primaryBottleneck)}
                  </td>

                  {/* تفاصيل المرتجع Drawer Trigger */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectProduct(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-zinc-500" />
                      <span>الأسباب ({item.returnReasons.length})</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
