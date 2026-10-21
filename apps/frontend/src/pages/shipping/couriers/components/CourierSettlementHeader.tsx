import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Truck, Receipt, TrendingUp, ArrowRight } from 'lucide-react';

export const CourierSettlementHeader: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
      <div>
        <div className="flex items-center gap-2">
          <Link
            to="/shipping/couriers"
            className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
          >
            <span>المناديب</span>
            <ArrowRight className="w-3 h-3 rotate-180" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            التوريد المالي وتسوية ورديات التوصيل
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          استلام وتوريد النقدية المحصلة من المناديب، إيداعها بخزينة الشركة ومطابقة المرتجعات
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to="/treasury"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/50 transition text-foreground"
        >
          <Building2 className="w-3.5 h-3.5" />
          حسابات الخزينة
        </Link>
        <Link
          to="/shipping/courier-dues"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/50 transition text-foreground"
        >
          <Receipt className="w-3.5 h-3.5" />
          مستحقات المناديب
        </Link>
        <Link
          to="/shipping/courier-performance"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/50 transition text-foreground"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          تقرير الأداء
        </Link>
        <Link
          to="/shipping/delivery-runs"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/50 transition text-foreground"
        >
          <Truck className="w-3.5 h-3.5" />
          شيتات المانيفست
        </Link>
      </div>
    </div>
  );
};
