import React from "react";
import { Layers, Users, TrendingUp, Sparkles } from "lucide-react";
import { WhatsAppMetricCard } from "../../../whatsapp/components/WhatsAppPageShell";
import { CustomerListsStats } from "./types";

interface CustomerListsKPIsProps {
  stats: CustomerListsStats;
}

export const CustomerListsKPIs: React.FC<CustomerListsKPIsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <WhatsAppMetricCard
        label="إجمالي القوائم"
        value={stats.totalLists.toLocaleString("ar-EG")}
        hint="قوائم افتراضية ومخصصة"
        icon={Layers}
        tone="primary"
      />
      <WhatsAppMetricCard
        label="إجمالي العملاء"
        value={stats.totalMembers.toLocaleString("ar-EG")}
        hint="عبر كل القوائم"
        icon={Users}
        tone="info"
      />
      <WhatsAppMetricCard
        label="نشط خلال 24 ساعة"
        value={stats.active24h.toLocaleString("ar-EG")}
        hint="عملاء تواصلوا اليوم"
        icon={TrendingUp}
        tone="success"
      />
      <WhatsAppMetricCard
        label="قوائم جديدة هذا الشهر"
        value={stats.newThisMonth.toLocaleString("ar-EG")}
        hint="مخصصة أُنشئت حديثاً"
        icon={Sparkles}
        tone="danger"
      />
    </div>
  );
};
