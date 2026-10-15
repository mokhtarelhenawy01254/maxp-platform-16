import { useState } from "react";
import { Tag, ClipboardList, ArrowRightLeft } from "lucide-react";
import OperationsLabelsTab from "./OperationsLabelsTab";
import OperationsDeliveriesTab from "./OperationsDeliveriesTab";
import OperationsTransactionsTab from "./OperationsTransactionsTab";

type SubTab = "labels" | "deliveries" | "transactions";

const SUB_TABS: { id: SubTab; label: string; icon: typeof Tag }[] = [
  { id: "labels", label: "لاصقات الفحص والمغلفات", icon: Tag },
  { id: "deliveries", label: "تسليم التقارير", icon: ClipboardList },
  { id: "transactions", label: "سجل حركات وتدقيق العمليات", icon: ArrowRightLeft },
];

export default function OperationsPage() {
  const [tab, setTab] = useState<SubTab>("labels");

  return (
    <div className="space-y-6">
      {/* Top Header Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">مركز العمليات الميدانية واللاصقات</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            إدارة وطباعة لاصقات الفحوصات، متابعة تسليم التقارير الطبية، وتدقيق سجل الحركات
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
          {SUB_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  active
                    ? "bg-card text-foreground shadow-sm border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View */}
      {tab === "labels" && <OperationsLabelsTab />}
      {tab === "deliveries" && <OperationsDeliveriesTab />}
      {tab === "transactions" && <OperationsTransactionsTab />}
    </div>
  );
}
