import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle, Package, ArrowUpRight, TrendingDown, ShieldAlert, Sparkles, Truck, Ruler, PhoneCall } from 'lucide-react';
import { useCurrency } from '../../../../hooks/useCurrency';
import { ProductDeliveryReturnsItem, BottleneckCategory } from './productDeliveryReturns.types';

interface Props {
  product: ProductDeliveryReturnsItem | null;
  onClose: () => void;
}

const getCategoryBadge = (category: BottleneckCategory) => {
  switch (category) {
    case 'QUALITY_CATALOG':
      return {
        label: 'جودة ومواصفات',
        icon: Ruler,
        bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      };
    case 'LOGISTICS':
      return {
        label: 'شحن ومندوبين',
        icon: Truck,
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      };
    case 'CUSTOMER_SALES':
      return {
        label: 'عميل وتأكيد',
        icon: PhoneCall,
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      };
    default:
      return {
        label: 'أخرى',
        icon: AlertCircle,
        bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
      };
  }
};

export const ProductReturnReasonsDrawer: React.FC<Props> = ({ product, onClose }) => {
  const { formatPrice } = useCurrency();

  if (!product) return null;

  const totalReturnReasonsCount = product.returnReasons.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div 
        className="w-full max-w-xl bg-white dark:bg-zinc-950 h-full shadow-2xl flex flex-col border-r border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {product.productImage ? (
              <img
                src={product.productImage}
                alt={product.productName}
                className="h-12 w-12 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
                <Package className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {product.productName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {product.productSku && (
                  <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded">
                    SKU: {product.productSku}
                  </span>
                )}
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  product.healthStatus === 'CRITICAL'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                    : product.healthStatus === 'WARNING'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                }`}>
                  {product.healthStatus === 'CRITICAL' ? 'حالة حرجة' : product.healthStatus === 'WARNING' ? 'تحت الملاحظة' : 'أداء ممتاز'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center">
              <span className="text-[11px] text-zinc-500 block mb-1">نسبة التسليم</span>
              <span className={`text-lg font-bold font-mono tabular-nums ${
                product.deliveryRate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {product.deliveryRate}%
              </span>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center">
              <span className="text-[11px] text-zinc-500 block mb-1">نسبة التحصيل</span>
              <span className="text-lg font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                {product.collectionRate}%
              </span>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center">
              <span className="text-[11px] text-zinc-500 block mb-1">الكاش المحصل</span>
              <span className="text-sm font-bold font-mono tabular-nums text-zinc-800 dark:text-zinc-200 block truncate">
                {formatPrice(product.collectedRevenue)}
              </span>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center">
              <span className="text-[11px] text-zinc-500 block mb-1">قيمة المرتجعات</span>
              <span className="text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 block truncate">
                {formatPrice(product.lostRevenue)}
              </span>
            </div>
          </div>

          {/* Operational Recommendation Card */}
          <div className="bg-gradient-to-br from-amber-500/5 via-zinc-50 to-zinc-50 dark:from-amber-950/20 dark:via-zinc-900 dark:to-zinc-900 border border-amber-200/80 dark:border-amber-900/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4 w-4 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                التشخيص التشغيلي وتوصية المعالجة
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {product.operationalRecommendation}
            </p>
            {product.lostShippingCost > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>مصاريف شحن مهدرة على هذا المنتج:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatPrice(product.lostShippingCost)}
                </span>
              </div>
            )}
          </div>

          {/* Breakdown of Return Reasons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                تفصيل أسباب الارتجاع ({product.returnReasons.length} سبب مسجل)
              </h3>
              <span className="text-xs text-zinc-500">
                إجمالي المرتجعات: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{product.returnedQuantity}</strong> قطعة
              </span>
            </div>

            {product.returnReasons.length === 0 ? (
              <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400">
                <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-xs font-medium">لا توجد مرتجعات مسجلة لهذا المنتج في هذه الفترة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {product.returnReasons.map((item, idx) => {
                  const cat = getCategoryBadge(item.category);
                  const Icon = cat.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3.5 space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center text-[10px] font-mono shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 break-words">
                            {item.reason}
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${cat.bg}`}>
                          <Icon className="h-3 w-3" />
                          {cat.label}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.percentage > 30 ? 'bg-rose-500' : item.percentage > 15 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                        />
                      </div>

                      {/* Stat values */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        <span>
                          التكرار: <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{item.count}</strong> ({item.percentage}%)
                        </span>
                        <span>
                          الخسارة: <strong className="text-rose-600 dark:text-rose-400 font-bold">{formatPrice(item.lostValue)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
