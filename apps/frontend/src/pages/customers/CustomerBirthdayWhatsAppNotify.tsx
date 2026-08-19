import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar as CalendarIcon,
    Clock as ClockIcon,
    AlertCircle as AlertIcon,
    RefreshCw as RefreshIcon,
    Send as SendIcon,
    Settings as SettingsIcon,
    UserX as UserXIcon,
    Sparkles as SparklesIcon,
    Gift as GiftIcon,
    Phone as PhoneIcon,
    Check as CheckIcon,
    AlertTriangle as WarningIcon,
    Sliders as SlidersIcon
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface TodayBirthdayCustomer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    birthday: string;
    age?: number | null;
    scheduledTime: string;
    status: 'scheduled' | 'sent' | 'failed';
    sentAt?: string | null;
}

interface UpcomingBirthdayCustomer {
    id: string;
    name: string;
    phone: string;
    birthdayDate: string;
    daysRemaining: number;
    formattedNextDate: string;
}

interface MissingBirthdayCustomer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    createdAt?: string;
}

interface BirthdaySettings {
    isEnabled: boolean;
    dailySendTime: string;
    channel: 'meta_api' | 'whatsapp_session';
    messageTemplate: string;
    couponCode: string;
    metaTemplateName: string;
}

const CustomerBirthdayWhatsAppNotify: React.FC = () => {
    // Active Tab
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'missing' | 'settings'>('today');

    // Data States
    const [todayList, setTodayList] = useState<TodayBirthdayCustomer[]>([]);
    const [upcomingList, setUpcomingList] = useState<UpcomingBirthdayCustomer[]>([]);
    const [missingList, setMissingList] = useState<MissingBirthdayCustomer[]>([]);
    const [settings, setSettings] = useState<BirthdaySettings>({
        isEnabled: true,
        dailySendTime: '12:00',
        channel: 'whatsapp_session',
        messageTemplate: '🎉 كل سنة وأنت طيب يا {first_name}! 🎂\n\nبمناسبة عيد ميلادك، يسعدنا نقدم لك هدية خاصة وخصم مميز من متجرنا.\nاستخدم كود الخصم: {coupon_code}\nنتمنى لك سنة سعيدة ملئية بالنجاح! ❤️',
        couponCode: 'HBD10',
        metaTemplateName: 'birthday_greeting_v1'
    });

    // Loading & Status States
    const [loading, setLoading] = useState<boolean>(true);
    const [savingSettings, setSavingSettings] = useState<boolean>(false);
    const [testPhone, setTestPhone] = useState<string>('');
    const [sendingTest, setSendingTest] = useState<boolean>(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Edit Modal State for updating missing birthday
    const [editingCustomer, setEditingCustomer] = useState<{ id: string; name: string; birthday: string } | null>(null);
    const [updatingBirthday, setUpdatingBirthday] = useState<boolean>(false);

    // Fetch all data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [todayRes, upcomingRes, missingRes, settingsRes] = await Promise.all([
                apiClient.get('/customers/whatsapp-notify/birthday-automation/today').catch(() => ({ data: { data: [] } })),
                apiClient.get('/customers/whatsapp-notify/birthday-automation/upcoming?days=30').catch(() => ({ data: { data: [] } })),
                apiClient.get('/customers/whatsapp-notify/birthday-automation/missing').catch(() => ({ data: { data: [] } })),
                apiClient.get('/customers/whatsapp-notify/birthday-automation/settings').catch(() => ({ data: { data: null } }))
            ]);

            if (todayRes.data?.data) setTodayList(todayRes.data.data);
            if (upcomingRes.data?.data) setUpcomingList(upcomingRes.data.data);
            if (missingRes.data?.data) setMissingList(missingRes.data.data);
            if (settingsRes.data?.data) setSettings(settingsRes.data.data);
        } catch (err) {
            console.error('Error fetching birthday automation data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Clear alert after 5s
    useEffect(() => {
        if (actionMessage) {
            const timer = setTimeout(() => setActionMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [actionMessage]);

    // Handle Save Settings
    const handleSaveSettings = async () => {
        setSavingSettings(true);
        setActionMessage(null);
        try {
            const res = await apiClient.post('/customers/whatsapp-notify/birthday-automation/settings', settings);
            if (res.data?.success) {
                setActionMessage({ type: 'success', text: 'تم حفظ إعدادات الأتمتة بنجاح!' });
            } else {
                setActionMessage({ type: 'error', text: res.data?.message || 'فشل في حفظ الإعدادات' });
            }
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات' });
        } finally {
            setSavingSettings(false);
        }
    };

    // Handle Send Test Message
    const handleSendTest = async () => {
        if (!testPhone.trim()) {
            setActionMessage({ type: 'error', text: 'يرجى كتابة رقم الهاتف التجريبي أولاً' });
            return;
        }
        setSendingTest(true);
        setActionMessage(null);
        try {
            const res = await apiClient.post('/customers/whatsapp-notify/birthday-automation/send-test', {
                testPhone,
                messageTemplate: settings.messageTemplate,
                couponCode: settings.couponCode
            });
            if (res.data?.success) {
                setActionMessage({ type: 'success', text: res.data.message || 'تم إرسال الرسالة التجريبية بنجاح' });
            } else {
                setActionMessage({ type: 'error', text: res.data?.message || 'فشل في إرسال الرسالة التجريبية' });
            }
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ أثناء الإرسال التجريبي' });
        } finally {
            setSendingTest(false);
        }
    };

    // Update Customer Birthday Date
    const handleUpdateBirthdayDate = async () => {
        if (!editingCustomer || !editingCustomer.birthday) return;
        setUpdatingBirthday(true);
        try {
            await apiClient.put(`/customers/${editingCustomer.id}`, {
                metadata: { birthday: editingCustomer.birthday }
            });
            setActionMessage({ type: 'success', text: `تم تحديث تاريخ ميلاد ${editingCustomer.name} بنجاح!` });
            setEditingCustomer(null);
            fetchData();
        } catch (err: any) {
            setActionMessage({ type: 'error', text: 'فشل في تحديث تاريخ الميلاد' });
        } finally {
            setUpdatingBirthday(false);
        }
    };

    // Helper to insert variables into template
    const insertVariable = (varName: string) => {
        setSettings(prev => ({
            ...prev,
            messageTemplate: prev.messageTemplate + ` {${varName}}`
        }));
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 dir-rtl text-right font-sans">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 -translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-yellow-300">
                                <GiftIcon className="w-7 h-7" />
                            </span>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                تتبع ورسائل اعياد الميلاد (WhatsApp)
                            </h1>
                        </div>
                        <p className="text-purple-100 text-sm md:text-base max-w-2xl">
                            مركز أتمتة وتتبع تهاني أعياد ميلاد العملاء تلقائياً عبر الواتساب. تتبع الرسائل المجدولة وحدد وقت وقالب الإرسال بسهولة.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-4 py-2.5 rounded-xl font-medium transition-all text-sm backdrop-blur-md active:scale-95"
                        >
                            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            تحديث البيانات
                        </button>
                        <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border backdrop-blur-md ${
                            settings.isEnabled
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                                : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                        }`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${settings.isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                            {settings.isEnabled ? `الأتمتة مفعّلة (${settings.dailySendTime})` : 'الأتمتة متوقفة'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Alert Banner */}
            {actionMessage && (
                <div className={`p-4 rounded-xl flex items-center justify-between shadow-md border ${
                    actionMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                    <div className="flex items-center gap-3">
                        {actionMessage.type === 'success' ? (
                            <CheckIcon className="w-5 h-5 text-emerald-600" />
                        ) : (
                            <WarningIcon className="w-5 h-5 text-rose-600" />
                        )}
                        <span className="font-semibold text-sm">{actionMessage.text}</span>
                    </div>
                    <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">🎂 اعياد ميلاد اليوم</p>
                            <h3 className="text-2xl font-black text-gray-900">{todayList.length}</h3>
                            <p className="text-xs text-purple-600 mt-1 font-medium">مجدولة للساعة {settings.dailySendTime}</p>
                        </div>
                        <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">📅 الأيام الـ 30 القادمة</p>
                            <h3 className="text-2xl font-black text-gray-900">{upcomingList.length}</h3>
                            <p className="text-xs text-blue-600 mt-1 font-medium">عملاء قادمين</p>
                        </div>
                        <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">⚠️ عملاء بدون تاريخ ميلاد</p>
                            <h3 className="text-2xl font-black text-gray-900">{missingList.length}</h3>
                            <p className="text-xs text-amber-600 mt-1 font-medium">تستدعي التحديث</p>
                        </div>
                        <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
                            <UserXIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">⚡ قناة الإرسال المعتمدة</p>
                            <h3 className="text-lg font-bold text-gray-900">
                                {settings.channel === 'meta_api' ? 'Meta WhatsApp API' : 'WhatsApp Session'}
                            </h3>
                            <p className="text-xs text-emerald-600 mt-1 font-medium">إرسال أوتوماتيكي</p>
                        </div>
                        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <PhoneIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-sm flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveTab('today')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'today'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <GiftIcon className="w-4 h-4" />
                    أعياد ميلاد اليوم ({todayList.length})
                </button>

                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'upcoming'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <CalendarIcon className="w-4 h-4" />
                    الأعياد القادمة ({upcomingList.length})
                </button>

                <button
                    onClick={() => setActiveTab('missing')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'missing'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <UserXIcon className="w-4 h-4" />
                    تنبيه بيانات ناقصة ({missingList.length})
                </button>

                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'settings'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <SettingsIcon className="w-4 h-4" />
                    الإعدادات والأتمتة
                </button>
            </div>

            {/* TAB CONTENT 1: Today's Birthdays */}
            {activeTab === 'today' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-purple-600" />
                                العملاء المستهدفين بتهنئة اليوم
                            </h2>
                            <p className="text-xs text-gray-500">سيتم إرسال الرسائل أوتوماتيكياً في تمام الساعة {settings.dailySendTime}</p>
                        </div>
                        <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-bold border border-purple-200">
                            مجدول اليوم: {todayList.length} عميل
                        </span>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
                    ) : todayList.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <GiftIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-gray-700">لا يوجد أعياد ميلاد للعملاء اليوم 🎉</h3>
                            <p className="text-xs text-gray-400 mt-1">تفقد تبويب الأعياد القادمة لاستعراض الأيام القادمة.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="p-3.5 rounded-r-xl">العميل</th>
                                        <th className="p-3.5">رقم الواتساب</th>
                                        <th className="p-3.5">تاريخ الميلاد (العمر)</th>
                                        <th className="p-3.5">وقت الإرسال المجدول</th>
                                        <th className="p-3.5">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {todayList.map((cust) => (
                                        <tr key={cust.id} className="hover:bg-purple-50/30 transition-colors">
                                            <td className="p-3.5 font-bold text-gray-900">{cust.name}</td>
                                            <td className="p-3.5 font-mono dir-ltr text-right">{cust.phone || 'غير مسجل'}</td>
                                            <td className="p-3.5">
                                                <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                                                    {cust.birthday} {cust.age ? `(${cust.age} سنة)` : ''}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-xs text-gray-500 font-semibold">{settings.dailySendTime}</td>
                                            <td className="p-3.5">
                                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    مجدول للإرسال
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT 2: Upcoming Birthdays */}
            {activeTab === 'upcoming' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-blue-600" />
                                أعياد الميلاد خلال الـ 30 يوماً القادمة
                            </h2>
                            <p className="text-xs text-gray-500">استعراض ومتابعة الأعياد القادمة للعملاء للتجهيز المبكر.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
                    ) : upcomingList.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                            لا يوجد أعياد ميلاد قادمة خلال الـ 30 يومًا القادمة.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingList.map((item) => (
                                <div key={item.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-purple-300 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-900">{item.name}</h3>
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-md">
                                            متبقي {item.daysRemaining} يوم
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">📱 {item.phone || 'بدون رقم'}</p>
                                    <p className="text-xs font-semibold text-purple-700">🎂 الموعد: {item.formattedNextDate}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT 3: Missing Birthdays Alert */}
            {activeTab === 'missing' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <UserXIcon className="w-5 h-5 text-amber-600" />
                                تنبيه العملاء بدون تاريخ ميلاد مٌسجل
                            </h2>
                            <p className="text-xs text-gray-500">قم بتحديث تاريخ الميلاد للعملاء ليتم إشراكهم في التهاني التلقائية.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
                    ) : missingList.length === 0 ? (
                        <div className="text-center py-12 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800">
                            🎉 ممتاز! جميع حسابات العملاء مسجل لها تواريخ ميلاد.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="p-3.5">اسم العميل</th>
                                        <th className="p-3.5">الهاتف</th>
                                        <th className="p-3.5">البريد الإلكتروني</th>
                                        <th className="p-3.5 text-center">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {missingList.map((c) => (
                                        <tr key={c.id} className="hover:bg-amber-50/20">
                                            <td className="p-3.5 font-bold text-gray-900">{c.name}</td>
                                            <td className="p-3.5 font-mono">{c.phone || '---'}</td>
                                            <td className="p-3.5">{c.email || '---'}</td>
                                            <td className="p-3.5 text-center">
                                                <button
                                                    onClick={() => setEditingCustomer({ id: c.id, name: c.name, birthday: '' })}
                                                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-purple-200 transition-colors"
                                                >
                                                    ✏️ إضافة تاريخ الميلاد
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT 4: Settings & Automation */}
            {activeTab === 'settings' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                    <div className="pb-4 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <SlidersIcon className="w-5 h-5 text-purple-600" />
                                إعدادات التهنئة والتوقيت التلقائي
                            </h2>
                            <p className="text-xs text-gray-500">تحكم بالكامل في وقت وقناة وقالب رسالة الواتساب اليومية.</p>
                        </div>
                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all text-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            <CheckIcon className="w-4 h-4" />
                            {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Toggle & Time */}
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                            <h3 className="font-bold text-gray-900 text-sm">⚙️ التحكم في التشغيل والوقت</h3>

                            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-gray-200">
                                <div>
                                    <span className="font-bold text-sm text-gray-800 block">تفعيل الإرسال التلقائي اليومي</span>
                                    <span className="text-xs text-gray-500">إرسال تهنئة اعياد الميلاد آلياً بدون تدخل يدوي</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.isEnabled}
                                        onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">🕒 توقيت الإرسال اليومي</label>
                                <input
                                    type="time"
                                    value={settings.dailySendTime}
                                    onChange={(e) => setSettings({ ...settings, dailySendTime: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">مثال: 12:00 PM (ظهر يوم عيد الميلاد)</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">📲 قناة الإرسال المعتمدة</label>
                                <select
                                    value={settings.channel}
                                    onChange={(e) => setSettings({ ...settings, channel: e.target.value as any })}
                                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="whatsapp_session">WhatsApp Session (الجلسات العادية)</option>
                                    <option value="meta_api">Meta WhatsApp API (الرسائل الرسمية)</option>
                                </select>
                            </div>
                        </div>

                        {/* Template & Coupon */}
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                            <h3 className="font-bold text-gray-900 text-sm">🎁 كود الخصم والهدية</h3>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">كود الخصم المرفق للعميل (Coupon Code)</label>
                                <input
                                    type="text"
                                    value={settings.couponCode}
                                    onChange={(e) => setSettings({ ...settings, couponCode: e.target.value })}
                                    placeholder="مثال: HBD10"
                                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            {/* Template Editor */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold text-gray-700">نص وقالب الرسالة</label>
                                    <div className="flex gap-1">
                                        <button onClick={() => insertVariable('first_name')} className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-bold">
                                            + {`{first_name}`}
                                        </button>
                                        <button onClick={() => insertVariable('coupon_code')} className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-bold">
                                            + {`{coupon_code}`}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    rows={5}
                                    value={settings.messageTemplate}
                                    onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-sans"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Test Send Section */}
                    <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-purple-900 text-sm flex items-center gap-2">
                                <SendIcon className="w-4 h-4 text-purple-700" />
                                إرسال رسالة تجريبية (Test Send)
                            </h3>
                            <p className="text-xs text-purple-700 mt-0.5">اختبر شكل وحالة إرسال التهنئة على رقمك الشخصي قبل التفعيل التلقائي.</p>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                placeholder="رقم الهاتف التجريبي (e.g. 2010...)"
                                className="bg-white border border-purple-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none w-full md:w-64"
                            />
                            <button
                                onClick={handleSendTest}
                                disabled={sendingTest}
                                className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
                            >
                                {sendingTest ? 'جاري الإرسال...' : 'تجربة الآن'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for editing customer birthday */}
            {editingCustomer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900">تحديث تاريخ ميلاد: {editingCustomer.name}</h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">اختر تاريخ الميلاد</label>
                            <input
                                type="date"
                                value={editingCustomer.birthday}
                                onChange={(e) => setEditingCustomer({ ...editingCustomer, birthday: e.target.value })}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setEditingCustomer(null)}
                                className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 font-bold"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleUpdateBirthdayDate}
                                disabled={updatingBirthday || !editingCustomer.birthday}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                            >
                                {updatingBirthday ? 'جاري الحفظ...' : 'حفظ التاريخ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerBirthdayWhatsAppNotify;

