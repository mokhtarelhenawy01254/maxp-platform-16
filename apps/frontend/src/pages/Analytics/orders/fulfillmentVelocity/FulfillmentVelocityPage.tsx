import React from "react";
import { Calendar, RefreshCw, Users, Package, Truck } from "lucide-react";
import { useFulfillmentVelocityData } from "./hooks/useFulfillmentVelocityData";
import { VelocityKpisStrip } from "./components/VelocityKpisStrip";
import { VintageDistributionCards } from "./components/VintageDistributionCards";
import { CreationCohortTable } from "./components/CreationCohortTable";
import { CohortOrdersDrawer } from "./components/CohortOrdersDrawer";
import { Card, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

interface FulfillmentVelocityPageProps {
  embedded?: boolean;
}

export const FulfillmentVelocityPage: React.FC<FulfillmentVelocityPageProps> = ({ embedded = false }) => {
  const {
    data,
    loading,
    error,
    targetDate,
    setTargetDate,
    milestone,
    setMilestone,
    refetch,
    drawerOpen,
    setDrawerOpen,
    drawerTitle,
    drawerOrders,
    drawerLoading,
    drawerPagination,
    loadCohortOrders,
  } = useFulfillmentVelocityData();

  const handleSelectBucket = (bucketKey: string, bucketLabel: string) => {
    void loadCohortOrders({
      vintageBucket: bucketKey,
      title: `طلبات شريحة: ${bucketLabel}`,
    });
  };

  const handleSelectCohortDate = (date: string) => {
    void loadCohortOrders({
      creationDate: date,
      title: `طلبات وارد تاريخ: ${date}`,
    });
  };

  const handleDrawerPageChange = (newPage: number) => {
    void loadCohortOrders({
      title: drawerTitle,
      page: newPage,
    });
  };

  const quickDates = [
    { label: "اليوم", val: daysAgo(0) },
    { label: "أمس", val: daysAgo(1) },
    { label: "أول أمس", val: daysAgo(2) },
    { label: "قبل 3 أيام", val: daysAgo(3) },
  ];

  const isPrep = milestone === "READY_TO_SHIP";

  return (
    <div className={`space-y-4 ${embedded ? "p-0" : "p-3 sm:p-5 max-w-7xl mx-auto"}`} dir="rtl">
      {/* Top Header & Control Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        {/* Row 1: Milestone Switcher & Titles */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              isPrep 
                ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                : "bg-primary/10 text-primary border-primary/20"
            }`}>
              {isPrep ? <Package className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  {isPrep
                    ? "سرعة إنجاز قسم التجهيز وتوزيع أعمار الطلبات (جاهز للشحن)"
                    : "سرعة خروج الشحنات وتوزيع أعمار الطلبات (تم الشحن)"}
                </h1>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isPrep
                  ? "رصد الأوردرات التي جهزها وغلّفها عمال المخزن يدوياً وتوزيعها حسب تاريخ ورود الطلب (Vintage)"
                  : "رصد الأوردرات التي استلمها مندوب شركة الشحن وتوزيعها حسب تاريخ ورود الطلب (Vintage)"}
              </p>
            </div>
          </div>

          {/* Milestone Toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1 border border-border/70 self-start lg:self-auto text-xs">
            <button
              type="button"
              onClick={() => setMilestone("READY_TO_SHIP")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition active:scale-95 ${
                isPrep
                  ? "bg-card text-foreground shadow-sm border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="h-3.5 w-3.5 text-amber-500" />
              <span>محطة التجهيز اليدوي (جاهز للشحن)</span>
            </button>
            <button
              type="button"
              onClick={() => setMilestone("SHIPPED")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition active:scale-95 ${
                !isPrep
                  ? "bg-card text-foreground shadow-sm border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Truck className="h-3.5 w-3.5 text-blue-500" />
              <span>محطة خروج الشحن (استلام الكابتن)</span>
            </button>
          </div>
        </div>

        {/* Row 2: Date Selector & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick date pills */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1 border border-border/60">
              {quickDates.map((q) => (
                <button
                  key={q.val}
                  type="button"
                  onClick={() => setTargetDate(q.val)}
                  className={`rounded-md px-2.5 py-1 text-xs font-mono transition active:scale-95 ${
                    targetDate === q.val
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Date input */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-mono">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent font-mono text-foreground outline-none text-xs"
              />
            </div>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono border-border/70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} /> تحديث
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive text-xs">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 text-xs font-bold underline hover:no-underline"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* 1. KPIs Summary Strip */}
          <VelocityKpisStrip kpis={data.kpis} />

          {/* 2. Vintage Distribution Buckets */}
          <VintageDistributionCards
            buckets={data.vintageBuckets}
            milestone={milestone}
            onSelectBucket={handleSelectBucket}
          />

          {/* 3. Detailed Creation Cohort Table */}
          <CreationCohortTable
            cohorts={data.cohorts}
            milestone={milestone}
            onSelectCohortDate={handleSelectCohortDate}
          />

          {/* 4. Team Breakdown Card (if team members exist) */}
          {data.teamBreakdown.length > 0 && (
            <Card className="border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {isPrep
                      ? "إنتاجية فريق التجهيز في تغليف هذه الدفعة (Packer Output)"
                      : "إنتاجية الفريق في شحن هذه الدفعة (Team Vintage Split)"}
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isPrep
                    ? "تفصيل من قام بتجهيز وتغليف الطلبات الجديدة مقابل المتراكمة"
                    : "تفصيل من قام بشحن الطلبات الجديدة مقابل الطلبات القديمة المتراكمة"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {data.teamBreakdown.map((m) => (
                  <div
                    key={m.name}
                    className="flex flex-col justify-between rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs"
                  >
                    <span className="font-semibold text-foreground truncate">
                      {m.name}
                    </span>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span className="text-primary font-bold">
                        {m.totalShipped} {isPrep ? "تجهيز" : "شحن"}
                      </span>
                      <span>
                        {m.freshOrders} جديد · {m.agedOrders} قديم
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}

      {/* Drill-down Drawer */}
      <CohortOrdersDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        orders={drawerOrders}
        loading={drawerLoading}
        pagination={drawerPagination}
        milestone={milestone}
        onPageChange={handleDrawerPageChange}
      />
    </div>
  );
};

export default FulfillmentVelocityPage;
