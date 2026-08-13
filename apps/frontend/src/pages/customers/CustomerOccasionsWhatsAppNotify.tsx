import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowPathIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationCircleIcon,
    MegaphoneIcon,
    PaperAirplaneIcon,
    SparklesIcon,
    StopCircleIcon,
    EyeIcon,
    ClockIcon as HistoryIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '../../services/apiClient';

type Audience = 'all' | 'withOrders' | 'newCustomers' | 'activeCustomers';
type CampaignState = 'scheduled' | 'running' | 'completed' | 'cancelled';
type ScheduleMode = 'now' | 'scheduled';

interface Session {
    sessionId: string;
    phoneNumber: string;
    isConnected: boolean;
}

interface CampaignStatus {
    status: CampaignState;
    sent: number;
    failed: number;
    total: number;
    progress: number;
    startedAt?: string | null;
    scheduledAt?: string | null;
    completedAt?: string;
    dbCampaignId?: string | null;
}

interface HistoryCampaign {
    id: string;
    name: string;
    targetAudience: string;
    status: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    scheduledAt?: string | null;
    sentAt?: string | null;
    createdAt: string;
}

const AUDIENCE_OPTIONS: { value: Audience; label: string; desc: string; emoji: string }[] = [
    { value: 'all', label: 'كل العملاء', desc: 'كل العملاء اللي عندهم رقم واتساب', emoji: '👥' },
    { value: 'withOrders', label: 'عملاء بطلبات', desc: 'العملاء اللي طلبوا قبل كده', emoji: '🛍️' },
    { value: 'newCustomers', label: 'عملاء جدد', desc: 'العملاء المنضمين خلال آخر X أيام', emoji: '✨' },
    { value: 'activeCustomers', label: 'عملاء نشطين', desc: 'العملاء بحالة حساب نشط', emoji: '💚' },
];

const AUDIENCE_LABELS: Record<string, string> = {
    all: 'كل العملاء',
    withOrders: 'عملاء بطلبات',
    newCustomers: 'عملاء جدد',
    activeCustomers: 'عملاء نشطين',
};

const CAMPAIGN_STORAGE_KEY = 'active_occasion_campaign_id';
const MAX_OCCASION_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 3000;
const MAX_NEW_DAYS = 365;
const POLL_INTERVAL_MS = 2500;
const MIN_SCHEDULE_LEAD_MS = 60 * 1000;

