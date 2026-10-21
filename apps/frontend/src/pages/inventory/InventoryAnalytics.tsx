import React from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useInventoryAnalyticsController } from './hooks/useInventoryAnalyticsController';
import { InventoryFinancialStrip } from './components/InventoryFinancialStrip';
import { InventoryStockAlertsTable } from './components/InventoryStockAlertsTable';

const InventoryAnalytics: React.FC = () => {
  const {
    loading,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    fetchStats,
    totalProducts,
    totalStock,
    totalValue,
    potentialRevenue,
    potentialProfit,
    profitMargin,
    lowCount,
    outCount,
    combinedAlertItems,
    formatPrice,
  } = useInventoryAnalyticsController();

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                تحليلات المخزون والتقييم المالي
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                مؤشرات السيولة، القيمة التقديرية للتكلفة والأرباح، ومراقبة نفاد المخزون
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            تحديث المؤشرات
          </Button>
        </div>
      </div>

      {/* Telemetry Strip - 5 Metric Cards */}
      <InventoryFinancialStrip
        totalValue={totalValue}
        totalStock={totalStock}
        potentialRevenue={potentialRevenue}
        potentialProfit={potentialProfit}
        profitMargin={profitMargin}
        totalProducts={totalProducts}
        lowCount={lowCount}
        outCount={outCount}
        loading={loading}
        formatPrice={formatPrice}
      />

      {/* Main Single-Surface Workspace Table */}
      <InventoryStockAlertsTable
        combinedAlertItems={combinedAlertItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        lowCount={lowCount}
        outCount={outCount}
        totalProducts={totalProducts}
        loading={loading}
      />
    </div>
  );
};

export default InventoryAnalytics;
