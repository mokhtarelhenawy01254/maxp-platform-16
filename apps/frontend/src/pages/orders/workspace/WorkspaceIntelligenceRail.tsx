import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
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
      {/* ─── Mode 1: Operator / Execution Intelligence ─────────────────────── */}
      {/* سطح واحد بفواصل شعرية — لا بوكسات داخلية (قاعدة Ergonomic Workspace Design) */}
      {perspective === 'operator' && (
        <div className="divide-y divide-border/30">
          {/* Customer Risk & Trust Dossier */}
          <section className="pb-3.5">
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
          </section>

          {/* Smart Upsell Script — سجل المكالمات يُعرض مرة واحدة في الـ Inspector
              (كان مرسومًا على لوحين متجاورين بأسلوبين مختلفين) */}
          <section className="py-3.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <SparklesIcon className="h-4 w-4 text-amber-500" />
              <span>{isArabic ? 'اقتراح العرض الإضافي' : 'Confirmation Upsell'}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {isArabic
                ? 'اقترح على العميل قطعة إضافية أو خصم باقة قبل اعتماد الشحن لرفع متوسط قيمة الطلب.'
                : 'Suggest an additional item or bundle discount to increase average order value.'}
            </p>
          </section>
        </div>
      )}

      {/* ─── Mode 2: Supervisor Operational View ──────────────────────────── */}
      {perspective === 'supervisor' && (
        <div className="divide-y divide-border/30">
          <section className="pb-3.5">
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
                <span>{isArabic ? 'إجمالي المؤكد' : 'Confirmed'}</span>
                <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{stats?.confirmed || 0}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isArabic ? 'الملغية' : 'Cancelled'}</span>
                <span className="font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">{stats?.cancelled || 0}</span>
              </div>
            </div>
          </section>

          <section className="py-3.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <UserGroupIcon className="h-4 w-4 text-primary" />
              <span>{isArabic ? 'إدارة توزيع الفريق' : 'Team Distribution'}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {isArabic
                ? 'توزيع الطلبات يتم آلياً وفقاً لقواعد الطاقة الاستيعابية والتناوب الدائري بين أعضاء الفريق.'
                : 'Orders are distributed automatically via workload cap and round-robin rules across team members.'}
            </p>
            <Link
              to="/settings/orders?tab=confirmation"
              className="mt-2.5 inline-block text-[11px] font-bold text-primary hover:underline"
            >
              {isArabic ? 'ضبط إعدادات التوزيع ←' : 'Configure Assignment Rules →'}
            </Link>
          </section>
        </div>
      )}
    </aside>
  );
};
