import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Loader2,
  DollarSign,
  Eye,
  MousePointerClick,
  Headphones,
  Inbox,
} from 'lucide-react';
import axios from 'axios';
import i18n from '../../../i18n';

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
          <div className="font-medium">{text || t('competitors.notAvailable')}</div>
          <div className="text-xs text-gray-400">{record.objective || ''}</div>
        </div>
      ),
    },
    {
      title: t('competitors.platform'),
      dataIndex: 'platform',
      key: 'platform',
      render: (platform) => (
        <Badge variant="outline" style={{ borderColor: platformColors[platform] || '#999', color: platformColors[platform] || '#999' }}>
          {t(`competitors.platforms.${platform}`) || platform?.toUpperCase()}
        </Badge>
      ),
    },
    {
      title: t('competitors.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span className="flex items-center gap-1 text-xs">
          <span className={`h-2 w-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
          {status === 'active' ? t('competitors.active') : t('competitors.inactive')}
        </span>
      ),
    },
    {
      title: t('competitors.budget'),
      dataIndex: 'budget',
      key: 'budget',
      render: (budget) =>
        budget ? (
          <span className="font-medium">{i18n.language === 'ar' ? 'ر.س' : '$'}{Number(budget).toLocaleString()}</span>
        ) : (
          t('competitors.notAvailable')
        ),
    },
    {
      title: t('competitors.spend'),
      dataIndex: 'spend',
      key: 'spend',
      render: (spend) =>
        spend ? <span>{i18n.language === 'ar' ? 'ر.س' : '$'}{Number(spend).toLocaleString()}</span> : t('competitors.notAvailable'),
    },
    {
      title: t('competitors.impressions'),
      dataIndex: 'impressions',
      key: 'impressions',
      render: (impressions) =>
        impressions ? impressions.toLocaleString() : t('competitors.notAvailable'),
    },
    {
      title: t('competitors.ctr'),
      dataIndex: 'ctr',
      key: 'ctr',
      render: (ctr) => (ctr ? `${Number(ctr).toFixed(2)}%` : t('competitors.notAvailable')),
    },
    {
      title: t('competitors.roas'),
      dataIndex: 'roas',
      key: 'roas',
      render: (roas) => (roas ? `${Number(roas).toFixed(2)}x` : t('competitors.notAvailable')),
    },
  ];

  if (loading) return <Loader2 className="animate-spin mx-auto mt-10 size-8" />;

  if (!summary || campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center mt-10 text-muted-foreground">
        <Inbox className="size-12 mb-2" />
        <p>{t('competitors.noAdData')}</p>
        <Badge variant="outline" className="mt-2 border-blue-500 text-blue-500">
          {t('competitors.addAdData')}
        </Badge>
      </div>
    );
  }

  const renderCampaignsTable = () => {
    if (!campaigns.length) return null;
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {campaignColumns.map((col) => (
                <TableHead key={col.key}>{col.title}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.slice(0, 10).map((row) => (
              <TableRow key={row.id}>
                {campaignColumns.map((col) => (
                  <TableCell key={col.key}>{col.render ? col.render(row[col.dataIndex], row) : row[col.dataIndex]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('competitors.adOverview')}</h2>
        <Select value={platformFilter || ''} onValueChange={(v) => setPlatformFilter(v || null)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('competitors.filterPlatform')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="facebook">{t('competitors.platforms.facebook')}</SelectItem>
            <SelectItem value="google">{t('competitors.platforms.google')}</SelectItem>
            <SelectItem value="tiktok">{t('competitors.platforms.tiktok')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card size="sm">
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Headphones className="size-4" />
              {t('competitors.totalCampaigns')}
            </div>
            <div className="text-2xl font-bold mt-1">{summary.totalCampaigns}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-sm text-muted-foreground">{t('competitors.activeCampaigns')}</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{summary.activeCampaigns}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="size-4" />
              {t('competitors.totalSpend')}
            </div>
            <div className="text-2xl font-bold mt-1">{i18n.language === 'ar' ? 'ر.س' : '$'}{Number(summary.totalSpend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-sm text-muted-foreground">{t('competitors.avgCTR')}</div>
            <div className="text-2xl font-bold mt-1">{Number(summary.avgCTR).toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('competitors.impressions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalImpressions?.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('competitors.clicks')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClicks?.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('competitors.conversions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalConversions?.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('competitors.platformBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {summary.platformStats?.map((stat) => (
              <div key={stat.platform} className="text-center p-4 border rounded">
                <Badge variant="outline" style={{ fontSize: 16, borderColor: platformColors[stat.platform], color: platformColors[stat.platform] }}>
                  {t(`competitors.platforms.${stat.platform}`) || stat.platform?.toUpperCase()}
                </Badge>
                <div className="mt-2">
                  <div className="text-2xl font-bold">
                    {stat.campaignCount} {t('competitors.campaigns')}
                  </div>
                  <div className="text-muted-foreground">
                    {i18n.language === 'ar' ? 'ر.س' : '$'}{stat.totalSpend?.toLocaleString()} {t('competitors.spend')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('competitors.campaigns')}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderCampaignsTable()}
        </CardContent>
      </Card>

      {creatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('competitors.topCreatives')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {creatives.slice(0, 6).map((creative) => (
                <Card key={creative.id}>
                  {creative.imageUrl && (
                    <img
                      src={creative.imageUrl}
                      alt={t('competitors.adOverview')}
                      className="w-full h-[150px] object-cover rounded-t-xl"
                    />
                  )}
                  <CardContent className="space-y-2">
                    <div className="font-medium">{creative.headline || t('competitors.notAvailable')}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {creative.primaryText?.slice(0, 100)}...
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Eye className="size-4" /> {creative.impressions?.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="size-4" /> {creative.clicks?.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}