import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  BarChart2,
  Users,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { PerspectiveMode, WorkspaceOrder, WorkspaceStats } from './types';

interface WorkspaceIntelligenceRailProps {
  order: WorkspaceOrder | null;
  perspective: PerspectiveMode;
  stats: WorkspaceStats | null;
  onClose?: () => void;
}

export const WorkspaceIntelligenceRail: React.FC<WorkspaceIntelligenceRailProps> = ({
  order,
  perspective,
  stats,
  onClose,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const customerStats = order?.customerStats;
  const deliveryRate = typeof customerStats?.deliveryRate === 'number' ? customerStats.deliveryRate : null;
  const isHighRisk = deliveryRate !== null && deliveryRate < 60;
  const isVip = deliveryRate !== null && deliveryRate >= 85 && (customerStats?.totalDelivered || 0) >= 3;

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-s border-border/60 bg-card/70 p-3.5 text-xs">
      {onClose && (
        <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2 md:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {isArabic ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            <span>{isArabic ? 'العودة إلى تفاصيل الطلب' : 'Back to Order Details'}</span>
          </button>
        </div>
      )}
      {/* ─── Mode 1: Operator / Execution Intelligence ─────────────────────── */}
      {perspective === 'operator' && (
        <div className="divide-y divide-border/40">
          {/* Customer Risk & Trust Dossier */}
          <section className="pb-3.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
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
                <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-[11px] font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{isArabic ? 'تنبيه: مرتجع مرتفع — يفضل طلب عربون شحن' : 'High return risk — recommend shipping deposit'}</span>
                </div>
              )}

              {isVip && (
                <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>{isArabic ? 'عميل موثوق VIP — أولوية قصوى للشحن' : 'VIP Customer — top fulfillment priority'}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ─── Mode 2: Supervisor Operational View ──────────────────────────── */}
      {perspective === 'supervisor' && (
        <div className="divide-y divide-border/40">
          <section className="pb-3.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <BarChart2 className="h-4 w-4 text-primary" />
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
                <span className="font-mono font-bold tabular-nums text-destructive">{stats?.cancelled || 0}</span>
              </div>
            </div>
          </section>

          <section className="py-3.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>{isArabic ? 'إدارة توزيع الفريق' : 'Team Distribution'}</span>
            </div>
            <Link
              to="/settings/orders?tab=confirmation"
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <span>{isArabic ? 'ضبط إعدادات التوزيع' : 'Configure Assignment Rules'}</span>
              {isArabic ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
            </Link>
          </section>
        </div>
      )}
    </aside>
  );
};

export default WorkspaceIntelligenceRail;
