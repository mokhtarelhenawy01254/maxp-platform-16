import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Sparkles,
  RotateCcw,
  Save,
  Check,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  GraduationCap,
  BookOpen,
  Gift,
  Users,
  CalendarDays,
  DollarSign,
  Clock,
  Layers,
  Megaphone,
  BarChart3,
  ArrowRight,
  HelpCircle,
  Wand2,
  Building2,
  Cpu,
  Briefcase,
  School,
  Lock,
  History,
  Presentation,
} from "lucide-react";
import { api, fetchJson, getAuthHeaders } from "./api";
import { useSidebarSettings } from "../../../contexts/SidebarSettingsContext";
import { PortalInviteAndPushCard } from "./PortalInviteAndPushCard";

export interface EducationTabConfig {
  id: string;
  key: string;
  defaultLabelAr: string;
  defaultLabelEn: string;
  labelAr: string;
  labelEn: string;
  order: number;
  visible: boolean;
  locked?: boolean;
  iconName: string;
}

export interface EducationSettingsData {
  systemTitle: string;
  systemTitleEn: string;
  educationMode?: "COURSES" | "ACADEMIC";
  enableSubjects?: boolean;
  enableDemoDay?: boolean;
  pushFirstSaveWhatsApp?: boolean;
  companySlug?: string | null;
  publicCode?: string | null;
  customDomain?: string | null;
  tabs: EducationTabConfig[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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

const PRESETS = [
  {
    id: "school",
    name: "مراكز تعليمية ومدارس",
    nameEn: "Educational Centers & Schools",
    desc: "المعلمين، الطلاب، الحصص، والمواد الدراسية",
    descEn: "Teachers, students, lessons, and academic subjects",
    icon: School,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
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
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
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
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
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
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
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

interface EducationSettingsTabProps {
  onSaved?: (newSettings: EducationSettingsData) => void;
}

export function EducationSettingsTab({ onSaved }: EducationSettingsTabProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const { refreshSettings } = useSidebarSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemTitle, setSystemTitle] = useState("النظام التعليمي");
  const [systemTitleEn, setSystemTitleEn] = useState("Education System");
  const [educationMode, setEducationMode] = useState<"COURSES" | "ACADEMIC">("COURSES");
  const [enableSubjects, setEnableSubjects] = useState<boolean>(false);
  const [enableDemoDay, setEnableDemoDay] = useState<boolean>(false);
  const [pushFirstSaveWhatsApp, setPushFirstSaveWhatsApp] = useState<boolean>(true);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [tabs, setTabs] = useState<EducationTabConfig[]>([]);
  const [initialData, setInitialData] = useState<EducationSettingsData | null>(null);

  const [savingMode, setSavingMode] = useState<"COURSES" | "ACADEMIC" | null>(null);
  const [savingPushFirst, setSavingPushFirst] = useState<boolean>(false);
  const [savingDemoDay, setSavingDemoDay] = useState<boolean>(false);

  // Load existing settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(api("settings"));
      if (data) {
        setSystemTitle(data.systemTitle || "النظام التعليمي");
        setSystemTitleEn(data.systemTitleEn || "Education System");
        const mode = data.educationMode || (data.enableSubjects ? "ACADEMIC" : "COURSES");
        setEducationMode(mode);
        const subjectsActive = data.enableSubjects !== undefined ? Boolean(data.enableSubjects) : (mode === "ACADEMIC");
        setEnableSubjects(subjectsActive);
        const demoActive = data.enableDemoDay !== undefined
          ? Boolean(data.enableDemoDay)
          : Boolean(data.tabs?.find((t: any) => t.id === 'demo-day')?.visible);
        setEnableDemoDay(demoActive);
        setPushFirstSaveWhatsApp(
          data.pushFirstSaveWhatsApp !== undefined ? Boolean(data.pushFirstSaveWhatsApp) : true,
        );
        setCompanySlug(data.companySlug ?? null);
        setPublicCode(data.publicCode ?? null);
        setCustomDomain(data.customDomain ?? null);
        setTabs(data.tabs || []);
        setInitialData(data);
      }
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to load education system settings" : "تعذر جلب إعدادات النظام التعليمي"));
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (mode: "COURSES" | "ACADEMIC") => {
    if (saving || savingMode) return;
    const subjectsOn = mode === "ACADEMIC";
    setEducationMode(mode);
    setEnableSubjects(subjectsOn);

    const updatedTabs = tabs.map((t) => {
      if (t.id.toLowerCase() === "subjects") {
        return { ...t, visible: subjectsOn };
      }
      return t;
    });
    setTabs(updatedTabs);

    setSavingMode(mode);
    try {
      const payload = {
        systemTitle: systemTitle.trim(),
        systemTitleEn: systemTitleEn.trim(),
        educationMode: mode,
        enableSubjects: subjectsOn,
        pushFirstSaveWhatsApp,
        tabs: updatedTabs.map((t, idx) => ({
          id: t.id,
          key: t.key,
          labelAr: t.labelAr.trim() || t.defaultLabelAr,
          labelEn: t.labelEn.trim() || t.defaultLabelEn,
          order: idx,
          visible: t.id.toLowerCase() === "subjects" ? subjectsOn : (t.locked ? true : t.visible),
        })),
      };

      await fetchJson(api("settings"), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      toast.success(
        mode === "COURSES"
          ? (isEn ? "Courses & packages mode activated (subjects hidden)" : "تم تفعيل نمط الأكاديمية والكورسات بنجاح (المواد مخفية)")
          : (isEn ? "Academic center mode activated (subjects enabled)" : "تم تفعيل نمط السنتر والمواد الدراسية بنجاح (المواد مفعلة)")
      );

      if (refreshSettings) {
        await refreshSettings();
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("education-settings-updated", { detail: payload }));
      }

      if (onSaved) {
        onSaved({
          systemTitle: payload.systemTitle,
          systemTitleEn: payload.systemTitleEn,
          educationMode: mode,
          enableSubjects: subjectsOn,
          pushFirstSaveWhatsApp,
          companySlug,
          publicCode,
          customDomain,
          tabs: payload.tabs as EducationTabConfig[],
        });
      }
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to apply mode change" : "فشل تطبيق وحفظ نمط النظام"));
    } finally {
      setSavingMode(null);
    }
  };

  const handleTogglePushFirst = async (next: boolean) => {
    if (saving || savingMode || savingPushFirst) return;
    const prev = pushFirstSaveWhatsApp;
    setPushFirstSaveWhatsApp(next);
    setSavingPushFirst(true);
    try {
      const payload = {
        systemTitle: systemTitle.trim(),
        systemTitleEn: systemTitleEn.trim(),
        educationMode,
        enableSubjects,
        pushFirstSaveWhatsApp: next,
        tabs: tabs.map((t, idx) => ({
          id: t.id,
          key: t.key,
          labelAr: t.labelAr.trim() || t.defaultLabelAr,
          labelEn: t.labelEn.trim() || t.defaultLabelEn,
          order: idx,
          visible: t.id.toLowerCase() === "subjects" ? enableSubjects : (t.locked ? true : t.visible),
        })),
      };

      await fetchJson(api("settings"), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      toast.success(
        next
          ? (isEn ? "Portal push-first notifications enabled" : "تم تفعيل إشعارات البوابة أولاً")
          : (isEn ? "Portal push-first notifications disabled" : "تم إيقاف إشعارات البوابة أولاً")
      );

      if (refreshSettings) {
        await refreshSettings();
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("education-settings-updated", { detail: payload }));
      }

      if (onSaved) {
        onSaved({
          systemTitle: payload.systemTitle,
          systemTitleEn: payload.systemTitleEn,
          educationMode,
          enableSubjects,
          pushFirstSaveWhatsApp: next,
          companySlug,
          publicCode,
          customDomain,
          tabs: payload.tabs as EducationTabConfig[],
        });
      }
    } catch (err: any) {
      setPushFirstSaveWhatsApp(prev);
      toast.error(err.message || (isEn ? "Failed to update notification setting" : "فشل تحديث إعداد الإشعارات"));
    } finally {
      setSavingPushFirst(false);
    }
  };

  const handleToggleDemoDay = async (next: boolean) => {
    if (saving || savingMode || savingDemoDay) return;
    const prev = enableDemoDay;
    setEnableDemoDay(next);
    setSavingDemoDay(true);

    const updatedTabs = tabs.map((t) => {
      if (t.id.toLowerCase() === "demo-day") {
        return { ...t, visible: next };
      }
      return t;
    });
    setTabs(updatedTabs);

    try {
      const payload = {
        systemTitle: systemTitle.trim(),
        systemTitleEn: systemTitleEn.trim(),
        educationMode,
        enableSubjects,
        enableDemoDay: next,
        pushFirstSaveWhatsApp,
        tabs: updatedTabs.map((t, idx) => ({
          id: t.id,
          key: t.key,
          labelAr: t.labelAr.trim() || t.defaultLabelAr,
          labelEn: t.labelEn.trim() || t.defaultLabelEn,
          order: idx,
          visible: t.id.toLowerCase() === "demo-day" ? next : (t.id.toLowerCase() === "subjects" ? enableSubjects : (t.locked ? true : t.visible)),
        })),
      };

      await fetchJson(api("settings"), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      toast.success(
        next
          ? (isEn ? "Demo Day section activated (visible in sidebar & education menu)" : "تم تفعيل قسم الديمو داي بنجاح (ظاهر بالقائمة الجانبية)")
          : (isEn ? "Demo Day section hidden" : "تم تعطيل وإخفاء قسم الديمو داي")
      );

      if (refreshSettings) {
        await refreshSettings();
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("education-settings-updated", { detail: payload }));
      }

      if (onSaved) {
        onSaved({
          systemTitle: payload.systemTitle,
          systemTitleEn: payload.systemTitleEn,
          educationMode,
          enableSubjects,
          enableDemoDay: next,
          pushFirstSaveWhatsApp,
          companySlug,
          publicCode,
          customDomain,
          tabs: payload.tabs as EducationTabConfig[],
        });
      }
    } catch (err: any) {
      setEnableDemoDay(prev);
      toast.error(err.message || (isEn ? "Failed to toggle Demo Day section" : "فشل تعديل حالة سيكشن الديمو داي"));
    } finally {
      setSavingDemoDay(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Presets applicator
  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSystemTitle(preset.systemTitle);
    setSystemTitleEn(preset.systemTitleEn);
    setTabs((prev) =>
      prev.map((tab) => {
        const replacement = (preset.labels as any)[tab.id];
        if (replacement) {
          return {
            ...tab,
            labelAr: replacement.ar,
            labelEn: replacement.en,
          };
        }
        return tab;
      })
    );
    const presetName = isEn ? (preset.nameEn || preset.name) : preset.name;
    toast.success(
      isEn
        ? `Applied "${presetName}" preset — click Save to apply changes`
        : `تم تطبيق قالب "${presetName}" — اضغط حفظ لتطبيق التغييرات`
    );
  };

  // Reorder tab
  const moveTab = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;

    const newTabs = [...tabs];
    const [moved] = newTabs.splice(index, 1);
    newTabs.splice(targetIndex, 0, moved);

    // Re-assign order indices
    const reordered = newTabs.map((t, idx) => ({ ...t, order: idx }));
    setTabs(reordered);
  };

  // Toggle visibility
  const toggleVisibility = (index: number) => {
    setTabs((prev) =>
      prev.map((t, i) => {
        if (i === index) {
          if (t.locked) {
            toast.info(isEn ? "This tab is required to ensure settings access" : "هذا التاب أساسي لا يمكن إخفاؤه لضمان الوصول للإعدادات");
            return t;
          }
          return { ...t, visible: !t.visible };
        }
        return t;
      })
    );
  };

  // Update label
  const updateLabel = (index: number, lang: "ar" | "en", value: string) => {
    setTabs((prev) =>
      prev.map((t, i) => {
        if (i === index) {
          return lang === "ar" ? { ...t, labelAr: value } : { ...t, labelEn: value };
        }
        return t;
      })
    );
  };

  // Reset tab to default
  const resetTabToDefault = (index: number) => {
    setTabs((prev) =>
      prev.map((t, i) => {
        if (i === index) {
          return {
            ...t,
            labelAr: t.defaultLabelAr,
            labelEn: t.defaultLabelEn,
          };
        }
        return t;
      })
    );
    toast.info(isEn ? "Restored default label for this item" : "تمت استعادة الاسم الافتراضي لهذا العنصر");
  };

  // Reset all to system defaults
  const resetAllToDefaults = () => {
    setSystemTitle("النظام التعليمي");
    setSystemTitleEn("Education System");
    setTabs((prev) =>
      prev.map((t, i) => ({
        ...t,
        labelAr: t.defaultLabelAr,
        labelEn: t.defaultLabelEn,
        visible: true,
        order: i,
      }))
    );
    toast.info(isEn ? "All labels and tabs restored to system defaults" : "تمت استعادة كافة المسميات والتابات الافتراضية");
  };

  // Save to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        systemTitle: systemTitle.trim(),
        systemTitleEn: systemTitleEn.trim(),
        educationMode,
        enableSubjects,
        pushFirstSaveWhatsApp,
        tabs: tabs.map((t, idx) => ({
          id: t.id,
          key: t.key,
          labelAr: t.labelAr.trim() || t.defaultLabelAr,
          labelEn: t.labelEn.trim() || t.defaultLabelEn,
          order: idx,
          visible: t.id.toLowerCase() === "subjects" ? enableSubjects : (t.locked ? true : t.visible),
        })),
      };

      const res = await fetchJson(api("settings"), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      toast.success(isEn ? "Education settings saved and sidebar updated successfully" : "تم حفظ إعدادات النظام التعليمي وتحديث القائمة الجانبية بنجاح");

      if (refreshSettings) {
        refreshSettings();
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("education-settings-updated", { detail: payload }));
      }

      if (onSaved) {
        onSaved({
          systemTitle: payload.systemTitle,
          systemTitleEn: payload.systemTitleEn,
          educationMode,
          enableSubjects,
          pushFirstSaveWhatsApp,
          companySlug,
          publicCode,
          customDomain,
          tabs: tabs.map((t, idx) => ({
            ...t,
            order: idx,
            visible: t.id.toLowerCase() === "subjects" ? enableSubjects : (t.locked ? true : t.visible),
          })),
        });
      }
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to save education settings" : "فشل حفظ إعدادات النظام التعليمي"));
    } finally {
      setSaving(false);
    }
  };

  const visibleCount = useMemo(() => tabs.filter((t) => t.visible).length, [tabs]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">
          {t("education.settingsTab.loading", isEn ? "Loading education settings..." : "جاري تحميل إعدادات النظام التعليمي...")}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir={isEn ? "ltr" : "rtl"}>
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Settings className="w-3.5 h-3.5" />
              {t("education.settingsTab.badge", isEn ? "Interface & Sections Customization" : "تخصيص الواجهة والسكاشن")}
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {isEn ? `${visibleCount} of ${tabs.length} sections visible` : `${visibleCount} من ${tabs.length} سكاشن ظاهرة`}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("education.settingsTab.title", isEn ? "Education System Labels & Sections Settings" : "إعدادات مسميات وسكاشن النظام التعليمي")}
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            {t("education.settingsTab.description", isEn
              ? "Full control over system branding, sidebar section labels, display order, and visibility."
              : "تحكم بحرية كاملة في الاسم الرئيسي للنظام وتخصيص أسماء السكاشن والقوائم الجانبية وترتيبها وإظهارها أو إخفائها.")}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={resetAllToDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl border border-border/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            {t("education.settingsTab.resetDefaults", isEn ? "Reset Defaults" : "استعادة الافتراضي")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {t("education.settingsTab.saveChanges", isEn ? "Save Changes" : "حفظ التعديلات")}
          </button>
        </div>
      </div>

      {/* 0. Operating Mode Selector: Courses/Packages (Default) vs Academic Subjects */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              {t("education.settingsTab.modeTitle", isEn ? "Operation Mode & Academic Sections" : "نمط تشغيل المنظومة وسكاشن المواد الدراسية")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("education.settingsTab.modeDesc", isEn
                ? "Define how your educational system operates: courses and packages directly, or academic center with subjects"
                : "حدد كيف يعمل نظامك التعليمي: نظام باقات وكورسات مباشرة بدون تشتيت، أو نظام سنتر أكاديمي بمواد دراسية")}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            educationMode === "COURSES"
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          }`}>
            {isEn
              ? (educationMode === "COURSES" ? "🎯 Courses & Packages Mode (Subjects hidden)" : "🏫 Academic Center & Subjects Mode")
              : (educationMode === "COURSES" ? "🎯 كورسات وباقات (المواد مخفية)" : "🏫 سنتر ومواد دراسية")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Option 1: Courses & Packages (Default) */}
          <div
            onClick={() => handleModeChange("COURSES")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              educationMode === "COURSES"
                ? "border-primary bg-primary/5 shadow-xs"
                : "border-border/70 hover:border-primary/40 bg-card hover:bg-muted/30"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg border ${
                    educationMode === "COURSES"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {isEn ? "Courses & Training Academy" : "أكاديمية تدريب وكورسات وباقات"}
                    </h4>
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      {isEn ? "(Default Mode)" : "(الوضع الافتراضي)"}
                    </span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  educationMode === "COURSES"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                }`}>
                  {savingMode === "COURSES" ? (
                    <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    educationMode === "COURSES" && <Check className="w-3 h-3 stroke-[3]" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn
                  ? "Tailored for skill academies (programming, languages, coaching). Automatically hides subjects for a clean UI, enabling direct package creation."
                  : "مخصص لأكاديميات ومراكز الكورسات (برمجة، لغات، مهارات، باقات ساعات). يتم إخفاء سيكشن وخانات المواد الدراسية تلقائياً لتوفير واجهة خفيفة، وإنشاء الباقات والكورسات مباشرة بدون تعقيد."}
              </p>
            </div>
            <div className="pt-2 border-t border-border/40 text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>{isEn ? "Subjects Section:" : "سيكشن المواد:"} <strong className="text-red-500">{isEn ? "Hidden" : "مخفي"}</strong></span>
              <span>{isEn ? "Package Creation:" : "إنشاء الباقة:"} <strong className="text-emerald-600 dark:text-emerald-400">{isEn ? "Direct without subject" : "مباشر بدون مادة"}</strong></span>
            </div>
          </div>

          {/* Option 2: Academic Subjects */}
          <div
            onClick={() => handleModeChange("ACADEMIC")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              educationMode === "ACADEMIC"
                ? "border-primary bg-primary/5 shadow-xs"
                : "border-border/70 hover:border-primary/40 bg-card hover:bg-muted/30"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg border ${
                    educationMode === "ACADEMIC"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    <School className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {isEn ? "Academic Center & Subjects" : "سنتر دراسي ومواد تعليمية"}
                    </h4>
                    <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                      {isEn ? "(Academic & School Mode)" : "(نظام أكاديمي ومدرسي)"}
                    </span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  educationMode === "ACADEMIC"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                }`}>
                  {savingMode === "ACADEMIC" ? (
                    <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    educationMode === "ACADEMIC" && <Check className="w-3 h-3 stroke-[3]" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn
                  ? "Tailored for schools and tutoring centers. Activates subjects (physics, languages, etc.), binds packages to subjects, and manages teachers by subject."
                  : "مخصص للمدارس والسناتر ومراكز الدروس الخصوصية. يُفعّل سيكشن المواد الدراسية وخانات اختيار المواد في الباقات، وربط المدرسين بتخصصاتهم وأسعارهم."}
              </p>
            </div>
            <div className="pt-2 border-t border-border/40 text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>{isEn ? "Subjects Section:" : "سيكشن المواد:"} <strong className="text-emerald-600 dark:text-emerald-400">{isEn ? "Visible" : "مفعل وظاهر"}</strong></span>
              <span>{isEn ? "Package Creation:" : "إنشاء الباقة:"} <strong className="text-blue-600 dark:text-blue-400">{isEn ? "Bound to subject" : "ربط بالمادة إجباري"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Terminology Presets */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-primary" />
            {t("education.settingsTab.presetsTitle", isEn ? "One-Click Quick Terminology Presets" : "قوالب جاهزة بضغطة واحدة (تسميات سريعة للنشاط)")}
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {t("education.settingsTab.presetsSub", isEn ? "Pick a preset tailored to your institution to apply labels instantly" : "اختر قالباً يناسب طبيعة مركزك لتطبيق المسميات فوراً")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`group p-3.5 bg-card hover:bg-muted/40 border border-border/80 hover:border-primary/40 rounded-xl transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs ${isEn ? "text-left" : "text-right"}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {isEn ? (preset.nameEn || preset.name) : preset.name}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${preset.badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isEn ? (preset.descEn || preset.desc) : preset.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-primary font-medium">
                  <span>{isEn ? "Apply This Preset" : "تطبيق هذا القالب"}</span>
                  <ArrowRight className={`w-3 h-3 transition-transform ${isEn ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side (Controls): 8 cols */}
        <div className="lg:col-span-8 space-y-5">
          {/* Demo Day & Trial Sessions Feature Toggle */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Presentation className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      {isEn ? "Demo Day & Trial Sessions Section" : "سيكشن الديمو داي والفعاليات التجريبية"}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      enableDemoDay
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {enableDemoDay ? (isEn ? "Active" : "مفعل بالقائمة الجانبية") : (isEn ? "Hidden" : "معطل ومخفي")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    {isEn
                      ? "Enables a specialized section for scheduling open days and trial sessions. Attendees are captured as CRM Leads for sales follow-up and one-click conversion to enrolled students."
                      : "تفعيل قسم مخصص لإدارة الأيام التعريفية وحصص التجربة للطلاب الجدد. يتم تسجيل الحاضرين تلقائياً كعملاء محتملين (Leads) في الـ CRM لمتابعتهم وتحويلهم لاشتراكات بنقرة واحدة."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {savingDemoDay && (
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                <button
                  type="button"
                  onClick={() => handleToggleDemoDay(!enableDemoDay)}
                  disabled={saving || savingMode || savingDemoDay}
                  aria-label={isEn ? "Toggle Demo Day section" : "تبديل تفعيل سيكشن الديمو داي"}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    enableDemoDay ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                      enableDemoDay ? (isEn ? "translate-x-5" : "-translate-x-5") : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <PortalInviteAndPushCard
            companySlug={companySlug}
            publicCode={publicCode}
            customDomain={customDomain}
            pushFirstSaveWhatsApp={pushFirstSaveWhatsApp}
            onTogglePushFirst={handleTogglePushFirst}
            savingPushFirst={savingPushFirst}
            isEn={isEn}
          />

          {/* System Name Box */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <GraduationCap className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">
                {t("education.settingsTab.systemNameTitle", isEn ? "Main System Title (shown in sidebar and header)" : "المسمى الرئيسي للنظام (يظهر أعلى القائمة الجانبية والهيدر)")}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">
                  {isEn ? "Arabic Name" : "الاسم بالعربية"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={systemTitle}
                  onChange={(e) => setSystemTitle(e.target.value)}
                  placeholder={isEn ? "e.g. النظام التعليمي" : "مثال: النظام التعليمي أو أكاديمية التدريب"}
                  maxLength={60}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">
                  {isEn ? "English Name (Optional)" : "الاسم بالإنجليزية (اختياري)"}
                </label>
                <input
                  type="text"
                  value={systemTitleEn}
                  onChange={(e) => setSystemTitleEn(e.target.value)}
                  placeholder="e.g. Education System"
                  maxLength={60}
                  dir="ltr"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
            </div>
          </div>

          {/* Sections Management List */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">
                  {t("education.settingsTab.sectionsTitle", isEn ? "Customize, Reorder and Toggle System Sections" : "تخصيص وترتيب وإظهار سكاشن النظام والقائمة الجانبية")}
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {t("education.settingsTab.sectionsHint", isEn ? "Use ⬆ ⬇ arrows to reorder, or eye icon to toggle visibility" : "استخدم الأسهم ⬆ ⬇ لإعادة الترتيب أو أيقونة العين لإخفاء السكشن")}
              </span>
            </div>

            <div className="space-y-2.5">
              {tabs.map((tab, index) => {
                const Icon = ICON_MAP[tab.iconName] || GraduationCap;
                const isFirst = index === 0;
                const isLast = index === tabs.length - 1;
                const isCustomized =
                  tab.labelAr !== tab.defaultLabelAr || tab.labelEn !== tab.defaultLabelEn;

                return (
                  <div
                    key={tab.id}
                    className={`p-3 rounded-xl border transition-all ${
                      tab.visible
                        ? "bg-background border-border/70 hover:border-primary/40"
                        : "bg-muted/30 border-dashed border-border/50 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Reorder Controls + Icon + Default Info */}
                      <div className="flex items-center gap-2.5 min-w-0 sm:w-1/3">
                        {/* Up/Down buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveTab(index, "up")}
                            disabled={isFirst}
                            title={isEn ? "Move up" : "تحريك لأعلى"}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTab(index, "down")}
                            disabled={isLast}
                            title={isEn ? "Move down" : "تحريك لأسفل"}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Order Number Badge */}
                        <span className="w-5 text-center text-[10px] font-mono text-muted-foreground">
                          #{index + 1}
                        </span>

                        {/* Icon */}
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Default Label Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground truncate">
                              {isEn ? (tab.labelEn || tab.defaultLabelEn || tab.labelAr) : (tab.labelAr || tab.defaultLabelAr)}
                            </span>
                            {tab.locked && (
                              <Lock className="w-3 h-3 text-muted-foreground" title={isEn ? "Locked tab" : "تاب أساسي"} />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono block truncate">
                            {isEn ? `Default: ${tab.defaultLabelEn || tab.defaultLabelAr}` : `الأصل: ${tab.defaultLabelAr}`}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Arabic & English Label Editor */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                        <div>
                          <input
                            type="text"
                            value={tab.labelAr}
                            onChange={(e) => updateLabel(index, "ar", e.target.value)}
                            placeholder={tab.defaultLabelAr}
                            maxLength={60}
                            className="w-full bg-card border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={tab.labelEn}
                            onChange={(e) => updateLabel(index, "en", e.target.value)}
                            placeholder={tab.defaultLabelEn}
                            maxLength={60}
                            dir="ltr"
                            className="w-full bg-card border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                          />
                        </div>
                      </div>

                      {/* Right: Reset + Visibility Toggle */}
                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        {isCustomized && (
                          <button
                            type="button"
                            onClick={() => resetTabToDefault(index)}
                            title={isEn ? "Reset to default" : "استعادة الاسم الأصلي"}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleVisibility(index)}
                          title={tab.visible ? (isEn ? "Hide section" : "إخفاء هذا التاب") : (isEn ? "Show section" : "إظهار هذا التاب")}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            tab.visible
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                          }`}
                        >
                          {tab.visible ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{isEn ? "Visible" : "ظاهر"}</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{isEn ? "Hidden" : "مخفي"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side (Live Preview): 4 cols */}
        <div className="lg:col-span-4 sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-primary" />
              {t("education.settingsTab.previewTitle", isEn ? "Sidebar Real-time Preview" : "معاينة حية لشكل القائمة الجانبية")}
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Real-time Preview</span>
          </div>

          {/* Miniature AppSidebar Mockup */}
          <div
            className="w-full bg-[#0b1329] text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-sans select-none"
            dir={isEn ? "ltr" : "rtl"}
          >
            {/* Back to Apps header button */}
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors">
              <div className="flex items-center gap-2">
                <ArrowRight className={`w-4 h-4 text-slate-400 ${isEn ? "rotate-180" : ""}`} />
                <span className="font-semibold text-[11px]">{isEn ? "Back to Apps" : "الرجوع للتطبيقات"}</span>
              </div>
            </div>

            {/* App Sidebar Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate tracking-wide">
                  {isEn ? (systemTitleEn || systemTitle) : (systemTitle || "النظام التعليمي")}
                </h4>
                <span className="text-[10px] text-slate-400 block truncate font-mono">
                  {isEn ? systemTitle : (systemTitleEn || "Education System")}
                </span>
              </div>
            </div>

            {/* Page Explanations Pill */}
            <div className="px-4 py-2 border-b border-slate-800/50 flex items-center gap-2 text-slate-400 text-xs">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] font-medium">{isEn ? "Page Guide" : "شرح الصفحة"}</span>
            </div>

            {/* List of sidebar items */}
            <div className="p-2 space-y-1 max-h-[480px] overflow-y-auto no-scrollbar">
              {tabs
                .filter((t) => t.visible)
                .map((tab, idx) => {
                  const Icon = ICON_MAP[tab.iconName] || GraduationCap;
                  const isActive = idx === 0;

                  return (
                    <div
                      key={tab.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">{isEn ? (tab.labelEn || tab.defaultLabelEn || tab.labelAr) : (tab.labelAr || tab.defaultLabelAr)}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 tabular-nums">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Preview Footer note */}
            <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-800/80 text-[10px] text-slate-400 text-center">
              {isEn ? "This preview matches exactly what appears in your sidebar" : "هذه المعاينة تطابق تماماً ما يظهر في القائمة الجانبية لحسابك"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EducationSettingsTab;
