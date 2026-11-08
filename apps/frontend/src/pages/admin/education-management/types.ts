import React from "react";
import {
  GraduationCap,
  BookOpen,
  Gift,
  Users,
  Clock,
  BarChart3,
  Layers,
} from "lucide-react";

export interface EducationSubject {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface EducationPackage {
  id: string;
  subjectId: string;
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
  firstName: string;
  lastName?: string;
  phone?: string;
  phone2?: string;
  gender?: string;
  grade?: string;
  subjects?: string[] | { id: string; name: string }[];
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
  student?: { id: string; firstName: string; lastName?: string };
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
  student?: { id: string; firstName: string; lastName?: string };
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
  | "students"
  | "teachers"
  | "enrollments"
  | "sessions";

export const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: BarChart3 },
  { id: "subjects", label: "المواد", icon: BookOpen },
  { id: "packages", label: "الباقات", icon: Gift },
  { id: "students", label: "الطلاب", icon: Users },
  { id: "teachers", label: "المهندسين", icon: GraduationCap },
  { id: "enrollments", label: "التسجيلات", icon: Layers },
  { id: "sessions", label: "الحصص", icon: Clock },
];

export const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: {
    label: "مجدولة",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  CONFIRMED: {
    label: "مؤكدة",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  CANCELLED: {
    label: "ملغية",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

export const MODAL_CLS =
  "bg-card border border-border rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-xl mx-auto space-y-4 max-h-[90vh] overflow-y-auto";
export const INPUT_CLS =
  "w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
export const CELL_CLS = "py-2.5 px-3 sm:py-3 sm:px-4 text-xs";
