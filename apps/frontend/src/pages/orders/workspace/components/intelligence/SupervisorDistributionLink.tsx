import React from "react";
import { Link } from "react-router-dom";
import { Users, ArrowLeft, ArrowRight } from "lucide-react";

export interface SupervisorDistributionLinkProps {
  isArabic: boolean;
}

export const SupervisorDistributionLink: React.FC<SupervisorDistributionLinkProps> = ({
  isArabic,
}) => {
  return (
    <div className="border-t border-border/40 pt-3">
      <section>
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Users className="h-4 w-4 text-primary" />
          <span>{isArabic ? "إدارة توزيع الفريق" : "Team Distribution"}</span>
        </div>
        <Link
          to="/settings/orders?tab=confirmation"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          <span>{isArabic ? "ضبط إعدادات التوزيع" : "Configure Assignment Rules"}</span>
          {isArabic ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
        </Link>
      </section>
    </div>
  );
};
