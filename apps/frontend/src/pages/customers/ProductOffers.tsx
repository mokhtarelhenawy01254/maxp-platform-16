import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { toast } from 'sonner';
import MetaTemplatesModal from './components/MetaTemplatesModal';
import TemplateStatsPanel from './components/TemplateStatsPanel';
import WhatsAppBubblePreview from './components/WhatsAppBubblePreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShoppingBag, Send, LayoutTemplate, ListChecks, RefreshCw, Loader2, CheckCircle2,
  Eye, ImageIcon, Users, BarChart3, Clock, Plus, Search,
} from 'lucide-react';

type Audience = 'all' | 'withOrders' | 'newCustomers' | 'activeCustomers' | 'list';

interface Product {
  id: string;
  name: string;
  price?: number | string;
  imageUrl?: string | null;
  trackInventory?: boolean;
  stockQuantity?: number | null;
}

interface CustomerList {
  id: string;
  name: string;
  count: number;
}

interface Session {
  sessionId: string;
  phoneNumber: string;
  isConnected: boolean;
}

const DEFAULT_MESSAGE =
  'أهلاً {customerName} 💙\nوصلنا للتو {productName} بسعر {price}\n\nالكمية محدودة — اطلبيه دلوقتي: {customer_link}';

const ProductOffersRedesign: React.FC = () => {
  /* بيانات */
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);

  const [lists, setLists] = useState<CustomerList[]>([]);
  const [audience, setAudience] = useState<Audience>('withOrders');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState('');

  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [mediaUrl, setMediaUrl] = useState('');
  const [delayMs, setDelayMs] = useState(1500);

  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const [autoSendLoading, setAutoSendLoading] = useState(false);

  /* تحميل */
  const loadProducts = useCallback(async (q = '') => {
    setProductsLoading(true);
    try {
      const res = await apiClient.get('/customers/whatsapp-notify/products', { params: q ? { search: q } : {} });
      const raw = (res.data?.products || res.data?.data || []) as Array<Record<string, unknown>>;
      setProducts(raw.map((p) => {
        let img: string | null = null;
        const imgs = p.images;
        if (typeof imgs === 'string') { try { const arr = JSON.parse(imgs); img = Array.isArray(arr) ? arr[0] : imgs; } catch { img = imgs; } }
        else if (Array.isArray(imgs) && imgs.length > 0) img = String(imgs[0]);
        else if (typeof imgs === 'string' && imgs.startsWith('http')) img = imgs;
        return { id: String(p.id), name: String(p.name || ''), price: p.price as number | undefined, imageUrl: img };
      }));
    } catch { /* ignore */ } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadLists = useCallback(async () => {
    try {
      const res = await apiClient.get('/broadcast/customer-lists');
      const all = res.data?.data?.lists || res.data?.lists || res.data?.data || [];
      setLists(all.filter((l: { isDefault?: boolean }) => !l.isDefault));
    } catch { /* ignore */ }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const res = await apiClient.get(`/customers/whatsapp-notify/sessions?t=${Date.now()}`);
      const list: Session[] = res.data?.sessions || [];
      setSessions(list);
      const connected = list.filter((s) => s.isConnected);
      setSelectedSession((prev) => (prev && connected.some((s) => s.sessionId === prev) ? prev : connected[0]?.sessionId || ''));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadProducts(); loadLists(); loadSessions(); }, [loadProducts, loadLists, loadSessions]);

  // عداد الجمهور
  useEffect(() => {
    let alive = true;
    if (audience === 'list') {
      // عدد القوائم المختارة
      const sum = lists.filter((l) => selectedListIds.includes(l.id)).reduce((s, l) => s + (l.count || 0), 0);
      setAudienceCount(selectedListIds.length > 0 ? sum : null);
      return;
    }
    apiClient
      .get('/customers/whatsapp-notify/preview-audience', { params: { audience, newDays: 7 } })
      .then((res) => { if (alive) setAudienceCount(res.data?.count ?? null); })
      .catch(() => { if (alive) setAudienceCount(null); });
    return () => { alive = false; };
  }, [audience, selectedListIds, lists]);

  // الإرسال التلقائي للمنتج الجديد — الحالة الحالية
  useEffect(() => {
    apiClient
      .get('/customers/whatsapp-notify/auto-send-settings')
      .then((res) => {
        const s = res.data?.settings || res.data;
        if (s && typeof s.isEnabled === 'boolean') setAutoSend(s.isEnabled);
      })
      .catch(() => { /* ignore */ });
  }, []);

  const toggleAutoSend = async (v: boolean) => {
    setAutoSend(v);
    setAutoSendLoading(true);
    try {
      await apiClient.put('/customers/whatsapp-notify/auto-send-settings', { isEnabled: v });
    } catch {
      setAutoSend(!v);
    } finally {
      setAutoSendLoading(false);
    }
  };

  const send = async () => {
    if (!selectedProduct || !message.trim()) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        audience: audience === 'list' ? 'list' : audience,
        customMessage: message,
        sessionId: selectedSession || undefined,
        productId: selectedProduct.id,
        mediaUrl: mediaUrl || undefined,
        delayMs,
        eventType: 'PROMOTIONAL',
        customerListIds: audience === 'list' ? selectedListIds : undefined,
      };
      await apiClient.post('/customers/whatsapp-notify/smart-send', payload);
      toast.success('الحملة اتبعتت للخلفية وبتشتغل دلوقتي');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل الإرسال';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim();
    if (!q) return products;
    return products.filter((p) => (p.name || '').includes(q));
  }, [products, productSearch]);

  const estimatedMinutes = useMemo(() => {
    if (!audienceCount) return null;
    const mins = Math.ceil((audienceCount * delayMs) / 60000);
    return mins < 1 ? 'أقل من دقيقة' : mins < 60 ? `~${mins} دقيقة` : `~${Math.ceil(mins / 60)} ساعة`;
  }, [audienceCount, delayMs]);

  const connectedSessions = sessions.filter((s) => s.isConnected);

  /* ═══════════ UI ═══════════ */
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[color:var(--color-foreground)]">
            <ShoppingBag className="h-6 w-6 text-[color:var(--color-primary)]" />
            عروض المنتجات
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            اختاري منتج، اكتبي العرض، حددي مين يستلمه — واتساب مباشر أو قالب ميتا معتمد
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-[color:var(--color-border)] px-4 py-2">
          <Switch checked={autoSend} onCheckedChange={toggleAutoSend} disabled={autoSendLoading} aria-label="إرسال تلقائي للمنتج الجديد" />
          <span className="text-sm font-medium">إرسال تلقائي للمنتج الجديد</span>
        </div>
      </header>

      <Tabs defaultValue="compose" className="space-y-5">
        <TabsList className="rounded-full p-1">
          <TabsTrigger value="compose" className="rounded-full">
            <Send className="ml-1 h-4 w-4" />
            إنشاء عرض
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-full">
            <BarChart3 className="ml-1 h-4 w-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            {/* ─── العمود الأيمن: الخطوات ─── */}
            <div className="space-y-5">
              {/* 1) المنتج */}
              <Card className="border-[color:var(--color-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-xs font-bold text-[color:var(--color-primary)]">1</span>
                    اختاري المنتج
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                    <Input value={productSearch} onChange={(e) => { setProductSearch(e.target.value); loadProducts(e.target.value); }} placeholder="ابحثي بالاسم…" className="rounded-xl pr-9" />
                  </div>
                  {productsLoading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[color:var(--color-muted-foreground)]">مفيش منتجات مطابقة</p>
                  ) : (
                    <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                      {filteredProducts.slice(0, 30).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProduct(p); if (!mediaUrl && p.imageUrl) setMediaUrl(p.imageUrl); }}
                          className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-right transition ${
                            selectedProduct?.id === p.id
                              ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5'
                              : 'border-[color:var(--color-border)] hover:bg-[color:var(--color-accent)]'
                          }`}
                        >
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[color:var(--color-muted)]">
                              <ImageIcon className="h-4 w-4 text-[color:var(--color-muted-foreground)]" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{p.name}</span>
                            {p.price != null && <span className="text-xs text-[color:var(--color-muted-foreground)]">{Number(p.price).toLocaleString('ar-EG')} ج.م</span>}
                          </span>
                          {selectedProduct?.id === p.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2) الرسالة */}
              <Card className="border-[color:var(--color-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-xs font-bold text-[color:var(--color-primary)]">2</span>
                    رسالة العرض
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => setMetaModalOpen(true)} className="rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300">
                      <LayoutTemplate className="h-3.5 w-3.5" />
                      اختيار قالب ميتا
                    </Button>
                  </div>
                  <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-xl" maxLength={3000} />
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">متغيرات: {'{customerName}'} · {'{productName}'} · {'{price}'} · {'{customer_link}'}</p>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs"><ImageIcon className="h-3.5 w-3.5" /> رابط صورة (اختياري)</Label>
                    <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" dir="ltr" className="rounded-xl" />
                  </div>
                </CardContent>
              </Card>

              {/* 3) الجمهور */}
              <Card className="border-[color:var(--color-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-xs font-bold text-[color:var(--color-primary)]">3</span>
                    مين يستلم العرض؟
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {([
                      { v: 'withOrders', label: 'عملاء بطلبات' },
                      { v: 'all', label: 'كل العملاء' },
                      { v: 'newCustomers', label: 'عملاء جدد' },
                      { v: 'list', label: 'قائمة محددة' },
                    ] as Array<{ v: Audience; label: string }>).map((a) => (
                      <button
                        key={a.v}
                        onClick={() => setAudience(a.v)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          audience === a.v
                            ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5 text-[color:var(--color-primary)]'
                            : 'border-[color:var(--color-border)] hover:bg-[color:var(--color-accent)]'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>

                  {audience === 'list' && (
                    <div className="space-y-1.5 rounded-xl border border-dashed border-[color:var(--color-border)] p-3">
                      {lists.length === 0 ? (
                        <p className="text-center text-xs text-[color:var(--color-muted-foreground)]">مفيش قوائم محفوظة — اعملي قائمة من مركز التقسيم الأول</p>
                      ) : (
                        <div className="max-h-40 space-y-1.5 overflow-y-auto">
                          {lists.map((l) => (
                            <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-[color:var(--color-accent)]">
                              <input
                                type="checkbox"
                                checked={selectedListIds.includes(l.id)}
                                onChange={(e) => setSelectedListIds((prev) => (e.target.checked ? [...prev, l.id] : prev.filter((x) => x !== l.id)))}
                                className="h-4 w-4 rounded"
                              />
                              <span className="flex-1">{l.name}</span>
                              <span className="text-xs text-[color:var(--color-muted-foreground)]">{(l.count || 0).toLocaleString('ar-EG')}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl bg-[color:var(--color-muted)] px-4 py-2.5 text-sm">
                    <span className="flex items-center gap-1.5 text-[color:var(--color-muted-foreground)]">
                      <Users className="h-4 w-4" /> المستهدفون
                    </span>
                    <span className="font-bold">{audienceCount != null ? `${audienceCount.toLocaleString('ar-EG')} عميل` : '—'}</span>
                  </div>
                  {estimatedMinutes && (
                    <p className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)]">
                      <Clock className="h-3.5 w-3.5" /> الوقت التقريبي للإرسال: {estimatedMinutes}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── العمود الأيسر: المعاينة والإرسال ─── */}
            <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              <WhatsAppBubblePreview
                content={message}
                variables={{ productName: selectedProduct?.name, price: selectedProduct?.price ? `${Number(selectedProduct.price).toLocaleString('ar-EG')} ج.م` : undefined }}
                headerLabel="سوان"
                mediaUrl={mediaUrl || selectedProduct?.imageUrl || undefined}
              />

              <Card className="border-[color:var(--color-border)]">
                <CardContent className="space-y-3 p-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">جلسة واتساب (للإرسال المباشر)</Label>
                    {connectedSessions.length > 0 ? (
                      <Select value={selectedSession} onValueChange={setSelectedSession}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {connectedSessions.map((s) => (
                            <SelectItem key={s.sessionId} value={s.sessionId}>{s.phoneNumber || s.sessionId.slice(0, 12)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                        مفيش جلسة متصلة — الإرسال هيشتغل بقناة Meta لو متاحة
                      </p>
                    )}
                  </div>
                  <Button onClick={send} disabled={sending || !selectedProduct || !message.trim()} className="w-full rounded-full">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    إرسال العرض {audienceCount ? `لـ ${audienceCount.toLocaleString('ar-EG')} عميل` : ''}
                  </Button>
                  {selectedProduct && (
                    <p className="text-center text-xs text-[color:var(--color-muted-foreground)]">
                      المنتج المختار: <span className="font-medium text-[color:var(--color-foreground)]">{selectedProduct.name}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <TemplateStatsPanel title="تقارير العروض والقوالب" description="أداء كل قالب عرض خلال آخر 90 يوم — الوصول والقراءة والتفاعل والتكلفة" />
        </TabsContent>
      </Tabs>

      <MetaTemplatesModal
        open={metaModalOpen}
        onClose={() => setMetaModalOpen(false)}
        onPick={(content) => { setMessage((prev) => content || prev); setMetaModalOpen(false); }}
        title="اختيار قالب ميتا للعرض"
      />
    </div>
  );
};

export default ProductOffersRedesign;
