import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Table, Tag, Badge, Spin, Empty, Progress, Select, Statistic } from 'antd';
import {
  DollarOutlined,
  EyeOutlined,
  InteractionOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const platformColors = {
  facebook: '#1877F2',
  google: '#4285F4',
  tiktok: '#000000',
};

export default function AdIntelligence() {
  const { t } = useTranslation();
  const { competitorId } = useParams();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [platformFilter, setPlatformFilter] = useState(null);

  useEffect(() => {
    if (competitorId) {
      fetchData();
    }
  }, [competitorId, platformFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, campaignsRes, topCreativesRes] = await Promise.all([
        axios.get(`/api/v1/competitors/ads/summary/${competitorId}`, {
          params: platformFilter ? { platform: platformFilter } : {},
        }),
        axios.get(`/api/v1/competitors/ads/campaigns/${competitorId}`, {
          params: platformFilter ? { platform: platformFilter } : {},
        }),
        axios.get(`/api/v1/competitors/ads/top-creatives/${competitorId}`, {
          params: { platform: platformFilter || 'facebook', limit: 10 },
        }),
      ]);

      setSummary(summaryRes.data);
      setCampaigns(campaignsRes.data);
      setCreatives(topCreativesRes.data);
    } catch (error) {
      console.error('Error fetching ad data:', error);
    } finally {
      setLoading(false);
    }
  };

  const campaignColumns = [
    {
      title: t('competitors.campaignName'),
      dataIndex: 'campaignName',
      key: 'campaignName',
      render: (text, record) => (
        <div>
          <div className="font-medium">{text || 'N/A'}</div>
          <div className="text-xs text-gray-400">{record.objective || ''}</div>
        </div>
      ),
    },
    {
      title: t('competitors.platform'),
      dataIndex: 'platform',
      key: 'platform',
      render: (platform) => (
        <Tag color={platformColors[platform] || '#999'}>{platform?.toUpperCase()}</Tag>
      ),
    },
    {
      title: t('competitors.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge status={status === 'active' ? 'success' : 'default'} text={status} />
      ),
    },
    {
      title: t('competitors.budget'),
      dataIndex: 'budget',
      key: 'budget',
      render: (budget) =>
        budget ? (
          <span className="font-medium">${Number(budget).toLocaleString()}</span>
        ) : (
          'N/A'
        ),
    },
    {
      title: t('competitors.spend'),
      dataIndex: 'spend',
      key: 'spend',
      render: (spend) =>
        spend ? <span>${Number(spend).toLocaleString()}</span> : 'N/A',
    },
    {
      title: t('competitors.impressions'),
      dataIndex: 'impressions',
      key: 'impressions',
      render: (impressions) =>
        impressions ? impressions.toLocaleString() : 'N/A',
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      render: (ctr) => (ctr ? `${Number(ctr).toFixed(2)}%` : 'N/A'),
    },
    {
      title: 'ROAS',
      dataIndex: 'roas',
      key: 'roas',
      render: (roas) => (roas ? `${Number(roas).toFixed(2)}x` : 'N/A'),
    },
  ];

  if (loading) return <Spin size="large" className="flex justify-center mt-10" />;

  if (!summary || campaigns.length === 0) {
    return (
      <Empty description={t('competitors.noAdData')} className="mt-10">
        <Tag color="blue">{t('competitors.addAdData')}</Tag>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('competitors.adOverview')}</h2>
        <Select
          placeholder={t('competitors.filterPlatform')}
          allowClear
          style={{ width: 150 }}
          onChange={setPlatformFilter}
          options={[
            { label: 'Facebook', value: 'facebook' },
            { label: 'Google', value: 'google' },
            { label: 'TikTok', value: 'tiktok' },
          ]}
        />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title={t('competitors.totalCampaigns')}
              value={summary.totalCampaigns}
              prefix={<CustomerServiceOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title={t('competitors.activeCampaigns')}
              value={summary.activeCampaigns}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title={t('competitors.totalSpend')}
              value={summary.totalSpend}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title={t('competitors.avgCTR')}
              value={summary.avgCTR}
              suffix="%"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title={t('competitors.impressions')}>
            <Statistic
              value={summary.totalImpressions}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('competitors.clicks')}>
            <Statistic value={summary.totalClicks} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('competitors.conversions')}>
            <Statistic value={summary.totalConversions} />
          </Card>
        </Col>
      </Row>

      <Card title={t('competitors.platformBreakdown')}>
        <Row gutter={16}>
          {summary.platformStats?.map((stat) => (
            <Col span={8} key={stat.platform}>
              <div className="text-center p-4 border rounded">
                <Tag color={platformColors[stat.platform]} style={{ fontSize: 16 }}>
                  {stat.platform?.toUpperCase()}
                </Tag>
                <div className="mt-2">
                  <div className="text-2xl font-bold">
                    {stat.campaignCount} {t('competitors.campaigns')}
                  </div>
                  <div className="text-gray-400">
                    ${stat.totalSpend?.toLocaleString()} {t('competitors.spend')}
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title={t('competitors.campaigns')}>
        <Table
          dataSource={campaigns}
          columns={campaignColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {creatives.length > 0 && (
        <Card title={t('competitors.topCreatives')}>
          <Row gutter={[16, 16]}>
            {creatives.slice(0, 6).map((creative) => (
              <Col xs={24} md={8} key={creative.id}>
                <Card
                  cover={creative.imageUrl && (
                    <img
                      src={creative.imageUrl}
                      alt="ad"
                      style={{ height: 150, objectFit: 'cover' }}
                    />
                  )}
                >
                  <div className="space-y-2">
                    <div className="font-medium">{creative.headline || 'N/A'}</div>
                    <div className="text-sm text-gray-500 line-clamp-2">
                      {creative.primaryText?.slice(0, 100)}...
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>
                        <EyeOutlined /> {creative.impressions?.toLocaleString()}
                      </span>
                      <span>
                        <InteractionOutlined /> {creative.clicks?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
}