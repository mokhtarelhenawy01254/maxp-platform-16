import React, { useCallback, useEffect, useState } from 'react';
import {
    ArrowPathIcon,
    CalendarDaysIcon,
    ExclamationCircleIcon,
    PaperAirplaneIcon,
    SparklesIcon,
    PlusIcon,
    TrashIcon,
    PencilIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '../../services/apiClient';

interface Session {
    sessionId: string;
    phoneNumber: string;
    isConnected: boolean;
}

const MAX_OCCASION_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 3000;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎉 المناسبات القابلة للإدارة (إضافة/حذف/تكرار + نشر تلقائي)
// ═══════════════════════════════════════════════════════════════════════════════
type Recurrence = 'none' | 'monthly' | 'yearly';
type OccasionStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

interface Occasion {
    id: string;
    name: string;
    message: string;
    templateId?: string | null;
    templateName?: string | null;
    templateMetaStatus?: string | null;
    mediaUrl: string | null;
    scheduledAt: string;
    recurrence: Recurrence;
    customerListIds: string[];
    status: OccasionStatus;
    lastSentAt: string | null;
    lastSentCount: number;
    totalSent: number;
    sendLimit: number;
    throttlePerRun: number;
    nextRunAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface OccasionTemplate {
    id: string;
    name: string;
    content: string;
    metaTemplateStatus?: string | null;
}

interface CustomerListOption {
    id: string;
    name: string;
    count: number;
    isDefault?: boolean;
}

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
    { value: 'none', label: 'مرة واحدة' },
    { value: 'monthly', label: 'شهري' },
    { value: 'yearly', label: 'سنوي' },
];

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

// يحول {{var}} إلى {var} (المحرر الموحد بيخزن بـ قوسين، المناسبة بتستخدم قوس واحد)
const normalizeTemplateToSingle = (content: string) => content.replace(/\{\{(\w+)\}\}/g, '{$1}');

const CustomerOccasionsWhatsAppNotify: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const defaultSchedule = getDefaultSchedule();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    // ── مناسباتي (Managed Occasions) ──
    const [occasions, setOccasions] = useState<Occasion[]>([]);
    const [occasionsLoading, setOccasionsLoading] = useState(false);
    const [customerLists, setCustomerLists] = useState<CustomerListOption[]>([]);
    const [templates, setTemplates] = useState<OccasionTemplate[]>([]);
    const [showOccasionForm, setShowOccasionForm] = useState(false);
    const [editingOccasionId, setEditingOccasionId] = useState<string | null>(null);
    const [occName, setOccName] = useState('');
    const [occMessage, setOccMessage] = useState(
        '🎉 بمناسبة {اسم المناسبة}،\n\nكل سنة وأنتم طيبين يا {اسم العميل}!\nيسعدنا نقدم لكم عرض خاص لفترة محدودة.'
    );
    const [occTemplateId, setOccTemplateId] = useState('');
    const [occMediaUrl, setOccMediaUrl] = useState('');
    const [occDate, setOccDate] = useState(defaultSchedule.date);
    const [occTime, setOccTime] = useState(defaultSchedule.time);
    const [occRecurrence, setOccRecurrence] = useState<Recurrence>('yearly');
    const [occListIds, setOccListIds] = useState<string[]>([]);
    const [occSendLimit, setOccSendLimit] = useState('');
    const [occThrottlePerRun, setOccThrottlePerRun] = useState('');
    const [occFormError, setOccFormError] = useState('');
    const [occSaving, setOccSaving] = useState(false);

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const res = await apiClient.get(`/customers/whatsapp-notify/sessions?t=${Date.now()}`);
            const list: Session[] = res.data?.sessions || [];
            setSessions(list);
        } catch {
            setSessions([]);
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const loadOccasions = useCallback(async () => {
        setOccasionsLoading(true);
        try {
            const res = await apiClient.get('/customers/whatsapp-notify/occasions');
            setOccasions(res.data?.data || []);
        } catch {
            setOccasions([]);
        } finally {
            setOccasionsLoading(false);
        }
    }, []);

    const loadCustomerLists = useCallback(async () => {
        try {
            const res = await apiClient.get('/broadcast/customer-lists');
            const lists = res.data?.data || [];
            setCustomerLists(
                lists.map((l: any) => ({
                    id: l.id,
                    name: l.name || l.id,
                    count: l.count ?? 0,
                    isDefault: l.isDefault,
                }))
            );
        } catch {
            setCustomerLists([]);
        }
    }, []);

    const loadTemplates = useCallback(async () => {
        try {
            const res = await apiClient.get('/whatsapp-notifications/templates');
            const list: OccasionTemplate[] = (res.data?.templates || [])
                .filter((t: any) => t?.id && t?.content)
                .map((t: any) => ({
                    id: t.id,
                    name: t.name || t.id,
                    content: t.content,
                    metaTemplateStatus: t.metaTemplateStatus || null,
                }));
            setTemplates(list);
        } catch {
            setTemplates([]);
        }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);
    useEffect(() => { loadOccasions(); }, [loadOccasions]);
    useEffect(() => { loadCustomerLists(); }, [loadCustomerLists]);
    useEffect(() => { loadTemplates(); }, [loadTemplates]);

    // ── مناسباتي: دوال الإدارة ──
    const resetOccasionForm = () => {
        setEditingOccasionId(null);
        setOccName('');
        setOccMessage(
            '🎉 بمناسبة {اسم المناسبة}،\n\nكل سنة وأنتم طيبين يا {اسم العميل}!\nيسعدنا نقدم لكم عرض خاص لفترة محدودة.'
        );
        setOccTemplateId('');
        setOccMediaUrl('');
        setOccDate(defaultSchedule.date);
        setOccTime(defaultSchedule.time);
        setOccRecurrence('yearly');
        setOccListIds([]);
        setOccSendLimit('');
        setOccThrottlePerRun('');
        setOccFormError('');
        setShowOccasionForm(false);
    };

    const startEditOccasion = (occ: Occasion) => {
        setEditingOccasionId(occ.id);
        setOccName(occ.name);
        setOccMessage(occ.message);
        setOccTemplateId(occ.templateId || '');
        setOccMediaUrl(occ.mediaUrl || '');
        const d = new Date(occ.scheduledAt);
        setOccDate(toLocalDateInput(d));
        setOccTime(toLocalTimeInput(d));
        setOccRecurrence(occ.recurrence);
        setOccListIds(occ.customerListIds || []);
        setOccSendLimit(occ.sendLimit > 0 ? String(occ.sendLimit) : '');
        setOccThrottlePerRun(occ.throttlePerRun > 0 ? String(occ.throttlePerRun) : '');
        setOccFormError('');
        setShowOccasionForm(true);
    };

    const saveOccasion = async (): Promise<string | null> => {
        setOccFormError('');
        const trimmedName = occName.trim();
        const trimmedMessage = occMessage.trim();
        if (!trimmedName) { setOccFormError('اكتب اسم المناسبة'); return null; }
        if (trimmedName.length > MAX_OCCASION_NAME_LENGTH) {
            setOccFormError(`اسم المناسبة لا يزيد عن ${MAX_OCCASION_NAME_LENGTH} حرف`); return null;
        }
        if (!trimmedMessage) { setOccFormError('اكتب الرسالة'); return null; }
        if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
            setOccFormError(`الرسالة لا تزيد عن ${MAX_MESSAGE_LENGTH} حرف`); return null;
        }
        if (occMediaUrl.trim() && !isValidHttpUrl(occMediaUrl.trim())) {
            setOccFormError('رابط الصورة غير صالح. استخدم رابط http/https'); return null;
        }
        if (!occDate || !occTime) { setOccFormError('حدد تاريخ المناسبة'); return null; }
        const scheduledAt = new Date(`${occDate}T${occTime}:00`);
        if (Number.isNaN(scheduledAt.getTime())) { setOccFormError('تاريخ غير صحيح'); return null; }

        setOccSaving(true);
        try {
            const payload = {
                name: trimmedName,
                message: trimmedMessage,
                templateId: occTemplateId || null,
                mediaUrl: occMediaUrl.trim() || undefined,
                scheduledAt: scheduledAt.toISOString(),
                recurrence: occRecurrence,
                customerListIds: occListIds,
                sendLimit: parseInt(occSendLimit, 10) || 0,
                throttlePerRun: parseInt(occThrottlePerRun, 10) || 0,
            };
            let res;
            if (editingOccasionId) {
                res = await apiClient.put(`/customers/whatsapp-notify/occasions/${editingOccasionId}`, payload);
            } else {
                res = await apiClient.post('/customers/whatsapp-notify/occasions', payload);
            }
            if (res.data?.success) {
                await loadOccasions();
                return res.data.data?.id || editingOccasionId || null;
            }
            setOccFormError(res.data?.message || 'فشل حفظ المناسبة');
            return null;
        } catch (err: any) {
            setOccFormError(err?.response?.data?.message || 'فشل حفظ المناسبة');
            return null;
        } finally {
            setOccSaving(false);
        }
    };

    const handlePublishOccasion = async (occ?: Occasion) => {
        let id = occ?.id || null;
        if (!id) id = await saveOccasion();
        if (!id) return;
        try {
            const d = occ ? new Date(occ.scheduledAt) : new Date(`${occDate}T${occTime}:00`);
            await apiClient.post(`/customers/whatsapp-notify/occasions/${id}/publish`, { scheduledAt: d.toISOString() });
            await loadOccasions();
        } catch (err: any) {
            setOccFormError(err?.response?.data?.message || 'فشل نشر المناسبة');
        }
    };

    const handleDeleteOccasion = async (id: string) => {
        if (!window.confirm('تأكيد حذف المناسبة؟')) return;
        try {
            await apiClient.delete(`/customers/whatsapp-notify/occasions/${id}`);
            await loadOccasions();
        } catch {
            setOccFormError('تعذر حذف المناسبة');
        }
    };

    const toggleOccList = (id: string) => {
        setOccListIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    };

    const connectedSession = sessions.find(s => s.isConnected);

    return (
        <div className={embedded ? "" : "min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-fuchsia-50/20 dark:from-slate-950 dark:via-violet-950/20 dark:to-fuchsia-950/20 text-gray-900 dark:text-slate-100 p-4 md:p-6"} dir="rtl">
            <div className={embedded ? "" : "max-w-5xl mx-auto space-y-5"}>

                {!embedded && (
                <>
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
                </>
                )}

                <div className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-900/50 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-200">
                            <CalendarDaysIcon className="h-4 w-4 text-violet-500" />
                            مناسباتي
                        </div>
                        <button
                            onClick={() => { resetOccasionForm(); setShowOccasionForm(s => !s); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 dark:bg-violet-500 text-white hover:bg-violet-500 dark:hover:bg-violet-400 transition-colors"
                        >
                            <PlusIcon className="h-4 w-4" />
                            {showOccasionForm ? 'إغلاق' : 'إضافة مناسبة'}
                        </button>
                    </div>

                    {occasionsLoading ? (
                        <div className="h-16 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ) : occasions.length === 0 && !showOccasionForm ? (
                        <p className="text-sm text-center text-gray-400 dark:text-slate-600 py-4">
                            لا توجد مناسبات بعد — اضغط «إضافة مناسبة» لإنشاء واحدة تقدر تضيفها وتمسحها براحتك.
                        </p>
                    ) : null}

                    {showOccasionForm && (
                        <div className="space-y-4 border-t border-gray-100 dark:border-slate-800 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">اسم المناسبة</label>
                                    <input
                                        value={occName}
                                        onChange={e => setOccName(e.target.value)}
                                        placeholder="مثال: رمضان، عيد الأم، افتتاح الفرع"
                                        className="w-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                    />
                                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{occName.trim().length}/80</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">التكرار</label>
                                    <select
                                        value={occRecurrence}
                                        onChange={e => setOccRecurrence(e.target.value as Recurrence)}
                                        className="w-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                    >
                                        {RECURRENCE_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value} className="dark:bg-slate-900">{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">قالب الرسالة (اختياري)</label>
                                <select
                                    value={occTemplateId}
                                    onChange={e => {
                                        const tplId = e.target.value;
                                        setOccTemplateId(tplId);
                                        const tpl = templates.find(t => t.id === tplId);
                                        if (tpl) {
                                            setOccMessage(normalizeTemplateToSingle(tpl.content));
                                            setOccFormError('');
                                        }
                                    }}
                                    className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                >
                                    <option value="">بدون قالب — اكتب الرسالة يدويًا</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id} className="dark:bg-slate-900">{t.name}</option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                                    اختر قالبًا من صفحة القوالب — أي تعديل على القالب هينعكس هنا تلقائيًا.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">نص الرسالة</label>
                                <textarea
                                    rows={4}
                                    value={occMessage}
                                    onChange={e => setOccMessage(e.target.value)}
                                    disabled={!!occTemplateId}
                                    className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm leading-6 resize-none outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                {occTemplateId ? (
                                    <p className="text-[11px] mt-1 text-violet-500 dark:text-violet-400 font-bold">
                                        الرسالة مرتبطة بالقالب — أي تعديل على القالب في صفحة القوالب هيتحدّث هنا تلقائيًا.
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                                            متغيرات متاحة: {'{اسم العميل}'} - {'{اسم المناسبة}'}
                                        </p>
                                        <p className={`text-[11px] mt-1 ${occMessage.trim().length > MAX_MESSAGE_LENGTH ? 'text-rose-600 font-bold' : 'text-gray-400 dark:text-slate-500'}`}>
                                            {occMessage.trim().length}/{MAX_MESSAGE_LENGTH}
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">التاريخ</label>
                                    <input
                                        type="date"
                                        value={occDate}
                                        onChange={e => setOccDate(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">الوقت</label>
                                    <input
                                        type="time"
                                        value={occTime}
                                        onChange={e => setOccTime(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">رابط صورة (اختياري)</label>
                                <input
                                    type="url"
                                    value={occMediaUrl}
                                    onChange={e => setOccMediaUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">جمهور المناسبة (قوائم العملاء)</label>
                                <div className="flex flex-wrap gap-2">
                                    {customerLists.length === 0 ? (
                                        <span className="text-[11px] text-gray-400 dark:text-slate-500">لا توجد قوائم — أنشئ قائمة من صفحة العملاء أولاً.</span>
                                    ) : customerLists.map(list => {
                                        const selected = occListIds.includes(list.id);
                                        return (
                                            <button
                                                key={list.id}
                                                type="button"
                                                onClick={() => toggleOccList(list.id)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selected ? 'bg-violet-600 dark:bg-violet-500 text-white border-violet-600 dark:border-violet-500' : 'bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700'}`}
                                            >
                                                {list.name} ({list.count})
                                            </button>
                                        );
                                    })}
                                </div>
                                {occListIds.length === 0 && (
                                    <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-1">لم تختر جمهورًا بعد — المناسبة هتتبعت لـ 0 عميل.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-gray-100 dark:border-slate-800 pt-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">أقصى عدد عملاء للمناسبة (0 = بدون حد)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={occSendLimit}
                                        onChange={e => setOccSendLimit(e.target.value)}
                                        placeholder="مثال: 500"
                                        className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                    />
                                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">يوقف الإرسال تلقائياً عند الوصول للعدد ده.</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">أقصى رسائل لكل ساعة (0 = بدون حد)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={occThrottlePerRun}
                                        onChange={e => setOccThrottlePerRun(e.target.value)}
                                        placeholder="مثال: 100"
                                        className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition text-gray-900 dark:text-white"
                                    />
                                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">لو حطيت حد، الإرسال بيتم على دفعات كل ساعة لحد ما يخلص.</p>
                                </div>
                            </div>

                            {occFormError && (
                                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-2.5 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
                                    <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                                    {occFormError}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => void saveOccasion()}
                                    disabled={occSaving}
                                    className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white disabled:opacity-60"
                                >
                                    {occSaving ? 'جاري الحفظ...' : (editingOccasionId ? 'تحديث المناسبة' : 'حفظ المناسبة')}
                                </button>
                                <button
                                    onClick={() => void handlePublishOccasion()}
                                    disabled={occSaving}
                                    className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-60"
                                >
                                    📅 نشر وجدولة
                                </button>
                                {editingOccasionId && (
                                    <button
                                        onClick={resetOccasionForm}
                                        className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400"
                                    >
                                        إلغاء
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {occasions.length > 0 && (
                        <div className="space-y-2 border-t border-gray-100 dark:border-slate-800 pt-3">
                            {occasions.map(occ => {
                                const listNames = (occ.customerListIds || [])
                                    .map(id => customerLists.find(l => l.id === id)?.name)
                                    .filter(Boolean);
                                const recLabel = RECURRENCE_OPTIONS.find(o => o.value === occ.recurrence)?.label || occ.recurrence;
                                const isScheduled = occ.status === 'scheduled';
                                return (
                                    <div key={occ.id} className="border border-gray-100 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{occ.name}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400">{recLabel}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isScheduled ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' : occ.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                                                    {isScheduled ? 'مجدولة' : occ.status === 'sent' ? 'تم الإرسال' : occ.status === 'draft' ? 'مسودة' : occ.status}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                                                📅 {new Date(occ.scheduledAt).toLocaleString('ar-EG')}
                                                {listNames.length > 0 ? ` • جمهور: ${listNames.join('، ')}` : ' • بدون جمهور'}
                                                {occ.templateName ? ` • قالب: ${occ.templateName}` : ''}
                                                {occ.sendLimit > 0 ? ` • حد: ${occ.sendLimit}` : ''}
                                                {occ.throttlePerRun > 0 ? ` • معدل: ${occ.throttlePerRun}/ساعة` : ''}
                                                {occ.totalSent > 0 ? ` • أُرسل: ${occ.totalSent}` : ''}
                                                {occ.lastSentCount ? ` • آخر إرسال: ${occ.lastSentCount}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {!isScheduled && (
                                                <button
                                                    onClick={() => void handlePublishOccasion(occ)}
                                                    title="نشر وجدولة"
                                                    className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                                                >
                                                    <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => startEditOccasion(occ)}
                                                title="تعديل"
                                                className="p-2 rounded-lg border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => void handleDeleteOccasion(occ.id)}
                                                title="حذف"
                                                className="p-2 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerOccasionsWhatsAppNotify;
