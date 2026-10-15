import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Plus,
  Calendar,
  Users,
  Briefcase,
  Wrench,
} from 'lucide-react';
import type { DashboardData } from '../../pages/dashboard/types';

interface SpecialtyDashboardHeaderProps {
  dashboard: DashboardData;
}

export const SpecialtyDashboardHeader: React.FC<SpecialtyDashboardHeaderProps> = ({ dashboard }) => {
  const navigate = useNavigate();
  const specialtySlug = dashboard.businessSpecialty?.slug || '';
  const specialtyName = dashboard.businessSpecialty?.nameAr || dashboard.businessSpecialty?.nameEn || '';
  const installedApps = dashboard.installedApps || [];
  const specialtyMetrics = dashboard.specialtyMetrics || {};

  const primaryVertical = (() => {
    if (specialtySlug.includes('medical') || installedApps.some(a => ['medical-system', 'booking-app'].includes(a.slug))) return 'medical';
    if (specialtySlug.includes('dental') || installedApps.some(a => a.slug === 'dental-lab-app')) return 'dental';
    if (specialtySlug.includes('education') || installedApps.some(a => a.slug === 'education-app')) return 'education';
    if (specialtySlug.includes('marketing') || installedApps.some(a => ['facebook-ads-pro', 'campaign-attribution'].includes(a.slug))) return 'marketing';
    if (specialtySlug.includes('support') || specialtySlug.includes('customer') || installedApps.some(a => ['unified-inbox', 'whatsapp-business'].includes(a.slug))) return 'messaging';
    return null;
  })();

  if (!primaryVertical) {
    return null;
  }

  const isMedical = primaryVertical === 'medical';
  const isDental = primaryVertical === 'dental';
  const isEducation = primaryVertical === 'education';
  const isMarketing = primaryVertical === 'marketing';
  const isMessaging = primaryVertical === 'messaging';

  return (
    <div className="relative overflow-hidden bg-card text-card-foreground rounded-xl border border-border/70 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header with Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            {isMedical ? (
              <Heart className="size-5 text-rose-500" />
            ) : isDental ? (
              <Wrench className="size-5 text-primary" />
            ) : isEducation ? (
              <GraduationCap className="size-5 text-indigo-500" />
            ) : isMarketing ? (
              <Megaphone className="size-5 text-amber-500" />
            ) : (
              <MessageSquare className="size-5 text-emerald-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                {isMedical
                  ? 'لوحة إدارة العيادات والمواعيد الطبية'
                  : isDental
                  ? 'لوحة إدارة معمل الأسنان والحالات'
                  : isEducation
                  ? 'لوحة إدارة الأكاديمية والتعليم'
                  : isMarketing
                  ? 'لوحة التسويق والحملات الرقمية'
                  : 'لوحة إدارة المحادثات وخدمة العملاء'}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{specialtyName || 'نشط ومتصل'}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              مركز القيادة والعمليات التشغيلية التخصصية
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {isMedical && (
            <>
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
              >
                <Plus className="size-3.5" />
                حجز موعد
              </button>
              <button
                type="button"
                onClick={() => navigate('/doctor/schedule')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shrink-0"
              >
                <Calendar className="size-3.5 text-muted-foreground" />
                الجدول الطبي
              </button>
            </>
          )}

          {isDental && (
            <>
              <button
                type="button"
                onClick={() => navigate('/dental-lab')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
              >
                <Plus className="size-3.5" />
                استلام حالة
              </button>
              <button
                type="button"
                onClick={() => navigate('/dental-lab/doctors')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shrink-0"
              >
                <Users className="size-3.5 text-muted-foreground" />
                أطباء الأسنان
              </button>
            </>
          )}

          {isEducation && (
            <>
              <button
                type="button"
                onClick={() => navigate('/teacher/schedule')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
              >
                <Plus className="size-3.5" />
                إضافة حصة
              </button>
              <button
                type="button"
                onClick={() => navigate('/parent/children')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shrink-0"
              >
                <Users className="size-3.5 text-muted-foreground" />
                الطلاب
              </button>
            </>
          )}

          {isMarketing && (
            <>
              <button
                type="button"
                onClick={() => navigate('/advertising/facebook-ads')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
              >
                <Plus className="size-3.5" />
                حملة إعلانية
              </button>
              <button
                type="button"
                onClick={() => navigate('/marketing/facebook')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shrink-0"
              >
                <Briefcase className="size-3.5 text-muted-foreground" />
                الصفحات
              </button>
            </>
          )}

          {isMessaging && (
            <>
              <button
                type="button"
                onClick={() => navigate('/unified-inbox')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
              >
                <MessageSquare className="size-3.5" />
                الوارد الموحد
              </button>
              <button
                type="button"
                onClick={() => navigate('/whatsapp')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shrink-0"
              >
                قنوات الواتساب
              </button>
            </>
          )}
        </div>
      </div>

      {/* Specialty Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-lg border border-border/60 bg-muted/20 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/50 overflow-hidden">
        {isMedical && (
          <>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">حجوزات اليوم</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-rose-500 mt-1">
                {specialtyMetrics.medical?.todayAppointments ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">مواعيد مؤكدة</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">إجمالي الحجوزات</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {specialtyMetrics.medical?.appointmentsCount ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">سجل العيادة التراكمي</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">المرضى المسجلين</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">ملفات المرضى</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">الطاقم الطبي</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">أطباء ومساعدين</span>
            </div>
          </>
        )}

        {isDental && (
          <>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">الحالات النشطة</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-primary mt-1">
                {specialtyMetrics.dentalLab?.activeCases ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">قيد التصنيع</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">أطباء الأسنان</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {specialtyMetrics.dentalLab?.totalDoctors ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">عيادات متعاقدة</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">العملاء والعيادات</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">إجمالي سجل الحالات</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">فريق المعمل</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">فنيين وموظفين</span>
            </div>
          </>
        )}

        {isEducation && (
          <>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">الحصص اليومية</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-indigo-500 mt-1">
                {specialtyMetrics.education?.todayClasses ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">جلسات مجدولة</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">الطلاب النشطين</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">اشتراكات فعالة</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">المعلمين</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">هيئة التدريس</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">الكورسات</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.products ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">مناهج مسجلة</span>
            </div>
          </>
        )}

        {isMarketing && (
          <>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">الحملات النشطة</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-500 mt-1">
                {specialtyMetrics.marketing?.activeCampaigns ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">حملة تعمل حالياً</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">الصفحات المتصلة</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {specialtyMetrics.marketing?.connectedPages ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">ربط فيسبوك نشط</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">التحويلات</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.orders ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">طلبات الإعلانات</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">فريق الميديا</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">مديري الحملات</span>
            </div>
          </>
        )}

        {isMessaging && (
          <>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">المحادثات المفتوحة</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-500 mt-1">
                {specialtyMetrics.messaging?.openConversations ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">بانتظار الرد</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">رسائل اليوم</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {specialtyMetrics.messaging?.todayMessages ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">محادثة واردة</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">العملاء النشطين</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">جهات اتصال</span>
            </div>
            <div className="p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground">فريق الدعم</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">وكلاء خدمة عملاء</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpecialtyDashboardHeader;