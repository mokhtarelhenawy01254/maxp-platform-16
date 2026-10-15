import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  DollarSign,
  Eye,
  MousePointerClick,
  Headphones,
  Inbox,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  Radio,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import i18n from '../../../i18n';

const platformColors: Record<string, string> = {
  facebook: '#1877F2',
  google: '#4285F4',
  tiktok: '#6366f1',
};

export default function AdIntelligence() {
  const { t } = useTranslation();
  const { competitorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [competitorName, setCompetitorName] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  useEffect(() => {
    if (competitorId) {
      fetchData();
    }
  }, [competitorId, platformFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, campaignsRes, topCreativesRes, compRes] = await Promise.all([
        axios.get(`/api/v1/competitors/ads/summary/${competitorId}`, {
          params: platformFilter ? { platform: platformFilter } : {},
        }),
        axios.get(`/api/v1/competitors/ads/campaigns/${competitorId}`, {
          params: platformFilter ? { platform: platformFilter } : {},
        }),
        axios.get(`/api/v1/competitors/ads/top-creatives/${competitorId}`, {
          params: { platform: platformFilter || 'facebook', limit: 10 },
        }),
        axios.get(`/api/v1/competitors/${competitorId}`).catch(() => null),
      ]);

      setSummary(summaryRes.data);
      setCampaigns(campaignsRes.data || []);
      setCreatives(topCreativesRes.data || []);
      if (compRes?.data?.data?.name) {
        setCompetitorName(compRes.data.data.name);
      }
    } catch (error) {
      console.error('Error fetching ad data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`/api/v1/competitors/ads/sync/${competitorId}`, {
        platform: platformFilter || 'facebook',
      });
      toast.success(res.data?.message || 'تم تفعيل وجدولة رصد مكتبة إعلانات Meta بنجاح');
      await fetchData();
    } catch {
      toast.error('تعذر تفعيل رصد الإعلانات حالياً');
    } finally {
      setSyncing(false);
    }
  };

  const currencySymbol = i18n.language === 'ar' ? 'ر.س' : '$';

  const metaLibraryUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(
    competitorName || 'competitor'
  )}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground bg-background">
        <Loader2 className="animate-spin size-8 text-primary mb-2" />
        <span className="text-xs font-mono">LOADING AD INTELLIGENCE...</span>
      </div>
    );
  }

  if (!summary || campaigns.length === 0) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/70">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold tracking-tight">{t('competitors.adOverview')}</h1>
              <p className="text-xs text-muted-foreground">
                رصد وتتبع الحملات الإعلانية لمنافسك {competitorName && `(${competitorName})`} عبر Meta Ad Library
              </p>
            </div>
          </div>

          {/* Meta Ad Library Radar Activation Card */}
          <div className="bg-card border border-border/70 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                    <Radio size={18} className="animate-pulse" />
                  </span>
                  <h2 className="text-sm font-bold text-foreground">
                    تفعيل رصد الإعلانات الذكي (Meta Ad Library Intelligence)
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  فحص تلقائي يومي لسجل إعلانات المنافس على فيسبوك وإنستجرام عبر مكتبة إعلانات ميتا الرسمية
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={metaLibraryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
                >
                  <span>فتح مكتبة إعلانات Meta</span>
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'جاري المزامنة...' : 'شغّل رصد الإعلانات الآن'}</span>
                </button>
              </div>
            </div>

            {/* Radar Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-muted/20 border border-border/60 space-y-1">
                <div className="text-[10px] uppercase font-mono text-muted-foreground">مصدر البيانات المعتمد</div>
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-blue-500" />
                  <span>Meta Ad Library API</span>
                </div>
                <div className="text-[11px] text-muted-foreground">فيسبوك، إنستجرام، وماسنجر وشبكة الجمهور</div>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/20 border border-border/60 space-y-1">
                <div className="text-[10px] uppercase font-mono text-muted-foreground">وتيرة الرصد الآلي</div>
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>فحص دوري يومي (Daily Cadence)</span>
                </div>
                <div className="text-[11px] text-muted-foreground">مراقبة تلقائية عبر وكيل السوق «زياد رادار»</div>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/20 border border-border/60 space-y-1">
                <div className="text-[10px] uppercase font-mono text-muted-foreground">حالة السجل الحالي</div>
                <div className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Inbox size={13} />
                  <span>في انتظار بدء أول فحص</span>
                </div>
                <div className="text-[11px] text-muted-foreground">اضغط الزر بالأعلى لبدء تفعيل الرصد وجدولة التقرير</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.back')}
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{t('competitors.adOverview')}</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  PAID ACQUISITION
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active ad library campaigns, creative assets, spend volume, and conversion hooks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative min-w-[160px]">
              <select
                value={platformFilter || ''}
                onChange={(e) => setPlatformFilter(e.target.value || null)}
                className="w-full text-xs h-9 px-3 pr-8 rounded-lg border border-border/70 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="">{t('competitors.filterPlatform')} (All)</option>
                <option value="facebook">{t('competitors.platforms.facebook') || 'Meta'}</option>
                <option value="google">{t('competitors.platforms.google') || 'Google'}</option>
                <option value="tiktok">{t('competitors.platforms.tiktok') || 'TikTok'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Telemetry Metric Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('competitors.totalCampaigns')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {summary.totalCampaigns}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Discovered ads in library</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('competitors.activeCampaigns')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.activeCampaigns}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Currently serving traffic</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('competitors.totalSpend')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-primary mt-1">
              {currencySymbol}{Number(summary.totalSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Estimated cumulative spend</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('competitors.avgCTR')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
              {Number(summary.avgCTR || 0).toFixed(2)}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Click-through engagement</div>
          </div>
        </div>

        {/* Secondary Telemetry: Impressions & Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs">
            <div className="text-xs text-muted-foreground uppercase font-mono">{t('competitors.impressions')}</div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-1">
              {summary.totalImpressions?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs">
            <div className="text-xs text-muted-foreground uppercase font-mono">{t('competitors.clicks')}</div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-1">
              {summary.totalClicks?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs">
            <div className="text-xs text-muted-foreground uppercase font-mono">{t('competitors.conversions')}</div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-1">
              {summary.totalConversions?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        {/* Platform Breakdown */}
        {summary.platformStats && summary.platformStats.length > 0 && (
          <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-3">
            <div className="text-xs font-bold text-foreground">
              {t('competitors.platformBreakdown')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {summary.platformStats.map((stat: any) => (
                <div key={stat.platform} className="p-3 rounded-lg bg-muted/15 border border-border/50 text-center">
                  <span
                    className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border mb-2 uppercase"
                    style={{ borderColor: platformColors[stat.platform] || '#6366f1', color: platformColors[stat.platform] || '#6366f1' }}
                  >
                    {stat.platform}
                  </span>
                  <div className="text-xl font-bold font-mono tabular-nums text-foreground">
                    {stat.campaignCount} <span className="text-xs font-normal text-muted-foreground">{t('competitors.campaigns')}</span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">
                    {currencySymbol}{stat.totalSpend?.toLocaleString()} {t('competitors.spend')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaigns Table */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">{t('competitors.campaigns')}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{campaigns.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/15 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">{t('competitors.campaignName')}</th>
                  <th className="py-2.5 px-4">{t('competitors.platform')}</th>
                  <th className="py-2.5 px-4">{t('competitors.status')}</th>
                  <th className="py-2.5 px-4">{t('competitors.budget')}</th>
                  <th className="py-2.5 px-4">{t('competitors.spend')}</th>
                  <th className="py-2.5 px-4">{t('competitors.impressions')}</th>
                  <th className="py-2.5 px-4">{t('competitors.ctr')}</th>
                  <th className="py-2.5 px-4">{t('competitors.roas')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {campaigns.slice(0, 10).map((row) => (
                  <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-foreground max-w-xs truncate">
                      <div>{row.campaignName || t('competitors.notAvailable')}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{row.objective || ''}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border"
                        style={{ borderColor: platformColors[row.platform] || '#6366f1', color: platformColors[row.platform] || '#6366f1' }}
                      >
                        {row.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                        row.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-muted/40 text-muted-foreground border-border/60'
                      }`}>
                        {row.status === 'active' ? t('competitors.active') : t('competitors.inactive')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">
                      {row.budget ? `${currencySymbol}${Number(row.budget).toLocaleString()}` : '--'}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-foreground">
                      {row.spend ? `${currencySymbol}${Number(row.spend).toLocaleString()}` : '--'}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">
                      {row.impressions ? row.impressions.toLocaleString() : '--'}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">
                      {row.ctr ? `${Number(row.ctr).toFixed(2)}%` : '--'}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.roas ? `${Number(row.roas).toFixed(2)}x` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Creatives Gallery */}
        {creatives.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-foreground">
              {t('competitors.topCreatives')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {creatives.slice(0, 6).map((creative) => (
                <div key={creative.id} className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
                  {creative.imageUrl && (
                    <img
                      src={creative.imageUrl}
                      alt={creative.headline || 'Ad Creative'}
                      className="w-full h-36 object-cover border-b border-border/50 bg-muted/20"
                    />
                  )}
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-xs text-foreground line-clamp-1">
                        {creative.headline || t('competitors.notAvailable')}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                        {creative.primaryText || ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="size-3.5" />
                        <span className="tabular-nums font-semibold text-foreground">{creative.impressions?.toLocaleString() || 0}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="size-3.5" />
                        <span className="tabular-nums font-semibold text-foreground">{creative.clicks?.toLocaleString() || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}