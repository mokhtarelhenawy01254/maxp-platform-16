import React from 'react';
import { Key } from 'lucide-react';
import type { ShippingCompany } from '../hooks/useShippingCompanyDetailController';

export interface ShippingCompanyApiCardProps {
  company: ShippingCompany;
  t: (key: string) => string;
}

export const ShippingCompanyApiCard: React.FC<ShippingCompanyApiCardProps> = ({
  company,
  t,
}) => {
  return (
    <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-border/60">
        <Key size={15} className="text-primary" />
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          {t('shipping.k_42')}
        </h2>
      </div>

      <div className="space-y-3">
        {company.apiKey ? (
          <div className="space-y-1.5 p-3 rounded-lg bg-muted/15 border border-border/40">
            <div className="text-[11px] font-mono text-muted-foreground uppercase">API KEY CREDENTIAL</div>
            <div className="font-mono text-xs bg-muted/30 px-2.5 py-1.5 rounded border border-border/50 text-foreground break-all">
              {company.apiKey.length > 24 ? `${company.apiKey.substring(0, 20)}••••••••` : company.apiKey}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/10 border border-border/40 text-xs text-muted-foreground italic">
            {t('shipping.k_43')}
          </div>
        )}

        {company.apiUrl ? (
          <div className="space-y-1.5 p-3 rounded-lg bg-muted/15 border border-border/40">
            <div className="text-[11px] font-mono text-muted-foreground uppercase">REST DISPATCH URL</div>
            <code className="text-xs font-mono bg-muted/30 px-2.5 py-1.5 rounded border border-border/50 text-foreground block truncate">
              {company.apiUrl}
            </code>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/10 border border-border/40 text-xs text-muted-foreground italic">
            No custom API endpoint overridden. Using default provider route.
          </div>
        )}
      </div>
    </div>
  );
};
