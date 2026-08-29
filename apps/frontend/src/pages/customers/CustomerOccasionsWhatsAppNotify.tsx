import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../services/apiClient';
import MetaTemplatesModal from './components/MetaTemplatesModal';
import TemplateStatsPanel from './components/TemplateStatsPanel';
import WhatsAppBubblePreview from './components/WhatsAppBubblePreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays, Send, Eye, Sparkles, Plus, Pencil, Trash2, Clock, CheckCircle2, XCircle,
  RefreshCw, Users, Ban, Loader2, Search, LayoutTemplate, MessagesSquare, BarChart3,
} from 'lucide-react';

type Audience = 'all' | 'withOrders' | 'newCustomers' | 'activeCustomers';

interface Occasion {
  id: string;
  name: string;
  message: string;
  mediaUrl: string | null;
  scheduledAt: string;
  recurrence: 'none' | 'monthly' | 'yearly';
  customerListIds: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  lastSentAt: string | null;
  totalSent: number;
  sendLimit: number;
  templateId?: string | null;
  templateName?: string | null;
  metaTemplateName?: string | null;
  metaTemplateStatus?: string | null;
}

interface Session {
  sessionId: string;
  phoneNumber: string;
  isConnected: boolean;
}

const RECURRENCE_LABEL: Record<string, string> = {
  none: 'مرة واحدة',
  monthly: 'شهري',
  yearly: 'سنوي',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'مجدولة', cls: 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400' },
  draft: { label: 'مسودة', cls: 'border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400' },
  sent: { label: 'أُرسلت', cls: 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400' },
  cancelled: { label: 'موقوفة', cls: 'border-destructive/40 text-destructive' },
};

const emptyForm = {
  id: '',
  name: '',
  message: '',
  mediaUrl: '',
  scheduledAt: '',
  recurrence: 'none' as Occasion['recurrence'],
  sendLimit: 0,
  templateId: '' as string,
};

const CustomerOccasionsWhatsAppNotify: React.FC = () => {
  /* ───────── بيانات ───────── */
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [audience, setAudience] = useState<Audience>('withOrders');
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [delayMs, setDelayMs] = useState(1500);

  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);

  const [viewOccasion, setViewOccasion] = useState<Occasion | null>(null);
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Occasion | null>(null);

  /* ───────── تحميل ───────── */
  const loadOccasions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/customers/whatsapp-notify/occasions');
      setOccasions(res.data?.data || []);
    } catch {
      // هادي — الحالة الفارغة بتوضح
    } finally {
      setLoading(false);
    }
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

  useEffect(() => { loadOccasions(); loadSessions(); }, [loadOccasions, loadSessions]);

  useEffect(() => {
    let alive = true;
    apiClient
      .get('/customers/whatsapp-notify/preview-audience', { params: { audience, newDays: 7 } })
      .then((res) => { if (alive) setAudienceCount(res.data?.count ?? null); })
      .catch(() => { if (alive) setAudienceCount(null); });
    return () => { alive = false; };
  }, [audience]);

  /* ───────── حفظ/حذف ───────── */
  const openCreate = () => {
    setForm({ ...emptyForm, scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16) });
    setFormOpen(true);
  };

  const openEdit = (o: Occasion) => {
    setForm({
      id: o.id,
      name: o.name,
      message: o.message,
      mediaUrl: o.mediaUrl || '',
      scheduledAt: new Date(o.scheduledAt).toISOString().slice(0, 16),
      recurrence: o.recurrence,
      sendLimit: o.sendLimit || 0,
      templateId: o.templateId || '',
    });
    setFormOpen(true);
  };

  const sendNow = async () => {
    if (!form.message.trim()) return;
    setSendingNow(true);
    try {
      await apiClient.post('/customers/whatsapp-notify/smart-send', {
        audience,
        message: form.message.trim(),
        mediaUrl: form.mediaUrl.trim() || undefined,
        sessionId: selectedSession || undefined,
        delayMs: 1500,
        occasionName: form.name.trim() || 'مناسبة خاصة',
        eventType: 'PROMOTIONAL',
      });
      toast.success('الحملة الفورية اتبعتت وبتشتغل في الخلفية');
      setFormOpen(false);
      loadOccasions();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل الإرسال الفوري';
      toast.error(msg);
    } finally {
      setSendingNow(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.message.trim() || !form.scheduledAt) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        message: form.message.trim(),
        mediaUrl: form.mediaUrl.trim() || null,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        recurrence: form.recurrence,
        sendLimit: Number(form.sendLimit) || 0,
        customerListIds: [],
        templateId: form.templateId || null,
      };
      if (form.id) {
        await apiClient.put(`/customers/whatsapp-notify/occasions/${form.id}`, payload);
      } else {
        await apiClient.post('/customers/whatsapp-notify/occasions', payload);
      }
      toast.success(form.id ? 'اتحفظت التعديلات' : 'المناسبة اتجدولت');
      setFormOpen(false);
      loadOccasions();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل الحفظ';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await apiClient.delete(`/customers/whatsapp-notify/occasions/${deleting.id}`);
      setDeleting(null);
      loadOccasions();
    } catch { /* ignore */ }
  };

  /* ───────── فلترة ───────── */
  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return occasions;
    return occasions.filter((o) => o.name.includes(q));
  }, [occasions, search]);

  const connectedSessions = sessions.filter((s) => s.isConnected);
  const hasBaileys = connectedSessions.length > 0;

  /* ═══════════ UI ═══════════ */
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      {/* رأس الصفحة */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[color:var(--color-foreground)]">
            <CalendarDays className="h-6 w-6 text-[color:var(--color-primary)]" />
            مناسبات العملاء
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            رسايل مجدولة على مناسبات عملائك — قوالب ميتا معتمدة أو رسايل مباشرة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadOccasions} className="rounded-full">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button onClick={openCreate} className="rounded-full">
            <Plus className="h-4 w-4" />
            مناسبة جديدة
          </Button>
        </div>
      </header>

      {/* حالة القناة */}
      <ChannelStatus
        hasBaileys={hasBaileys}
        sessions={connectedSessions}
        selected={selectedSession}
        onSelect={setSelectedSession}
        onRefresh={loadSessions}
      />

      <Tabs defaultValue="occasions" className="space-y-5">
        <TabsList className="rounded-full p-1">
          <TabsTrigger value="occasions" className="rounded-full">
            <CalendarDays className="ml-1 h-4 w-4" />
            المناسبات
            <Badge variant="secondary" className="mr-2 rounded-full">{occasions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-full">
            <BarChart3 className="ml-1 h-4 w-4" />
            أداء القوالب
          </TabsTrigger>
        </TabsList>

        {/* ═══ تبويب المناسبات ═══ */}
        <TabsContent value="occasions" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المناسبة…"
              className="rounded-full pr-9"
            />
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((o) => (
                <OccasionCard
                  key={o.id}
                  occasion={o}
                  onView={() => setViewOccasion(o)}
                  onEdit={() => openEdit(o)}
                  onDelete={() => setDeleting(o)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ تبويب أداء القوالب ═══ */}
        <TabsContent value="stats">
          <TemplateStatsPanel />
        </TabsContent>
      </Tabs>

      {/* ═════ نافذة إنشاء/تعديل ═════ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'تعديل المناسبة' : 'مناسبة جديدة'}</DialogTitle>
            <DialogDescription>جدولة رسالة تتبعت تلقائياً في موعدها — سنة بعد سنة لو حددت التكرار السنوي</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>اسم المناسبة</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="رمضان، عيد الأم…" className="rounded-xl" maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label>الموعد</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="rounded-xl" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>التكرار</Label>
                <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v as Occasion['recurrence'] })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">مرة واحدة</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                    <SelectItem value="yearly">سنوي (مثالي للمناسبات)</SelectItem>
                  </SelectContent>
                </Select>
                {form.recurrence === 'yearly' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">التكرار السنوي بيكرر على نفس التاريخ الميلادي — المناسبات الهجرية راجعيها سنوياً</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>حد الإرسال (0 = بدون حد)</Label>
                <Input type="number" min={0} value={form.sendLimit} onChange={(e) => setForm({ ...form, sendLimit: Number(e.target.value) })} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>نص الرسالة</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setMetaModalOpen(true)} className="rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  اختيار قالب ميتا
                </Button>
              </div>
              <Textarea rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-xl" maxLength={3000} />
              <p className="text-xs text-[color:var(--color-muted-foreground)]">متغيرات: {'{اسم العميل}'} · {'{اسم المناسبة}'} · {'{customer_link}'}</p>
            </div>

            <div className="space-y-1.5">
              <Label>رابط صورة (اختياري)</Label>
              <Input value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} placeholder="https://…" dir="ltr" className="rounded-xl" />
            </div>

            {/* معاينة حية */}
            <WhatsAppBubblePreview content={form.message} headerLabel="سوان" mediaUrl={form.mediaUrl || undefined} />

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" onClick={() => setFormOpen(false)} className="rounded-full">إلغاء</Button>
              <Button
                variant="outline"
                onClick={sendNow}
                disabled={sendingNow || !hasBaileys || !form.message.trim()}
                className="rounded-full"
                title={hasBaileys ? 'إرسال فوري دلوقتي عبر واتساب متصل' : 'محتاجة جلسة واتساب متصلة'}
              >
                {sendingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                إرسال فوري
              </Button>
              <Button onClick={save} disabled={saving || !form.name.trim() || !form.message.trim() || !form.scheduledAt} className="rounded-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {form.id ? 'حفظ التعديلات' : 'جدولة المناسبة'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═════ نافذة عرض الرسالة ═════ */}
      <Dialog open={!!viewOccasion} onOpenChange={(open) => !open && setViewOccasion(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[color:var(--color-primary)]" />
              {viewOccasion?.name}
            </DialogTitle>
            <DialogDescription>
              {viewOccasion?.templateName ? `قالب مرتبط: ${viewOccasion.templateName}` : 'رسالة نصية مباشرة'}
            </DialogDescription>
          </DialogHeader>
          {viewOccasion && (
            <div className="space-y-4 py-1">
              <WhatsAppBubblePreview content={viewOccasion.message} headerLabel="سوان" mediaUrl={viewOccasion.mediaUrl || undefined} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="الموعد" value={new Date(viewOccasion.scheduledAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })} />
                <InfoRow label="التكرار" value={RECURRENCE_LABEL[viewOccasion.recurrence] || viewOccasion.recurrence} />
                <InfoRow label="إجمالي المرسل" value={`${(viewOccasion.totalSent || 0).toLocaleString('ar-EG')} رسالة`} />
                <InfoRow label="آخر إرسال" value={viewOccasion.lastSentAt ? new Date(viewOccasion.lastSentAt).toLocaleDateString('ar-EG') : 'لسه'} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═════ تأكيد الحذف ═════ */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>حذف المناسبة؟</DialogTitle>
            <DialogDescription>هتتمسح «{deleting?.name}» نهائياً وكل جدولتها. الرسايل اللي اتبعتت قبل كده مش هتتأثر.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} className="rounded-full">إلغاء</Button>
            <Button variant="destructive" onClick={confirmDelete} className="rounded-full">
              <Trash2 className="h-4 w-4" />
              حذف نهائي
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═════ اختيار قالب ميتا ═════ */}
      <MetaTemplatesModal
        open={metaModalOpen}
        onClose={() => setMetaModalOpen(false)}
        onPick={(content) => {
          setForm((prev) => ({ ...prev, message: content || prev.message }));
          setMetaModalOpen(false);
        }}
        title="اختيار قالب ميتا للمناسبة"
      />
    </div>
  );
};

/* ─────────────────────── مكوّنات داخلية ─────────────────────── */

const ChannelStatus: React.FC<{
  hasBaileys: boolean;
  sessions: Session[];
  selected: string;
  onSelect: (v: string) => void;
  onRefresh: () => void;
}> = ({ hasBaileys, sessions, selected, onSelect, onRefresh }) => (
  <Card className="border-[color:var(--color-border)]">
    <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${hasBaileys ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
          <MessagesSquare className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold">
            {hasBaileys ? 'جلسة واتساب متصلة — الإرسال الفوري جاهز' : 'مفيش جلسة واتساب متصلة'}
          </p>
          <p className="text-xs text-[color:var(--color-muted-foreground)]">
            {hasBaileys
              ? 'المناسبات المجدولة بتتبعت أوتوماتيك من السيرفر حتى لو القناة مقفولة'
              : <>مفيش جلسة متصلة —{' '}<Link to="/customers/whatsapp-notify" className="font-medium text-[color:var(--color-primary)] underline-offset-2 hover:underline">اربطيها من إشعارات واتساب</Link>{' '}للإرسال الفوري</>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hasBaileys && (
          <Select value={selected} onValueChange={onSelect}>
            <SelectTrigger className="w-[220px] rounded-full"><SelectValue placeholder="اختر الجلسة" /></SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.sessionId} value={s.sessionId}>
                  {s.phoneNumber || s.sessionId.slice(0, 12)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="ghost" size="icon" onClick={onRefresh} className="rounded-full" aria-label="تحديث الجلسات">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const OccasionCard: React.FC<{
  occasion: Occasion;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ occasion: o, onView, onEdit, onDelete }) => {
  const status = STATUS_META[o.status] || STATUS_META.draft;
  const isUpcoming = new Date(o.scheduledAt) > new Date();
  return (
    <Card className="group relative overflow-hidden border-[color:var(--color-border)] transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{o.name}</CardTitle>
          <Badge variant="outline" className={`shrink-0 rounded-full ${status.cls}`}>{status.label}</Badge>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(o.scheduledAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
            {isUpcoming ? ' · قادمة' : ''}
          </span>
          <span>{RECURRENCE_LABEL[o.recurrence] || o.recurrence}</span>
          {o.metaTemplateName && (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" /> قالب ميتا معتمد
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm text-[color:var(--color-muted-foreground)]">{o.message}</p>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="inline-flex items-center gap-1 text-xs text-[color:var(--color-muted-foreground)]">
            <Users className="h-3.5 w-3.5" />
            {(o.totalSent || 0).toLocaleString('ar-EG')} رسالة مرسلة
          </span>
          <div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
            <Button variant="ghost" size="icon" onClick={onView} className="h-8 w-8 rounded-full" aria-label="عرض الرسالة" title="عرض الرسالة">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 rounded-full" aria-label="تعديل" title="تعديل">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 rounded-full text-destructive hover:text-destructive" aria-label="حذف" title="حذف">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--color-border)] px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
      <CalendarDays className="h-7 w-7" />
    </div>
    <h3 className="mt-4 text-lg font-semibold">ابدأي بأول مناسبة</h3>
    <p className="mt-1 max-w-sm text-sm text-[color:var(--color-muted-foreground)]">
      اختاري مناسبة سنوية زي رمضان أو عيد الأم، اكتبي الرسالة مرة، والمنصة هتبعتها لعملائك أوتوماتيك كل سنة
    </p>
    <Button onClick={onCreate} className="mt-5 rounded-full">
      <Plus className="h-4 w-4" />
      إنشاء مناسبة
    </Button>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-[color:var(--color-muted)] p-3">
    <p className="text-xs text-[color:var(--color-muted-foreground)]">{label}</p>
    <p className="mt-0.5 font-medium">{value}</p>
  </div>
);

export default CustomerOccasionsWhatsAppNotify;
