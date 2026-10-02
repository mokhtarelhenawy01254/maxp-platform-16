import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';
import { PerspectiveMode, WorkspaceOrder, WorkspaceStats } from './types';

interface WorkspaceIntelligenceRailProps {
  order: WorkspaceOrder | null;
  perspective: PerspectiveMode;
  stats: WorkspaceStats | null;
}

export const WorkspaceIntelligenceRail: React.FC<WorkspaceIntelligenceRailProps> = ({
  order,
  perspective,
  stats,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const customerStats = order?.customerStats;
  const deliveryRate = typeof customerStats?.deliveryRate === 'number' ? customerStats.deliveryRate : null;
  const isHighRisk = deliveryRate !== null && deliveryRate < 60;
  const isVip = deliveryRate !== null && deliveryRate >= 85 && (customerStats?.totalDelivered || 0) >= 3;

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-s border-border/40 bg-card/60 p-3.5 text-xs">
      {/* ─── Mode 1: Operator View ─────────────────────────────────────────── */}
      {perspective === 'operator' && (
        <div className="space-y-3.5">
          {/* Customer Risk & Trust Dossier */}
          <div className="rounded-md border border-border/40 bg-background/80 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheckIcon className="h-4 w-4 text-primary" />
              <span>{isArabic ? 'سجل ثقة العميل' : 'Customer Trust Dossier'}</span>
            </div>

            <div className="mt-2.5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{isArabic ? 'نسبة الاستلام السابقة' : 'Delivery Rate'}</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {deliveryRate !== null ? `${Math.round(deliveryRate)}%` : (isArabic ? 'عميل جديد' : 'New Customer')}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>{isArabic ? 'إجمالي الطلبات المستلمة' : 'Total Delivered'}</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {customerStats?.totalDelivered || 0} / {customerStats?.totalOrdersCount || (order ? 1 : 0)}
                </span>
              </div>

              {isHighRisk && (
                <div className="mt-2 flex items-center gap-1.5 rounded bg-rose-500/10 p-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                  <span>{isArabic ? 'تنبيه: مرتجع مرتفع — يفضل طلب عربون شحن' : 'High return risk — recommend shipping deposit'}</span>
                </div>
              )}

              {isVip && (
                <div className="mt-2 rounded bg-emerald-500/10 p-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>{isArabic ? 'عميل موثوق VIP — أولوية قصوى للشحن' : 'VIP Customer — top fulfillment priority'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Call Attempts History Timeline */}
          <div className="rounded-md border border-border/40 bg-background/80 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ClockIcon className="h-4 w-4 text-primary" />
              <span>{isArabic ? 'سجل المحاولات السابقة' : 'Call History'}</span>
            </div>

            <div className="mt-2.5 space-y-2">
              {order?.callLogs && order.callLogs.length > 0 ? (
                order.callLogs.map((log) => (
                  <div key={log.id} className="border-s-2 border-primary/40 ps-2.5 text-[11px]">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">{log.userName || (isArabic ? 'موظف' : 'Agent')}</span>
                      <span className="font-mono text-[10px] tabular-nums">
                        {new Date(log.createdAt).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-muted-foreground">
                      <span className="font-semibold text-foreground">[{log.result}]</span> {log.notes || ''}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {isArabic ? 'لا توجد محاولات سابقة مسجلة لهذا الطلب' : 'No previous calls recorded for this order'}
                </p>
              )}
            </div>
          </div>

          {/* In-Call Upsell Tip */}
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
              <SparklesIcon className="h-4 w-4" />
              <span>{isArabic ? 'فرصة بيع إضافي (Upsell)' : 'Upsell Suggestion'}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {isArabic
                ? 'اقترح إضافة قطعة ثانية أو شحن مجاني عند زيادة قيمة الطلب لرفع متوسط الفاتورة.'
                : 'Suggest an additional item or bundle discount to increase average order value.'}
            </p>
          </div>
        </div>
      )}

      {/* ─── Mode 2: Supervisor View ────────────────────────────────────────── */}
      {perspective === 'supervisor' && (
        <div className="space-y-3.5">
          <div className="rounded-md border border-border/40 bg-background/80 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ChartBarIcon className="h-4 w-4 text-primary" />
              <span>{isArabic ? 'تيليمتري الطابور الحي' : 'Live Queue Telemetry'}</span>
            </div>

            <div className="mt-2.5 space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>{isArabic ? 'الطلبات المعلقة' : 'Pending Queue'}</span>
                <span className="font-mono font-bold tabular-nums text-foreground">{stats?.pending || 0}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isArabic ? 'طلبات المتابعة' : 'Follow-up Due'}</span>
                <span className="font-mono font-bold tabular-nums text-foreground">{stats?.followup || 0}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isArabic ? 'إجمالي المؤكد' : 'Confirmed Today'}</span>
                <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{stats?.confirmed || 0}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border/40 bg-background/80 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <UserGroupIcon className="h-4 w-4 text-primary" />
              <span>{isArabic ? 'إدارة توزيع الفريق' : 'Team Distribution'}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {isArabic
                ? 'توزيع الطلبات يتم آلياً وفقاً لقواعد الطاقة الاستيعابية والتناوب الدائري.'
                : 'Orders are distributed automatically via workload cap and round-robin rules.'}
            </p>
            <Link
              to="/settings/orders?tab=confirmation"
              className="mt-2.5 inline-block text-[11px] font-bold text-primary hover:underline"
            >
              {isArabic ? 'ضبط إعدادات التوزيع ←' : 'Configure Assignment Rules →'}
            </Link>
          </div>
        </div>
      )}

      {/* ─── Mode 3: Marketer Attribution View ──────────────────────────────── */}
      {perspective === 'marketer' && (
        <div className="space-y-3.5">
          <div className="rounded-md border border-border/40 bg-background/80 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <MegaphoneIcon className="h-4 w-4 text-primary" />
              <span>{isArabic ? 'الإسناد الإعلاني (Attribution)' : 'Ad Attribution'}</span>
            </div>

            <div className="mt-2.5 space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>{isArabic ? 'المصدر' : 'Source'}</span>
                <span className="font-mono font-semibold text-foreground">
                  {order?.attribution?.source || (isArabic ? 'مباشر / متجر' : 'Direct Store')}
                </span>
              </div>
              {order?.attribution?.campaignName && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{isArabic ? 'الحملة' : 'Campaign'}</span>
                  <span className="truncate font-mono font-semibold text-foreground">
                    {order.attribution.campaignName}
                  </span>
                </div>
              )}
              {order?.attribution?.adSetId && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{isArabic ? 'المجموعة' : 'AdSet ID'}</span>
                  <span className="font-mono text-muted-foreground" dir="ltr">
                    {order.attribution.adSetId}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border/40 bg-background/80 p-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {isArabic
                ? 'أسباب الإلغاء المسجلة تنعكس فوراً على تحليل جودة الحملات لتحسين الاستهداف وخفض التكلفة.'
                : 'Recorded cancellation reasons feed directly into campaign quality analytics to reduce ad spend waste.'}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
