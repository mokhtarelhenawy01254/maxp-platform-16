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
    const common = { key: activeTab, ...filterProps };
    switch (activeTab) {
      case "matrix": return <StatusMatrixTab {...common} />;
      case "velocity": return <VelocityTab embedded />;
      case "sankey": return <SankeyTab {...common} />;
      case "paths": return <PathsTab {...common} />;
      case "dwell": return <DwellTimeTab {...common} />;
      case "outcomes": return <OutcomesTab {...common} />;
      case "team": return <TeamTab {...common} />;
      case "aging": return <AgingTab {...common} />;
      case "approvals": return <ApprovalsTab {...common} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/20">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              تحليلات الطلبات
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-l from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              حركة حالات الطلبات
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
              رصد كامل لرحلات الطلبات بين الحالات — يدوي وتلقائي — وتحديد الاختناقات والفاقد في كل سيناريو
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
              {QUICK_PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyPeriod(p.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    period === p.value
                      ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-300"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setPeriod("custom"); setStartDate(e.target.value); }}
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none [color-scheme:light] dark:[color-scheme:dark]"
              />
              <span className="text-gray-400 text-sm">إلى</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setPeriod("custom"); setEndDate(e.target.value); }}
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[64px] z-20 -mx-1 px-1 py-2 bg-gradient-to-b from-slate-50/95 to-slate-50/40 dark:from-gray-950/95 dark:to-gray-950/40 backdrop-blur-md">
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/70 p-1.5 shadow-sm backdrop-blur-md scrollbar-thin">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === id
                    ? "bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Active tab */}
        <div className="pb-10">
          <Suspense fallback={<LoadingState />}>{renderTab()}</Suspense>
        </div>
      </div>
    </div>
  );
}
