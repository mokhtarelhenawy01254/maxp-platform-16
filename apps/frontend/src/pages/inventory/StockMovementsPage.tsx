import React from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useStockMovementsController } from './hooks/useStockMovementsController';
import { StockMovementsTelemetryStrip } from './components/StockMovementsTelemetryStrip';
import { StockMovementsFilterBar } from './components/StockMovementsFilterBar';
import { StockMovementsTable } from './components/StockMovementsTable';

const StockMovementsPage: React.FC = () => {
  const {
    movements,
    loading,
    typeFilter,
    setTypeFilter,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    loadMovements,
    inCount,
    outCount,
    adjustCount,
    transferCount,
    formatDate,
  } = useStockMovementsController();

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                سجل حركات المخزون التفصيلية
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                تتبع الوارد والمنصرف، التسويات الجردية، وحركات النقل بين المستودعات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMovements}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            تحديث الحركات
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <StockMovementsTelemetryStrip
        totalCount={movements.length}
        inCount={inCount}
        outCount={outCount}
        adjustCount={adjustCount}
        transferCount={transferCount}
        loading={loading}
      />

      {/* Main Single-Surface Workspace */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-2xs">
        {/* Controls Bar */}
        <StockMovementsFilterBar
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
        />

        {/* Data Table */}
        <StockMovementsTable
          movements={movements}
          loading={loading}
          formatDate={formatDate}
        />
      </div>
    </div>
  );
};

export default StockMovementsPage;
