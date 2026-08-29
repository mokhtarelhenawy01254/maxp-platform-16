import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Cake, Send, Eye, Sparkles, RefreshCw, Clock, Users, LayoutTemplate, BarChart3,
  CalendarDays, Loader2, CheckCircle2, Gift,
} from 'lucide-react';

interface BirthdaySettings {
  isEnabled: boolean;
  dailySendTime: string;
  channel: 'whatsapp_session' | 'meta_api';
  messageTemplate: string;
  couponCode: string;
  metaTemplateName?: string;
}

interface BirthdayCustomer {
  id: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  daysUntil: number;
}

const DEFAULT_MESSAGE =
  'كل سنة وأنتي طيبة يا {first_name} 🎂\n\nبمناسبة عيد ميلادك، هدية خاصة من سوان: خصم {discount}% بكود {coupon_code}\n\nاستلمي هديتك من هنا: {customer_link}';

const BirthdayWhatsAppNotify: React.FC = () => {
  const [settings, setSettings] = useState<BirthdaySettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [todayList, setTodayList] = useState<BirthdayCustomer[]>([]);
  const [upcomingList, setUpcomingList] = useState<BirthdayCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const [metaModalOpen, setMetaModalOpen] = useState(false);

  /* ───────── تحميل ───────── */
  const loadSettings = useCallback(async () => {
    try {
      const res = await apiClient.get('/customers/whatsapp-notify/birthday-automation/settings');
      const s = res.data?.settings || res.data;
      if (s) {
        setSettings({
          isEnabled: s.isEnabled ?? true,
          dailySendTime: s.dailySendTime || '12:00',
          channel: s.channel || 'whatsapp_session',
          messageTemplate: s.messageTemplate || DEFAULT_MESSAGE,
          couponCode: s.couponCode || 'HBD10',
          metaTemplateName: s.metaTemplateName,
        });
      }
    } catch { /* ignore */ }
  }, []);

  const loadTrack = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, upcomingRes] = await Promise.all([
        apiClient.get('/customers/whatsapp-notify/birthday-automation/today'),
        apiClient.get('/customers/whatsapp-notify/birthday-automation/upcoming'),
      ]);
      setTodayList(resToList(todayRes.data));
      setUpcomingList(resToList(upcomingRes.data));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); loadTrack(); }, [loadSettings, loadTrack]);

  const saveSettings = async () => {
    if (!settings) return;
    setSettingsSaving(true);
    try {
      await apiClient.post('/customers/whatsapp-notify/birthday-automation/settings', settings);
    } catch { /* ignore */ } finally {
      setSettingsSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim()) return;
    setSendingTest(true);
    try {
      await apiClient.post('/customers/whatsapp-notify/birthday-automation/send-test', { testPhone: testPhone.trim(), messageTemplate: settings.messageTemplate, couponCode: settings.couponCode });
      setTestPhone('');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل الإرسال التجريبي';
      alert(msg);
    } finally {
      setSendingTest(false);
    }
  };

  /* ═══════════ UI ═══════════ */
  if (!settings) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      {/* رأس الصفحة */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[color:var(--color-foreground)]">
            <Cake className="h-6 w-6 text-[color:var(--color-primary)]" />
            رسايل عيد الميلاد
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            تهنئة أوتوماتيك في يوم عميلك — كود خصم يخليها فرصة بيع
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 py-2">
            <Switch checked={settings.isEnabled} onCheckedChange={(v) => setSettings({ ...settings, isEnabled: v })} aria-label="تفعيل التهنئة التلقائية" />
            <span className="text-sm font-medium">{settings.isEnabled ? 'مفعّلة' : 'متوقفة'}</span>
          </div>
          <Button onClick={saveSettings} disabled={settingsSaving} className="rounded-full">
            {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            حفظ
          </Button>
        </div>
      </header>

      <Tabs defaultValue="audience" className="space-y-5">
        <TabsList className="rounded-full p-1">
          <TabsTrigger value="audience" className="rounded-full">
            <Users className="ml-1 h-4 w-4" />
            أعياد الميلاد
            <Badge variant="secondary" className="mr-2 rounded-full">{todayList.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="message" className="rounded-full">
            <Gift className="ml-1 h-4 w-4" />
            الرسالة والإعدادات
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-full">
            <BarChart3 className="ml-1 h-4 w-4" />
            الأداء
          </TabsTrigger>
        </TabsList>

        {/* ═══ أعياد اليوم والقادمة ═══ */}
        <TabsContent value="audience" className="space-y-5">
          <BirthdaySection title="أعياد النهارده" icon={<Sparkles className="h-4 w-4 text-amber-500" />} list={todayList} loading={loading} emptyText="مفيش عميلة عندها عيد ميلاد النهارده" highlight />
          <BirthdaySection title="القادمة خلال 30 يوم" icon={<CalendarDays className="h-4 w-4" />} list={upcomingList.slice(0, 15)} loading={loading} emptyText="مفيش أعياد قريبة" />
        </TabsContent>

        {/* ═══ الرسالة والإعدادات ═══ */}
        <TabsContent value="message">
          <Card className="border-[color:var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-base">قالب التهنئة</CardTitle>
              <CardDescription>بيتبعت أوتوماتيك يوم الميلاد في الوقت المحدد — اختاري قالب ميتا معتمد أو اكتبي رسالة عادية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>وقت الإرسال اليومي</Label>
                  <Input type="time" value={settings.dailySendTime} onChange={(e) => setSettings({ ...settings, dailySendTime: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>كود الخصم</Label>
                  <Input value={settings.couponCode} onChange={(e) => setSettings({ ...settings, couponCode: e.target.value })} dir="ltr" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>القناة</Label>
                  <Select value={settings.channel} onValueChange={(v) => setSettings({ ...settings, channel: v as BirthdaySettings['channel'] })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp_session">واتساب مباشر (Baileys)</SelectItem>
                      <SelectItem value="meta_api">Meta Cloud API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>نص التهنئة</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setMetaModalOpen(true)} className="rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300">
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    اختيار قالب ميتا
                  </Button>
                </div>
                <Textarea rows={6} value={settings.messageTemplate} onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })} className="rounded-xl" />
                <p className="text-xs text-[color:var(--color-muted-foreground)]">متغيرات: {'{first_name}'} · {'{coupon_code}'} · {'{discount}'} · {'{customer_link}'}</p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <WhatsAppBubblePreview content={settings.messageTemplate} variables={{ coupon_code: settings.couponCode }} headerLabel="سوان" />

                {/* اختبار تجريبي */}
                <div className="space-y-3 rounded-2xl border border-[color:var(--color-border)] p-4">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-[color:var(--color-primary)]" />
                    <h4 className="text-sm font-semibold">تجربة على رقمك</h4>
                  </div>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">هيوصلك شكل الرسالة النهائي على رقمك قبل ما تحفظي</p>
                  <div className="flex gap-2">
                    <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="2010…" dir="ltr" className="rounded-xl" />
                    <Button onClick={sendTest} disabled={sendingTest || !testPhone.trim()} className="rounded-full">
                      {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ الأداء ═══ */}
        <TabsContent value="stats">
          <TemplateStatsPanel title="أداء رسايل الميلاد والقوالب" />
        </TabsContent>
      </Tabs>

      <MetaTemplatesModal
        open={metaModalOpen}
        onClose={() => setMetaModalOpen(false)}
        onPick={(content) => {
          setSettings((prev) => (prev ? { ...prev, messageTemplate: content || prev.messageTemplate } : prev));
          setMetaModalOpen(false);
        }}
        title="اختيار قالب ميتا لتهنئة الميلاد"
      />
    </div>
  );
};

/* ─────────────────────── helpers ─────────────────────── */

function resToList(data: unknown): BirthdayCustomer[] {
  const d = data as { customers?: unknown[]; today?: unknown[]; upcoming?: unknown[]; data?: unknown[] };
  const raw = (d?.customers || d?.today || d?.upcoming || d?.data || []) as Array<Record<string, unknown>>;
  return raw.map((c) => ({
    id: String(c.id || ''),
    name: String(c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'عميلة'),
    phone: (c.phone as string) || null,
    birthDate: (c.birthdayDate as string) || (c.birthDate as string) || null,
    daysUntil: Number(c.daysRemaining ?? c.daysUntil ?? 0),
  }));
}

const BirthdaySection: React.FC<{
  title: string;
  icon: React.ReactNode;
  list: BirthdayCustomer[];
  loading: boolean;
  emptyText: string;
  highlight?: boolean;
}> = ({ title, icon, list, loading, emptyText, highlight }) => (
  <Card className="border-[color:var(--color-border)]">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-[color:var(--color-muted-foreground)]">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العميلة</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-center">تاريخ الميلاد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name || '—'}</TableCell>
                  <TableCell className="font-mono text-sm" dir="ltr">{c.phone || '—'}</TableCell>
                  <TableCell className="text-center text-sm">
                    {c.birthDate
                      ? new Date(c.birthDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
                      : '—'}
                    {highlight && <Badge variant="outline" className="mr-2 rounded-full border-amber-300 text-amber-700 dark:text-amber-400">النهارده 🎉</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

export default BirthdayWhatsAppNotify;
