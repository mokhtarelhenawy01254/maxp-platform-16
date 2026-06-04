import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Progress, Badge, Spin, Empty, Tag, Button } from 'antd';
import {
  InstagramOutlined,
  FacebookOutlined,
  TikTokOutlined,
  LikeOutlined,
  CommentOutlined,
  ShareAltOutlined,
  EyeOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { RefreshCw } from 'lucide-react';
import axios from 'axios';
import Chart from 'react-chartjs-2';

const platformIcons = {
  instagram: <InstagramOutlined style={{ fontSize: 24, color: '#E4405F' }} />,
  facebook: <FacebookOutlined style={{ fontSize: 24, color: '#1877F2' }} />,
  tiktok: <TikTokOutlined style={{ fontSize: 24, color: '#000000' }} />,
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
    if (sentiment === 'positive') return <Tag color="green">{t('competitors.sentiment.positive') || 'Positive'}</Tag>;
    if (sentiment === 'negative') return <Tag color="red">{t('competitors.sentiment.negative') || 'Negative'}</Tag>;
    return <Tag color="default">{t('competitors.sentiment.neutral') || 'Neutral'}</Tag>;
  };

  if (loading) return <Spin size="large" className="flex justify-center mt-10" />;

  if (profiles.length === 0) {
    return (
      <Empty description={t('competitors.noSocialProfiles')} className="mt-10">
        <Tag color="blue">{t('competitors.addSocialProfile')}</Tag>
      </Empty>
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
    <div className="space-y-6" dir="auto">
      <div className="flex justify-end">
        <Button
          icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
          onClick={handleRefresh}
          loading={refreshing}
        >
          {t('competitors.refresh') || 'Refresh'}
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {profiles.map((profile) => (
          <Col xs={24} md={8} key={profile.platform}>
            <Card
              title={
                <div className="flex items-center gap-2">
                  {platformIcons[profile.platform]}
                  <span className="capitalize">{profile.platform}</span>
                  {profile.isVerified && (
                    <CheckCircleOutlined style={{ color: '#1890ff' }} />
                  )}
                </div>
              }
              extra={
                <Badge
                  status={profile.isActive ? 'success' : 'default'}
                  text={profile.isActive ? t('competitors.active') : t('competitors.inactive')}
                />
              }
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t('competitors.followers')}</span>
                  <span className="text-xl font-bold">
                    {profile.followersCount?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t('competitors.posts')}</span>
                  <span className="text-lg">{profile.postsCount || 0}</span>
                </div>

                {engagementStats[profile.platform] && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">{t('competitors.engagementRate')}</span>
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
                      percent={Math.min(Number(engagementStats[profile.platform].avgEngagementRate) || 0, 100)}
                      strokeColor={getEngagementColor(
                        Number(engagementStats[profile.platform].avgEngagementRate) || 0
                      )}
                      showInfo={false}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center">
                    <LikeOutlined className="text-gray-400" />
                    <div className="text-sm">
                      {engagementStats[profile.platform]?.avgLikes?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-400">{t('competitors.avgLikes')}</div>
                  </div>
                  <div className="text-center">
                    <CommentOutlined className="text-gray-400" />
                    <div className="text-sm">
                      {engagementStats[profile.platform]?.avgComments?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-400">{t('competitors.avgComments')}</div>
                  </div>
                  <div className="text-center">
                    <EyeOutlined className="text-gray-400" />
                    <div className="text-sm">
                      {engagementStats[profile.platform]?.avgViews?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-400">{t('competitors.avgViews')}</div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={t('competitors.engagementComparison')}>
        <Row gutter={16}>
          {Object.entries(engagementStats).map(([platform, stats]) => (
            <Col span={8} key={platform}>
              <div className="text-center mb-4">
                {platformIcons[platform]}
                <div className="text-2xl font-bold mt-2">
                  {stats.avgEngagementRate}%
                </div>
                <div className="text-gray-400 dark:text-gray-500">{t('competitors.avgEngagement')}</div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title={t('competitors.sentiment.title') || 'Sentiment Analysis'}>
        {Object.keys(sentimentData).length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-4">
            {t('competitors.sentiment.noData') || 'No sentiment data yet'}
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {Object.entries(sentimentData).map(([platform, records]) => {
              const latest = records[records.length - 1] || records[0];
              const totalCount = (latest.positiveCount || 0) + (latest.negativeCount || 0) + (latest.neutralCount || 0);
              const posPct = totalCount ? ((latest.positiveCount || 0) / totalCount) * 100 : 0;
              const negPct = totalCount ? ((latest.negativeCount || 0) / totalCount) * 100 : 0;
              const neuPct = totalCount ? ((latest.neutralCount || 0) / totalCount) * 100 : 0;

              return (
                <Col xs={24} md={8} key={platform}>
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                      {platformIcons[platform]}
                      <span className="capitalize font-medium">{platform}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Score:</span>
                      <span className="font-bold text-lg">{latest.score?.toFixed(2) || '—'}</span>
                      {getSentimentTag(latest.sentiment)}
                    </div>
                    <div className="flex h-6 rounded overflow-hidden">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${posPct}%` }}
                        title={`Positive: ${latest.positiveCount || 0}`}
                      />
                      <div
                        className="bg-gray-400 transition-all"
                        style={{ width: `${neuPct}%` }}
                        title={`Neutral: ${latest.neutralCount || 0}`}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${negPct}%` }}
                        title={`Negative: ${latest.negativeCount || 0}`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                      <span>{latest.positiveCount || 0} pos</span>
                      <span>{latest.neutralCount || 0} neu</span>
                      <span>{latest.negativeCount || 0} neg</span>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      <Card title={t('competitors.metrics.followersGrowth') || 'Followers Growth'}>
        {Object.keys(metricsTimeline).length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-4">
            {t('competitors.metrics.noData') || 'No metrics data yet'}
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
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {t('competitors.metrics.followersGrowth') || 'Followers'} — {t('competitors.metrics.engagementTrend') || 'Engagement'}
                    </span>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                      {t('competitors.metrics.followersGrowth') || 'Followers Growth'}
                    </div>
                    <div className="space-y-0.5">
                      {recent.map((dp, i) => {
                        const pct = fMax ? ((dp.followersCount || 0) / fMax) * 100 : 0;
                        return (
                          <div key={dp.metricDate || i} className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 w-16 truncate">
                              {dp.metricDate ? dp.metricDate.slice(5) : ''}
                            </span>
                            <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded">
                              <div
                                className="h-full rounded transition-all"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 w-14 text-right">
                              {(dp.followersCount || 0).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                      {t('competitors.metrics.engagementTrend') || 'Engagement Trend'}
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
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      <span>{recent.length > 0 ? recent[0].metricDate?.slice(5) : ''}</span>
                      <span>{recent.length > 0 ? recent[recent.length - 1].metricDate?.slice(5) : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}