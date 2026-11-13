import React from "react";
import {
  GraduationCap,
  BookOpen,
  Gift,
  Users,
  Clock,
  BarChart3,
  Layers,
  Settings,
  History,
  Presentation,
} from "lucide-react";

export interface EducationSubject {
  id: string;
  name: string;
  description?: string;
  price?: number;
  isActive: boolean;
}

export interface EducationPackage {
  id: string;
  subjectId?: string;
  name: string;
  description?: string;
  hoursCount: number;
  sessionDuration: number;
  price: number;
  isActive: boolean;
  subject?: { id: string; name: string };
}

export interface EducationStudent {
  id: string;
  customerId: string;
  code?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  phone2?: string;
  address?: string;
  gender?: string;
  grade?: string;
  subjects?: string[] | { id: string; name: string }[];
  currentLevel?: number;
  notes?: string;
  isActive: boolean;
  customer?: { id: string; firstName: string; lastName: string; phone: string; phone2?: string; email?: string };
  enrollments?: EducationEnrollment[];
}

export interface EducationTeacher {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  bio?: string;
  qualifications?: string;
  avatarUrl?: string;
  isActive: boolean;
  subjectRates?: {
    id: string;
    subjectId: string;
    hourlyRate: number;
    subject: { id: string; name: string };
  }[];
}

export interface EducationEnrollment {
  id: string;
  studentId: string;
  packageId: string;
  teacherId: string | null;
  totalHours: number;
  remainingHours: number;
  amountPaid: number;
  paymentStatus: string;
  enrollmentDate: string;
  expiresAt?: string;
  isActive: boolean;
  student?: { id: string; code?: string; firstName: string; lastName?: string };
  package?: { id: string; name: string; subject?: { id: string; name: string } };
  teacher?: { id: string; name: string };
}

export interface EducationSession {
  id: string;
  enrollmentId: string;
  studentId: string;
  teacherId: string;
  subjectId: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration?: number;
  topic?: string;
  notes?: string;
  status: string;
  createdAt: string;
  student?: { id: string; code?: string; firstName: string; lastName?: string };
  teacher?: { id: string; name: string };
  subject?: { id: string; name: string };
  enrollment?: { id: string; remainingHours: number };
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  phone2?: string;
  email?: string;
}

export type TabId =
  | "dashboard"
  | "subjects"
  | "packages"
  | "groups"
  | "students"
  | "teachers"
  | "enrollments"
  | "sessions"
  | "demo-day"
  | "settings"
  | "logs";

export const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: BarChart3 },
  { id: "subjects", label: "المواد", icon: BookOpen },
  { id: "packages", label: "الباقات", icon: Gift },
  { id: "groups", label: "المجموعات (الجروبات)", icon: Users },
  { id: "students", label: "الطلاب", icon: Users },
  { id: "teachers", label: "المهندسين", icon: GraduationCap },
  { id: "enrollments", label: "التسجيلات", icon: Layers },
  { id: "sessions", label: "الحصص", icon: Clock },
  { id: "demo-day", label: "الديمو داي", icon: Presentation },
  { id: "settings", label: "الإعدادات", icon: Settings },
  { id: "logs", label: "سجلات النظام التعليمي", icon: History },
];

export interface EducationLogItem {
  id: string;
  userId?: string | null;
  companyId: string;
  category: string;
  action: string;
  description: string;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  metadata?: any;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isSuccess: boolean;
  errorMessage?: string | null;
  tags?: string[] | null;
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
  } | null;
  actorName: string;
  actorRole: string;
  actorType: string;
}

export interface EducationLogStats {
  totalLogs: number;
  todayLogs: number;
  weekLogs: number;
  targetTypeCounts: Record<string, number>;
  actionCounts: Record<string, number>;
  recent: Array<{
    id: string;
    action: string;
    description: string;
    targetType?: string;
    targetName?: string;
    createdAt: string;
    actorName: string;
    isSuccess: boolean;
  }>;
}

export const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: {
    label: "مجدولة",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  CONFIRMED: {
    label: "مؤكدة",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  COMPLETED: {
    label: "مكتملة",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  CANCELLED: {
    label: "ملغية",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

export const getSessionStatus = (status: string, isEn = false): { label: string; color: string } => {
  const map: Record<string, { ar: string; en: string; color: string }> = {
    SCHEDULED: { ar: "مجدولة", en: "Scheduled", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    CONFIRMED: { ar: "مؤكدة", en: "Confirmed", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    COMPLETED: { ar: "مكتملة", en: "Completed", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
    CANCELLED: { ar: "ملغية", en: "Cancelled", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  };
  const item = map[status];
  if (!item) return { label: status, color: "bg-muted text-muted-foreground" };
  return { label: isEn ? item.en : item.ar, color: item.color };
};

export const MODAL_CLS =
  "bg-card border border-border rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-xl mx-auto space-y-4 max-h-[90vh] overflow-y-auto";
export const INPUT_CLS =
  "w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
export const CELL_CLS = "py-2.5 px-3 sm:py-3 sm:px-4 text-xs";