const pad2 = (value: number) => String(value).padStart(2, '0');
const toLocalDateInput = (date: Date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const toLocalTimeInput = (date: Date) =>
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const getDefaultSchedule = () => {
    const date = new Date(Date.now() + 10 * 60 * 1000);
    return { date: toLocalDateInput(date), time: toLocalTimeInput(date) };
};

const isValidHttpUrl = (value: string) => {
    if (!value.trim()) return true;
    try {
        const parsed = new URL(value.trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch { return false; }
};

const clampDays = (value: number) => {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(MAX_NEW_DAYS, Math.floor(value)));
};

const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
};

const formatEstimatedTime = (customers: number, delayValue: number, delayUnit: string) => {
    const delayMs = delayValue * (delayUnit === 'minutes' ? 60000 : 1000);
    const totalMs = customers * delayMs;
    const mins = Math.ceil(totalMs / 60000);
    if (mins < 1) return 'أقل من دقيقة';
    if (mins < 60) return `~${mins} دقيقة`;
    return `~${Math.ceil(mins / 60)} ساعة`;
};

const CustomerOccasionsWhatsAppNotify: React.FC = () => {
    const defaultSchedule = getDefaultSchedule();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState('');
    const [sessionsLoading, setSessionsLoading] = useState(true);

    const [audience, setAudience] = useState<Audience>('withOrders');
    const [newDays, setNewDays] = useState(7);
    const [audienceCount, setAudienceCount] = useState<number | null>(null);
    const [audienceLoading, setAudienceLoading] = useState(false);

    const [occasionName, setOccasionName] = useState('مناسبة خاصة');
    const [message, setMessage] = useState(
        '🎉 بمناسبة {اسم المناسبة}،\n\nكل سنة وأنتم طيبين يا {اسم العميل}!\nيسعدنا نقدم لكم عرض خاص لفترة محدودة.'
    );
    const [mediaUrl, setMediaUrl] = useState('');

    const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
    const [sendDate, setSendDate] = useState(defaultSchedule.date);
    const [sendTime, setSendTime] = useState(defaultSchedule.time);

    const [delayValue, setDelayValue] = useState(1.5);
    const [delayUnit, setDelayUnit] = useState<'seconds' | 'minutes'>('seconds');

    const [sending, setSending] = useState<boolean>(() =>
        Boolean(localStorage.getItem(CAMPAIGN_STORAGE_KEY))
    );
    const [sendError, setSendError] = useState('');
    const [pollError, setPollError] = useState('');
    const [campaignId, setCampaignId] = useState<string | null>(
        () => localStorage.getItem(CAMPAIGN_STORAGE_KEY)
    );
    const [campaign, setCampaign] = useState<CampaignStatus | null>(null);

    const [showPreview, setShowPreview] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryCampaign[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const res = await apiClient.get(`/customers/whatsapp-notify/sessions?t=${Date.now()}`);
            const list: Session[] = res.data?.sessions || [];
            setSessions(list);
            const connected = list.filter(s => s.isConnected);
            setSelectedSession(prev => {
                if (prev && connected.some(s => s.sessionId === prev)) return prev;
                return connected[0]?.sessionId || '';
            });
        } catch {
            setSessions([]);
            setSelectedSession('');
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const previewAudience = useCallback(async (currentAudience: Audience, days: number) => {
        setAudienceLoading(true);
        setAudienceCount(null);
        try {
            const params: Record<string, string> = { audience: currentAudience };
            if (currentAudience === 'newCustomers') params.newDays = String(clampDays(days));
            const res = await apiClient.get('/customers/whatsapp-notify/preview-audience', { params });
            setAudienceCount(res.data?.count ?? 0);
        } catch {
            setAudienceCount(null);
        } finally {
            setAudienceLoading(false);
        }
    }, []);

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await apiClient.get('/customers/whatsapp-notify/campaigns/history?limit=10');
            setHistoryData(res.data?.campaigns || []);
        } catch {
            setHistoryData([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);
    useEffect(() => { previewAudience(audience, newDays); }, [audience, newDays, previewAudience]);
    useEffect(() => { loadHistory(); }, [loadHistory]);

    useEffect(() => {
        if (!campaignId) return;
        let failures = 0;
        const pollCampaign = async () => {
            try {
                const res = await apiClient.get(`/customers/whatsapp-notify/campaign/${campaignId}`);
                const data = res.data as CampaignStatus;
                failures = 0;
                setPollError('');
                setCampaign(data);
                setSending(data.status === 'running' || data.status === 'scheduled');
                if (data.status === 'completed' || data.status === 'cancelled') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
                    setCampaignId(null);
                    setSending(false);
                    loadHistory();
                }
            } catch (err: any) {
                if (err?.response?.status === 404) {
                    if (pollRef.current) clearInterval(pollRef.current);
                    localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
                    setCampaignId(null);
                    setCampaign(null);
                    setSending(false);
                    setPollError('');
                    return;
                }
                failures += 1;
                if (failures >= 2) {
                    setPollError('تعذر تحديث حالة الحملة مؤقتًا. سيتم إعادة المحاولة تلقائيًا.');
                }
            }
        };
        void pollCampaign();
        pollRef.current = setInterval(() => void pollCampaign(), POLL_INTERVAL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [campaignId, loadHistory]);

    const handleSend = async () => {
        const trimmedOccasionName = occasionName.trim();
        const trimmedMessage = message.trim();
        const trimmedMediaUrl = mediaUrl.trim();

        if (!trimmedOccasionName) { setSendError('اكتبي اسم المناسبة أولاً'); return; }
        if (trimmedOccasionName.length > MAX_OCCASION_NAME_LENGTH) {
            setSendError(`اسم المناسبة لا يزيد عن ${MAX_OCCASION_NAME_LENGTH} حرف`); return;
        }
        if (!trimmedMessage) { setSendError('اكتب الرسالة أولاً'); return; }
        if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
            setSendError(`الرسالة لا يجب أن تتجاوز ${MAX_MESSAGE_LENGTH} حرف`); return;
        }
        if (!isValidHttpUrl(trimmedMediaUrl)) {
            setSendError('رابط الصورة غير صالح. استخدمي رابط يبدأ بـ http أو https'); return;
        }
        if (!Number.isFinite(delayValue) || delayValue <= 0) {
            setSendError('حدد فاصل زمني صحيح أكبر من صفر'); return;
        }
        const connectedSessions = sessions.filter(s => s.isConnected);
        if (connectedSessions.length === 0) {
            setSendError('لا توجد جلسة واتساب متصلة. يرجى ربط الجلسة أولاً.'); return;
        }
        const targetSession =
            connectedSessions.find(s => s.sessionId === selectedSession) || connectedSessions[0];
        if (!targetSession) { setSendError('اختاري جلسة واتساب متصلة قبل الإرسال'); return; }

        let sendAt: string | undefined;
        if (scheduleMode === 'scheduled') {
            if (!sendDate || !sendTime) { setSendError('حدد اليوم والوقت للحملة'); return; }
            const scheduledDate = new Date(`${sendDate}T${sendTime}:00`);
            if (Number.isNaN(scheduledDate.getTime())) {
                setSendError('صيغة اليوم أو الوقت غير صحيحة'); return;
            }
            if (scheduledDate.getTime() - Date.now() < MIN_SCHEDULE_LEAD_MS) {
                setSendError('وقت الإرسال لازم يكون في المستقبل'); return;
            }
            sendAt = scheduledDate.toISOString();
        }

        setSendError('');
        setPollError('');
        setCampaign(null);
        setCampaignId(null);
        localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
        setSending(true);

        try {
            const payload: Record<string, unknown> = {
                audience,
                message: trimmedMessage,
                occasionName: trimmedOccasionName,
                sessionId: targetSession.sessionId,
                delayValue,
                delayUnit,
            };
            if (audience === 'newCustomers') payload.newDays = clampDays(newDays);
            if (trimmedMediaUrl) payload.mediaUrl = trimmedMediaUrl;
            if (sendAt) payload.sendAt = sendAt;

            const res = await apiClient.post('/customers/whatsapp-notify/smart-send', payload);

            if (res.data?.success) {
                const id = res.data.campaignId as string;
                const status = (res.data.status || (sendAt ? 'scheduled' : 'running')) as CampaignState;
                const total = Number(res.data.total || 0);

                const initialCampaign: CampaignStatus = {
                    status,
                    sent: 0,
                    failed: 0,
                    total,
                    progress: 0,
                    startedAt: status === 'running' ? new Date().toISOString() : null,
                    scheduledAt: status === 'scheduled' ? (res.data.scheduledAt || sendAt || null) : null,
                    dbCampaignId: res.data.dbCampaignId || null,
                };

                setCampaign(initialCampaign);
                setCampaignId(id);
                localStorage.setItem(CAMPAIGN_STORAGE_KEY, id);
            } else {
                setSending(false);
                setSendError(res.data?.message || 'حدث خطأ أثناء إنشاء الحملة');
            }
        } catch (err: any) {
            setSending(false);
            setSendError(err?.response?.data?.message || 'فشل إرسال الحملة');
        }
    };

    const handleStopCampaign = async () => {
        if (!campaignId) return;
        try {
            await apiClient.delete(`/customers/whatsapp-notify/campaign/${campaignId}`);
            setCampaign(prev =>
                prev ? { ...prev, status: 'cancelled', completedAt: new Date().toISOString() } : prev
            );
            setSending(false);
            localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
            setCampaignId(null);
            if (pollRef.current) clearInterval(pollRef.current);
        } catch {
            setSendError('تعذر إيقاف الحملة حالياً');
        }
    };

    // Preview message with real substitutions
    const previewMessage = message
        .replace(/{اسم العميل}/g, 'محمد أحمد')
        .replace(/{customerName}/g, 'محمد أحمد')
        .replace(/{اسم المناسبة}/g, occasionName || 'رمضان كريم')
        .replace(/{occasionName}/g, occasionName || 'رمضان كريم');

    const connectedSession = sessions.find(s => s.isConnected);
    const connectedSessions = sessions.filter(s => s.isConnected);
    const todayDate = toLocalDateInput(new Date());
    const minTime =
        sendDate === todayDate
            ? toLocalTimeInput(new Date(Date.now() + MIN_SCHEDULE_LEAD_MS))
            : undefined;
    const canSend =
        !sending &&
        !sessionsLoading &&
        !audienceLoading &&
        !!message.trim() &&
        message.trim().length <= MAX_MESSAGE_LENGTH &&
        !!occasionName.trim() &&
        occasionName.trim().length <= MAX_OCCASION_NAME_LENGTH &&
        Number.isFinite(delayValue) && delayValue > 0 &&
        (mediaUrl.trim() ? isValidHttpUrl(mediaUrl.trim()) : true) &&
        !!selectedSession &&
        connectedSessions.length > 0 &&
        (audienceCount ?? 0) > 0 &&
        (scheduleMode !== 'scheduled' ||
            (() => {
                if (!sendDate || !sendTime) return false;
                const combined = new Date(`${sendDate}T${sendTime}:00`);
                return (
                    !Number.isNaN(combined.getTime()) &&
                    combined.getTime() - Date.now() >= MIN_SCHEDULE_LEAD_MS
                );
            })());

    const statusColor =
        campaign?.status === 'scheduled'
            ? { bar: 'bg-amber-500', badge: 'text-amber-700 bg-amber-100 border-amber-200 shadow-sm' }
            : campaign?.status === 'running'
                ? { bar: 'bg-violet-500', badge: 'text-violet-700 bg-violet-100 border-violet-200 shadow-sm' }
                : campaign?.status === 'completed'
                    ? { bar: 'bg-emerald-500', badge: 'text-emerald-700 bg-emerald-100 border-emerald-200 shadow-sm' }
                    : { bar: 'bg-rose-500', badge: 'text-rose-700 bg-rose-100 border-rose-200 shadow-sm' };

    const statusText =
        campaign?.status === 'scheduled' ? '📅 الحملة مجدولة' :
        campaign?.status === 'running' ? '⚡ الحملة جارية' :
        campaign?.status === 'completed' ? '✅ الحملة اكتملت' :
        campaign?.status === 'cancelled' ? '🛑 تم إيقاف الحملة' : '';

    const getHistoryStatusStyle = (status: string) => {
        switch (status) {
            case 'running': return 'bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400';
            case 'completed': return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400';
            case 'cancelled': return 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400';
            case 'scheduled': return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400';
            default: return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400';
        }
    };

    const getHistoryStatusLabel = (status: string) => {
        switch (status) {
            case 'running': return 'جارية';
            case 'completed': return 'مكتملة';
            case 'cancelled': return 'موقوفة';
            case 'scheduled': return 'مجدولة';
            case 'draft': return 'مسودة';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-fuchsia-50/20 dark:from-slate-950 dark:via-violet-950/20 dark:to-fuchsia-950/20 text-gray-900 dark:text-slate-100 p-4 md:p-6" dir="rtl">
            <div className="max-w-5xl mx-auto space-y-5">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2.5 text-gray-900 dark:text-white">
                            <span className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-xl shadow-sm">
                                <SparklesIcon className="h-5 w-5" />
                            </span>
                            مناسبات العملاء
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            ابعتي رسائل واتساب لمناسبة من اختيارك، فوراً أو في اليوم/الوقت اللي تحدديه.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {sessionsLoading ? (
                            <div className="h-8 w-36 bg-gray-200 dark:bg-slate-800 rounded-full animate-pulse" />
                        ) : connectedSession ? (
                            <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {connectedSession.phoneNumber}
                            </div>
                        ) : (
                            <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                لا توجد جلسة متصلة
                            </div>
                        )}
                        <button
                            onClick={loadSessions}
                            className="p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                            title="تحديث الجلسات"
                        >
                            <ArrowPathIcon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* ── Active Campaign Progress ── */}
                {campaign && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${statusColor.badge}`}>
                                {statusText}
                            </span>
                            <div className="text-right">
                                <div className="text-sm font-black text-gray-800 dark:text-slate-100">
                                    {campaign.sent + campaign.failed} / {campaign.total}
                                </div>
                                <div className="text-[11px] text-gray-400 dark:text-slate-500">إجمالي المعالجة</div>
                            </div>
                        </div>

                        <div className="h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${statusColor.bar} transition-all duration-500 rounded-full`}
                                style={{
                                    width: `${campaign.total > 0
                                        ? ((campaign.sent + campaign.failed) / campaign.total) * 100
                                        : 0}%`
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-2">
                                <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">{campaign.sent}</div>
                                <div className="text-[11px] text-emerald-600 dark:text-emerald-500">تم الإرسال ✓</div>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl p-2">
                                <div className="text-lg font-black text-rose-700 dark:text-rose-400">{campaign.failed}</div>
                                <div className="text-[11px] text-rose-600 dark:text-rose-500">فشل الإرسال ✗</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-2">
                                <div className="text-lg font-black text-gray-700 dark:text-slate-300">
                                    {campaign.total > 0
                                        ? Math.round(((campaign.sent + campaign.failed) / campaign.total) * 100)
                                        : 0}%
                                </div>
                                <div className="text-[11px] text-gray-500 dark:text-slate-500">الإنجاز</div>
                            </div>
                        </div>

                        {campaign.status === 'scheduled' && campaign.scheduledAt && (
                            <p className="text-xs text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                <CalendarDaysIcon className="h-4 w-4" />
                                موعد الإرسال: {new Date(campaign.scheduledAt).toLocaleString('ar-EG')}
                            </p>
                        )}

                        {(campaign.status === 'running' || campaign.status === 'scheduled') && campaignId && (
                            <button
                                onClick={handleStopCampaign}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
                            >
                                <StopCircleIcon className="h-4 w-4" />
                                إيقاف الحملة
                            </button>
                        )}
                    </div>
                )}

                {/* ── Settings Card ── */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Occasion Name */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block">اسم المناسبة</label>
                            <input
                                value={occasionName}
                                onChange={e => setOccasionName(e.target.value)}
                                placeholder="مثال: رمضان، عيد الأم، افتتاح الفرع الجديد"
                                className="w-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 focus:border-violet-300 dark:focus:border-violet-700 transition text-gray-900 dark:text-white"
                            />
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                                {occasionName.trim().length}/{MAX_OCCASION_NAME_LENGTH}
                            </p>
                        </div>

                        {/* Audience */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block">الجمهور</label>
                            <div className="grid grid-cols-2 gap-2">
                                {AUDIENCE_OPTIONS.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => setAudience(option.value)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                                            audience === option.value
                                                ? 'bg-violet-600 dark:bg-violet-500 text-white border-violet-600 dark:border-violet-500 font-bold shadow-sm'
                                                : 'bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700'
                                        }`}
                                    >
                                        <span>{option.emoji}</span>
                                        <span>{option.label}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">
                                {AUDIENCE_OPTIONS.find(o => o.value === audience)?.desc}
                            </p>
                        </div>
                    </div>

                    {/* New Customers Days */}
                    {audience === 'newCustomers' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block">آخر كام يوم؟</label>
                            <input
                                type="number"
                                min={1}
                                max={MAX_NEW_DAYS}
                                value={newDays}
                                onChange={e => setNewDays(clampDays(Number(e.target.value || 1)))}
                                className="w-full md:w-40 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                            />
                        </div>
                    )}

                    {/* Audience Count */}
                    <div className="flex items-center gap-3 rounded-xl border border-violet-100 dark:border-violet-900/50 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 px-4 py-3">
                        <MegaphoneIcon className="h-5 w-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                        <div className="flex-1">
                            {audienceLoading ? (
                                <div className="h-4 w-40 bg-violet-200 dark:bg-violet-800/30 rounded-full animate-pulse" />
                            ) : (
                                <span className="text-sm text-violet-800 dark:text-violet-300 font-bold">
                                    عدد المستهدفين: {(audienceCount ?? 0).toLocaleString()} عميل
                                </span>
                            )}
                        </div>
                        {audienceCount !== null && audienceCount > 0 && (
                            <span className="text-[11px] text-violet-600 dark:text-fuchsia-400">
                                ⏱ وقت تقريبي: {formatEstimatedTime(audienceCount, delayValue, delayUnit)}
                            </span>
                        )}
                    </div>

                    {/* Session Selector */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block">جلسة واتساب</label>
                        <select
                            value={selectedSession}
                            onChange={e => setSelectedSession(e.target.value)}
                            disabled={connectedSessions.length === 0}
                            className="w-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:text-gray-400 dark:disabled:text-slate-600 transition text-gray-900 dark:text-white"
                        >
                            {connectedSessions.length === 0 ? (
                                <option value="">لا توجد جلسات متصلة</option>
                            ) : (
                                connectedSessions.map(session => (
                                    <option key={session.sessionId} value={session.sessionId}>
                                        {session.phoneNumber || session.sessionId}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>

                {/* ── Schedule ── */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-200">
                        <ClockIcon className="h-4 w-4 text-violet-500" />
                        وقت الإرسال
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(['now', 'scheduled'] as ScheduleMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setScheduleMode(mode)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                    scheduleMode === mode
                                        ? 'bg-violet-600 dark:bg-violet-500 text-white border-violet-600 dark:border-violet-500 shadow-sm'
                                        : 'bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700'
                                }`}
                            >
                                {mode === 'now' ? '⚡ إرسال الآن' : '📅 تحديد يوم/وقت'}
                            </button>
                        ))}
                    </div>
                    {scheduleMode === 'scheduled' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">اليوم</label>
                                <input
                                    type="date"
                                    value={sendDate}
                                    onChange={e => setSendDate(e.target.value)}
                                    min={todayDate}
                                    className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">الوقت</label>
                                <input
                                    type="time"
                                    value={sendTime}
                                    onChange={e => setSendTime(e.target.value)}
                                    min={minTime}
                                    className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-1">
                            ملاحظة: الحد الأقصى للجدولة 24 يوماً من الآن.
                        </p>
                    )}
                </div>

                {/* ── Message Card ── */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700 dark:text-slate-200">نص الرسالة</label>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                showPreview
                                    ? 'bg-violet-600 dark:bg-violet-500 text-white border-violet-600 dark:border-violet-500'
                                    : 'bg-white dark:bg-slate-950 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700'
                            }`}
                        >
                            <EyeIcon className="h-3.5 w-3.5" />
                            {showPreview ? 'إخفاء المعاينة' : 'معاينة الرسالة'}
                        </button>
                    </div>

                    <div className={`grid gap-4 ${showPreview ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Editor */}
                        <div>
                            <textarea
                                rows={8}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="اكتب الرسالة هنا..."
                                className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm leading-6 resize-none outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 focus:border-violet-300 dark:focus:border-violet-700 transition text-gray-900 dark:text-slate-100"
                            />
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                                متغيرات متاحة:{' '}
                                <span
                                    className="font-mono bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-1 rounded cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/50 shadow-sm"
                                    onClick={() => setMessage(m => m + '{اسم العميل}')}
                                    title="انقر لإضافة المتغير"
                                >
                                    {'{اسم العميل}'}
                                </span>
                                {' '}-{' '}
                                <span
                                    className="font-mono bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-1 rounded cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/50 shadow-sm"
                                    onClick={() => setMessage(m => m + '{اسم المناسبة}')}
                                    title="انقر لإضافة المتغير"
                                >
                                    {'{اسم المناسبة}'}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-slate-600 mr-1">(انقر لإضافة)</span>
                            </p>
                            {!message.includes('{اسم العميل}') && !message.includes('{customerName}') && message.trim() && (
                                <div className="mt-1.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 text-[11px] flex items-start gap-1.5">
                                    <ExclamationCircleIcon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                    <span>
                                        الرسالة لا تحتوي على{' '}
                                        <span className="font-mono font-bold">{'{اسم العميل}'}</span>{' '}
                                        — ستُرسل نفس الرسالة لجميع العملاء بدون تخصيص.
                                    </span>
                                </div>
                            )}
                            <p className={`text-[11px] mt-1 ${message.trim().length > MAX_MESSAGE_LENGTH ? 'text-rose-600 font-bold' : 'text-gray-400 dark:text-slate-500'}`}>
                                {message.trim().length}/{MAX_MESSAGE_LENGTH}
                            </p>
                        </div>

                        {/* Live Preview */}
                        {showPreview && (
                            <div>
                                <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 mb-2">🔍 معاينة كما ستظهر للعميل</p>
                                <div className="bg-[#eae6df] dark:bg-[#0b141a] rounded-2xl p-4 h-full min-h-[200px] border border-gray-200 dark:border-slate-800">
                                    <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] shadow-sm">
                                        {mediaUrl && (
                                            <div className="mb-2 bg-gray-100 dark:bg-slate-700/50 rounded-xl h-24 flex items-center justify-center text-xs text-gray-400">
                                                📷 صورة مرفقة
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-800 dark:text-[#e9edef] whitespace-pre-wrap leading-6">
                                            {previewMessage || <span className="text-gray-400 italic">اكتب الرسالة لترى المعاينة...</span>}
                                        </p>
                                        <p className="text-[10px] text-gray-400 dark:text-[#8696a0] text-left mt-1">
                                            {toLocalTimeInput(new Date())} ✓✓
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-2 text-center">
                                        ← سيُستبدل اسم العميل تلقائياً لكل شخص
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Media URL */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block">رابط صورة (اختياري)</label>
                        <input
                            type="url"
                            value={mediaUrl}
                            onChange={e => setMediaUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Delay Settings */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950">
                            <span className="text-xs text-gray-500 dark:text-slate-400">التأخير:</span>
                            <input
                                type="number"
                                min={0.5}
                                step={0.5}
                                value={delayValue}
                                onChange={e => setDelayValue(Number(e.target.value || 0))}
                                className="w-16 text-sm bg-transparent outline-none font-bold text-gray-900 dark:text-white"
                            />
                            <select
                                value={delayUnit}
                                onChange={e => setDelayUnit(e.target.value as 'seconds' | 'minutes')}
                                className="bg-transparent text-xs outline-none text-gray-900 dark:text-slate-100"
                            >
                                <option value="seconds" className="dark:bg-slate-900">ثانية</option>
                                <option value="minutes" className="dark:bg-slate-900">دقيقة</option>
                            </select>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">
                            نصيحة: 1.5-3 ثواني آمن ✓
                        </span>
                    </div>
                </div>

                {/* ── Errors ── */}
                {sendError && (
                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-2">
                        <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                        {sendError}
                    </div>
                )}
                {pollError && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3 text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2">
                        <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                        {pollError}
                    </div>
                )}

                {/* ── Send Button ── */}
                <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all ${
                        canSend
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg hover:shadow-violet-200 dark:shadow-none'
                            : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                >
                    {sending ? (
                        <>
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            جاري التحضير...
                        </>
                    ) : (
                        <>
                            {scheduleMode === 'scheduled' ? '📅 جدولة الحملة' : '🚀 إرسال الحملة الآن'}
                            <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />
                        </>
                    )}
                </button>

                <div className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-2 justify-center">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                    الحملة بتشتغل في الخلفية وتقدري تتابعي حالتها لحظيًا من نفس الشاشة.
                </div>

                {/* ── Campaign History ── */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-200">
                            <HistoryIcon className="h-4 w-4 text-violet-500" />
                            سجل الحملات السابقة
                        </div>
                        <button
                            onClick={loadHistory}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                        >
                            <ArrowPathIcon className={`h-3.5 w-3.5 text-gray-400 ${historyLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {historyLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : historyData.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-slate-600">
                            <ChartBarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">لا توجد حملات سابقة بعد</p>
                            <p className="text-xs mt-1">ابعتي أول حملة وهتظهر هنا</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {historyData.map(camp => (
                                <div
                                    key={camp.id}
                                    className="border border-gray-100 dark:border-slate-800 rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">
                                                    {camp.name}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getHistoryStatusStyle(camp.status)}`}>
                                                    {getHistoryStatusLabel(camp.status)}
                                                </span>
                                                <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                    {AUDIENCE_LABELS[camp.targetAudience] || camp.targetAudience}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                                                {formatRelativeTime(camp.createdAt)}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {camp.sentCount}</span>
                                                {camp.failedCount > 0 && (
                                                    <span className="text-rose-500 dark:text-rose-400 font-bold">✗ {camp.failedCount}</span>
                                                )}
                                                <span className="text-gray-400 dark:text-slate-600">/ {camp.recipientCount}</span>
                                            </div>
                                            {camp.recipientCount > 0 && (
                                                <div className="mt-1 h-1.5 w-20 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full"
                                                        style={{ width: `${(camp.sentCount / camp.recipientCount) * 100}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CustomerOccasionsWhatsAppNotify;
