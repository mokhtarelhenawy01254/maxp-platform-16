import { Circle as MegaphoneIcon, Circle as PaperAirplaneIcon, Image as PhotoIcon, Circle as UserGroupIcon, ShoppingBag as ShoppingBagIcon, RefreshCw as ArrowPathIcon, Circle as CheckCircleOutline, AlertTriangle as ExclamationCircleIcon, Zap as BoltIcon, Clock as ClockIcon, Activity as ChartBarIcon, X as XMarkIcon, Info as InformationCircleIcon, Star as SparklesIcon, Circle as CalendarDaysIcon, Circle as CheckCircleSolid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback, useRef } from 'react';
;
;
import { apiClient } from '../../services/apiClient';
import { formatCurrency } from '../../utils/currency';


// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
type Audience = 'all' | 'withOrders' | 'newCustomers' | 'activeCustomers';
type NotifyMode = 'general' | 'birthday';

interface CustomerWhatsAppNotifyProps {
    mode?: NotifyMode;
}

interface Session {
    sessionId: string;
    phoneNumber: string;
    isConnected: boolean;
    status: string;
}

interface Product {
    id: string;
    name: string;
    price: number | string;
    images: string[];
    description?: string;
}

interface CampaignStatus {
    status: 'running' | 'completed' | 'cancelled';
    sent: number;
    failed: number;
    total: number;
    progress: number;
    startedAt: string;
    completedAt?: string;
    errors: {
        customerId: string;
        phone?: string;
        formattedPhone?: string;
        name?: string;
        error: string;
        timestamp?: string;
    }[];
}

// ─────────────────────────────────────────
// Audience Options
// ─────────────────────────────────────────
const getAudienceOptions = (t: any) => [
    {
        value: 'all',
        label: t('whatsappNotify.audienceOptions.all'),
        desc: t('whatsappNotify.audienceOptions.allDesc'),
        icon: '👥',
        color: 'from-violet-500 to-purple-600',
    },
    {
        value: 'withOrders',
        label: t('whatsappNotify.audienceOptions.withOrders'),
        desc: t('whatsappNotify.audienceOptions.withOrdersDesc'),
        icon: '🛒',
        color: 'from-blue-500 to-cyan-600',
    },
    {
        value: 'newCustomers',
        label: t('whatsappNotify.audienceOptions.newCustomers'),
        desc: t('whatsappNotify.audienceOptions.newCustomersDesc'),
        icon: '✨',
        color: 'from-emerald-500 to-green-600',
    },
    {
        value: 'activeCustomers',
        label: t('whatsappNotify.audienceOptions.activeCustomers'),
        desc: t('whatsappNotify.audienceOptions.activeCustomersDesc'),
        icon: '⚡',
        color: 'from-amber-500 to-orange-600',
    },
];

const getTemplates = (t: any) => [
    {
        label: t('whatsappNotify.templates.newProduct'),
        text: t('whatsappNotify.templates.newProductText'),
    },
    {
        label: t('whatsappNotify.templates.specialOffer'),
        text: t('whatsappNotify.templates.specialOfferText'),
    },
    {
        label: t('whatsappNotify.templates.generalContact'),
        text: t('whatsappNotify.templates.generalContactText'),
    },
];

const getBirthdayTemplates = () => [
    {
        label: 'تهنئة رسمية',
        text: 'عزيزي {اسم العميل} ✨\n\nكل عام وأنتم بخير بمناسبة عيد ميلادكم 🎉!\nنتمنى لكم عاماً سعيداً مليئاً بالنجاح والتوفيق.\n\nمع تحياتنا،\nفريق العمل',
    },
    {
        label: 'تهنئة ودية + خصم',
        text: 'كل سنة وأنت طيب يا {اسم العميل}! 🎂🥳\n\nعشان النهاردة يوم مش عادي، حبينا نحتفل معاك ونقدملك خصم 20% على أي طلب بمناسبة عيد ميلادك! 🎁\n\nاطلب دلوقتي واستمتع بالخصم ✨',
    },
    {
        label: 'رسالة قصيرة',
        text: 'عيد ميلاد سعيد {اسم العميل} 🎉🎂 نتمنى لك يوماً رائعاً وعاماً مليئاً بالسعادة!',
    },
];


// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
const CustomerWhatsAppNotify: React.FC<CustomerWhatsAppNotifyProps> = ({ mode = 'general' }) => {
    const { t } = useTranslation();
    const isBirthdayPage = mode === 'birthday';

    const campaignStorageKey = isBirthdayPage ? 'active_birthday_campaign_id' : 'active_general_campaign_id';

    // Session
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState('');
    const [sessionsLoading, setSessionsLoading] = useState(true);

    // Audience
    const [audience, setAudience] = useState<Audience>('withOrders');
    const [newDays, setNewDays] = useState(7);
    const [audienceCount, setAudienceCount] = useState<number | null>(null);
    const [audienceLoading, setAudienceLoading] = useState(false);

    // Message
    const [message, setMessage] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');

    // Birthday campaign
    const [birthdayDate, setBirthdayDate] = useState(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });
    const [birthdayAudienceCount, setBirthdayAudienceCount] = useState<number | null>(null);
    const [birthdayAudienceLoading, setBirthdayAudienceLoading] = useState(false);
    const [birthdayMessage, setBirthdayMessage] = useState(
        t('whatsappNotify.birthdayMessageDefault')
    );

    const [birthdayMediaUrl, setBirthdayMediaUrl] = useState('');

    // Product picker
    const [showProducts, setShowProducts] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Campaign
    const [sending, setSending] = useState(false);
    const [campaignId, setCampaignId] = useState<string | null>(() => localStorage.getItem(campaignStorageKey));
    const [campaign, setCampaign] = useState<CampaignStatus | null>(null);
    const [sendError, setSendError] = useState('');

    // Delay Settings
    const [delayValue, setDelayValue] = useState(1.5);
    const [delayUnit, setDelayUnit] = useState<'seconds' | 'minutes'>('seconds');
    const [delayMode, setDelayMode] = useState<'perMessage' | 'perSession'>('perMessage');

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Load Sessions ──
    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const res = await apiClient.get(`/customers/whatsapp-notify/sessions?t=${Date.now()}`);
            const list: Session[] = res.data?.sessions || [];
            setSessions(list);
            const active = list.find(s => s.isConnected);
            if (active) setSelectedSession(active.sessionId);
            else if (list.length > 0) setSelectedSession(list[0].sessionId);
        } catch { }
        finally { setSessionsLoading(false); }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    // ── Preview Audience Count ──
    const previewAudience = useCallback(async (aud: Audience, days: number) => {
        setAudienceLoading(true);
        setAudienceCount(null);
        try {
            const params: Record<string, string> = { audience: aud };
            if (aud === 'newCustomers') params.newDays = String(days);
            const res = await apiClient.get('/customers/whatsapp-notify/preview-audience', { params });
            setAudienceCount(res.data?.count ?? 0);
        } catch {
            setAudienceCount(null);
        } finally {
            setAudienceLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isBirthdayPage) previewAudience(audience, newDays);
    }, [audience, newDays, previewAudience, isBirthdayPage]);

    const previewBirthdayAudience = useCallback(async (targetDate: string) => {
        if (!targetDate) return;
        setBirthdayAudienceLoading(true);
        setBirthdayAudienceCount(null);
        try {
            const res = await apiClient.get('/customers/whatsapp-notify/preview-birthday-audience', {
                params: { date: targetDate },
            });
            setBirthdayAudienceCount(res.data?.count ?? 0);
        } catch {
            setBirthdayAudienceCount(null);
        } finally {
            setBirthdayAudienceLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isBirthdayPage) previewBirthdayAudience(birthdayDate);
    }, [birthdayDate, previewBirthdayAudience, isBirthdayPage]);
    useEffect(() => { setSendError(''); }, [mode]);

    // ── Load Products ──
    const loadProducts = useCallback(async () => {
        setProductsLoading(true);
        try {
            const res = await apiClient.get('/customers/whatsapp-notify/products?limit=60');
            setProducts(res.data?.data || []);
        } catch { } finally { setProductsLoading(false); }
    }, []);

    useEffect(() => {
        if (!isBirthdayPage && showProducts) loadProducts();
    }, [showProducts, loadProducts, isBirthdayPage]);

    // ── Poll Campaign Status ──
    useEffect(() => {
        if (!campaignId) return;

        pollRef.current = setInterval(async () => {
            try {
                const res = await apiClient.get(`/customers/whatsapp-notify/campaign/${campaignId}`);
                const data: CampaignStatus & { status: string } = res.data;
                setCampaign(data as CampaignStatus);

                if (data.status === 'completed' || data.status === 'cancelled') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setSending(false);
                    localStorage.removeItem(campaignStorageKey);
                }
            } catch (err: any) {
                if (err.response?.status === 404) {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setSending(false);
                    setCampaign(null);
                    setCampaignId(null);
                    localStorage.removeItem(campaignStorageKey);
                }
            }
        }, 2000);

        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [campaignId, campaignStorageKey]);

    // ── Insert product info into message ──
    const insertProduct = (product: Product) => {
        const imgUrl = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : '';
        setMessage(prev =>
            prev
                .replace(/{productName}/g, product.name)
                .replace(/{price}/g, String(product.price))
        );
        if (imgUrl && !mediaUrl) setMediaUrl(imgUrl);
        setSelectedProduct(product);
        setShowProducts(false);
    };

    // ── Send ──
    const handleSend = async () => {
        if (!message.trim()) { setSendError(t('whatsappNotify.writeMessageFirst')); return; }
        if (!Number.isFinite(delayValue) || delayValue <= 0) { setSendError(t('whatsappNotify.invalidDelay')); return; }

        const connectedSession = sessions.find(s => s.isConnected);
        if (!connectedSession) {
            setSendError(t('whatsappNotify.noConnectedSessionError'));
            return;
        }


        setSendError('');
        setSending(true);
        setCampaign(null);
        setCampaignId(null);
        localStorage.removeItem(campaignStorageKey);

        try {
            const payload: Record<string, unknown> = {
                audience,
                message: message.trim(),
                sessionId: selectedSession || connectedSession.sessionId,
                delayValue,
                delayUnit,
                delayMode,
            };
            if (audience === 'newCustomers') payload.newDays = newDays;
            if (mediaUrl.trim()) payload.mediaUrl = mediaUrl.trim();

            const res = await apiClient.post('/customers/whatsapp-notify/smart-send', payload);
            if (res.data?.success) {
                const newId = res.data.campaignId;
                setCampaignId(newId);
                localStorage.setItem(campaignStorageKey, newId);
                setCampaign({
                    status: 'running',
                    sent: 0,
                    failed: 0,
                    total: res.data.total,
                    progress: 0,
                    startedAt: new Date().toISOString(),
                    errors: [],
                });
            } else {
                setSendError(res.data?.message || t('whatsappNotify.errorGeneric'));
                setSending(false);
            }
        } catch (err: any) {
            setSendError(err?.response?.data?.message || t('whatsappNotify.failed'));
            setSending(false);
        }
    };

    const handleSendBirthday = async () => {
        if (!birthdayMessage.trim()) { setSendError(t('whatsappNotify.birthdayMessagePlaceholder')); return; }
        if (!Number.isFinite(delayValue) || delayValue <= 0) { setSendError(t('whatsappNotify.invalidDelay')); return; }

        const connectedSession = sessions.find(s => s.isConnected);
        if (!connectedSession) {
            setSendError(t('whatsappNotify.noConnectedSessionError'));
            return;
        }


        setSendError('');
        setSending(true);
        setCampaign(null);
        setCampaignId(null);
        localStorage.removeItem(campaignStorageKey);

        try {
            const payload: Record<string, unknown> = {
                date: birthdayDate,
                message: birthdayMessage.trim(),
                sessionId: selectedSession || connectedSession.sessionId,
                delayValue,
                delayUnit,
                delayMode,
            };
            if (birthdayMediaUrl.trim()) payload.mediaUrl = birthdayMediaUrl.trim();

            const res = await apiClient.post('/customers/whatsapp-notify/smart-send-birthday', payload);
            if (res.data?.success) {
                const newId = res.data.campaignId;
                setCampaignId(newId);
                localStorage.setItem(campaignStorageKey, newId);
                setCampaign({
                    status: 'running',
                    sent: 0,
                    failed: 0,
                    total: res.data.total,
                    progress: 0,
                    startedAt: new Date().toISOString(),
                    errors: [],
                });
            } else {
                setSendError(res.data?.message || t('whatsappNotify.errorGeneric'));
                setSending(false);
            }
        } catch (err: any) {
            setSendError(err?.response?.data?.message || t('whatsappNotify.failed'));
            setSending(false);
        }
    };

    // ── Stop ──
    const handleStop = async () => {
        if (!campaignId) return;
        try {
            await apiClient.delete(`/customers/whatsapp-notify/campaign/${campaignId}`);
            // Polling will detect 'cancelled' status or we can update UI locally
        } catch (err) {
            console.error('Stop failed:', err);
        }
    };

    // ── Connected session ──
    const connectedSession = sessions.find(s => s.isConnected);

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-4 md:p-6 transition-colors duration-300" dir="rtl">

            {/* ── Header ── */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <span className="text-3xl">{isBirthdayPage ? '🎂' : '📢'}</span>
                        {isBirthdayPage ? t('whatsappNotify.birthdayTitle') : t('whatsappNotify.title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {!isBirthdayPage
                            ? t('whatsappNotify.subtitle')
                            : t('whatsappNotify.birthdaySubtitle')}
                    </p>
                </div>

                {/* Session badge */}
                <div className="flex items-center gap-2">
                    {sessionsLoading ? (
                        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                    ) : connectedSession ? (
                        <div className="flex items-center gap-1.5 bg-green-500/10 dark:bg-green-500/15 border border-green-500/20 dark:border-green-500/30 rounded-full px-3 py-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
                            🟢 {connectedSession.phoneNumber}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 dark:border-red-500/30 rounded-full px-3 py-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                            🔴 {t('whatsappNotify.sessionDisconnected')}
                        </div>
                    )}
                    <button
                        onClick={loadSessions}
                        className="p-1.5 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white shadow-sm dark:shadow-none border border-gray-200 dark:border-transparent transition-all"
                        title={t('whatsappNotify.refreshSession')}
                    >
                        <ArrowPathIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── No session warning ── */}
            {!sessionsLoading && !connectedSession && (
                <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
                    <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">{t('whatsappNotify.noSessionWarning')}</p>
                        <p className="text-xs text-red-400 mt-0.5">
                            {t('whatsappNotify.noSessionWarningDesc').split(' ').map((word, i, arr) => {
                                if (word === t('common.settings')) {
                                    return <a key={i} href="/whatsapp/settings" className="underline">{t('whatsappNotify.whatsappSettings')}</a>;
                                }
                                return word + (i === arr.length - 1 ? '' : ' ');
                            })}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {!isBirthdayPage ? (
                    <>
                    {/* ══════════════════════════════════════
                    LEFT: Audience & Progress
                ══════════════════════════════════════ */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-5">

                        {/* Audience Cards */}
                        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-5 shadow-xl dark:shadow-2xl">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="p-1.5 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
                                    <UserGroupIcon className="h-4 w-4" />
                                </span>
                                {t('whatsappNotify.audienceTarget')}
                            </h2>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {getAudienceOptions(t).map(opt => (
                                    <button

                                        key={opt.value}
                                        onClick={() => setAudience(opt.value)}
                                        className={`relative p-3.5 rounded-2xl border text-right transition-all duration-300 group ${audience === opt.value
                                            ? 'border-violet-500/60 bg-violet-500/5 dark:bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.1)] dark:shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                                            : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:border-gray-200 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">{opt.icon}</div>
                                        <div className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">{opt.label}</div>
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">{opt.desc}</div>
                                        {audience === opt.value && (
                                            <span className="absolute top-2.5 left-2.5">
                                                <div className="h-2 w-2 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* New days picker */}
                            {audience === 'newCustomers' && (
                                <div className="mt-4 flex items-center justify-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3 animate-in slide-in-from-top-2">
                                    <span className="text-xs text-emerald-600 dark:text-emerald-300 font-medium">{t('whatsappNotify.joinedInLast')}</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={newDays}
                                        onChange={e => setNewDays(Number(e.target.value))}
                                        className="w-20 text-center bg-white dark:bg-gray-950/50 border border-emerald-500/30 rounded-xl px-2 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 outline-none"
                                    />
                                    <span className="text-xs text-emerald-600 dark:text-emerald-300">{t('whatsappNotify.days')}</span>
                                </div>
                            )}

                            {/* Audience Preview Box */}
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                                        <ChartBarIcon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('whatsappNotify.willSendTo')}</div>
                                        <div className="text-[11px] text-gray-500 dark:text-gray-300 mt-0.5">{t('whatsappNotify.realCustomers')}</div>
                                    </div>
                                </div>
                                {audienceLoading ? (
                                    <div className="h-7 w-16 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse" />
                                ) : (
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-gray-900 dark:text-white">{audienceCount?.toLocaleString() ?? 0}</span>
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold">{t('whatsappNotify.customer')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Campaign Progress */}
                        {campaign && (
                            <div className="bg-white dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-5 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        {campaign.status === 'running' ? (
                                            <><div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" /> {t('whatsappNotify.sending')}</>
                                        ) : campaign.status === 'cancelled' ? (
                                            <><ExclamationCircleIcon className="h-4 w-4 text-amber-500" /> {t('whatsappNotify.paused')}</>
                                        ) : (
                                            <><CheckCircleSolid className="h-4 w-4 text-green-500" /> {t('whatsappNotify.completed')}</>
                                        )}
                                    </h2>
                                    {campaign.status === 'running' && (
                                        <button
                                            onClick={handleStop}
                                            className="text-[10px] px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30 rounded-lg transition-colors flex items-center gap-1 font-bold"
                                        >
                                            <XMarkIcon className="h-3 w-3" />
                                            {t('whatsappNotify.pause')}
                                        </button>
                                    )}
                                </div>

                                {/* Progress bar */}
                                <div className="relative h-3 bg-gray-100 dark:bg-gray-950 rounded-full overflow-hidden mb-5 shadow-inner">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${campaign.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-violet-500'}`}
                                        style={{ width: `${(campaign.sent + campaign.failed) / campaign.total * 100}%` }}
                                    />
                                    {campaign.status === 'running' && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 border border-gray-100 dark:border-white/5 text-center">
                                        <div className="text-xl font-black text-gray-900 dark:text-white">{campaign.total}</div>
                                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{t('whatsappNotify.audience')}</div>
                                    </div>
                                    <div className="bg-green-500/5 rounded-2xl p-3 border border-green-500/10 text-center">
                                        <div className="text-xl font-black text-green-600 dark:text-green-400">{campaign.sent}</div>
                                        <div className="text-[10px] text-green-600/70 dark:text-gray-400 font-bold uppercase">{t('whatsappNotify.done')}</div>
                                    </div>
                                    <div className="bg-red-500/5 rounded-2xl p-3 border border-red-500/10 text-center">
                                        <div className="text-xl font-black text-red-600 dark:text-red-400">{campaign.failed}</div>
                                        <div className="text-[10px] text-red-600/70 dark:text-gray-400 font-bold uppercase">{t('whatsappNotify.failed')}</div>
                                    </div>
                                </div>

                                {/* Error Logs (Collapsible or visible if errors exist) */}
                                {campaign.errors && campaign.errors.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                        <label className="text-[10px] text-red-500 font-black uppercase block mb-2">{t('whatsappNotify.errorLogs')} ({campaign.errors.length})</label>
                                        <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1.5">
                                            {campaign.errors.map((err, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-[9px] bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{err.phone} {err.name ? `(${err.name})` : ''}</span>
                                                    <span className="text-red-500 font-medium">{err.error}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ══════════════════════════════════════
                RIGHT: Message Composer & Preview
            ══════════════════════════════════════ */}
                    <div className="lg:col-span-12 xl:col-span-7 space-y-5">

                        {/* Editor Card */}
                        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-5 shadow-xl dark:shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                        <PaperAirplaneIcon className="h-4 w-4" />
                                    </span>
                                    {t('whatsappNotify.notificationContent')}
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setShowProducts(!showProducts)}
                                        className="text-[10px] px-3 py-1.5 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 transition-all flex items-center gap-1.5 font-bold"
                                    >
                                        <ShoppingBagIcon className="h-3 w-3" />
                                        {t('whatsappNotify.linkProduct')}
                                    </button>
                                    {getTemplates(t).map((t_temp, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setMessage(t_temp.text)}
                                            className="text-[10px] px-3 py-1.5 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 transition-all font-bold"
                                        >
                                            {t_temp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Product Picker (Inline) */}
                            {showProducts && (
                                <div className="mb-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="text"
                                            placeholder={t('whatsappNotify.searchProduct')}
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                            className="flex-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-violet-500 outline-none shadow-sm dark:shadow-none"
                                        />
                                        <button onClick={() => setShowProducts(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                            <XMarkIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {productsLoading ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-200 dark:bg-white/5 rounded-xl animate-pulse" />)}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {products
                                                .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                                .map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => insertProduct(p)}
                                                        className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-100 dark:border-white/5 text-right text-[10px] transition-all shadow-sm dark:shadow-none"
                                                    >
                                                        {p.images?.[0] ? (
                                                            <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0 shadow-md" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-600">
                                                                <ShoppingBagIcon className="h-5 w-5" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-gray-900 dark:text-white truncate font-bold">{p.name}</div>
                                                            <div className="text-violet-600 dark:text-violet-400 font-black mt-0.5">{formatCurrency(typeof p.price === 'string' ? parseFloat(p.price) : p.price)}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Editor */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 dark:text-gray-500 font-black uppercase mb-2 block">{t('whatsappNotify.messageText')}</label>
                                        <textarea
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            rows={8}
                                            placeholder={t('whatsappNotify.messagePlaceholder')}
                                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:ring-2 focus:ring-violet-500/20 dark:focus:ring-violet-500/30 outline-none transition-all shadow-inner"
                                        />
                                        <div className="flex items-center justify-between mt-2 px-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{t('whatsappNotify.charCount', { count: message.length })}</span>
                                            </div>
                                            <button onClick={() => setMessage('')} className="text-[10px] text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 font-bold transition-colors">{t('whatsappNotify.clearText')}</button>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1.5 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/10 rounded-lg p-2">
                                            <SparklesIcon className="h-3 w-3 text-violet-500 dark:text-violet-400" />
                                            <p className="text-[9px] text-violet-700 dark:text-violet-300">
                                                {t('whatsappNotify.aiTip')}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-500 dark:text-gray-500 font-black uppercase mb-2 block">{t('whatsappNotify.imageUrl')}</label>
                                        <div className="relative group">
                                            <PhotoIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:text-violet-500 dark:group-focus-within:text-violet-400 transition-colors" />
                                            <input
                                                value={mediaUrl}
                                                onChange={e => setMediaUrl(e.target.value)}
                                                placeholder="https://..."
                                                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl pr-10 pl-4 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-700 outline-none focus:ring-2 focus:ring-violet-500/20 dark:focus:ring-violet-500/30 transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Delay Settings */}
                                    <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-violet-600 dark:text-violet-400 font-black uppercase flex items-center gap-1.5">
                                                <ClockIcon className="h-3 w-3" />
                                                {t('whatsappNotify.delaySettings')}
                                            </label>

                                            {/* Safety Badge */}
                                            {(() => {
                                                const totalSec = delayUnit === 'seconds' ? delayValue : delayValue * 60;
                                                if (totalSec < 5) return <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md font-bold">{t('whatsappNotify.safetyLow')}</span>;
                                                if (totalSec < 15) return <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 rounded-md font-bold">{t('whatsappNotify.safetyMedium')}</span>;
                                                return <span className="text-[8px] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-md font-bold">{t('whatsappNotify.safetyHigh')}</span>;
                                            })()}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-inner">
                                                <input
                                                    type="number"
                                                    value={delayValue}
                                                    onChange={e => setDelayValue(Number(e.target.value))}
                                                    min={0.5}
                                                    step={0.5}
                                                    className="w-12 bg-transparent text-xs text-gray-900 dark:text-white outline-none font-black"
                                                />
                                                <select
                                                    value={delayUnit}
                                                    onChange={e => setDelayUnit(e.target.value as any)}
                                                    className="bg-transparent text-[10px] text-gray-500 dark:text-gray-400 outline-none cursor-pointer font-bold"
                                                >
                                                    <option value="seconds">{t('whatsappNotify.seconds')}</option>
                                                    <option value="minutes">{t('whatsappNotify.minutes')}</option>
                                                </select>
                                            </div>
                                            <select
                                                value={delayMode}
                                                onChange={e => setDelayMode(e.target.value as any)}
                                                className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] text-gray-600 dark:text-gray-300 outline-none cursor-pointer font-bold shadow-inner"
                                            >
                                                <option value="perMessage">{t('whatsappNotify.perMessage')}</option>
                                                <option value="perSession">{t('whatsappNotify.perSession')}</option>
                                            </select>
                                        </div>
                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-relaxed px-1 font-medium">
                                            {t('whatsappNotify.delayDesc', {
                                                value: delayValue,
                                                unit: delayUnit === 'seconds' ? t('whatsappNotify.seconds') : t('whatsappNotify.minutes'),
                                                mode: delayMode === 'perMessage' ? t('whatsappNotify.perMessage') : t('whatsappNotify.perSession')
                                            })}
                                        </p>
                                    </div>
                                </div>

                                {/* Live Preview (WhatsApp Bubble) */}
                                <div className="hidden md:block">
                                    <label className="text-[10px] text-gray-500 dark:text-gray-500 font-black uppercase mb-2 block">{t('whatsappNotify.livePreview')}</label>
                                    <div className="bg-[#0b141a] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/5 h-[340px] relative shadow-2xl">
                                        {/* Whatsapp Header */}
                                        <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-gray-600" />
                                            <div>
                                                <div className="text-[11px] font-bold text-[#e9edef]">{t('whatsappNotify.customerName')}</div>
                                                <div className="text-[9px] text-[#8696a0]">{t('whatsappNotify.onlineNow')}</div>
                                            </div>
                                        </div>
                                        {/* Chat Background */}
                                        <div className="absolute inset-x-0 top-12 bottom-0 bg-[#0b141a] opacity-50" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }} />

                                        {/* Bubble */}
                                        <div className="relative p-4 flex flex-col items-start overflow-y-auto h-full custom-scrollbar">
                                            <div className="max-w-[90%] bg-[#005c4b] rounded-2xl rounded-tr-none p-1.5 shadow-md self-end mb-2 animate-in fade-in slide-in-from-right-2">
                                                {mediaUrl && (
                                                    <img src={mediaUrl} alt="" className="w-full rounded-xl mb-1.5 object-cover max-h-40 shadow-sm" onError={e => e.currentTarget.style.display = 'none'} />
                                                )}
                                                <div className="px-2 pb-1">
                                                    <div className="text-[12px] text-[#e9edef] leading-relaxed whitespace-pre-wrap">
                                                        {message || t('whatsappNotify.messagePlaceholder').split('\n')[0]}
                                                    </div>
                                                    <div className="text-[9px] text-[#8696a0] text-left mt-1 flex items-center gap-1 justify-end">
                                                        10:30 PM
                                                        <CheckCircleSolid className="h-3 w-3 text-[#53bdeb]" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Send Area */}
                            <div className="mt-8 pt-5 border-t border-gray-100 dark:border-white/5">
                                {sendError && (
                                    <div className="mb-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 dark:border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-600 dark:text-red-300 text-sm animate-in fade-in slide-in-from-bottom-2 font-medium">
                                        <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                                        {sendError}
                                    </div>
                                )}

                                <button
                                    onClick={handleSend}
                                    disabled={sending || !message.trim() || !connectedSession || audienceCount === 0}
                                    className={`w-full py-5 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all duration-500 group relative overflow-hidden ${sending || !message.trim() || !connectedSession || audienceCount === 0
                                        ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/5'
                                        : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_20px_40px_-15px_rgba(124,58,237,0.4)] dark:shadow-[0_20px_40px_-15px_rgba(124,58,237,0.5)] hover:scale-[1.01] active:scale-[0.98]'
                                        }`}
                                >
                                    {sending ? (
                                        <><ArrowPathIcon className="h-6 w-6 animate-spin" /> {t('common.loading')}</>
                                    ) : (
                                        <>
                                            <span className="relative z-10 flex items-center gap-3">
                                                {t('whatsappNotify.sendCampaign')} {audienceCount?.toLocaleString() ?? '...'} {t('whatsappNotify.customer')}
                                                <PaperAirplaneIcon className="h-5 w-5 -rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl -z-0" />
                                        </>
                                    )}
                                </button>

                                <div className="mt-4 flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-black/20 rounded-xl p-3 border border-gray-100 dark:border-white/5 font-bold">
                                    <InformationCircleIcon className="h-4 w-4 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                                    <span>{t('whatsappNotify.instructions')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="lg:col-span-12 xl:col-span-5 space-y-5">
                        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-5 shadow-xl dark:shadow-2xl">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <CalendarDaysIcon className="h-4 w-4" />
                            </span>
                            {t('whatsappNotify.birthdayTitle')}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 block font-bold">{t('whatsappNotify.birthdayDateLabel')}</label>
                                <input
                                    type="date"
                                    value={birthdayDate}
                                    onChange={e => setBirthdayDate(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400/30"
                                />
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase">{t('whatsappNotify.willSendTo')}</div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-300 mt-1">{t('whatsappNotify.birthdaySubtitle')}</div>
                                </div>
                                {birthdayAudienceLoading ? (
                                    <div className="h-7 w-16 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse" />
                                ) : (
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{birthdayAudienceCount?.toLocaleString() ?? 0}</span>
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold">{t('whatsappNotify.customer')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="mb-4 text-[11px] text-gray-500 dark:text-gray-400">
                            {t('whatsappNotify.birthdayDataNote')}
                        </p>

                        {campaign && (
                            <div className="mb-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-700 dark:text-gray-200">
                                            {campaign.status === 'running' ? t('whatsappNotify.sending') : campaign.status === 'completed' ? t('whatsappNotify.completed') : t('whatsappNotify.paused')}
                                        </span>
                                        {campaign.status === 'running' && (
                                            <button
                                                onClick={handleStop}
                                                className="text-[10px] px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30 rounded-lg transition-colors flex items-center gap-1 font-bold"
                                            >
                                                <XMarkIcon className="h-3 w-3" />
                                                {t('whatsappNotify.pause')}
                                            </button>
                                        )}
                                    </div>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">{campaign.sent + campaign.failed}/{campaign.total}</span>
                                </div>

                                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                                        style={{ width: `${campaign.total > 0 ? ((campaign.sent + campaign.failed) / campaign.total) * 100 : 0}%` }}
                                    />
                                </div>

                                {/* Error Logs */}
                                {campaign.errors && campaign.errors.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
                                        <label className="text-[10px] text-red-500 font-black uppercase block mb-2">{t('whatsappNotify.errorLogs')} ({campaign.errors.length})</label>
                                        <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1.5">
                                            {campaign.errors.map((err, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-[9px] bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{err.phone} {err.name ? `(${err.name})` : ''}</span>
                                                    <span className="text-red-500 font-medium">{err.error}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-12 xl:col-span-7 space-y-5">
                    <div className="bg-white dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-5 shadow-xl dark:shadow-2xl">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <SparklesIcon className="h-4 w-4" />
                            </span>
                            أرشيف ونماذج الرسائل
                        </h2>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {getBirthdayTemplates().map((t_temp, i) => (
                                <button
                                    key={i}
                                    onClick={() => setBirthdayMessage(t_temp.text)}
                                    className="text-[10px] px-3 py-1.5 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 transition-all font-bold"
                                >
                                    {t_temp.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-4">
                                <div>
                                <label className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 block font-bold">{t('whatsappNotify.birthdayMessageLabel')}</label>
                                <textarea
                                    value={birthdayMessage}
                                    onChange={e => setBirthdayMessage(e.target.value)}
                                    rows={7}
                                    placeholder={t('whatsappNotify.messagePlaceholder')}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none outline-none focus:ring-2 focus:ring-amber-400/30"
                                />

                                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                                    {t('whatsappNotify.availableVariables')} <span className="font-mono">{t('whatsappNotify.customerNameVar')}</span> {t('common.and')} <span className="font-mono">{t('whatsappNotify.ageVar')}</span>
                                </p>
                            </div>

                            <div>
                                <label className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 block font-bold">{t('whatsappNotify.imageUrl')}</label>
                                <input
                                    value={birthdayMediaUrl}
                                    onChange={e => setBirthdayMediaUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-700 outline-none focus:ring-2 focus:ring-amber-400/30"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2">
                                    <input
                                        type="number"
                                        value={delayValue}
                                        onChange={e => setDelayValue(Number(e.target.value))}
                                        min={0.5}
                                        step={0.5}
                                        className="w-12 bg-transparent text-xs text-gray-900 dark:text-white outline-none font-black"
                                    />
                                    <select
                                        value={delayUnit}
                                        onChange={e => setDelayUnit(e.target.value as any)}
                                        className="bg-transparent text-[10px] text-gray-500 dark:text-gray-400 outline-none cursor-pointer font-bold"
                                    >
                                        <option value="seconds">{t('whatsappNotify.seconds')}</option>
                                        <option value="minutes">{t('whatsappNotify.minutes')}</option>
                                    </select>
                                </div>
                                <select
                                    value={delayMode}
                                    onChange={e => setDelayMode(e.target.value as any)}
                                    className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] text-gray-600 dark:text-gray-300 outline-none cursor-pointer font-bold"
                                >
                                    <option value="perMessage">{t('whatsappNotify.perMessage')}</option>
                                    <option value="perSession">{t('whatsappNotify.perSession')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Live Preview (WhatsApp Bubble) */}
                        <div className="hidden md:block">
                            <label className="text-[10px] text-gray-500 dark:text-gray-500 font-black uppercase mb-2 block">{t('whatsappNotify.livePreview')}</label>
                            <div className="bg-[#0b141a] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/5 h-[340px] relative shadow-2xl">
                                <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-gray-600" />
                                    <div>
                                        <div className="text-[11px] font-bold text-[#e9edef]">{t('whatsappNotify.customerName')}</div>
                                        <div className="text-[9px] text-[#8696a0]">{t('whatsappNotify.onlineNow')}</div>
                                    </div>
                                </div>
                                <div className="absolute inset-x-0 top-12 bottom-0 bg-[#0b141a] opacity-50" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }} />

                                <div className="relative p-4 flex flex-col items-start overflow-y-auto h-full custom-scrollbar">
                                    <div className="max-w-[90%] bg-[#005c4b] rounded-2xl rounded-tr-none p-1.5 shadow-md self-end mb-2 animate-in fade-in slide-in-from-right-2">
                                        {birthdayMediaUrl && (
                                            <img src={birthdayMediaUrl} alt="" className="w-full rounded-xl mb-1.5 object-cover max-h-40 shadow-sm" onError={e => e.currentTarget.style.display = 'none'} />
                                        )}
                                        <div className="px-2 pb-1">
                                            <div className="text-[12px] text-[#e9edef] leading-relaxed whitespace-pre-wrap">
                                                {birthdayMessage || t('whatsappNotify.messagePlaceholder').split('\n')[0]}
                                            </div>
                                            <div className="text-[9px] text-[#8696a0] text-left mt-1 flex items-center gap-1 justify-end">
                                                10:30 PM
                                                <CheckCircleSolid className="h-3 w-3 text-[#53bdeb]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-5 border-t border-gray-100 dark:border-white/5">
                        {sendError && (
                                <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-red-600 dark:text-red-300 text-sm">
                                    {sendError}
                                </div>
                            )}

                            <button
                                onClick={handleSendBirthday}
                                disabled={sending || !birthdayMessage.trim() || !connectedSession || birthdayAudienceCount === 0}
                                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all ${sending || !birthdayMessage.trim() || !connectedSession || birthdayAudienceCount === 0
                                    ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/5'
                                    : 'bg-amber-500 hover:bg-amber-400 text-white shadow-[0_20px_40px_-15px_rgba(245,158,11,0.45)]'
                                    }`}
                            >
                                {sending
                                    ? <><ArrowPathIcon className="h-5 w-5 animate-spin" /> {t('common.loading')}</>
                                    : <>{t('whatsappNotify.sendCampaign')} {birthdayAudienceCount?.toLocaleString() ?? 0} {t('whatsappNotify.customer')} <PaperAirplaneIcon className="h-4 w-4 -rotate-45" /></>
                                }
                            </button>
                        </div>
                    </div>
                </div>
                </>
            )}
            </div>

            {/* Global Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: rgba(0,0,0,0.1); 
                    border-radius: 10px; 
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .animate-shimmer { animation: shimmer 2.5s infinite linear; }
            `}</style>
        </div >
    );
};

export default CustomerWhatsAppNotify;

