import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Loader2, ShoppingBag, MapPin, Store, Globe, Star, Inbox } from 'lucide-react';
import axios from 'axios';

const platformIcons = {
  amazon: <ShoppingBag className="size-4 text-amber-500" />,
  google: <MapPin className="size-4 text-sky-500" />,
  shopify: <Store className="size-4 text-emerald-500" />,
  tech: <Globe className="size-4 text-primary" />,
};

export default function PlatformOverview() {
  const { t } = useTranslation();
  const { competitorId } = useParams();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [amazonProducts, setAmazonProducts] = useState<any[]>([]);
  const [googleBusiness, setGoogleBusiness] = useState<any>(null);
  const [techStack, setTechStack] = useState<any[]>([]);
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
        axios.get(`/api/v1/competitors/platform/amazon/${competitorId}`).catch(() => ({ data: [] })),
        axios.get(`/api/v1/competitors/platform/google/${competitorId}`).catch(() => ({ data: null })),
        axios.get(`/api/v1/competitors/platform/techstack/${competitorId}`).catch(() => ({ data: [] })),
      ]);

      setSummary(summaryRes.data);
      setAmazonProducts(amazonRes.data?.slice(0, 20) || []);
      setGoogleBusiness(googleRes.data);
      setTechStack(techRes.data || []);
    } catch (error) {
      console.error('Error fetching platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-2 bg-card border border-border/70 rounded-2xl p-8">
        <Loader2 className="animate-spin mx-auto size-7 text-primary" />
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground bg-card border border-border/70 rounded-2xl p-8 space-y-2">
        <Inbox className="size-10 text-muted-foreground/50 mb-1" />
        <p className="text-xs sm:text-sm font-semibold text-foreground">{t('competitors.platforms.noPlatformData')}</p>
        <Badge variant="outline" className="border-border/70 text-xs">
          {t('competitors.platforms.addPlatformData')}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-foreground">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('amazon')}
          className={`p-3.5 sm:p-4 rounded-xl border transition-colors cursor-pointer shadow-xs ${
            activeTab === 'amazon' ? 'bg-card border-primary/40' : 'bg-card border-border/70 hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">{t('competitors.amazonProducts')}</span>
            {platformIcons.amazon}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
            {summary.amazon?.totalProducts || 0}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('google')}
          className={`p-3.5 sm:p-4 rounded-xl border transition-colors cursor-pointer shadow-xs ${
            activeTab === 'google' ? 'bg-card border-primary/40' : 'bg-card border-border/70 hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">{t('competitors.googleRating')}</span>
            {platformIcons.google}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
            {summary.googleBusiness?.rating || '—'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('tech')}
          className={`p-3.5 sm:p-4 rounded-xl border transition-colors cursor-pointer shadow-xs ${
            activeTab === 'tech' ? 'bg-card border-primary/40' : 'bg-card border-border/70 hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">{t('competitors.technologies')}</span>
            {platformIcons.tech}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
            {summary.techStack || 0}
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">{t('competitors.shopifyProducts')}</span>
            {platformIcons.shopify}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
            {summary.shopify?.productsCount || 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/70 p-1 rounded-xl">
          <TabsTrigger value="amazon" className="flex items-center gap-1.5 text-xs rounded-lg font-semibold">
            {platformIcons.amazon} <span>{t('competitors.platforms.amazonTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-1.5 text-xs rounded-lg font-semibold">
            {platformIcons.google} <span>{t('competitors.platforms.googleTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="tech" className="flex items-center gap-1.5 text-xs rounded-lg font-semibold">
            {platformIcons.tech} <span>{t('competitors.platforms.techStackTab')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Amazon Tab Content */}
        <TabsContent value="amazon" className="space-y-4">
          {summary.amazon && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-card border border-border/70 rounded-xl shadow-xs">
                <div className="text-[11px] text-muted-foreground">{t('competitors.totalProducts')}</div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">{summary.amazon.totalProducts}</div>
              </div>
              <div className="p-3 bg-card border border-border/70 rounded-xl shadow-xs">
                <div className="text-[11px] text-muted-foreground">{t('competitors.avgPrice')}</div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">{Number(summary.amazon.avgPrice || 0).toFixed(2)}</div>
              </div>
              <div className="p-3 bg-card border border-border/70 rounded-xl shadow-xs">
                <div className="text-[11px] text-muted-foreground">{t('competitors.avgRating')}</div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">{Number(summary.amazon.avgRating || 0).toFixed(1)} / 5</div>
              </div>
              <div className="p-3 bg-card border border-border/70 rounded-xl shadow-xs">
                <div className="text-[11px] text-muted-foreground">{t('competitors.primePercentage')}</div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">{Number(summary.amazon.primePercentage || 0).toFixed(1)}%</div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-card border border-border/70 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border/60">
              <h3 className="font-bold text-xs sm:text-sm text-foreground">{t('competitors.amazonProducts')}</h3>
            </div>
            {amazonProducts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-xs">{t('competitors.noResults')}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/30 border-b border-border/60">
                    <TableRow>
                      <TableHead>{t('competitors.product')}</TableHead>
                      <TableHead>{t('competitors.price')}</TableHead>
                      <TableHead>{t('competitors.bsr')}</TableHead>
                      <TableHead>{t('competitors.reviews')}</TableHead>
                      <TableHead>{t('competitors.rating')}</TableHead>
                      <TableHead>{t('competitors.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {amazonProducts.slice(0, 10).map((row) => (
                      <TableRow key={row.asin || row.productTitle} className="hover:bg-muted/15 transition-colors">
                        <TableCell className="font-medium max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            {row.imageUrl && <img src={row.imageUrl} alt="" className="w-8 h-8 object-contain rounded shrink-0" />}
                            <span className="truncate">{row.productTitle}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">{row.currency} {row.price ? Number(row.price).toFixed(2) : '—'}</TableCell>
                        <TableCell className="font-mono tabular-nums">{row.bsrRank ? `#${row.bsrRank.toLocaleString()}` : '—'}</TableCell>
                        <TableCell className="font-mono tabular-nums">{row.reviewCount?.toLocaleString() || '0'}</TableCell>
                        <TableCell className="font-mono tabular-nums flex items-center gap-1">
                          <Star className="size-3 text-amber-500 fill-amber-500" />
                          <span>{row.reviewRating ? Number(row.reviewRating).toFixed(1) : '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            row.isAvailable ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {row.isAvailable ? t('competitors.inStock') : t('competitors.outOfStock')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Google Tab Content */}
        <TabsContent value="google">
          {summary.googleBusiness ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-xs sm:text-sm font-bold">{t('competitors.businessInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-3 text-xs">
                  <div className="flex">
                    <span className="text-muted-foreground w-24 shrink-0">{t('competitors.address')}:</span>
                    <span className="font-medium">{summary.googleBusiness.address || t('competitors.notAvailable')}</span>
                  </div>
                  <div className="flex">
                    <span className="text-muted-foreground w-24 shrink-0">{t('competitors.phone')}:</span>
                    <span className="font-mono tabular-nums">{summary.googleBusiness.phone || t('competitors.notAvailable')}</span>
                  </div>
                  <div className="flex">
                    <span className="text-muted-foreground w-24 shrink-0">{t('competitors.website')}:</span>
                    <a href={summary.googleBusiness.website} target="_blank" rel="noopener" className="text-primary hover:underline font-mono truncate">
                      {summary.googleBusiness.website || t('competitors.notAvailable')}
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-xs sm:text-sm font-bold">{t('competitors.ratings')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 text-center space-y-2">
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-4 ${star <= Math.round(Number(summary.googleBusiness.rating) || 0) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{summary.googleBusiness.rating}</div>
                  <div className="text-muted-foreground text-xs font-mono tabular-nums">
                    {summary.googleBusiness.reviewsCount?.toLocaleString()} {t('competitors.reviews')}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12 rounded-2xl bg-card border border-border/70 p-8 space-y-2">
              <Inbox className="size-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs">{t('competitors.noGoogleData')}</p>
            </div>
          )}
        </TabsContent>

        {/* Tech Stack Tab Content */}
        <TabsContent value="tech">
          {techStack.length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-2">
                <div className="text-xs font-bold text-foreground">{t('competitors.categories')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {summary.techCategories?.map((cat: string) => (
                    <Badge key={cat} variant="outline" className="border-border/70 text-xs rounded-md">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-card border border-border/70 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-border/60">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">{t('competitors.technologies')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/30 border-b border-border/60">
                      <TableRow>
                        <TableHead>{t('competitors.category')}</TableHead>
                        <TableHead>{t('competitors.technology')}</TableHead>
                        <TableHead>{t('competitors.version')}</TableHead>
                        <TableHead>{t('competitors.confidence')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/60">
                      {techStack.slice(0, 20).map((row) => (
                        <TableRow key={row.id || row.name} className="hover:bg-muted/15 transition-colors">
                          <TableCell><Badge variant="outline" className="border-border/70 text-[10px] rounded-md">{row.category}</Badge></TableCell>
                          <TableCell className="font-bold text-foreground">{row.name}</TableCell>
                          <TableCell className="font-mono tabular-nums text-muted-foreground">{row.version || '—'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              row.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border/60'
                            }`}>
                              {row.confidence || 'normal'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12 rounded-2xl bg-card border border-border/70 p-8 space-y-2">
              <Inbox className="size-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs">{t('competitors.noTechData')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}