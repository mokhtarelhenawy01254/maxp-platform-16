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

  // Detect vertical domain with clean priority resolution to prevent duplicate stacking
  const primaryVertical = (() => {
    if (specialtySlug.includes('medical') || installedApps.some(a => ['medical-system', 'booking-app'].includes(a.slug))) return 'medical';
    if (specialtySlug.includes('dental') || installedApps.some(a => a.slug === 'dental-lab-app')) return 'dental';
    if (specialtySlug.includes('education') || installedApps.some(a => a.slug === 'education-app')) return 'education';
    if (specialtySlug.includes('marketing') || installedApps.some(a => ['facebook-ads-pro', 'campaign-attribution'].includes(a.slug))) return 'marketing';
    if (specialtySlug.includes('support') || specialtySlug.includes('customer') || installedApps.some(a => ['unified-inbox', 'whatsapp-business'].includes(a.slug))) return 'messaging';
    return null;
  })();

  if (!primaryVertical) {
    return null; // Regular e-commerce uses standard view
  }

  const isMedical = primaryVertical === 'medical';
  const isDental = primaryVertical === 'dental';
  const isEducation = primaryVertical === 'education';
  const isMarketing = primaryVertical === 'marketing';
  const isMessaging = primaryVertical === 'messaging';

  return (
    <div className="relative overflow-hidden bg-slate-950 text-white rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5">
      {/* Subtle architectural background grid glow */}
      <div className="pointer-events-none absolute -top-24 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-primary/5 to-transparent blur-3xl opacity-60" />

      {/* Header with Title & Badge */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
            {isMedical ? (
              <HeartIcon className="w-6 h-6 text-rose-400" />
            ) : isDental ? (
              <WrenchScrewdriverIcon className="w-6 h-6 text-cyan-400" />
            ) : isEducation ? (
              <AcademicCapIcon className="w-6 h-6 text-indigo-400" />
            ) : isMarketing ? (
              <MegaphoneIcon className="w-6 h-6 text-amber-400" />
            ) : (
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{specialtyName || 'نشط ومتصل'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              مركز القيادة والعمليات التشغيلية التخصصية
            </p>
          </div>
        </div>

        {/* Quick Action Buttons for this vertical */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto">
          {isMedical && (
            <>
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold active:scale-[0.97] transition-[transform,background-color] duration-150 shadow-md shadow-rose-500/20 shrink-0"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                حجز موعد
              </button>
              <button
                type="button"
                onClick={() => navigate('/doctor/schedule')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white active:scale-[0.97] transition-[transform,background-color] duration-150 text-xs font-semibold shrink-0"
              >
                <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                الجدول الطبي
              </button>
            </>
          )}

          {isDental && (
            <>
              <button
                type="button"
                onClick={() => navigate('/dental-lab')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold active:scale-[0.97] transition-[transform,background-color] duration-150 shadow-md shadow-cyan-400/20 shrink-0"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                استلام حالة معمل
              </button>
              <button
                type="button"
                onClick={() => navigate('/dental-lab/doctors')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white active:scale-[0.97] transition-[transform,background-color] duration-150 text-xs font-semibold shrink-0"
              >
                <UsersIcon className="w-4 h-4 text-slate-400" />
                أطباء الأسنان
              </button>
            </>
          )}

          {isEducation && (
            <>
              <button
                type="button"
                onClick={() => navigate('/teacher/schedule')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-950 text-xs font-bold active:scale-[0.97] transition-[transform,background-color] duration-150 shadow-md shadow-indigo-400/20 shrink-0"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                إضافة حصة
              </button>
              <button
                type="button"
                onClick={() => navigate('/parent/children')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white active:scale-[0.97] transition-[transform,background-color] duration-150 text-xs font-semibold shrink-0"
              >
                <UsersIcon className="w-4 h-4 text-slate-400" />
                الطلاب
              </button>
            </>
          )}

          {isMarketing && (
            <>
              <button
                type="button"
                onClick={() => navigate('/advertising/facebook-ads')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold active:scale-[0.97] transition-[transform,background-color] duration-150 shadow-md shadow-amber-400/20 shrink-0"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                حملة إعلانية
              </button>
              <button
                type="button"
                onClick={() => navigate('/marketing/facebook')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white active:scale-[0.97] transition-[transform,background-color] duration-150 text-xs font-semibold shrink-0"
              >
                <BriefcaseIcon className="w-4 h-4 text-slate-400" />
                الصفحات المتصلة
              </button>
            </>
          )}

          {isMessaging && (
            <>
              <button
                type="button"
                onClick={() => navigate('/unified-inbox')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold active:scale-[0.97] transition-[transform,background-color] duration-150 shadow-md shadow-emerald-400/20 shrink-0"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 stroke-[2.5]" />
                صندوق الوارد الموحد
              </button>
              <button
                type="button"
                onClick={() => navigate('/whatsapp')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white active:scale-[0.97] transition-[transform,background-color] duration-150 text-xs font-semibold shrink-0"
              >
                قنوات الواتساب
              </button>
            </>
          )}
        </div>
      </div>

      {/* Specialty Metrics Strip - High Impact Bento Chassis */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-white/10 bg-white/[0.02] divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-white/10 overflow-hidden backdrop-blur-xs">
        {isMedical && (
          <>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">حجوزات اليوم</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-rose-400 mt-1.5 font-mono">
                {specialtyMetrics.medical?.todayAppointments ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">مواعيد مؤكدة لليوم</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">إجمالي الحجوزات</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {specialtyMetrics.medical?.appointmentsCount ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">سجل العيادة التراكمي</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">المرضى المسجلين</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">ملفات المرضى النشطة</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">الطاقم الطبي</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">أطباء ومساعدين</span>
            </div>
          </>
        )}

        {isDental && (
          <>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">الحالات النشطة</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-cyan-400 mt-1.5 font-mono">
                {specialtyMetrics.dentalLab?.activeCases ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">حالة قيد التصنيع حالياً</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">أطباء الأسنان</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {specialtyMetrics.dentalLab?.totalDoctors ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">عيادات متعاقدة</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">العملاء والعيادات</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">إجمالي سجل الحالات</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">فريق المعمل</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">فنيين ومشرفين نشطين</span>
            </div>
          </>
        )}

        {isEducation && (
          <>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">الطلاب المسجلين</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-indigo-400 mt-1.5 font-mono">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">طلاب نشطين</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">المعلمين والمدربين</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">طاقم التدريس</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">محادثات الطلاب</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.conversations ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">تفاعل ودعم تعليمي</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">التطبيقات المفعلة</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {installedApps.length}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">أدوات تعليمية متصلة</span>
            </div>
          </>
        )}

        {isMarketing && (
          <>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">العملاء المحتملين (Leads)</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-amber-400 mt-1.5 font-mono">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">عملاء جدد مستهدفين</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">المحادثات الجارية</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.conversations ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">محادثات قمع البيع</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">فريق الحملات</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">مديري إعلانات ومسوقين</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">التطبيقات المرتبطة</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {installedApps.length}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">قنوات تسويق مفعلة</span>
            </div>
          </>
        )}

        {isMessaging && (
          <>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">إجمالي المحادثات</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-emerald-400 mt-1.5 font-mono">
                {dashboard.counts?.conversations ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">سجل الرسائل الشامل</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">محادثات جديدة</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.recentActivity?.newConversations ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">اليوم</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">العملاء وجهات الاتصال</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.customers ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">قاعدة بيانات العملاء</span>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">فريق الرد</span>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-1.5 font-mono">
                {dashboard.counts?.users ?? 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">وكلاء خدمة عملاء نشطين</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpecialtyDashboardHeader;