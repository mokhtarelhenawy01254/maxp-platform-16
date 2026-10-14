import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Trash2,
  Globe,
  Phone,
  Mail,
  Key,
  Link as LinkIcon,
  RefreshCw,
  Clock,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { envConfig } from '../../config/environment';
import i18n from '../../i18n';

interface ShippingCompany {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  apiKey?: string;
  apiUrl?: string;
  providerKey?: string;
  integrationMode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ShippingCompanyDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<ShippingCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const providerLabels: Record<string, string> = {
    MANUAL: t('shipping.k_1'),
    TURBO: 'Turbo',
    BOSTA_DEMO: 'Bosta Demo',
    MYLERZ_DEMO: 'Mylerz Demo',
    ARAMEX_DEMO: 'Aramex Demo',
  };

  const integrationLabels: Record<string, string> = {
    MANUAL: t('shipping.k_1'),
    DEMO: t('shipping.k_2'),
    LIVE: t('shipping.k_3'),
  };

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(`${envConfig.backendUrl}/api/v1/shipping-companies/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCompany(data.data);
      } else {
        setError(data.error || t('shipping.k_35'));
      }
    } catch (err) {
      console.error('Error fetching shipping company:', err);
      setError(t('shipping.k_36'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(t('shipping.k_8'))) {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const response = await fetch(`${envConfig.backendUrl}/api/v1/shipping-companies/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          navigate('/shipping-companies');
        } else {
          alert(data.error || t('shipping.k_9'));
        }
      } catch (err) {
        console.error('Error deleting shipping company:', err);
        alert(t('shipping.k_9'));
      }
    }
  };

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

        {/* Top Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link
              to="/shipping-companies"
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title={t('shipping.k_61')}
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{company.name}</h1>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  company.isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                }`}>
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
              className="h-9 px-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 text-xs font-semibold text-foreground flex items-center gap-2 transition-all shadow-xs"
            >
              <Pencil size={13} />
              <span>{t('shipping.k_22')}</span>
            </Link>
            <button
              onClick={handleDelete}
              className="h-9 px-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2 transition-all shadow-xs"
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
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono ${
                company.integrationMode === 'LIVE'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}>
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

        {/* Carrier Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Contact & Dispatch Channel */}
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
                    <a href={`tel:${company.phone}`} className="text-xs font-mono font-semibold text-primary hover:underline">
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
                    <a href={`mailto:${company.email}`} className="text-xs font-semibold text-primary hover:underline truncate block">
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

              {!company.phone && !company.email && !company.website && (
                <div className="py-6 text-center text-xs text-muted-foreground font-mono">
                  No direct contact channels registered.
                </div>
              )}
            </div>
          </div>

          {/* API Gateway & Dispatch Endpoint */}
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

        </div>

      </div>
    </div>
  );
};

export default ShippingCompanyDetail;
