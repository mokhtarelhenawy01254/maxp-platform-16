import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Clock,
    User,
    ArrowRight,
    Search,
    RotateCw,
    X,
    Calendar,
    Users,
    Activity,
    Table as TableIcon,
    List,
    Bot,
    ExternalLink,
    Copy,
    Check,
    Shield,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import orderWorkflowService, { AuditLogFilters } from '../../services/orderWorkflowService';
import { useAuth } from '../../hooks/useAuthSimple';
import api from '../../services/api';

const PAGE_SIZE = 30;

interface ActorOption {
    id: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
    normal: {
        label: 'تغيير حالة',
        badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    },
    bot_whatsapp: {
        label: 'تأكيد واتساب',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    bulk_update: {
        label: 'تحديث جماعي',
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    override: {
        label: 'تجاوز بصلاحية',
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    approved: {
        label: 'اعتماد رسمي',
        badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    cancelled: {
        label: 'إلغاء طلب',
        badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
};

export const OrderActivityLogPage: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Filters
    const [selectedActorId, setSelectedActorId] = useState<string>('');
    const [orderNumber, setOrderNumber] = useState<string>('');
    const [changeType, setChangeType] = useState<string>('ALL');
    const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
    const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

    // Data State
    const [logs, setLogs] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [serverStats, setServerStats] = useState<{ total: number; todayCount: number }>({ total: 0, todayCount: 0 });
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Actors / Employees List
    const [actors, setActors] = useState<ActorOption[]>([]);
    const [loadingActors, setLoadingActors] = useState(false);
    const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

    // Fetch Actors on Mount
    useEffect(() => {
        const fetchActors = async () => {
            try {
                setLoadingActors(true);
                const res = await orderWorkflowService.getAuditActors();
                if (res?.success && Array.isArray(res?.data)) {
                    setActors(res.data);
                }
            } catch (err) {
                console.error('[OrderActivityLogPage] Error fetching actors:', err);
            } finally {
                setLoadingActors(false);
            }
        };

        fetchActors();
    }, []);

    // Date Range calculation based on Preset
    const getDateRange = useCallback(() => {
        const now = new Date();
        if (datePreset === 'TODAY') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            return { startDate: start, endDate: now.toISOString() };
        }
        if (datePreset === '7DAYS') {
            const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            return { startDate: start, endDate: now.toISOString() };
        }
        if (datePreset === '30DAYS') {
            const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            return { startDate: start, endDate: now.toISOString() };
        }
        return {};
    }, [datePreset]);

    // Fetch Logs
    const fetchLogs = useCallback(async (isLoadMore = false) => {
        const currentOffset = isLoadMore ? offset : 0;
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const dateRange = getDateRange();
            const filters: AuditLogFilters = {
                userId: selectedActorId || undefined,
                changeType: changeType !== 'ALL' ? changeType : undefined,
                orderNumber: orderNumber.trim() || undefined,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            };

            const res = await orderWorkflowService.getGlobalAuditLogs(PAGE_SIZE, currentOffset, filters);
            const fetchedLogs = Array.isArray(res.data) ? res.data : [];

            if (isLoadMore) {
                setLogs((prev) => [...prev, ...fetchedLogs]);
                setOffset((prev) => prev + fetchedLogs.length);
            } else {
                setLogs(fetchedLogs);
                setOffset(fetchedLogs.length);
            }

            if (typeof res.total === 'number') {
                setTotalCount(res.total);
                setHasMore(currentOffset + fetchedLogs.length < res.total);
            } else {
                setHasMore(fetchedLogs.length >= PAGE_SIZE);
            }

            if (res.stats) {
                setServerStats(res.stats);
            }
        } catch (err) {
            console.error('[OrderActivityLogPage] Error fetching audit logs:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedActorId, changeType, orderNumber, getDateRange, offset]);

    // Refetch on primary filter change
    useEffect(() => {
        fetchLogs(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedActorId, changeType, datePreset]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLogs(false);
    };

    const handleResetFilters = () => {
        setSelectedActorId('');
        setOrderNumber('');
        setChangeType('ALL');
        setDatePreset('ALL');
    };

    const isFilterActive = selectedActorId !== '' || orderNumber.trim() !== '' || changeType !== 'ALL' || datePreset !== 'ALL';

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedOrderId(id);
        setTimeout(() => setCopiedOrderId(null), 2000);
    };

    const formatTimestamp = (dateString: string) => {
        try {
            const d = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            let relative = '';
            if (diffMins < 1) relative = 'الآن';
            else if (diffMins < 60) relative = `منذ ${diffMins} د`;
            else if (diffHours < 24) relative = `منذ ${diffHours} س`;
            else relative = `منذ ${diffDays} يوم`;

            const timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });

            return { relative, timeStr, dateStr };
        } catch {
            return { relative: '', timeStr: dateString, dateStr: '' };
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 bg-background text-foreground select-none" dir="rtl">
            {/* Top Unified Cockpit Bar */}
            <header className="border-b border-border/40 bg-card/50 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-medium shadow-xs">
                        <Clock className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                                سجل نشاط الطلبات
                            </h1>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium tabular-nums bg-muted text-muted-foreground border border-border/40">
                                {totalCount.toLocaleString('ar-EG')} حركة
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            متابعة شاملة لجميع الحركات وتغييرات الحالات الصادرة عن الموظفين والأنظمة الآلية
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher Segmented Control */}
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50">
                        <button
                            type="button"
                            onClick={() => setViewMode('timeline')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                viewMode === 'timeline'
                                    ? 'bg-card text-foreground shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="العرض الزمني"
                        >
                            <List className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">مسار زمني</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                viewMode === 'table'
                                    ? 'bg-card text-foreground shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="عرض الجدول"
                        >
                            <TableIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">جدول</span>
                        </button>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={() => fetchLogs(false)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card hover:bg-muted border border-border/60 text-foreground transition active:scale-[0.98] disabled:opacity-50"
                        title="تحديث البيانات"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">تحديث</span>
                    </button>
                </div>
            </header>

            {/* Seamless Bento Telemetry Strip (Hairline Dividers, Single Chassis) */}
            <section className="grid grid-cols-2 md:grid-cols-4 border-b border-border/40 bg-muted/15 divide-x divide-x-reverse divide-border/40 shrink-0">
                <div className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                        <div className="text-[11px] text-muted-foreground font-medium">إجمالي الحركات</div>
                        <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5">
                            {totalCount.toLocaleString('ar-EG')}
                        </div>
                    </div>
                    <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-muted-foreground">
                        <Activity className="w-3.5 h-3.5 stroke-[1.5]" />
                    </div>
                </div>

                <div className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                        <div className="text-[11px] text-muted-foreground font-medium">حركات اليوم</div>
                        <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5 text-blue-600 dark:text-blue-400">
                            {(serverStats.todayCount || 0).toLocaleString('ar-EG')}
                        </div>
                    </div>
                    <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Clock className="w-3.5 h-3.5 stroke-[1.5]" />
                    </div>
                </div>

                <div className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                        <div className="text-[11px] text-muted-foreground font-medium">الموظفون الفاعلون</div>
                        <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5">
                            {actors.length > 0 ? actors.length.toLocaleString('ar-EG') : '—'}
                        </div>
                    </div>
                    <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Users className="w-3.5 h-3.5 stroke-[1.5]" />
                    </div>
                </div>

                <div className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                        <div className="text-[11px] text-muted-foreground font-medium">المعروض حالياً</div>
                        <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5 text-zinc-600 dark:text-zinc-300">
                            {logs.length.toLocaleString('ar-EG')}
                        </div>
                    </div>
                    <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                        <Shield className="w-3.5 h-3.5 stroke-[1.5]" />
                    </div>
                </div>
            </section>

            {/* Ergonomic Compact Filter Bar */}
            <div className="border-b border-border/40 bg-card/30 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                {/* Search Order Number */}
                <form onSubmit={handleSearchSubmit} className="relative min-w-[160px] sm:min-w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="ابحث برقم الطلب (مثال: ORD-450)..."
                        className="w-full pl-7 pr-8 py-1.5 text-xs rounded-lg bg-background border border-border/60 placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-1 focus:ring-ring font-mono"
                    />
                    {orderNumber && (
                        <button
                            type="button"
                            onClick={() => { setOrderNumber(''); fetchLogs(false); }}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </form>

                {/* Actor / Employee Selector */}
                <div className="min-w-[150px] sm:min-w-[180px]">
                    <select
                        value={selectedActorId}
                        onChange={(e) => setSelectedActorId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-background border border-border/60 text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                    >
                        <option value="">جميع الموظفين والأنظمة ({actors.length})</option>
                        {actors.map((actor) => (
                            <option key={actor.id} value={actor.id}>
                                {actor.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Change Type Filter */}
                <div className="min-w-[130px]">
                    <select
                        value={changeType}
                        onChange={(e) => setChangeType(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-background border border-border/60 text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                    >
                        <option value="ALL">جميع أنواع الحركات</option>
                        <option value="normal">تغيير حالة عادي</option>
                        <option value="bot_whatsapp">تأكيد بوت واتساب</option>
                        <option value="bulk_update">تحديث جماعي</option>
                        <option value="override">تجاوز بصلاحية</option>
                        <option value="approved">اعتماد رسمي</option>
                        <option value="cancelled">إلغاء طلب</option>
                    </select>
                </div>

                {/* Date Preset Segmented Control */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/50 border border-border/40 text-[11px] font-medium">
                    <button
                        type="button"
                        onClick={() => setDatePreset('ALL')}
                        className={`px-2 py-1 rounded-md transition ${datePreset === 'ALL' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        كل الأوقات
                    </button>
                    <button
                        type="button"
                        onClick={() => setDatePreset('TODAY')}
                        className={`px-2 py-1 rounded-md transition ${datePreset === 'TODAY' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        اليوم
                    </button>
                    <button
                        type="button"
                        onClick={() => setDatePreset('7DAYS')}
                        className={`px-2 py-1 rounded-md transition ${datePreset === '7DAYS' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        7 أيام
                    </button>
                    <button
                        type="button"
                        onClick={() => setDatePreset('30DAYS')}
                        className={`px-2 py-1 rounded-md transition ${datePreset === '30DAYS' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        30 يوماً
                    </button>
                </div>

                {/* Reset Filters */}
                {isFilterActive && (
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition"
                    >
                        <X className="w-3 h-3" />
                        <span>إعادة ضبط</span>
                    </button>
                )}
            </div>

            {/* Main Content Area (Single Surface, Edge-to-Edge) */}
            <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
                {loading && logs.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <RotateCw className="w-6 h-6 animate-spin text-zinc-500" />
                        <span className="text-xs font-mono">جاري تحميل سجل الحركات الحية...</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed border-border/60 rounded-xl my-4">
                        <Clock className="w-10 h-10 stroke-[1.25] text-muted-foreground/40 mb-3" />
                        <h3 className="text-sm font-semibold text-foreground">لا توجد حركات مطابقة للبحث</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mt-1">
                            جرب تغيير شروط الفلترة أو تفريغ البحث برقم الطلب لعرض كافة الحركات المسجلة.
                        </p>
                        {isFilterActive && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="mt-4 px-3 py-1.5 text-xs font-medium rounded-lg bg-card border border-border/60 hover:bg-muted text-foreground transition"
                            >
                                إظهار كافة الحركات
                            </button>
                        )}
                    </div>
                ) : viewMode === 'timeline' ? (
                    /* Timeline View (Linear / GitHub Audit Style) */
                    <div className="relative pr-4 sm:pr-6 space-y-3">
                        {/* Continuous Vertical Rail */}
                        <div className="absolute right-[7px] sm:right-[11px] top-3 bottom-3 w-px bg-border/50 pointer-events-none" />

                        {logs.map((log) => {
                            const { relative, timeStr, dateStr } = formatTimestamp(log.createdAt);
                            const typeConfig = CHANGE_TYPE_CONFIG[log.changeType] || CHANGE_TYPE_CONFIG.normal;
                            const isBot = log.user?.firstName?.includes('Bot') || log.user?.id?.includes('WHATSAPP');

                            return (
                                <div key={log.id} className="relative group">
                                    {/* Timeline Node Bullet */}
                                    <div
                                        className="absolute -right-4 sm:-right-6 top-3.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-card flex items-center justify-center transition-transform group-hover:scale-110"
                                        style={{ borderColor: log.toStatus?.color || '#3B82F6' }}
                                    >
                                        <div
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{ backgroundColor: log.toStatus?.color || '#3B82F6' }}
                                        />
                                    </div>

                                    {/* Entry Card (Single-Surface Hairline Box) */}
                                    <div className="bg-card hover:bg-card/90 border border-border/50 hover:border-border/80 rounded-xl p-3.5 sm:p-4 transition-all duration-150 shadow-2xs">
                                        {/* Row 1: Header (Actor + Time + Order Info) */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/30">
                                            <div className="flex items-center gap-2">
                                                {/* Actor Avatar */}
                                                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-[10px] font-semibold tracking-tight border border-border/40 shrink-0">
                                                    {isBot ? (
                                                        <Bot className="w-3.5 h-3.5" />
                                                    ) : (
                                                        log.user?.firstName?.charAt(0) || 'U'
                                                    )}
                                                </div>

                                                <span className="text-xs sm:text-sm font-semibold text-foreground">
                                                    {log.user?.firstName || 'النظام'}
                                                </span>

                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeConfig.badgeClass}`}>
                                                    {typeConfig.label}
                                                </span>
                                            </div>

                                            {/* Timestamps */}
                                            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground tabular-nums">
                                                <span className="text-foreground/80 font-medium">{relative}</span>
                                                <span className="text-border">|</span>
                                                <span>{dateStr}</span>
                                                <span>{timeStr}</span>
                                            </div>
                                        </div>

                                        {/* Row 2: Status Transition & Order Info */}
                                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5">
                                            {/* Transition Badge */}
                                            <div className="flex items-center gap-2 text-xs">
                                                {log.fromStatus?.name && (
                                                    <>
                                                        <span
                                                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
                                                            style={{
                                                                borderColor: `${log.fromStatus.color}40`,
                                                                backgroundColor: `${log.fromStatus.color}15`,
                                                                color: log.fromStatus.color,
                                                            }}
                                                        >
                                                            {log.fromStatus.name}
                                                        </span>
                                                        <ArrowRight className="w-3 h-3 text-muted-foreground rotate-180" />
                                                    </>
                                                )}
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border"
                                                    style={{
                                                        borderColor: `${log.toStatus?.color}50`,
                                                        backgroundColor: `${log.toStatus?.color}20`,
                                                        color: log.toStatus?.color,
                                                    }}
                                                >
                                                    {log.toStatus?.name || log.toStatus?.code}
                                                </span>
                                            </div>

                                            {/* Order Badge & Customer */}
                                            {log.order && (
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`/orders?search=${encodeURIComponent(log.order.orderNumber)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted text-xs font-mono font-medium text-foreground border border-border/50 transition group/link"
                                                    >
                                                        <span>{log.order.orderNumber}</span>
                                                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover/link:text-foreground" />
                                                    </a>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(log.order.orderNumber, log.id)}
                                                        className="p-1 text-muted-foreground hover:text-foreground rounded transition"
                                                        title="نسخ رقم الطلب"
                                                    >
                                                        {copiedOrderId === log.id ? (
                                                            <Check className="w-3 h-3 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-3 h-3" />
                                                        )}
                                                    </button>

                                                    {log.order.customerName && (
                                                        <span className="hidden sm:inline text-xs text-muted-foreground">
                                                            {log.order.customerName}
                                                        </span>
                                                    )}

                                                    {log.order.total && (
                                                        <span className="text-xs font-mono font-medium tabular-nums text-foreground/80">
                                                            {Number(log.order.total).toLocaleString('ar-EG')} ج.م
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 3: Notes / Payload Diff */}
                                        {log.reason && (
                                            <div className="mt-2.5 pt-2 border-t border-border/30">
                                                <div className="p-2 rounded-lg bg-muted/30 border border-border/30 text-xs font-mono text-foreground/85 whitespace-pre-line leading-relaxed">
                                                    {log.reason}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* High-Density Data Grid Table */
                    <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground font-medium">
                                    <tr>
                                        <th className="py-2.5 px-3">الوقت</th>
                                        <th className="py-2.5 px-3">رقم الطلب</th>
                                        <th className="py-2.5 px-3">العميل</th>
                                        <th className="py-2.5 px-3">الموظف / النظام</th>
                                        <th className="py-2.5 px-3">الانتقال</th>
                                        <th className="py-2.5 px-3">نوع الحركة</th>
                                        <th className="py-2.5 px-3">الملاحظات والتفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {logs.map((log) => {
                                        const { relative, timeStr } = formatTimestamp(log.createdAt);
                                        const typeConfig = CHANGE_TYPE_CONFIG[log.changeType] || CHANGE_TYPE_CONFIG.normal;

                                        return (
                                            <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                                    <span className="font-medium text-foreground">{relative}</span>
                                                    <span className="block text-[10px] text-muted-foreground">{timeStr}</span>
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap font-mono font-medium">
                                                    {log.order ? (
                                                        <a
                                                            href={`/orders?search=${encodeURIComponent(log.order.orderNumber)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:underline text-blue-600 dark:text-blue-400"
                                                        >
                                                            {log.order.orderNumber}
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    {log.order?.customerName || '—'}
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap font-medium text-foreground">
                                                    {log.user?.firstName || 'النظام'}
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        {log.fromStatus?.name && (
                                                            <>
                                                                <span
                                                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                                                    style={{
                                                                        borderColor: `${log.fromStatus.color}40`,
                                                                        backgroundColor: `${log.fromStatus.color}15`,
                                                                        color: log.fromStatus.color,
                                                                    }}
                                                                >
                                                                    {log.fromStatus.name}
                                                                </span>
                                                                <ArrowRight className="w-2.5 h-2.5 text-muted-foreground rotate-180" />
                                                            </>
                                                        )}
                                                        <span
                                                            className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                                                            style={{
                                                                borderColor: `${log.toStatus?.color}50`,
                                                                backgroundColor: `${log.toStatus?.color}20`,
                                                                color: log.toStatus?.color,
                                                            }}
                                                        >
                                                            {log.toStatus?.name || log.toStatus?.code}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeConfig.badgeClass}`}>
                                                        {typeConfig.label}
                                                    </span>
                                                </td>

                                                <td className="py-2.5 px-3 max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                                                    {log.reason || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Load More Button */}
                {hasMore && logs.length > 0 && (
                    <div className="pt-4 pb-8 flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => fetchLogs(true)}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium bg-card hover:bg-muted border border-border/60 text-foreground shadow-2xs transition active:scale-[0.98] disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <>
                                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>جاري التحميل...</span>
                                </>
                            ) : (
                                <>
                                    <span>تحميل المزيد من الحركات</span>
                                    <span className="text-muted-foreground font-mono tabular-nums text-[11px]">
                                        ({logs.length} من {totalCount.toLocaleString('ar-EG')})
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrderActivityLogPage;
