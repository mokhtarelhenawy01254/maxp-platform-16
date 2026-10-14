import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  Loader2,
  Instagram,
  Facebook,
  Music,
  ThumbsUp,
  MessageCircle,
  Eye,
  CheckCircle2,
  Inbox,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Share2,
} from 'lucide-react';
import axios from 'axios';
import i18n from '../../../i18n';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="size-5 text-[#E4405F]" />,
  facebook: <Facebook className="size-5 text-[#1877F2]" />,
  tiktok: <Music className="size-5 text-foreground" />,
};

const platformColors: Record<string, string> = {
  instagram: '#E4405F',
  facebook: '#1877F2',
  tiktok: '#6366f1',
};

const platforms = ['instagram', 'facebook', 'tiktok'];

export default function SocialOverview() {
  const { t } = useTranslation();
  const { competitorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [engagementStats, setEngagementStats] = useState<Record<string, any>>({});
  const [sentimentData, setSentimentData] = useState<Record<string, any>>({});
  const [metricsTimeline, setMetricsTimeline] = useState<Record<string, any>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, instagramStats, facebookStats, tiktokStats] = await Promise.all([
        axios.get(`/api/v1/competitors/social/profiles/${competitorId}`),
        axios.get(`/api/v1/competitors/social/engagement/${competitorId}/instagram`).catch(() => null),
        axios.get(`/api/v1/competitors/social/engagement/${competitorId}/facebook`).catch(() => null),
        axios.get(`/api/v1/competitors/social/engagement/${competitorId}/tiktok`).catch(() => null),
      ]);

      setProfiles(profilesRes.data || []);

      const stats: Record<string, any> = {};
      if (instagramStats?.data) stats.instagram = instagramStats.data;
      if (facebookStats?.data) stats.facebook = facebookStats.data;
      if (tiktokStats?.data) stats.tiktok = tiktokStats.data;
      setEngagementStats(stats);
    } catch (error) {
      console.error('Error fetching social data:', error);
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  const fetchSentimentAndMetrics = useCallback(async () => {
    if (!competitorId) return;

    const sentimentResults: Record<string, any> = {};
    const metricsResults: Record<string, any> = {};

    const sentimentPromises = platforms.map(async (platform) => {
      try {
        const res = await axios.get(`/api/v1/competitors/social/sentiment/${competitorId}/${platform}`, {
          params: { months: 3 },
        });
        if (res.data && res.data.length > 0) {
          sentimentResults[platform] = res.data;
        }
      } catch {
        // silently fail
      }
    });

    const metricsPromises = platforms.map(async (platform) => {
      try {
        const res = await axios.get(`/api/v1/competitors/social/metrics/${competitorId}/${platform}`, {
          params: { days: 30 },
        });
        if (res.data && res.data.length > 0) {
          metricsResults[platform] = res.data;
        }
      } catch {
        // silently fail
      }
    });

    await Promise.all([...sentimentPromises, ...metricsPromises]);
    setSentimentData(sentimentResults);
    setMetricsTimeline(metricsResults);
  }, [competitorId]);

  useEffect(() => {
    if (competitorId) {
      fetchData();
      fetchSentimentAndMetrics();
    }
  }, [competitorId, fetchData, fetchSentimentAndMetrics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchSentimentAndMetrics()]);
    setRefreshing(false);
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 5) return 'text-emerald-500';
    if (rate >= 2) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getSentimentTag = (sentiment: string) => {
    if (sentiment === 'positive') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {t('competitors.sentiment.positive')}
        </span>
      );
    }
    if (sentiment === 'negative') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          {t('competitors.sentiment.negative')}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/60">
        {t('competitors.sentiment.neutral')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="animate-spin size-8 text-primary mb-2" />
        <span className="text-xs font-mono">LOADING SOCIAL INTELLIGENCE...</span>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/70 rounded-xl bg-card/40 my-6">
        <Inbox className="size-10 text-muted-foreground/60 mb-2" />
        <h3 className="text-sm font-semibold text-foreground">{t('competitors.social.noSocialProfiles')}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          No social channels linked to this competitor dossier.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background text-foreground space-y-6" dir={i18n.dir()}>
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
                <h1 className="text-xl font-bold tracking-tight">Social Intelligence</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  ENGAGEMENT RADAR
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-channel presence, audience velocity, and community sentiment tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 px-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{t('competitors.refresh')}</span>
            </button>
          </div>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const engRate = Number(engagementStats[profile.platform]?.avgEngagementRate) || 0;
            return (
              <div key={profile.platform} className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {platformIcons[profile.platform]}
                    <span className="capitalize text-xs font-bold text-foreground">{profile.platform}</span>
                    {profile.isVerified && <CheckCircle2 className="text-primary size-3.5" />}
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    profile.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-muted/40 text-muted-foreground border-border/60'
                  }`}>
                    {profile.isActive ? t('competitors.active') : t('competitors.inactive')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/20">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">{t('competitors.followers')}</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
                      {profile.followersCount?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/20">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">{t('competitors.posts')}</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
                      {profile.postsCount?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>

                {engagementStats[profile.platform] && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground text-[11px]">{t('competitors.engagementRate')}</span>
                      <span className={`font-mono font-bold ${getEngagementColor(engRate)}`}>
                        {engRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(engRate * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
                  <div className="p-1.5 rounded bg-muted/10">
                    <ThumbsUp className="mx-auto text-muted-foreground size-3.5" />
                    <div className="text-xs font-bold font-mono tabular-nums mt-1">
                      {engagementStats[profile.platform]?.avgLikes?.toLocaleString() || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t('competitors.avgLikes')}</div>
                  </div>
                  <div className="p-1.5 rounded bg-muted/10">
                    <MessageCircle className="mx-auto text-muted-foreground size-3.5" />
                    <div className="text-xs font-bold font-mono tabular-nums mt-1">
                      {engagementStats[profile.platform]?.avgComments?.toLocaleString() || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t('competitors.avgComments')}</div>
                  </div>
                  <div className="p-1.5 rounded bg-muted/10">
                    <Eye className="mx-auto text-muted-foreground size-3.5" />
                    <div className="text-xs font-bold font-mono tabular-nums mt-1">
                      {engagementStats[profile.platform]?.avgViews?.toLocaleString() || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t('competitors.avgViews')}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sentiment Analysis Panel */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/60">
            <Share2 size={16} className="text-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              {t('competitors.sentiment.title')}
            </h2>
          </div>

          {Object.keys(sentimentData).length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-xs font-mono">
              {t('competitors.sentiment.noData')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(sentimentData).map(([platform, records]) => {
                const latest = records[records.length - 1] || records[0];
                const totalCount = (latest.positiveCount || 0) + (latest.negativeCount || 0) + (latest.neutralCount || 0);
                const posPct = totalCount ? ((latest.positiveCount || 0) / totalCount) * 100 : 0;
                const negPct = totalCount ? ((latest.negativeCount || 0) / totalCount) * 100 : 0;
                const neuPct = totalCount ? ((latest.neutralCount || 0) / totalCount) * 100 : 0;

                return (
                  <div key={platform} className="p-3.5 rounded-lg bg-muted/15 border border-border/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {platformIcons[platform]}
                        <span className="capitalize text-xs font-bold text-foreground">{platform}</span>
                      </div>
                      {getSentimentTag(latest.sentiment)}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">{t('competitors.score')}:</span>
                      <span className="font-bold text-foreground">{latest.score?.toFixed(2) || '—'}</span>
                    </div>

                    <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/40">
                      <div className="bg-emerald-500 transition-all" style={{ width: `${posPct}%` }} />
                      <div className="bg-slate-400 transition-all" style={{ width: `${neuPct}%` }} />
                      <div className="bg-rose-500 transition-all" style={{ width: `${negPct}%` }} />
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
                      <span className="text-emerald-500">{latest.positiveCount || 0} pos</span>
                      <span className="text-muted-foreground">{latest.neutralCount || 0} neu</span>
                      <span className="text-rose-500">{latest.negativeCount || 0} neg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Follower Growth & Velocity */}
        {Object.keys(metricsTimeline).length > 0 && (
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t('competitors.metrics.followersGrowth')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(metricsTimeline).map(([platform, dataPoints]) => {
                const recent = dataPoints.slice(-10);
                const fMax = Math.max(...recent.map((d: any) => d.followersCount || 0), 1);

                return (
                  <div key={platform} className="p-3.5 rounded-lg bg-muted/15 border border-border/50 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                      {platformIcons[platform]}
                      <span className="text-xs font-bold capitalize text-foreground">{platform}</span>
                    </div>

                    <div className="space-y-1">
                      {recent.map((dp: any, i: number) => {
                        const pct = fMax ? ((dp.followersCount || 0) / fMax) * 100 : 0;
                        return (
                          <div key={dp.metricDate || i} className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="text-muted-foreground w-12 truncate">
                              {dp.metricDate ? dp.metricDate.slice(5) : ''}
                            </span>
                            <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-foreground w-12 text-end tabular-nums font-semibold">
                              {(dp.followersCount || 0).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}