import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, Grid3X3, GitBranch, Route, Clock, Flag, Users, Hourglass, ClipboardCheck, Zap } from "lucide-react";
import { LoadingState, ModeToggle, type MovementFilterProps, type MovementMode } from "./orderMovementShared";

const StatusMatrixTab = React.lazy(() => import("./tabs/StatusMatrixTab"));
const VelocityTab = React.lazy(() => import("../fulfillmentVelocity/FulfillmentVelocityPage"));
const SankeyTab = React.lazy(() => import("./tabs/SankeyTab"));
const PathsTab = React.lazy(() => import("./tabs/PathsTab"));
const DwellTimeTab = React.lazy(() => import("./tabs/DwellTimeTab"));
const OutcomesTab = React.lazy(() => import("./tabs/OutcomesTab"));
const TeamTab = React.lazy(() => import("./tabs/TeamTab"));
const AgingTab = React.lazy(() => import("./tabs/AgingTab"));
const ApprovalsTab = React.lazy(() => import("./tabs/ApprovalsTab"));

type TabId =
  | "matrix"
  | "velocity"
  | "sankey"
  | "paths"
  | "dwell"
  | "outcomes"
  | "team"
  | "aging"
  | "approvals";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "matrix", label: "مصفوفة الانتقالات", icon: Grid3X3 },
  { id: "velocity", label: "سرعة الإنجاز وشحن اليوم (Vintage)", icon: Zap },
  { id: "sankey", label: "خريطة التدفق", icon: GitBranch },
  { id: "paths", label: "تحليل المسارات", icon: Route },
  { id: "dwell", label: "زمن المكوث", icon: Clock },
  { id: "outcomes", label: "النتائج النهائية", icon: Flag },
  { id: "team", label: "أداء الفريق", icon: Users },
  { id: "aging", label: "الطلبات المعلّقة", icon: Hourglass },
  { id: "approvals", label: "الموافقات", icon: ClipboardCheck },
];

const QUICK_PERIODS = [
  { value: "7", label: "7 أيام" },
  { value: "30", label: "30 يوم" },
  { value: "90", label: "90 يوم" },
  { value: "180", label: "6 شهور" },
];

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function OrderMovementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (urlTab && ["matrix", "velocity", "sankey", "paths", "dwell", "outcomes", "team", "aging", "approvals"].includes(urlTab)) {
      return urlTab;
    }
    return "matrix";
  });

  useEffect(() => {
    if (urlTab && ["matrix", "velocity", "sankey", "paths", "dwell", "outcomes", "team", "aging", "approvals"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", id);
    setSearchParams(newParams, { replace: true });
  };

  const [period, setPeriod] = useState("30");
  const [startDate, setStartDate] = useState(daysAgoStr(29));
  const [endDate, setEndDate] = useState(todayStr());
  const [mode, setMode] = useState<MovementMode>("all");

  const applyPeriod = (p: string) => {
    setPeriod(p);
    if (p === "custom") return;
    const n = Number(p);
    setStartDate(daysAgoStr(n - 1));
    setEndDate(todayStr());
  };

  const filterProps: MovementFilterProps = {
    startDate,
    endDate,
    mode,
    onSwitchToVelocity: () => handleTabChange("velocity"),
  };

  const renderTab = () => {
    switch (activeTab) {
      case "matrix": return <StatusMatrixTab key={activeTab} {...filterProps} />;
      case "velocity": return <VelocityTab key={activeTab} embedded />;
      case "sankey": return <SankeyTab key={activeTab} {...filterProps} />;
      case "paths": return <PathsTab key={activeTab} {...filterProps} />;
      case "dwell": return <DwellTimeTab key={activeTab} {...filterProps} />;
      case "outcomes": return <OutcomesTab key={activeTab} {...filterProps} />;
      case "team": return <TeamTab key={activeTab} {...filterProps} />;
      case "aging": return <AgingTab key={activeTab} {...filterProps} />;
      case "approvals": return <ApprovalsTab key={activeTab} {...filterProps} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              حركة وحالات تدفق الطلبات (Order Movement)
            </h1>
            <p className="text-xs text-muted-foreground">
              رصد كامل لرحلات الطلبات بين الحالات، زمن المكوث، ومعدل تحول الإجراءات
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1 border border-border/70 text-xs">
            {QUICK_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => applyPeriod(p.value)}
                className={`rounded-md px-2.5 py-1 font-mono transition-all ${
                  period === p.value
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-mono">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setPeriod("custom"); setStartDate(e.target.value); }}
              className="bg-transparent text-xs text-foreground outline-none font-mono"
            />
            <span className="text-muted-foreground text-xs">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setPeriod("custom"); setEndDate(e.target.value); }}
              className="bg-transparent text-xs text-foreground outline-none font-mono"
            />
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {/* Tabs Chassis */}
      <div className="rounded-xl border border-border/70 bg-card p-1 shadow-sm overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Tab Body */}
      <div className="min-w-0">
        <Suspense fallback={<LoadingState />}>{renderTab()}</Suspense>
      </div>
    </div>
  );
}
