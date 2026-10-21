import React from 'react';
import { Truck } from 'lucide-react';
import { type SettlementCompanySummary } from '../../../services/shippingSettlementService';

interface SettlementCompanyCardsProps {
  summary: SettlementCompanySummary[];
  loadingSummary: boolean;
  selectedCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  formatPrice: (price: number) => string;
  getCompanyName: (item: SettlementCompanySummary) => string;
  t: (key: string, fallback?: string) => string;
}

export const SettlementCompanyCards: React.FC<SettlementCompanyCardsProps> = ({
  summary,
  loadingSummary,
  selectedCompanyId,
  onSelectCompany,
  formatPrice,
  getCompanyName,
  t,
}) => {
  if (loadingSummary) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        جاري تحميل الملخص...
      </div>
    );
  }

  if ((summary || []).length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card p-8 text-center text-xs text-muted-foreground">
        {t('shippingSettlement.noCompanies', 'لا توجد شركات شحن')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {(summary || []).map((item) => (
        <button
          key={item.company.id}
          type="button"
          onClick={() => onSelectCompany(item.company.id)}
          className={`rounded-2xl border p-4 text-right transition-all shadow-2xs ${
            selectedCompanyId === item.company.id
              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
              : 'border-border/70 bg-card hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs sm:text-sm text-foreground">
              {getCompanyName(item)}
            </span>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {item.deliveredShipments} {t('shippingSettlement.deliveredCount', 'مسلّمة')}
            </span>
            <span className="font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {formatPrice(item.pendingAmount)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
