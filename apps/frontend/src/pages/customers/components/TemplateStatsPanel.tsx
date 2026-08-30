import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../services/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart3, RefreshCw, TrendingUp, MessageCircle, MousePointerClick, Wallet, AlertTriangle } from 'lucide-react';

interface TemplateStat {
    templateId: string;
    total: number;
    delivered: number;
    read: number;
    clicked: number;
    responded: number;
    failed: number;
    cost: number;
    deliveryRate: string;
    readRate: string;
    eventHint?: string | null;
}

interface TemplateInfo {
    id: string;
    name: string;
    eventType: string;
    metaTemplateName?: string | null;
    channel?: string;
}

interface Props {
    /** قوالب للربط بالأسماء — اختياري، هيتجاب تلقائياً لو مش متمرر */
    templates?: TemplateInfo[];
    title?: string;
    description?: string;
    compact?: boolean;
}

/**
 * 📊 لوحة أداء القوالب — إحصائيات كل قالب على حدة من لوج الإشعارات
 * (delivery / read / clicked / responded / failed / cost)
 */
const TemplateStatsPanel: React.FC<Props> = ({ templates, title, description, compact }) => {
    const [stats, setStats] = useState<TemplateStat[]>([]);
    const [tplList, setTplList] = useState<TemplateInfo[]>(templates || []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [statsRes, tplRes] = await Promise.all([
                apiClient.get('/whatsapp-notifications/template-stats?days=90'),
                templates ? Promise.resolve({ data: { templates } }) : apiClient.get('/whatsapp-notifications/templates'),
            ]);
            setStats(statsRes.data?.stats || []);
            if (!templates) setTplList(resToTemplates(tplRes.data));
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'فشل تحميل الإحصائيات';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [templates]);

    useEffect(() => { load(); }, [load]);

    const nameById = useMemo(() => {
        const m = new Map<string, string>();
        for (const t of tplList) {
            if (t.id) m.set(t.id, t.name || t.eventType);
        }
        return m;
    }, [tplList]);

    const totalSent = stats.reduce((s, x) => s + x.total, 0);
    const totalDelivered = stats.reduce((s, x) => s + x.delivered, 0);
    const totalCost = stats.reduce((s, x) => s + x.cost, 0);
    const overallRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0.0';

    return (
        <Card className="border-[color:var(--color-border)] bg-[color:var(--color-card)]">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4 text-[color:var(--color-primary)]" />
                        {title || 'أداء القوالب'}
                    </CardTitle>
                    <CardDescription>{description || 'إحصائيات كل قالب على حدة خلال آخر 90 يوم'}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                    {!loading && stats.length > 0 && (
                        <div className="hidden items-center gap-4 text-xs text-[color:var(--color-muted-foreground)] md:flex">
                            <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> وصول {overallRate}%</span>
                            <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {totalSent.toLocaleString('ar-EG')} رسالة</span>
                            <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> {totalCost.toFixed(2)} ج</span>
                        </div>
                    )}
                    <button
                        onClick={load}
                        className="rounded-full border border-[color:var(--color-border)] p-2 text-[color:var(--color-muted-foreground)] transition hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-accent-foreground)]"
                        aria-label="تحديث"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4" /> {error}
                    </div>
                ) : stats.length === 0 ? (
                    <div className="py-10 text-center text-sm text-[color:var(--color-muted-foreground)]">
                        لسه مفيش رسايل اتبعتت بالقوالب — الإحصائيات هتظهر هنا بعد أول إرسال
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">القالب</TableHead>
                                    <TableHead className="text-center">مرسل</TableHead>
                                    {!compact && <TableHead className="text-center">وصل</TableHead>}
                                    {!compact && <TableHead className="text-center">اتقري</TableHead>}
                                    <TableHead className="text-center">تفاعل</TableHead>
                                    <TableHead className="text-center">فشل</TableHead>
                                    {!compact && <TableHead className="text-center">التكلفة</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.slice(0, 12).map((s) => {
                                    const knownName = nameById.get(s.templateId);
                                    const name = knownName || (s.eventHint ? `(سابق) ${s.eventHint}` : 'قالب محذوف');
                                    const interacted = Math.max(s.clicked, s.responded);
                                    return (
                                        <TableRow key={s.templateId}>
                                            <TableCell className="max-w-[220px] truncate font-medium" title={name}>{name}</TableCell>
                                            <TableCell className="text-center font-mono text-sm">{s.total.toLocaleString('ar-EG')}</TableCell>
                                            {!compact && (
                                                <TableCell className="text-center">
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Badge variant="outline" className={Number(s.deliveryRate) >= 90 ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' : Number(s.deliveryRate) >= 70 ? 'border-amber-300 text-amber-700 dark:text-amber-400' : 'border-destructive/40 text-destructive'}>
                                                                    {s.deliveryRate}%
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{s.delivered.toLocaleString('ar-EG')} وصلت من {s.total.toLocaleString('ar-EG')}</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            )}
                                            {!compact && <TableCell className="text-center font-mono text-sm">{s.readRate}%</TableCell>}
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <MousePointerClick className="h-3.5 w-3.5 text-[color:var(--color-muted-foreground)]" />
                                                    {interacted.toLocaleString('ar-EG')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {s.failed > 0
                                                    ? <span className="font-mono text-sm text-destructive">{s.failed.toLocaleString('ar-EG')}</span>
                                                    : <span className="text-[color:var(--color-muted-foreground)]">—</span>}
                                            </TableCell>
                                            {!compact && <TableCell className="text-center font-mono text-sm">{s.cost.toFixed(2)}</TableCell>}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

function resToTemplates(data: unknown): TemplateInfo[] {
    const d = data as { templates?: TemplateInfo[]; data?: TemplateInfo[] };
    return d?.templates || d?.data || [];
}

export default TemplateStatsPanel;
