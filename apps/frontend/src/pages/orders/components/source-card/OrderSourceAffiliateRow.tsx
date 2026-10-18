import React from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

export interface OrderSourceAffiliateRowProps {
  affiliateId?: string;
  affiliate?: {
    id: string;
    affiliateCode?: string;
    status?: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export const OrderSourceAffiliateRow: React.FC<OrderSourceAffiliateRowProps> = ({
  affiliateId,
  affiliate,
}) => {
  if (!affiliateId || !affiliate) return null;

  return (
    <div className="flex items-start gap-3 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground mb-0.5">
          مسوق بالعمولة
        </div>
        <div className="font-medium text-foreground">
          {affiliate.user
            ? `${affiliate.user.firstName} ${affiliate.user.lastName}`
            : "مسوق"}
        </div>
        {affiliate.affiliateCode && (
          <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
            كود: {affiliate.affiliateCode}
          </div>
        )}
        {affiliate.user?.email && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {affiliate.user.email}
          </div>
        )}
        <Link
          to={`/affiliates/management/${affiliateId}`}
          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline mt-1 inline-block"
        >
          عرض التفاصيل
        </Link>
      </div>
    </div>
  );
};

export default OrderSourceAffiliateRow;
