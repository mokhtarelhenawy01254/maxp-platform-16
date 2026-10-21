import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, RotateCcw, ArrowLeft } from 'lucide-react';
import { useShippingSettlementController } from './hooks/useShippingSettlementController';
import { SettlementKpiStrip } from './components/SettlementKpiStrip';
import { SettlementCompanyCards } from './components/SettlementCompanyCards';
import { SettlementFilterBar } from './components/SettlementFilterBar';
import { SettlementOrdersTable } from './SettlementOrdersTable';

const SETTLEMENT_STATUS_OPTIONS = [
  { value: '', fallback: 'كل الحالات' },
  { value: 'PENDING', fallback: 'قيد التسوية' },
  { value: 'SETTLED', fallback: 'تم التسوية' },
];

const SettlementPage: React.FC = () => {
  const {
    t,
    formatPrice,
    formatDate,
    summary,
    orders,
    loadingSummary,
    loadingOrders,
    selectedCompanyId,
    setSelectedCompanyId,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    selectedIds,
    processing,
    totalPending,
    totalDelivered,
    totalSettled,
    allSelected,
    toggleSelect,
    toggleSelectAll,
    handleBulkSettle,
    handleUnsettle,
    getCompanyName,
  } = useShippingSettlementController();

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t('shippingSettlement.title', 'تسويات شركات الشحن')}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('shippingSettlement.description', 'تقفيل حسابات الشحنات المسلّمة مع شركات الشحن')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/shipping/courier-settlements"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-border/70 bg-card hover:bg-muted/30 text-foreground rounded-xl transition shadow-2xs"
          >
            <span>تسويات المناديب والتوصيل الداخلي</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <SettlementKpiStrip
        totalPending={totalPending}
        totalDelivered={totalDelivered}
        totalSettled={totalSettled}
        formatPrice={formatPrice}
        t={t}
      />

      {/* Company Cards */}
      <SettlementCompanyCards
        summary={summary}
        loadingSummary={loadingSummary}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={(companyId) => {
          setSelectedCompanyId((prev) => (prev === companyId ? '' : companyId));
          setPage(1);
        }}
        formatPrice={formatPrice}
        getCompanyName={getCompanyName}
        t={t}
      />

      {/* Filters and Search Bar */}
      <SettlementFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={SETTLEMENT_STATUS_OPTIONS}
        selectedCount={selectedIds.length}
        onBulkSettle={() => handleBulkSettle()}
        processing={processing}
      />

      {/* Orders Table */}
      {loadingOrders && (orders || []).length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RotateCcw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (orders || []).length === 0 ? (
        <div className="bg-card border border-border/70 rounded-2xl p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto mb-3 border border-border/60">
            <Truck className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">لا توجد شحنات مطابقة</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            لم يتم العثور على أي شحنات بانتظار التسوية بحسب الفلاتر المحددة.
          </p>
        </div>
      ) : (
        <SettlementOrdersTable
          orders={orders}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          formatPrice={formatPrice}
          formatDate={formatDate}
          onUnsettle={handleUnsettle}
          processing={processing}
          totalPages={totalPages}
          page={page}
          setPage={setPage}
        />
      )}
    </div>
  );
};

export default SettlementPage;
