import React from 'react';
import { Phone, Mail, Globe, ExternalLink } from 'lucide-react';
import type { ShippingCompany } from '../hooks/useShippingCompanyDetailController';

export interface ShippingCompanyContactCardProps {
  company: ShippingCompany;
  t: (key: string) => string;
}

export const ShippingCompanyContactCard: React.FC<ShippingCompanyContactCardProps> = ({
  company,
  t,
}) => {
  const hasContactInfo = Boolean(company.phone || company.email || company.website);

  return (
    <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-border/60">
        <Phone size={15} className="text-primary" />
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          {t('shipping.k_39')}
        </h2>
      </div>

      <div className="space-y-3">
        {company.phone && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/15 border border-border/40">
            <Phone size={16} className="text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">{t('shipping.k_29')}</div>
              <a
                href={`tel:${company.phone}`}
                className="text-xs font-mono font-semibold text-primary hover:underline tabular-nums"
              >
                {company.phone}
              </a>
            </div>
          </div>
        )}

        {company.email && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/15 border border-border/40">
            <Mail size={16} className="text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">{t('shipping.k_40')}</div>
              <a
                href={`mailto:${company.email}`}
                className="text-xs font-semibold text-primary hover:underline truncate block"
              >
                {company.email}
              </a>
            </div>
          </div>
        )}

        {company.website && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/15 border border-border/40">
            <Globe size={16} className="text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-muted-foreground">{t('shipping.k_41')}</div>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 truncate max-w-full"
              >
                <span className="truncate">{company.website}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
          </div>
        )}

        {!hasContactInfo && (
          <div className="py-6 text-center text-xs text-muted-foreground font-mono">
            No direct contact channels registered.
          </div>
        )}
      </div>
    </div>
  );
};
