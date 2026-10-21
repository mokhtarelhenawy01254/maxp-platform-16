import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import i18n from '../../../i18n';
import type { ShippingCompany } from '../hooks/useShippingCompanyDetailController';

export interface ShippingCompanyDetailHeaderProps {
  company: ShippingCompany;
  providerLabels: Record<string, string>;
  integrationLabels: Record<string, string>;
  onDelete: () => void;
  t: (key: string) => string;
}

export const ShippingCompanyDetailHeader: React.FC<ShippingCompanyDetailHeaderProps> = ({
  company,
  providerLabels,
  integrationLabels,
  onDelete,
  t,
}) => {
  const isRtl = i18n.dir() === 'rtl';

  return (
    <div className="space-y-6">
      {/* Top Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <Link
            to="/shipping-companies"
            className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
            title={t('shipping.k_61')}
          >
            {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{company.name}</h1>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  company.isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                }`}
              >
                {company.isActive ? t('shipping.k_37') : t('shipping.k_38')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Shipping Carrier Dossier, API Credentials, and Dispatch Configuration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={`/shipping-companies/${company.id}/edit`}
            className="h-9 px-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 text-xs font-semibold text-foreground flex items-center gap-2 transition-all shadow-xs active:scale-[0.98]"
          >
            <Pencil size={13} />
            <span>{t('shipping.k_22')}</span>
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="h-9 px-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2 transition-all shadow-xs active:scale-[0.98]"
          >
            <Trash2 size={13} />
            <span>{t('shipping.k_23')}</span>
          </button>
        </div>
      </div>

      {/* Telemetry Integration Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
        <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Integration Provider
          </div>
          <div className="text-sm font-bold text-foreground mt-1">
            {providerLabels[company.providerKey || 'MANUAL'] || company.providerKey || t('shipping.k_1')}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Mode Environment
          </div>
          <div className="text-sm font-bold text-foreground mt-1">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono ${
                company.integrationMode === 'LIVE'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {integrationLabels[company.integrationMode || 'MANUAL'] || company.integrationMode || t('shipping.k_1')}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Created Date
          </div>
          <div className="text-xs font-mono tabular-nums text-foreground mt-1">
            {new Date(company.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Last Sync Revision
          </div>
          <div className="text-xs font-mono tabular-nums text-foreground mt-1">
            {new Date(company.updatedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
          </div>
        </div>
      </div>
    </div>
  );
};
