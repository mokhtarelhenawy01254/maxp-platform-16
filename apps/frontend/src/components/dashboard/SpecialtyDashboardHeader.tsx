import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartIcon,
  AcademicCapIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  PlusIcon,
  CalendarDaysIcon,
  UsersIcon,
  BriefcaseIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
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

  // Detect vertical domain
  const isMedical = specialtySlug.includes('medical') || installedApps.some(a => ['medical-system', 'booking-app'].includes(a.slug));
  const isDental = specialtySlug.includes('dental') || installedApps.some(a => a.slug === 'dental-lab-app');
  const isEducation = specialtySlug.includes('education') || installedApps.some(a => a.slug === 'education-app');
  const isMarketing = specialtySlug.includes('marketing') || installedApps.some(a => ['facebook-ads-pro', 'campaign-attribution'].includes(a.slug));
  const isMessaging = specialtySlug.includes('support') || specialtySlug.includes('customer') || installedApps.some(a => ['unified-inbox', 'whatsapp-business'].includes(a.slug));

  if (!isMedical && !isDental && !isEducation && !isMarketing && !isMessaging) {
    return null; // Regular e-commerce uses standard view
  }

  return (
    <div className="bg-gradient-to-r from-card to-background border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header with Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
            {isMedical ? (
              <HeartIcon className="w-6 h-6 text-rose-500" />
            ) : isDental ? (
              <WrenchScrewdriverIcon className="w-6 h-6 text-cyan-500" />
            ) : isEducation ? (
              <AcademicCapIcon className="w-6 h-6 text-indigo-500" />
            ) : isMarketing ? (
              <MegaphoneIcon className="w-6 h-6 text-amber-500" />
            ) : (
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-emerald-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
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
              {specialtyName && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  {specialtyName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              مؤشرات تشغيلية مخصصة ومطابقة لطبيعة نشاطك اليومي
            </p>
          </div>
        </div>

        {/* Quick Action Buttons for this vertical */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {isMedical && (
            <>
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                حجز موعد
              </button>
              <button
                type="button"
                onClick={() => navigate('/doctor/schedule')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 text-xs font-semibold transition-colors shrink-0"
              >
                <CalendarDaysIcon className="w-4 h-4 text-muted-foreground" />
                الجدول الطبي
              </button>
            </>
          )}

          {isDental && (
            <>
              <button
                type="button"
                onClick={() => navigate('/dental-lab')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                استلام حالة معمل
              </button>
              <button
                type="button"
                onClick={() => navigate('/dental-lab/doctors')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 text-xs font-semibold transition-colors shrink-0"
              >
                <UsersIcon className="w-4 h-4 text-muted-foreground" />
                أطباء الأسنان
              </button>
            </>
          )}

          {isEducation && (
            <>
              <button
                type="button"
                onClick={() => navigate('/teacher/schedule')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                إضافة حصة
              </button>
              <button
                type="button"
                onClick={() => navigate('/parent/children')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 text-xs font-semibold transition-colors shrink-0"
              >
                <UsersIcon className="w-4 h-4 text-muted-foreground" />
                الطلاب
              </button>
            </>
          )}

          {isMarketing && (
            <>
              <button
                type="button"
                onClick={() => navigate('/advertising/facebook-ads')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                حملة إعلانية
              </button>
              <button
                type="button"
                onClick={() => navigate('/marketing/facebook')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 text-xs font-semibold transition-colors shrink-0"
              >
                <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                الصفحات المتصلة
              </button>
            </>
          )}

          {isMessaging && (
            <>
              <button
                type="button"
                onClick={() => navigate('/unified-inbox')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                صندوق الوارد الموحد
              </button>
              <button
                type="button"
                onClick={() => navigate('/whatsapp')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 text-xs font-semibold transition-colors shrink-0"
              >
                قنوات الواتساب
              </button>
            </>
          )}
        </div>
      </div>

      {/* Specialty Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {isMedical && (
          <>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">حجوزات اليوم</span>
              <p className="text-2xl font-black text-rose-600 mt-1">
                {specialtyMetrics.medical?.todayAppointments ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">إجمالي الحجوزات</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {specialtyMetrics.medical?.appointmentsCount ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">المرضى المسجلين</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">الطاقم الطبي</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
            </div>
          </>
        )}

        {isDental && (
          <>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">الحالات النشطة</span>
              <p className="text-2xl font-black text-cyan-600 mt-1">
                {specialtyMetrics.dentalLab?.activeCases ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">أطباء الأسنان</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {specialtyMetrics.dentalLab?.totalDoctors ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">العملاء والعيادات</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">فريق المعمل</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
            </div>
          </>
        )}

        {isEducation && (
          <>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">الطلاب المسجلين</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">المعلمين والمدربين</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">محادثات الطلاب</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.conversations ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">التطبيقات المفعلة</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {installedApps.length}
              </p>
            </div>
          </>
        )}

        {isMarketing && (
          <>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">العملاء المحتملين (Leads)</span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">المحادثات الجارية</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.conversations ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">فريق الحملات</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">التطبيقات المرتبطة</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {installedApps.length}
              </p>
            </div>
          </>
        )}

        {isMessaging && (
          <>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">إجمالي المحادثات</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {dashboard.counts?.conversations ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">محادثات جديدة</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.recentActivity?.newConversations ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">العملاء وجهات الاتصال</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.customers ?? 0}
              </p>
            </div>
            <div className="bg-background/80 border border-border/60 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] font-bold text-muted-foreground">فريق الرد</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {dashboard.counts?.users ?? 0}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpecialtyDashboardHeader;