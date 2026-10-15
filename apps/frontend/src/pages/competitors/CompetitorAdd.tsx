import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, X, Plus, Trash2,
  Upload, Globe, MapPin, Info, BarChart3, Zap, DollarSign,
  ImagePlus, ChevronDown, ChevronUp,
  Facebook, Instagram as InstagramIcon, Music2, Ghost, MessageCircle, Youtube, Linkedin,
  Smartphone, AlertTriangle, RefreshCw, Scale, Lightbulb, Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/apiClient';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CompetitorStatusBar, { type CompetitorStatus } from './CompetitorStatusBar';
import { updateCompetitorStatus } from './useCompetitorStatus';
import i18n from '../../i18n';

const PLATFORMS = ['manual', 'shopify', 'woocommerce', 'salla', 'zid', 'easy_orders', 'other'] as const;
const ACTIVITY_TYPES = ['ecommerce', 'services', 'import_export', 'manufacturing', 'software', 'education', 'healthcare', 'realestate', 'tourism', 'other'] as const;
const TARGET_MARKETS = ['b2b', 'b2c', 'b2b_b2c', 'government', 'all'] as const;
const SOCIAL_PLATFORMS = [
  { key: 'facebook', icon: Facebook },
  { key: 'instagram', icon: InstagramIcon },
  { key: 'tiktok', icon: Music2 },
  { key: 'snapchat', icon: Ghost },
  { key: 'x', icon: MessageCircle },
  { key: 'youtube', icon: Youtube },
  { key: 'linkedin', icon: Linkedin },
  { key: 'other', icon: Smartphone },
] as const;

let idCounter = 0;
const genId = () => `item_${++idCounter}_${Date.now()}`;

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

interface SocialProfile {
  platform: string;
  url: string;
}

interface MediaNoteItem {
  id: string;
  text: string;
}

interface ComparisonItem {
  id: string;
  featureName: string;
  competitorDesc: string;
  ourDesc: string;
  easierToUse: string;
  stronger: string;
  notes: string;
}

interface DevIdea {
  id: string;
  title: string;
  description: string;
  images: string[];
}

interface ImageItem {
  id: string;
  data: string;
  file?: File;
}

const CompetitorAdd: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSocialIndex, setActiveSocialIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<Record<string, string>>({
    name: '', websiteUrl: '', platform: 'manual', activityType: '',
    targetMarket: '', foundedYear: '', founderName: '', founderLink: '',
    country: '', city: '',
    trafficSource: '',
    strengths: '', weaknesses: '',
    price: '', currency: 'EGP', cycle: 'monthly',
    monthlyPrice: '', yearlyPrice: '', pricingNotes: '',
    status: '',
  });

  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>(
    SOCIAL_PLATFORMS.map(p => ({ platform: p.key, url: '' }))
  );

  const [activityImages, setActivityImages] = useState<ImageItem[]>([]);
  const [featureImages, setFeatureImages] = useState<ImageItem[]>([]);
  const [mediaNotes, setMediaNotes] = useState<MediaNoteItem[]>([]);
  const [mediaNoteInput, setMediaNoteInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([]);
  const [devIdeas, setDevIdeas] = useState<DevIdea[]>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const prefillName = searchParams.get('name');
    const prefillUrl = searchParams.get('url');
    const prefillActivityType = searchParams.get('activityType');
    if (prefillName || prefillUrl || prefillActivityType) {
      setFormData(prev => ({
        ...prev,
        ...(prefillName ? { name: prefillName } : {}),
        ...(prefillUrl ? { websiteUrl: prefillUrl } : {}),
        ...(prefillActivityType ? { activityType: prefillActivityType } : {}),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isEdit || !id) return;
    setIsLoading(true);
    apiClient.get(`/competitors/${id}`).then(res => {
      if (res.data.success) {
        const c = res.data.data;
        const sp = c.structuredPricing || c.metadata?.structuredPricing || {};
        setFormData({
          name: c.name || '', websiteUrl: c.url || '', platform: c.platform || 'manual',
          activityType: c.activityType || '', targetMarket: c.targetMarket || '',
          foundedYear: c.foundedYear?.toString() || '', founderName: c.founderName || '',
          founderLink: c.founderLink || '',
          country: c.country || '', city: c.city || '',
          trafficSource: c.trafficSource || '',
          strengths: c.strengths || '', weaknesses: c.weaknesses || '',
          price: sp.price?.toString() || c.monthlyPrice?.toString() || '',
          currency: sp.currency || 'EGP',
          cycle: sp.cycle || 'monthly',
          monthlyPrice: c.monthlyPrice?.toString() || sp.monthlyPrice?.toString() || '',
          yearlyPrice: c.yearlyPrice?.toString() || sp.yearlyPrice?.toString() || '',
          pricingNotes: c.pricingNotes || sp.notes || '',
          status: c.status || 'NEW',
        });
        if (c.socialProfiles?.length) {
          const merged = SOCIAL_PLATFORMS.map(p => {
            const existing = c.socialProfiles.find((sp: Record<string, unknown>) => sp.platform === p.key);
            return existing
              ? { platform: p.key, url: (existing.profileUrl as string) || (existing.url as string) || '' }
              : { platform: p.key, url: '' };
          });
          setSocialProfiles(merged);
        }
        if (c.activityImages) setActivityImages(c.activityImages.map((img: { imageUrl: string }) => ({ id: genId(), data: img.imageUrl })));
        if (c.featureImages) setFeatureImages(c.featureImages.map((img: { imageUrl: string }) => ({ id: genId(), data: img.imageUrl })));
        if (c.mediaNotes) setMediaNotes(c.mediaNotes.map((n: { note: string }) => ({ id: genId(), text: n.note })));
        if (c.comparisons) {
          setComparisons(c.comparisons.map((cmp: Record<string, unknown>) => ({
            id: genId(),
            featureName: (cmp.featureName as string) || '',
            competitorDesc: (cmp.competitorDescription as string) || (cmp.competitorDesc as string) || '',
            ourDesc: (cmp.ourDescription as string) || (cmp.ourDesc as string) || '',
            easierToUse: (cmp.easiestToUse as string) || (cmp.easierToUse as string) || '',
            stronger: (cmp.stronger as string) || '',
            notes: (cmp.notes as string) || '',
          })));
        }
        if (c.devIdeas) {
          setDevIdeas(c.devIdeas.map((idea: Record<string, unknown>) => ({
            id: genId(),
            title: (idea.title as string) || '',
            description: (idea.description as string) || '',
            images: ((idea.images as { imageUrl: string }[]) || []).map((img) => img.imageUrl),
          })));
        }
      }
    }).catch(() => {
      toast.error(t('common.error'));
      navigate('/competitors');
    }).finally(() => setIsLoading(false));
  }, [id, isEdit, navigate, t]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleSocialChange = (index: number, field: keyof SocialProfile, value: string) => {
    setSocialProfiles(prev => prev.map((sp, i) => i === index ? { ...sp, [field]: value } : sp));
  };

  const handleAddImage = async (list: 'activity' | 'feature', file: File) => {
    const data = await toBase64(file);
    const item: ImageItem = { id: genId(), data, file };
    if (list === 'activity') setActivityImages(prev => [...prev, item]);
    else setFeatureImages(prev => [...prev, item]);
  };

  const handleRemoveImage = (list: 'activity' | 'feature', id: string) => {
    if (list === 'activity') setActivityImages(prev => prev.filter(img => img.id !== id));
    else setFeatureImages(prev => prev.filter(img => img.id !== id));
  };

  const handleMoveImage = (list: 'activity' | 'feature', index: number, direction: 'up' | 'down') => {
    const setter = list === 'activity' ? setActivityImages : setFeatureImages;
    setter(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const handleAddMediaNote = () => {
    const text = mediaNoteInput.trim();
    if (!text) return;
    setMediaNotes(prev => [...prev, { id: genId(), text }]);
    setMediaNoteInput('');
  };

  const handleRemoveMediaNote = (id: string) => {
    setMediaNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleStartEditNote = (id: string, text: string) => {
    setEditingNoteId(id);
    setEditingNoteText(text);
  };

  const handleSaveEditNote = (id: string) => {
    setMediaNotes(prev => prev.map(n => n.id === id ? { ...n, text: editingNoteText } : n));
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const handleAddComparison = () => {
    setComparisons(prev => [...prev, {
      id: genId(), featureName: '', competitorDesc: '', ourDesc: '',
      easierToUse: '', stronger: '', notes: '',
    }]);
  };

  const handleUpdateComparison = (id: string, field: keyof ComparisonItem, value: string) => {
    setComparisons(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoveComparison = (id: string) => {
    setComparisons(prev => prev.filter(c => c.id !== id));
  };

  const handleMoveComparison = (index: number, direction: 'up' | 'down') => {
    setComparisons(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const handleAddDevIdea = () => {
    setDevIdeas(prev => [...prev, { id: genId(), title: '', description: '', images: [] }]);
  };

  const handleUpdateDevIdea = (id: string, field: keyof DevIdea, value: string) => {
    setDevIdeas(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleRemoveDevIdea = (id: string) => {
    setDevIdeas(prev => prev.filter(d => d.id !== id));
  };

  const handleMoveDevIdea = (index: number, direction: 'up' | 'down') => {
    setDevIdeas(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const handleDevIdeaImageAdd = async (ideaId: string, file: File) => {
    const data = await toBase64(file);
    setDevIdeas(prev => prev.map(d => d.id === ideaId ? { ...d, images: [...d.images, data] } : d));
  };

  const handleDevIdeaImageRemove = (ideaId: string, index: number) => {
    setDevIdeas(prev => prev.map(d => d.id === ideaId
      ? { ...d, images: d.images.filter((_, i) => i !== index) }
      : d
    ));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = t('competitors.errors.nameRequired') || 'هذا الحقل مطلوب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    const payload: Record<string, unknown> = {
      ...formData,
      url: formData.websiteUrl,
      socialProfiles: socialProfiles.filter(sp => sp.url),
      activityImages: activityImages.map(img => img.data),
      featureImages: featureImages.map(img => img.data),
      mediaNotes: mediaNotes.map(n => n.text),
      comparisons,
      devIdeas,
    };
    delete payload.websiteUrl;
    try {
      if (isEdit && id) {
        await apiClient.put(`/competitors/${id}`, payload);
        toast.success(t('competitors.updateSuccess'));
        navigate(`/competitors/${id}`);
      } else {
        const res = await apiClient.post('/competitors', payload);
        toast.success(t('competitors.createSuccess'));
        const newId = res.data?.data?.id || res.data?.id;
        navigate(newId ? `/competitors/${newId}` : '/competitors');
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6" dir={i18n.dir()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const dir = i18n.dir();

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir={dir}>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit ? `/competitors/${id}` : '/competitors')}>
          {dir === 'rtl' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {isEdit ? t('competitors.editCompetitor') : t('competitors.addCompetitor')}
            </h1>
            {isEdit && id && formData.status && (
              <CompetitorStatusBar
                currentStatus={formData.status as CompetitorStatus}
                competitorId={id}
                onChange={async (newStatus) => {
                  const ok = await updateCompetitorStatus(id, newStatus);
                  if (ok) setFormData(prev => ({ ...prev, status: newStatus }));
                }}
                size="md"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? t('competitors.editCompetitor') : t('competitors.addCompetitor')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start mb-6 overflow-x-auto">
          <TabsTrigger value="general" className="gap-2">
            <Info size={16} />
            <span className="hidden sm:inline">{t('competitors.generalInfo') || 'المعلومات العامة'}</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-2">
            <BarChart3 size={16} />
            <span className="hidden sm:inline">{t('competitors.mediaAnalysis') || 'تحليل الميديا'}</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Zap size={16} />
            <span className="hidden sm:inline">{t('competitors.strengthsWeaknesses') || 'القوة والضعف'}</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign size={16} />
            <span className="hidden sm:inline">{t('competitors.pricing') || 'الأسعار'}</span>
          </TabsTrigger>
        </TabsList>

        {/* ──────────── TAB 1: GENERAL INFO ──────────── */}
        <TabsContent value="general" className="space-y-6">
          {/* Basic Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info size={18} className="text-blue-500" />
                {t('competitors.basicData') || 'البيانات الأساسية'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('competitors.competitorName')} *</Label>
                  <Input
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    placeholder={t('competitors.competitorNamePlaceholder')}
                    aria-invalid={!!formErrors.name}
                  />
                  {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{t('competitors.competitorUrl')}</Label>
                  <Input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={e => handleInputChange('websiteUrl', e.target.value)}
                    placeholder={t('competitors.competitorUrlPlaceholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('competitors.platform')}</Label>
                  <select
                    value={formData.platform}
                    onChange={e => handleInputChange('platform', e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm dark:bg-input/30"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p} value={p}>{t(`competitors.platformOptions.${p === 'easy_orders' ? 'easyOrders' : p}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('competitors.activityType')}</Label>
                  <select
                    value={formData.activityType}
                    onChange={e => handleInputChange('activityType', e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm dark:bg-input/30"
                  >
                    <option value="">{t('competitors.activityTypePlaceholder')}</option>
                    {ACTIVITY_TYPES.map(at => (
                      <option key={at} value={at}>{t(`competitors.activityTypes.${at}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('competitors.targetMarket')}</Label>
                  <select
                    value={formData.targetMarket}
                    onChange={e => handleInputChange('targetMarket', e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm dark:bg-input/30"
                  >
                    <option value="">{t('competitors.targetMarketPlaceholder')}</option>
                    {TARGET_MARKETS.map(tm => (
                      <option key={tm} value={tm}>{t(`competitors.targetMarkets.${tm}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('competitors.foundedYear')}</Label>
                  <Input
                    type="number"
                    value={formData.foundedYear}
                    onChange={e => handleInputChange('foundedYear', e.target.value)}
                    placeholder={t('competitors.foundedYearPlaceholder')}
                    min={1900}
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('competitors.founderName') || 'اسم المؤسس'}</Label>
                  <Input
                    value={formData.founderName}
                    onChange={e => handleInputChange('founderName', e.target.value)}
                    placeholder={t('competitors.founderNamePlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('competitors.founderLink') || 'رابط المؤسس'}</Label>
                  <Input
                    type="url"
                    value={formData.founderLink}
                    onChange={e => handleInputChange('founderLink', e.target.value)}
                    placeholder={t('competitors.founderLinkPlaceholder')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-green-500" />
                {t('competitors.location')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('competitors.country') || 'الدولة'}</Label>
                  <Input
                    value={formData.country}
                    onChange={e => handleInputChange('country', e.target.value)}
                    placeholder={t('competitors.countryPlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('competitors.city') || 'المدينة'}</Label>
                  <Input
                    value={formData.city}
                    onChange={e => handleInputChange('city', e.target.value)}
                    placeholder={t('competitors.cityPlaceholder')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={18} className="text-pink-500" />
                {t('competitors.socialLinks')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {socialProfiles.map((sp, i) => (
                <div key={sp.platform} className="border rounded-lg dark:border-gray-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setActiveSocialIndex(activeSocialIndex === i ? null : i)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {React.createElement(SOCIAL_PLATFORMS.find(p => p.key === sp.platform)?.icon || Smartphone, { size: 18, className: 'text-gray-500 shrink-0' })}
                    <span className="flex-1 text-start">{t(`competitors.social.${sp.platform}`) || sp.platform}</span>
                    {activeSocialIndex === i ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {activeSocialIndex === i && (
                    <div className="px-4 pb-3 pt-1 border-t dark:border-gray-700 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('competitors.social.linkUrl') || 'رابط الصفحة'}</Label>
                        <Input
                          value={sp.url}
                          onChange={e => handleSocialChange(i, 'url', e.target.value)}
                          placeholder={t('competitors.socialUrlPlaceholder')}
                          size="sm"
                        />
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reference Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus size={18} className="text-purple-500" />
                {t('competitors.referenceImages') || 'الصور المرجعية'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUploadSection
                label={t('competitors.activityTypeImages') || 'صور نوع النشاط'}
                images={activityImages}
                onAdd={file => handleAddImage('activity', file)}
                onRemove={id => handleRemoveImage('activity', id)}
                onMoveUp={i => handleMoveImage('activity', i, 'up')}
                onMoveDown={i => handleMoveImage('activity', i, 'down')}
              />
              <ImageUploadSection
                label={t('competitors.featureReferenceImages') || 'صور مرجعية للمميزات'}
                images={featureImages}
                onAdd={file => handleAddImage('feature', file)}
                onRemove={id => handleRemoveImage('feature', id)}
                onMoveUp={i => handleMoveImage('feature', i, 'up')}
                onMoveDown={i => handleMoveImage('feature', i, 'down')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────── TAB 2: MEDIA ANALYSIS ──────────── */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={18} className="text-orange-500" />
                {t('competitors.mediaAnalysis') || 'تحليل الميديا'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Traffic Source */}
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('competitors.trafficSource') || 'مصدر الزيارات'}</Label>
                <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit" dir={dir}>
                  {['organic', 'paid', 'both'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleInputChange('trafficSource', val)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        formData.trafficSource === val
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t(`competitors.${val}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t dark:border-gray-700" />

              {/* Media Notes */}
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('competitors.mediaNotes') || 'ملاحظات تحليل الميديا'}</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={mediaNoteInput}
                    onChange={e => setMediaNoteInput(e.target.value)}
                    placeholder={t('competitors.mediaNotesPlaceholder') || 'أضف ملاحظة...'}
                    className="min-h-[60px]"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddMediaNote(); } }}
                  />
                  <Button onClick={handleAddMediaNote} disabled={!mediaNoteInput.trim()} className="self-end shrink-0">
                    <Plus size={16} />
                  </Button>
                </div>
                {mediaNotes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {t('competitors.noMediaNotes') || 'لا توجد ملاحظات بعد. أضف ملاحظاتك أعلاه.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto mt-4">
                    {mediaNotes.map(n => (
                      <div key={n.id} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 group">
                        {editingNoteId === n.id ? (
                          <div className="flex-1 space-y-2">
                            <Textarea
                              value={editingNoteText}
                              onChange={e => setEditingNoteText(e.target.value)}
                              className="min-h-[60px]"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveEditNote(n.id)}>
                                {t('common.save')}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={handleCancelEditNote}>
                                {t('common.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="flex-1 text-sm whitespace-pre-wrap">{n.text}</p>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                              <Button variant="ghost" size="icon-xs" onClick={() => handleStartEditNote(n.id, n.text)}>
                                <Edit3 size={14} className="text-blue-400" />
                              </Button>
                              <Button variant="ghost" size="icon-xs" onClick={() => handleRemoveMediaNote(n.id)}>
                                <Trash2 size={14} className="text-red-400" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────── TAB 3: STRENGTHS, WEAKNESSES & FEATURES ──────────── */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={18} className="text-emerald-500" />
                {t('competitors.strengths')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.strengths}
                onChange={e => handleInputChange('strengths', e.target.value)}
                placeholder={t('competitors.strengthsPlaceholder')}
                rows={6}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                {t('competitors.weaknesses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.weaknesses}
                onChange={e => handleInputChange('weaknesses', e.target.value)}
                placeholder={t('competitors.weaknessesPlaceholder')}
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Comparison Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <Scale size={18} className="text-indigo-500" />
                  {t('competitors.comparisonSection')}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleAddComparison}>
                  <Plus size={14} /> {t('common.add') || 'إضافة'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {comparisons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('competitors.noComparisons') || 'لم تضف أي مقارنات بعد. أضف مقارنة جديدة.'}
                </div>
              ) : (
                comparisons.map((comp, i) => (
                  <div key={comp.id} className="border rounded-lg p-4 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleMoveComparison(i, 'up')} disabled={i === 0}>
                          <ChevronUp size={14} />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleMoveComparison(i, 'down')} disabled={i === comparisons.length - 1}>
                          <ChevronDown size={14} />
                        </Button>
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                      </div>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleRemoveComparison(comp.id)}>
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('competitors.featureName') || 'اسم الميزة'}</Label>
                      <Input
                        value={comp.featureName}
                        onChange={e => handleUpdateComparison(comp.id, 'featureName', e.target.value)}
                        placeholder={t('competitors.featureNamePlaceholder') || 'مثال: سرعة التوصيل'}
                        size="sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('competitors.competitorDesc') || 'وصف المنافس'}</Label>
                        <Textarea
                          value={comp.competitorDesc}
                          onChange={e => handleUpdateComparison(comp.id, 'competitorDesc', e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('competitors.ourDesc') || 'وصفنا'}</Label>
                        <Textarea
                          value={comp.ourDesc}
                          onChange={e => handleUpdateComparison(comp.id, 'ourDesc', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('competitors.easierToUse') || 'الأسهل استخداماً؟'}</Label>
                        <div className="flex gap-3">
                          {['competitor', 'us'].map(val => (
                            <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name={`easier_${comp.id}`}
                                checked={comp.easierToUse === val}
                                onChange={() => handleUpdateComparison(comp.id, 'easierToUse', val)}
                                className="accent-blue-600"
                              />
                              {val === 'competitor' ? t('competitors.competitor') : t('competitors.us')}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('competitors.stronger') || 'الأقوى؟'}</Label>
                        <div className="flex gap-3">
                          {['competitor', 'us'].map(val => (
                            <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name={`stronger_${comp.id}`}
                                checked={comp.stronger === val}
                                onChange={() => handleUpdateComparison(comp.id, 'stronger', val)}
                                className="accent-blue-600"
                              />
                              {val === 'competitor' ? t('competitors.competitor') : t('competitors.us')}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('competitors.additionalNotes') || 'ملاحظات إضافية'}</Label>
                      <Input
                        value={comp.notes}
                        onChange={e => handleUpdateComparison(comp.id, 'notes', e.target.value)}
                        placeholder={t('competitors.additionalNotesPlaceholder') || 'أي ملاحظات إضافية...'}
                        size="sm"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Development Ideas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb size={18} className="text-amber-500" />
                  {t('competitors.devIdeas') || 'أفكار ومقترحات تطويرية'}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleAddDevIdea}>
                  <Plus size={14} /> {t('common.add') || 'إضافة'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {devIdeas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('competitors.noDevIdeas') || 'لم تضف أي أفكار تطويرية بعد. أضف فكرة جديدة.'}
                </div>
              ) : (
                devIdeas.map((idea, i) => (
                  <div key={idea.id} className="border rounded-lg p-4 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleMoveDevIdea(i, 'up')} disabled={i === 0}>
                          <ChevronUp size={14} />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleMoveDevIdea(i, 'down')} disabled={i === devIdeas.length - 1}>
                          <ChevronDown size={14} />
                        </Button>
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                      </div>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleRemoveDevIdea(idea.id)}>
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('competitors.ideaTitle') || 'عنوان الفكرة'}</Label>
                      <Input
                        value={idea.title}
                        onChange={e => handleUpdateDevIdea(idea.id, 'title', e.target.value)}
                        placeholder={t('competitors.ideaTitlePlaceholder') || 'عنوان الفكرة التطويرية'}
                        size="sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('competitors.ideaDescription') || 'وصف الفكرة'}</Label>
                      <Textarea
                        value={idea.description}
                        onChange={e => handleUpdateDevIdea(idea.id, 'description', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('competitors.ideaImages') || 'صور توضيحية'}</Label>
                      <div className="flex flex-wrap gap-2">
                        {idea.images.map((imgData, imgIdx) => (
                          <div key={imgIdx} className="relative size-16 rounded-lg overflow-hidden border group">
                            <img src={imgData} alt="" className="size-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleDevIdeaImageRemove(idea.id, imgIdx)}
                              className="absolute top-0.5 right-0.5 size-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <label className="size-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                          <Plus size={16} className="text-muted-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) { handleDevIdeaImageAdd(idea.id, file); e.target.value = ''; }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────── TAB 4: PRICING ──────────── */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-500" />
                {t('competitors.pricing') || 'الأسعار'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>السعر الأساسي / الباقة</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={e => handleInputChange('price', e.target.value)}
                    placeholder="مثال: 500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>العملة</Label>
                  <select
                    value={formData.currency || 'EGP'}
                    onChange={e => handleInputChange('currency', e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="EGP">EGP - جنيه مصري</option>
                    <option value="USD">USD - دولار أمريكي ($)</option>
                    <option value="SAR">SAR - ريال سعودي (ر.س)</option>
                    <option value="AED">AED - درهم إماراتي (د.إ)</option>
                    <option value="EUR">EUR - يورو (€)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>دورة التسعير</Label>
                  <select
                    value={formData.cycle || 'monthly'}
                    onChange={e => handleInputChange('cycle', e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="monthly">شهرياً (Monthly)</option>
                    <option value="yearly">سنوياً (Yearly)</option>
                    <option value="one_time">دفعة واحدة (One-Time)</option>
                    <option value="usage_based">حسب الاستخدام (Usage-Based)</option>
                    <option value="custom">مخصص / تفاوضي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                <div className="space-y-1.5">
                  <Label>{t('competitors.monthlyPrice') || 'السعر الشهري'}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.monthlyPrice}
                      onChange={e => handleInputChange('monthlyPrice', e.target.value)}
                      placeholder={t('competitors.pricePlaceholder')}
                      className="ltr:pl-7 rtl:pr-7"
                    />
                    <span className="absolute top-1/2 -translate-y-1/2 ltr:left-2.5 rtl:right-2.5 text-xs text-muted-foreground">{formData.currency || 'EGP'}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('competitors.yearlyPrice') || 'السعر السنوي'}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.yearlyPrice}
                      onChange={e => handleInputChange('yearlyPrice', e.target.value)}
                      placeholder={t('competitors.pricePlaceholder')}
                      className="ltr:pl-7 rtl:pr-7"
                    />
                    <span className="absolute top-1/2 -translate-y-1/2 ltr:left-2.5 rtl:right-2.5 text-xs text-muted-foreground">{formData.currency || 'EGP'}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('competitors.pricingNotes') || 'ملاحظات الأسعار'}</Label>
                <Textarea
                  value={formData.pricingNotes}
                  onChange={e => handleInputChange('pricingNotes', e.target.value)}
                  rows={4}
                  placeholder={t('competitors.pricingNotesPlaceholder') || 'أي تفاصيل عن خطط الأسعار والخصومات...'}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
        <Button variant="outline" onClick={() => navigate(isEdit ? `/competitors/${id}` : '/competitors')}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSaving ? t('common.saving') : isEdit ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </div>
  );
};

/* ─── Image Upload Sub-section ─── */
const ImageUploadSection: React.FC<{
  label: string;
  images: ImageItem[];
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}> = ({ label, images, onAdd, onRemove, onMoveUp, onMoveDown }) => {
  const { t } = useTranslation();
  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">{label}</Label>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {images.map((img, i) => (
          <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted/30">
            <img src={img.data} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button variant="ghost" size="icon-xs" onClick={() => onMoveUp(i)} disabled={i === 0} className="text-white hover:bg-white/20">
                <ChevronUp size={14} />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => onMoveDown(i)} disabled={i === images.length - 1} className="text-white hover:bg-white/20">
                <ChevronDown size={14} />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => onRemove(img.id)} className="text-red-300 hover:bg-red-500/30">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
        <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 transition-colors">
          <Upload size={18} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{t('common.upload') || 'رفع'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { onAdd(f); e.target.value = ''; } }}
          />
        </label>
      </div>
    </div>
  );
};

export default CompetitorAdd;
