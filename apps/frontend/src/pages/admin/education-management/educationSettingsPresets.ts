import React from "react";
import {
  BarChart3,
  BookOpen,
  Gift,
  Users,
  GraduationCap,
  CalendarDays,
  DollarSign,
  Clock,
  Layers,
  Megaphone,
  Settings,
  History,
  Presentation,
  School,
  Cpu,
  Briefcase,
  Building2,
} from "lucide-react";

export const SECTION_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  BookOpen,
  Gift,
  Users,
  GraduationCap,
  CalendarDays,
  DollarSign,
  Layers,
  Clock,
  Megaphone,
  Settings,
  History,
  Presentation,
};

interface PresetLabel {
  ar: string;
  en: string;
}

export interface EducationPreset {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  systemTitle: string;
  systemTitleEn: string;
  labels: Record<string, PresetLabel>;
}

export const PRESETS: EducationPreset[] = [
  {
    id: "school",
    name: "مراكز تعليمية ومدارس",
    nameEn: "Educational Centers & Schools",
    desc: "المعلمين، الطلاب، الحصص، والمواد الدراسية",
    descEn: "Teachers, students, lessons, and academic subjects",
    icon: School,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    systemTitle: "النظام التعليمي والدروس",
    systemTitleEn: "Education & Tutoring System",
    labels: {
      teachers: { ar: "المعلمين", en: "Teachers" },
      students: { ar: "الطلاب", en: "Students" },
      subjects: { ar: "المواد الدراسية", en: "Subjects" },
      packages: { ar: "باقات الحصص", en: "Lesson Packages" },
      sessions: { ar: "الحصص", en: "Lessons" },
      "teacher-schedule": { ar: "جدول المعلمين", en: "Teachers Schedule" },
      "teacher-payments": { ar: "مرتبات المعلمين", en: "Teachers Payroll" },
      enrollments: { ar: "تسجيلات الطلاب", en: "Student Enrollments" },
      calendar: { ar: "التقويم الدراسي", en: "Academic Calendar" },
      funnel: { ar: "التسجيل والإشعارات", en: "Admissions & Notifications" },
    },
  },
  {
    id: "engineering",
    name: "مراكز تدريب هندسي وتقني",
    nameEn: "Engineering & Technical Centers",
    desc: "المهندسين، المتدربين، الورش والمشاريع",
    descEn: "Engineers, trainees, workshops, and technical projects",
    icon: Cpu,
    iconColor: "text-blue-600 dark:text-blue-400",
    systemTitle: "نظام المركز الهندسي والتقني",
    systemTitleEn: "Engineering Training Center",
    labels: {
      teachers: { ar: "المهندسين", en: "Engineers & Instructors" },
      students: { ar: "المتدربين", en: "Trainees" },
      subjects: { ar: "المسارات الهندسية", en: "Engineering Tracks" },
      packages: { ar: "الباقات الهندسية", en: "Training Packages" },
      sessions: { ar: "الورش والمحاضرات", en: "Workshops & Labs" },
      "teacher-schedule": { ar: "جدول المهندسين", en: "Engineers Schedule" },
      "teacher-payments": { ar: "مرتبات المهندسين", en: "Engineers Payroll" },
      enrollments: { ar: "تسجيلات المتدربين", en: "Trainee Enrollments" },
      calendar: { ar: "جدول الورش", en: "Workshops Calendar" },
      funnel: { ar: "قمع التقديمات", en: "Applications Funnel" },
    },
  },
  {
    id: "academy",
    name: "أكاديميات تدريب وكورسات",
    nameEn: "Training Academies & Courses",
    desc: "المدربين، الدارسين، البرامج والكورسات",
    descEn: "Trainers, learners, courses, and programs",
    icon: Briefcase,
    iconColor: "text-purple-600 dark:text-purple-400",
    systemTitle: "أكاديمية التدريب والتطوير",
    systemTitleEn: "Training Academy",
    labels: {
      teachers: { ar: "المدربين", en: "Trainers & Coaches" },
      students: { ar: "الدارسين والمتدربين", en: "Learners" },
      subjects: { ar: "الدورات التدريبية", en: "Courses" },
      packages: { ar: "البرامج والحقائب", en: "Training Programs" },
      sessions: { ar: "المحاضرات", en: "Lectures" },
      "teacher-schedule": { ar: "جدول المدربين", en: "Trainers Schedule" },
      "teacher-payments": { ar: "مستحقات المدربين", en: "Trainers Compensation" },
      enrollments: { ar: "الاشتراكات", en: "Subscriptions" },
      calendar: { ar: "الجدول الزمني", en: "Training Calendar" },
      funnel: { ar: "قمع التسجيل والتسويق", en: "Lead Funnel" },
    },
  },
  {
    id: "institute",
    name: "معاهد وجامعات أكاديمية",
    nameEn: "Academic Institutes & Universities",
    desc: "هيئة التدريس، الطلاب، والمقررات",
    descEn: "Faculty members, students, and curriculum",
    icon: Building2,
    iconColor: "text-amber-600 dark:text-amber-400",
    systemTitle: "نظام المعهد الأكاديمي",
    systemTitleEn: "Academic Institute System",
    labels: {
      teachers: { ar: "أعضاء هيئة التدريس", en: "Faculty Members" },
      students: { ar: "الطلاب الأكاديميين", en: "Academic Students" },
      subjects: { ar: "المقررات الدراسية", en: "Curriculum & Courses" },
      packages: { ar: "الساعات المعتمدة", en: "Credit Hours" },
      sessions: { ar: "المحاضرات الجامعية", en: "Academic Lectures" },
      "teacher-schedule": { ar: "جدول المحاضرين", en: "Faculty Schedule" },
      "teacher-payments": { ar: "المستحقات الأكاديمية", en: "Academic Payroll" },
      enrollments: { ar: "التسجيل الأكاديمي", en: "Course Registration" },
      calendar: { ar: "التقويم الأكاديمي", en: "Academic Calendar" },
      funnel: { ar: "القبول والتسجيل", en: "Admissions & Inquiries" },
    },
  },
];
