import React from 'react';
import {
  CheckCircle2,
  Bot,
  Phone,
  ArrowRightLeft,
  FileText,
  Edit3,
  PlusCircle,
} from 'lucide-react';

export const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badgeClass: string;
    borderClass: string;
    dotClass: string;
  }
> = {
  REVIEWED: {
    label: 'مراجعة واعتماد المرتجع',
    icon: CheckCircle2,
    badgeClass:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
    borderClass: 'border-emerald-500 dark:border-emerald-400',
    dotClass: 'bg-emerald-500 dark:border-emerald-400',
  },
  AUTO_CREATED: {
    label: 'إنشاء طلب إرجاع تلقائي',
    icon: Bot,
    badgeClass:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
    borderClass: 'border-blue-500 dark:border-blue-400',
    dotClass: 'bg-blue-500 dark:bg-blue-400',
  },
  CONTACT_ATTEMPT: {
    label: 'تسجيل محاولة تواصل',
    icon: Phone,
    badgeClass:
      'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40',
    borderClass: 'border-purple-500 dark:border-purple-400',
    dotClass: 'bg-purple-500 dark:bg-purple-400',
  },
  STATUS_CHANGE: {
    label: 'تغيير حالة المرتجع',
    icon: ArrowRightLeft,
    badgeClass:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
    borderClass: 'border-amber-500 dark:border-amber-400',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
  },
  NOTE_ADDED: {
    label: 'ملاحظة إدارية',
    icon: FileText,
    badgeClass:
      'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    borderClass: 'border-slate-400 dark:border-slate-500',
    dotClass: 'bg-slate-500 dark:bg-slate-400',
  },
  UPDATED: {
    label: 'تعديل بيانات المرتجع',
    icon: Edit3,
    badgeClass:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40',
    borderClass: 'border-indigo-500 dark:border-indigo-400',
    dotClass: 'bg-indigo-500 dark:bg-indigo-400',
  },
  CREATED: {
    label: 'إنشاء طلب إرجاع يدوي',
    icon: PlusCircle,
    badgeClass:
      'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40',
    borderClass: 'border-cyan-500 dark:border-cyan-400',
    dotClass: 'bg-cyan-500 dark:bg-cyan-400',
  },
};

export const renderRoleBadge = (role?: string) => {
  if (!role) return null;
  const upper = role.toUpperCase();
  if (upper === 'OWNER') {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
        مالك الحساب
      </span>
    );
  }
  if (upper === 'ADMIN') {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
        مدير
      </span>
    );
  }
  if (upper === 'MODERATOR') {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
        مشرف
      </span>
    );
  }
  if (upper === 'EMPLOYEE') {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        موظف
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
      {role}
    </span>
  );
};

export const FIELD_LABELS: Record<string, string> = {
  responsibleParty: 'الجهة المسؤولة',
  reason: 'سبب الإرجاع',
  shippingCompany: 'شركة الشحن',
  returnType: 'نوع المرتجع',
  shippingReturnCost: 'تكلفة الشحن الراجع',
  settlementAmount: 'صافي التسوية',
  customerNotes: 'ملاحظات العميل',
  adminNotes: 'ملاحظات الإدارة',
  refundAmount: 'المبلغ المسترد',
};

export const parseResponsibleParty = (party?: string | null) => {
  if (!party) return null;
  switch (party) {
    case 'CUSTOMER':
      return 'العميل';
    case 'SHIPPING':
    case 'SHIPPING_COMPANY':
      return 'شركة الشحن';
    case 'STORE':
      return 'المتجر';
    case 'OTHER':
      return 'أخرى';
    default:
      return party;
  }
};

export const CONTACT_RESULTS_MAP: Record<string, string> = {
  NO_ANSWER: 'لم يرد',
  ANSWERED: 'تم الرد',
  BUSY: 'مشغول',
  WRONG_NUMBER: 'رقم خاطئ',
  CALL_BACK_LATER: 'إعادة اتصال لاحقاً',
};
