import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Loader2,
  Instagram,
  Facebook,
  Music,
  ThumbsUp,
  MessageCircle,
  Eye,
  CheckCircle,
  Inbox,
} from 'lucide-react';
import axios from 'axios';
import i18n from '../../../i18n';

const platformIcons = {
  instagram: <Instagram className="size-6 text-[#E4405F]" />,
  facebook: <Facebook className="size-6 text-[#1877F2]" />,
  tiktok: <Music className="size-6" />,
};

const platformColors = {
  instagram: '#E4405F',
  facebook: '#1877F2',
  tiktok: '#000000',
};

const platforms = ['instagram', 'facebook', 'tiktok'];

export default function SocialOverview() {
  const { t } = useTranslation();
  const { competitorId } = useParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [engagementStats, setEngagementStats] = useState({});
  const [metricsHistory, setMetricsHistory] = useState({});
  const [sentimentData, setSentimentData] = useState({});
  const [metricsTimeline, setMetricsTimeline] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, instagramStats, facebookStats, tiktokStats] = await Promise.all([
        axios.get(`/api/v1/competitors/social/profiles/${competitorId}`),
        axios.get(`/api/v1/competitors/social/engagement/${competitorId}/instagram`).catch(() => null),
        axios.get(`/api/v1/competitors/social/engagement/${competitorId}/facebook`).catch(() => null),
        axios.get(`/api/v1/competitors/social/engagement/${competitorId}/tiktok`).catch(() => null),
      ]);

      setProfiles(profilesRes.data);

      const stats = {};
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

    const sentimentResults = {};
    const metricsResults = {};

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

  const getEngagementColor = (rate) => {
    if (rate >= 5) return '#52c41a';
    if (rate >= 2) return '#faad14';
    return '#f5222d';
  };

  const getSentimentTag = (sentiment) => {
    if (sentiment === 'positive') return <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">{t('competitors.sentiment.positive')}</Badge>;
    if (sentiment === 'negative') return <Badge variant="destructive">{t('competitors.sentiment.negative')}</Badge>;
    return <Badge variant="outline">{t('competitors.sentiment.neutral')}</Badge>;
  };

  if (loading) return <Loader2 className="animate-spin mx-auto mt-10 size-8" />;

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center mt-10 text-muted-foreground">
        <Inbox className="size-12 mb-2" />
        <p>{t('competitors.noSocialProfiles')}</p>
        <Badge variant="outline" className="mt-2 border-blue-500 text-blue-500">
          {t('competitors.addSocialProfile')}
        </Badge>
      </div>
    );
  }

  const maxFollowers = Math.max(
    ...Object.values(metricsTimeline).flatMap((data) =>
      data.map((d) => d.followersCount || 0)
    ),
    1
  );

  const maxEngagement = Math.max(
    ...Object.values(metricsTimeline).flatMap((data) =>
      data.map((d) => d.engagementRate || 0)
    ),
    1
  );

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <div className="flex justify-end">
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('competitors.refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card key={profile.platform}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                {platformIcons[profile.platform]}
                <span className="capitalize">{profile.platform}</span>
                {profile.isVerified && (
                  <CheckCircle className="text-blue-500 size-4" />
                )}
              </CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${profile.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {profile.isActive ? t('competitors.active') : t('competitors.inactive')}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('competitors.followers')}</span>
                  <span className="text-xl font-bold">
                    {profile.followersCount?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('competitors.posts')}</span>
                  <span className="text-lg">{profile.postsCount || 0}</span>
                </div>

                {engagementStats[profile.platform] && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t('competitors.engagementRate')}</span>
                      <span
                        className="font-bold"
                        style={{
                          color: getEngagementColor(
                            Number(engagementStats[profile.platform].avgEngagementRate) || 0
                          ),
                        }}
                      >
                        {engagementStats[profile.platform].avgEngagementRate}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(Number(engagementStats[profile.platform].avgEngagementRate) || 0, 100)}
                      className="[&>div]:bg-[var(--progress-color)]"
                      style={{ '--progress-color': getEngagementColor(Number(engagementStats[profile.platform].avgEngagementRate) || 0) } as React.CSSProperties}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center">
                    <ThumbsUp className="mx-auto text-muted-foreground size-4" />
                    <div className="text-sm">
                      {engagementStats[profile.platform]?.avgLikes?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{t('competitors.avgLikes')}</div>
                  </div>
                  <div className="text-center">
                    <MessageCircle className="mx-auto text-muted-foreground size-4" />
                    <div className="text-sm">
                      {engagementStats[profile.platform]?.avgComments?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{t('competitors.avgComments')}</div>
                  </div>
                  <div className="text-center">
                    <Eye className="mx-auto text-muted-foreground size-4" />
                    <div className="text-sm">
                      {engagementStats[profile.platform]?.avgViews?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{t('competitors.avgViews')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('competitors.engagementComparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(engagementStats).map(([platform, stats]) => (
              <div className="text-center" key={platform}>
                {platformIcons[platform]}
                <div className="text-2xl font-bold mt-2">
                  {stats.avgEngagementRate}%
                </div>
                <div className="text-muted-foreground">{t('competitors.avgEngagement')}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('competitors.sentiment.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(sentimentData).length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
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
                  <div key={platform} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                      {platformIcons[platform]}
                      <span className="capitalize font-medium">{platform}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">{t('competitors.score')}:</span>
                      <span className="font-bold text-lg">{latest.score?.toFixed(2) || '—'}</span>
                      {getSentimentTag(latest.sentiment)}
                    </div>
                    <div className="flex h-6 rounded overflow-hidden">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${posPct}%` }}
                        title={`${t('competitors.positive')}: ${latest.positiveCount || 0}`}
                      />
                      <div
                        className="bg-gray-400 transition-all"
                        style={{ width: `${neuPct}%` }}
                        title={`${t('competitors.neutral')}: ${latest.neutralCount || 0}`}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${negPct}%` }}
                        title={`${t('competitors.negative')}: ${latest.negativeCount || 0}`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{latest.positiveCount || 0} {t('competitors.positive')}</span>
                      <span>{latest.neutralCount || 0} {t('competitors.neutral')}</span>
                      <span>{latest.negativeCount || 0} {t('competitors.negative')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('competitors.metrics.followersGrowth')}</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(metricsTimeline).length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              {t('competitors.metrics.noData')}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(metricsTimeline).map(([platform, dataPoints]) => {
                const color = platformColors[platform] || '#888';
                const recent = dataPoints.slice(-30);
                const fMax = Math.max(...recent.map((d) => d.followersCount || 0), 1);
                const eMax = Math.max(...recent.map((d) => d.engagementRate || 0), 0.1);

                return (
                  <div key={platform}>
                    <div className="flex items-center gap-2 mb-2">
                      {platformIcons[platform]}
                      <span className="font-medium capitalize">{platform}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('competitors.metrics.followersGrowth')} — {t('competitors.metrics.engagementTrend')}
                      </span>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('competitors.metrics.followersGrowth')}
                      </div>
                      <div className="space-y-0.5">
                        {recent.map((dp, i) => {
                          const pct = fMax ? ((dp.followersCount || 0) / fMax) * 100 : 0;
                          return (
                            <div key={dp.metricDate || i} className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground w-16 truncate">
                                {dp.metricDate ? dp.metricDate.slice(5) : ''}
                              </span>
                              <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded">
                                <div
                                  className="h-full rounded transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-14 text-end">
                                {(dp.followersCount || 0).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('competitors.metrics.engagementTrend')}
                      </div>
                      <div className="flex items-end h-16 gap-px">
                        {recent.slice(-30).map((dp, i) => {
                          const pct = eMax ? ((dp.engagementRate || 0) / eMax) * 100 : 0;
                          return (
                            <div
                              key={dp.metricDate || i}
                              className="flex-1 rounded-t transition-all"
                              style={{
                                height: `${pct}%`,
                                backgroundColor: color,
                                minHeight: dp.engagementRate ? '2px' : '0',
                                opacity: 0.8,
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span>{recent.length > 0 ? recent[0].metricDate?.slice(5) : ''}</span>
                        <span>{recent.length > 0 ? recent[recent.length - 1].metricDate?.slice(5) : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}