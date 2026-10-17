import React from "react";
import { Link } from "react-router-dom";
import {
  TruckIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

interface ShipmentsHeaderProps {
  onExportCsv: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const ShipmentsHeader: React.FC<ShipmentsHeaderProps> = ({
  onExportCsv,
  onRefresh,
  loading,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <TruckIcon className="h-6 w-6 text-primary" />
          <span>بيان تفاصيل الأوردرات في شركات الشحن</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          متابعة دقيقة لبيانات المناديب والفروع وأسباب التأجيل والارتجاع لكل شركة شحن على حدة
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border/70 rounded-xl hover:bg-muted/50 transition-colors shadow-2xs"
        >
          <ArrowDownTrayIcon className="h-4 w-4 text-muted-foreground" />
          <span>تصدير بيان الشحنات</span>
        </button>

        <Link
          to="/tickets"
          className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors flex items-center gap-1"
        >
          <span>تذاكر وشات الشحن</span>
        </Link>

        <Link
          to="/shipping-companies"
          className="px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border/70 rounded-xl hover:bg-muted/50 transition-colors"
        >
          <span>إدارة الشركات</span>
        </Link>

        <Link
          to="/shipping-settlement"
          className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-colors"
        >
          <span>التسويات المالية</span>
        </Link>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 text-muted-foreground hover:text-foreground bg-card border border-border/70 rounded-xl hover:bg-muted/50 transition-colors"
          title="تحديث البيانات"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
};
