import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, Phone, MapPin, Truck } from "lucide-react";
import { useTurboCaptainOrders } from "./turbo/useTurboCaptainOrders";
import { TurboCaptainStatsRibbon } from "./turbo/TurboCaptainStatsRibbon";
import { TurboCaptainOrdersTable } from "./turbo/TurboCaptainOrdersTable";

export const TurboCaptainDetails: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const captainName = decodeURIComponent(name || "");

  const {
    orders,
    stats,
    captain,
    loading,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
  } = useTurboCaptainOrders(captainName);

  if (loading && orders.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3"
        dir="rtl"
      >
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل سجل شحنات المندوب...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/orders/turbo-captains"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">
                {captain?.name || captainName}
              </h1>
              {captain && (
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {captain.phone && (
                    <span
                      className="inline-flex items-center gap-1 font-mono"
                      dir="ltr"
                    >
                      <Phone className="w-3 h-3 text-primary" />
                      <span>{captain.phone}</span>
                    </span>
                  )}
                  {captain.branch && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>
                        {captain.branch}
                        {captain.branchPhone
                          ? ` (${captain.branchPhone})`
                          : ""}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Link
          to="/orders/turbo-captains"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
        >
          <Truck className="w-3.5 h-3.5 text-muted-foreground" />
          <span>كل المناديب</span>
        </Link>
      </div>

      {/* Telemetry Ribbon & Reasons */}
      {stats && <TurboCaptainStatsRibbon stats={stats} />}

      {/* Table Surface */}
      <TurboCaptainOrdersTable
        orders={orders}
        statusFilter={statusFilter}
        onFilterChange={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};

export default TurboCaptainDetails;
