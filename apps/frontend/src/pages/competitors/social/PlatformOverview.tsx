import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Globe, Inbox, Loader2, Mail, MapPin, Pin, ShoppingBag, Star, Store } from 'lucide-react';
import axios from 'axios';

const platformIcons = {
  amazon: <ShoppingBag className="size-5 text-[#FF9900]" />,
  google: <MapPin className="size-5 text-[#4285F4]" />,
  shopify: <Store className="size-5 text-[#96BF48]" />,
  tech: <Globe className="size-5 text-[#666]" />,
};

export default function PlatformOverview() {
  const { t } = useTranslation();
  const { competitorId } = useParams();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [amazonProducts, setAmazonProducts] = useState([]);
  const [googleBusiness, setGoogleBusiness] = useState(null);
  const [techStack, setTechStack] = useState([]);
  const [activeTab, setActiveTab] = useState('amazon');

  useEffect(() => {
    if (competitorId) {
      fetchData();
    }
  }, [competitorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, amazonRes, googleRes, techRes] = await Promise.all([
        axios.get(`/api/v1/competitors/platform/summary/${competitorId}`),
        axios.get(`/api/v1/competitors/platform/amazon/${competitorId}`).catch(() => []),
        axios.get(`/api/v1/competitors/platform/google/${competitorId}`).catch(() => null),
        axios.get(`/api/v1/competitors/platform/techstack/${competitorId}`).catch(() => []),
      ]);

      setSummary(summaryRes.data);
      setAmazonProducts(amazonRes.data?.slice(0, 20) || []);
      setGoogleBusiness(googleRes.data);
      setTechStack(techRes.data);
    } catch (error) {
      console.error('Error fetching platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const amazonColumns = [
    {
      title: t('competitors.product'),
      dataIndex: 'productTitle',
      key: 'productTitle',
      render: (text, record) => (
        <div className="flex items-center gap-2">
          {record.imageUrl && (
            <img src={record.imageUrl} alt="" className="w-10 h-10 object-contain" />
          )}
          <span className="line-clamp-2">{text}</span>
        </div>
      ),
    },
    {
      title: t('competitors.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => (
        <span className="font-medium">
          {record.currency} {price ? Number(price).toFixed(2) : t('competitors.notAvailable')}
        </span>
      ),
    },
    {
      title: t('competitors.bsr'),
      dataIndex: 'bsrRank',
      key: 'bsrRank',
      render: (rank) => (rank ? `#${rank.toLocaleString()}` : t('competitors.notAvailable')),
    },
    {
      title: t('competitors.reviews'),
      dataIndex: 'reviewCount',
      key: 'reviewCount',
      render: (count) => count?.toLocaleString() || '0',
    },
    {
      title: t('competitors.rating'),
      dataIndex: 'reviewRating',
      key: 'reviewRating',
      render: (rating) => (
        <span className="flex items-center gap-1">
          <Star className="size-4 text-yellow-500" />
          {rating ? Number(rating).toFixed(1) : t('competitors.notAvailable')}
        </span>
      ),
    },
    {
      title: t('competitors.prime'),
      dataIndex: 'isPrime',
      key: 'isPrime',
      render: (isPrime) =>
        isPrime ? (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">{t('competitors.primeLabel')}</Badge>
        ) : (
          <Badge variant="outline">{t('competitors.standardLabel')}</Badge>
        ),
    },
    {
      title: t('competitors.status'),
      dataIndex: 'isAvailable',
      key: 'isAvailable',
      render: (isAvailable) => (
        <span className="flex items-center gap-1 text-xs">
          <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
          {isAvailable ? t('competitors.inStock') : t('competitors.outOfStock')}
        </span>
      ),
    },
  ];

  const techColumns = [
    {
      title: t('competitors.category'),
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Badge variant="outline" className="border-blue-500 text-blue-500">{cat}</Badge>,
    },
    {
      title: t('competitors.technology'),
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-medium">{name}</span>,
    },
    {
      title: t('competitors.version'),
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: t('competitors.confidence'),
      dataIndex: 'confidence',
      key: 'confidence',
      render: (conf) => {
        if (conf === 'high') return <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t('competitors.high')}</Badge>;
        if (conf === 'medium') return <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">{t('competitors.medium')}</Badge>;
        return <Badge variant="destructive">{t('competitors.low')}</Badge>;
      },
    },
  ];

  if (loading) return <Loader2 className="animate-spin mx-auto mt-10 size-8" />;

  if (!summary) {
    return (
      <div className="flex flex-col items-center mt-10 text-muted-foreground">
        <Inbox className="size-12 mb-2" />
        <p>{t('competitors.platforms.noPlatformData')}</p>
        <Badge variant="outline" className="mt-2 border-blue-500 text-blue-500">
          {t('competitors.platforms.addPlatformData')}
        </Badge>
      </div>
    );
  }

  const renderAmazonProductsTable = () => {
    if (!amazonProducts.length) return null;
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {amazonColumns.map((col) => (
                <TableHead key={col.key}>{col.title}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {amazonProducts.slice(0, 10).map((row) => (
              <TableRow key={row.asin}>
                {amazonColumns.map((col) => (
                  <TableCell key={col.key}>{col.render ? col.render(row[col.dataIndex], row) : row[col.dataIndex]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderTechTable = () => {
    if (!techStack.length) return null;
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {techColumns.map((col) => (
                <TableHead key={col.key}>{col.title}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {techStack.slice(0, 20).map((row) => (
              <TableRow key={row.id}>
                {techColumns.map((col) => (
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-blue-500 data-[active=true]:border-blue-500" data-active={activeTab === 'amazon'} onClick={() => setActiveTab('amazon')}>
          <CardContent className="text-center py-4">
            {platformIcons.amazon}
            <div className="text-xl font-bold mt-2">
              {summary.amazon?.totalProducts || 0}
            </div>
            <div className="text-muted-foreground text-sm">{t('competitors.amazonProducts')}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500 data-[active=true]:border-blue-500" data-active={activeTab === 'google'} onClick={() => setActiveTab('google')}>
          <CardContent className="text-center py-4">
            {platformIcons.google}
            <div className="text-xl font-bold mt-2">
              {summary.googleBusiness?.rating || t('competitors.notAvailable')}
            </div>
            <div className="text-muted-foreground text-sm">{t('competitors.googleRating')}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500 data-[active=true]:border-blue-500" data-active={activeTab === 'tech'} onClick={() => setActiveTab('tech')}>
          <CardContent className="text-center py-4">
            {platformIcons.tech}
            <div className="text-xl font-bold mt-2">{summary.techStack || 0}</div>
            <div className="text-muted-foreground text-sm">{t('competitors.technologies')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            {platformIcons.shopify}
            <div className="text-xl font-bold mt-2">
              {summary.shopify?.productsCount || 0}
            </div>
            <div className="text-muted-foreground text-sm">{t('competitors.shopifyProducts')}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="amazon" className="flex items-center gap-1">
            {platformIcons.amazon} {t('competitors.platforms.amazonTab')}
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-1">
            {platformIcons.google} {t('competitors.platforms.googleTab')}
          </TabsTrigger>
          <TabsTrigger value="tech" className="flex items-center gap-1">
            {platformIcons.tech} {t('competitors.platforms.techStackTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="amazon">
          <div className="space-y-4">
            {summary.amazon && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card size="sm">
                  <CardContent>
                    <div className="text-sm text-muted-foreground">{t('competitors.totalProducts')}</div>
                    <div className="text-2xl font-bold">{summary.amazon.totalProducts}</div>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent>
                    <div className="text-sm text-muted-foreground">{t('competitors.avgPrice')}</div>
                    <div className="text-2xl font-bold">{t('competitors.currency')}{Number(summary.amazon.avgPrice).toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent>
                    <div className="text-sm text-muted-foreground">{t('competitors.avgRating')}</div>
                    <div className="text-2xl font-bold">{Number(summary.amazon.avgRating).toFixed(1)} <span className="text-sm text-muted-foreground">/ 5</span></div>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent>
                    <div className="text-sm text-muted-foreground">{t('competitors.primePercentage')}</div>
                    <div className="text-2xl font-bold">{Number(summary.amazon.primePercentage).toFixed(1)}%</div>
                  </CardContent>
                </Card>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>{t('competitors.amazonProducts')}</CardTitle>
              </CardHeader>
              <CardContent>
                {renderAmazonProductsTable()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="google">
          {summary.googleBusiness ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('competitors.businessInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex">
                    <span className="text-muted-foreground w-24 shrink-0">{t('competitors.address')}:</span>
                    <span>{summary.googleBusiness.address || t('competitors.notAvailable')}</span>
                  </div>
                  <div className="flex">
                    <span className="text-muted-foreground w-24 shrink-0">{t('competitors.phone')}:</span>
                    <span>{summary.googleBusiness.phone || t('competitors.notAvailable')}</span>
                  </div>
                  <div className="flex">
                    <span className="text-muted-foreground w-24 shrink-0">{t('competitors.website')}:</span>
                    <a href={summary.googleBusiness.website} target="_blank" rel="noopener">
                      {summary.googleBusiness.website || t('competitors.notAvailable')}
                    </a>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('competitors.ratings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`size-5 ${star <= Math.round(Number(summary.googleBusiness.rating) || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                      <div className="text-2xl font-bold mt-2">
                        {summary.googleBusiness.rating}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {summary.googleBusiness.reviewsCount?.toLocaleString()}{' '}
                        {t('competitors.reviews')}
                      </div>
                    </div>
                    <div className="text-center p-4">
                      <div
                        className="text-4xl mb-2"
                        style={{
                          color:
                            summary.googleBusiness.rating >= 4
                              ? '#52c41a'
                              : summary.googleBusiness.rating >= 3
                              ? '#faad14'
                              : '#f5222d',
                        }}
                      >
                        {summary.googleBusiness.rating >= 4
                          ? t('competitors.great')
                          : summary.googleBusiness.rating >= 3
                          ? t('competitors.good')
                          : t('competitors.poor')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Inbox className="size-12 mx-auto mb-2" />
              <p>{t('competitors.noGoogleData')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tech">
          {techStack.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card size="sm">
                  <CardContent>
                    <div className="text-sm text-muted-foreground">{t('competitors.totalTechnologies')}</div>
                    <div className="text-2xl font-bold">{summary.techStack}</div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>{t('competitors.categories')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {summary.techCategories?.map((cat) => (
                        <Badge key={cat} variant="outline" className="border-blue-500 text-blue-500">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('competitors.technologies')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderTechTable()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Inbox className="size-12 mx-auto mb-2" />
              <p>{t('competitors.noTechData')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}