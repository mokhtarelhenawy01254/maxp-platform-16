import React from 'react';
import { Search, Package, MinusCircle, AlertTriangle } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { type LowStockItem, type InventoryAlertTab } from '../hooks/useInventoryAnalyticsController';

interface InventoryStockAlertsTableProps {
  combinedAlertItems: (LowStockItem & { status: 'low' | 'out' })[];
  activeTab: InventoryAlertTab;
  onTabChange: (tab: InventoryAlertTab) => void;
  search: string;
  onSearchChange: (val: string) => void;
  lowCount: number;
  outCount: number;
  totalProducts: number;
  loading: boolean;
}

export const InventoryStockAlertsTable: React.FC<InventoryStockAlertsTableProps> = ({
  combinedAlertItems,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  lowCount,
  outCount,
  totalProducts,
  loading,
}) => {
  return (
    <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-2xs">
      {/* Controls Bar */}
      <div className="p-3 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => onTabChange('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            كل النواقص ({lowCount + outCount})
          </button>
          <button
            type="button"
            onClick={() => onTabChange('low')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === 'low'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            منخفض المخزون ({lowCount})
          </button>
          <button
            type="button"
            onClick={() => onTabChange('out')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === 'out'
                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            نافذ بالكامل ({outCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="بحث بالمنتج أو رمز SKU..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pr-9 pl-3 text-xs bg-background border-border/70"
          />
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
            <tr>
              <th className="py-2.5 px-3.5">المنتج والرمز</th>
              <th className="py-2.5 px-3.5 text-center">الرصيد المتاح</th>
              <th className="py-2.5 px-3.5 text-center">مستوى الخطر</th>
              <th className="py-2.5 px-3.5 text-left">الإجراء الموصى به</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="py-4 px-3.5">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </td>
                </tr>
              ))
            ) : combinedAlertItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-medium">لا توجد منتجات مطابقة لفلتر البحث</p>
                  <p className="text-[11px] mt-0.5">مستويات المخزون ضمن النطاق الآمن</p>
                </td>
              </tr>
            ) : (
              combinedAlertItems.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                      {item.name}
                    </div>
                    {item.sku && (
                      <div className="text-[11px] font-mono text-muted-foreground">
                        SKU: {item.sku}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        item.status === 'out'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {item.status === 'out' ? (
                        <MinusCircle className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {item.stock} قطعة
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        item.status === 'out'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}
                    >
                      {item.status === 'out' ? 'مخزون نافذ بالكامل' : 'دون الحد الأدنى'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-left">
                    <span className="text-[11px] text-muted-foreground">
                      {item.status === 'out'
                        ? 'إصدار أمر شراء فوري للمورد'
                        : 'مراجعة معدل الاستهلاك والتجديد'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary Ribbon */}
      <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-4">
          <span>
            إجمالي الأصناف المعروضة:{' '}
            <strong className="text-foreground font-mono">{combinedAlertItems.length}</strong>
          </span>
          <span>
            الأصناف الآمنة بالمخزن:{' '}
            <strong className="text-foreground font-mono">
              {Math.max(0, totalProducts - lowCount - outCount)}
            </strong>
          </span>
        </div>
        <div className="text-[11px]">
          يتم تحديث تقييم التكلفة والإيرادات تلقائياً مع كل حركة صرف أو استلام
        </div>
      </div>
    </div>
  );
};
