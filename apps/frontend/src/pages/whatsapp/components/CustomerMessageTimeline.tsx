import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../services/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  MessageSquareText, Clock, CheckCircle2, XCircle, RefreshCw, User, Workflow, ArrowLeft,
} from 'lucide-react';

interface TimelineEvent {
  source: 'notification' | 'direct';
  title: string;
  eventType: string;
  category: string;
  content: string;
  status: string;
  failureReason: string | null;
  at: string;
  meta: { delivered?: boolean; read?: boolean; failed?: boolean; templateName?: string | null; messageType?: string };
}

interface JourneyInfo {
  journeyId: string;
  flowName: string;
  status: string;
  currentStep: number;
  startedAt: string;
  nextSendAt: string;
  lastSentAt: string | null;
  orderNumber: string | null;
  stepEvents: Array<{ stepId?: string; content?: string; at?: string; status?: string }>;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** عميل محدد مفتوح مباشرة (من جدول الرحلات) */
  customerId?: string;
  customerName?: string;
}

/**
 * 🕐 الخط الزمني لرسايل عميل — كل الرسايل اللي اتبعتت له (سلاسل + إشعارات + حملات)
 * مرتبة من الأحدث للأقدم بتصميم Timeline عمودي.
 */
const CustomerMessageTimeline: React.FC<Props> = ({ open, onClose, customerId: presetId, customerName: presetName }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [journeys, setJourneys] = useState<JourneyInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTimeline = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/customers/whatsapp-notify/${id}/message-timeline?limit=120`);
      setCustomer(res.data?.customer || null);
      setEvents(res.data?.events || []);
      setJourneys(res.data?.journeys || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && presetId) {
      loadTimeline(presetId);
      setCustomer((prev) => prev || ({ id: presetId, name: presetName || '', phone: null }));
    }
    if (!open) {
      setCustomer(null); setEvents([]); setJourneys([]); setSearchQuery('');
    }
  }, [open, presetId, presetName, loadTimeline]);

  // بحث عن عميل
  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get('/customers/search', { params: { q } });
        const list = res.data?.data || res.data?.customers || [];
        setSearchResults(
          (list as Array<Record<string, unknown>>).map((c) => ({
            id: String(c.id || ''),
            name: String(c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.customerName || 'عميل'),
            phone: (c.phone as string) || null,
          })),
        );
      } catch { setSearchResults([]); } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, searchOpen]);

  const grouped = useMemo(() => {
    // تجميع باليوم
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const day = new Date(e.at).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-[color:var(--color-primary)]" />
            رسايل {customer?.name || 'العميل'}
          </DialogTitle>
          <DialogDescription>
            {customer?.phone ? <span dir="ltr">{customer.phone}</span> : 'اختاري عميل لعرض كل الرسايل المرسلة له'}
          </DialogDescription>
        </DialogHeader>

        {/* بحث عميل */}
        <div className="relative">
          {customer ? (
            <Button variant="ghost" size="sm" onClick={() => { setCustomer(null); setEvents([]); setJourneys([]); }} className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
              تغيير العميل
            </Button>
          ) : (
            <>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحثي بالاسم أو رقم الهاتف…"
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-input)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              />
              {(searchResults.length > 0 || searching) && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-lg">
                  {searching ? (
                    <div className="p-3 text-center text-xs text-[color:var(--color-muted-foreground)]">جاري البحث…</div>
                  ) : (
                    searchResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { loadTimeline(c.id); setSearchResults([]); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm transition hover:bg-[color:var(--color-accent)]"
                      >
                        <User className="h-4 w-4 text-[color:var(--color-muted-foreground)]" />
                        <span className="flex-1 font-medium">{c.name}</span>
                        <span className="text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">{c.phone || ''}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* رحلات السلاسل النشطة */}
        {!loading && journeys.length > 0 && customer && (
          <div className="flex flex-wrap gap-2">
            {journeys.filter((j) => j.status === 'ACTIVE').map((j) => (
              <Badge key={j.journeyId} variant="outline" className="gap-1 rounded-full border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">
                <Workflow className="h-3 w-3" />
                {j.flowName} · خطوة {j.currentStep}
              </Badge>
            ))}
          </div>
        )}

        {/* الخط الزمني */}
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !customer ? (
          <div className="py-12 text-center text-sm text-[color:var(--color-muted-foreground)]">
            ابحثي عن عميل وشوفي كل حاجة اتبعتت له بالترتيب
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-sm text-[color:var(--color-muted-foreground)]">
            مفيش رسايل مرسلة لـ {customer.name} لسه
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {grouped.map(([day, dayEvents]) => (
              <div key={day}>
                <div className="sticky top-0 z-[1] -mx-1 bg-[color:var(--color-card)]/95 px-1 py-1.5 backdrop-blur">
                  <p className="text-xs font-bold text-[color:var(--color-muted-foreground)]">{day}</p>
                </div>
                <div className="relative mt-2 space-y-3 before:absolute before:right-[7px] before:top-2 before:h-full before:w-px before:bg-[color:var(--color-border)]">
                  {dayEvents.map((e, i) => (
                    <TimelineItem key={`${e.at}-${i}`} event={e} last={i === dayEvents.length - 1} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TimelineItem: React.FC<{ event: TimelineEvent; last: boolean }> = ({ event: e, last }) => {
  const failed = e.status === 'FAILED';
  const read = e.meta?.read;
  const delivered = e.meta?.delivered || e.status === 'DELIVERED' || e.status === 'READ';
  return (
    <div className={`relative pr-7 ${last ? 'before:h-2' : ''}`}>
      <span
        className={`absolute right-0 top-2 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 ${
          failed
            ? 'border-destructive bg-destructive/15'
            : read
              ? 'border-emerald-500 bg-emerald-500/20'
              : delivered
                ? 'border-blue-500 bg-blue-500/15'
                : 'border-[color:var(--color-border)] bg-[color:var(--color-muted)]'
        }`}
      >
        {failed && <XCircle className="h-2.5 w-2.5 text-destructive" />}
      </span>
      <div className={`rounded-xl border p-3 ${failed ? 'border-destructive/30 bg-destructive/5' : 'border-[color:var(--color-border)]'}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{e.title}</p>
          <span className="shrink-0 text-[11px] text-[color:var(--color-muted-foreground)]">
            {new Date(e.at).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[color:var(--color-muted-foreground)]">{e.content}</p>
        {failed && e.failureReason && (
          <p className="mt-1.5 text-[11px] text-destructive">سبب الفشل: {e.failureReason}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <StatusChip status={e.status} />
          {e.source === 'direct' && <Badge variant="outline" className="rounded-full text-[10px]">مباشرة</Badge>}
        </div>
      </div>
    </div>
  );
};

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    SENT: { label: 'مرسلة', cls: 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400' },
    DELIVERED: { label: 'وصلت', cls: 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400' },
    READ: { label: 'اتقرت', cls: 'border-emerald-400 text-emerald-800 dark:border-emerald-600 dark:text-emerald-300' },
    FAILED: { label: 'فشلت', cls: 'border-destructive/40 text-destructive' },
    PENDING: { label: 'منتظرة', cls: 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400' },
  };
  const s = map[status] || { label: status, cls: 'border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)]' };
  return <Badge variant="outline" className={`rounded-full text-[10px] ${s.cls}`}>{s.label}</Badge>;
};

export default CustomerMessageTimeline;
