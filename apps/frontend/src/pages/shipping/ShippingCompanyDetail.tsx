import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import i18n from '../../i18n';
import { useShippingCompanyDetailController } from './hooks/useShippingCompanyDetailController';
import { ShippingCompanyDetailHeader } from './components/ShippingCompanyDetailHeader';
import { ShippingCompanyContactCard } from './components/ShippingCompanyContactCard';
import { ShippingCompanyApiCard } from './components/ShippingCompanyApiCard';

const ShippingCompanyDetail: React.FC = () => {
  const {
    t,
    company,
    loading,
    error,
    handleDelete,
    providerLabels,
    integrationLabels,
  } = useShippingCompanyDetailController();

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="text-center">
          <RefreshCw className="animate-spin size-8 text-primary mx-auto mb-3" />
          <p className="text-xs font-mono text-muted-foreground">{t('shipping.k_17')}...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="p-8 rounded-xl border border-dashed border-border/70 bg-card/40 space-y-3">
            <Truck className="size-12 text-muted-foreground/60 mx-auto" />
            <h3 className="text-sm font-semibold">{error || t('shipping.k_35')}</h3>
            <Link
              to="/shipping-companies"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <span>{t('shipping.k_60')}</span>
              {i18n.dir() === 'rtl' ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <ShippingCompanyDetailHeader
          company={company}
          providerLabels={providerLabels}
          integrationLabels={integrationLabels}
          onDelete={handleDelete}
          t={t}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ShippingCompanyContactCard company={company} t={t} />
          <ShippingCompanyApiCard company={company} t={t} />
        </div>
      </div>
    </div>
  );
};

export default ShippingCompanyDetail;
