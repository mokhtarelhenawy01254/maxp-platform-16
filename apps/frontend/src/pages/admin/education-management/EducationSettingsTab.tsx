import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
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
} from "lucide-react";
import { api, fetchJson, getAuthHeaders } from "./api";
import { useSidebarSettings } from "../../../contexts/SidebarSettingsContext";

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
};

const PRESETS = [
  {
    id: "school",
    name: "مراكز تعليمية ومدارس",
    desc: "المعلمين، الطلاب، الحصص، والمواد الدراسية",
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
    desc: "المهندسين، المتدربين، الورش والمشاريع",
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
    desc: "المدربين، الدارسين، البرامج والكورسات",
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
    desc: "هيئة التدريس، الطلاب، والمقررات",
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
  const { refreshSettings } = useSidebarSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemTitle, setSystemTitle] = useState("النظام التعليمي");
  const [systemTitleEn, setSystemTitleEn] = useState("Education System");
  const [tabs, setTabs] = useState<EducationTabConfig[]>([]);
  const [initialData, setInitialData] = useState<EducationSettingsData | null>(null);

  // Load existing settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(api("settings"));
      if (data) {
        setSystemTitle(data.systemTitle || "النظام التعليمي");
        setSystemTitleEn(data.systemTitleEn || "Education System");
        setTabs(data.tabs || []);
        setInitialData(data);
      }
    } catch (err: any) {
      toast.error(err.message || "تعذر جلب إعدادات النظام التعليمي");
    } finally {
      setLoading(false);
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
    toast.success(`تم تطبيق قالب "${preset.name}" — اضغط حفظ لتطبيق التغييرات`);
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
            toast.info("هذا التاب أساسي لا يمكن إخفاؤه لضمان الوصول للإعدادات");
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
    toast.info("تمت استعادة الاسم الافتراضي لهذا العنصر");
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
    toast.info("تمت استعادة كافة المسميات والتابات الافتراضية");
  };

  // Save to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        systemTitle: systemTitle.trim(),
        systemTitleEn: systemTitleEn.trim(),
        tabs: tabs.map((t, idx) => ({
          id: t.id,
          key: t.key,
          labelAr: t.labelAr.trim() || t.defaultLabelAr,
          labelEn: t.labelEn.trim() || t.defaultLabelEn,
          order: idx,
          visible: t.locked ? true : t.visible,
        })),
      };

      const res = await fetchJson(api("settings"), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      toast.success("تم حفظ إعدادات النظام التعليمي وتحديث القائمة الجانبية بنجاح");

      if (refreshSettings) {
        refreshSettings();
      }

      if (onSaved) {
        onSaved({
          systemTitle: payload.systemTitle,
          systemTitleEn: payload.systemTitleEn,
          tabs: tabs.map((t, idx) => ({
            ...t,
            order: idx,
          })),
        });
      }
    } catch (err: any) {
      toast.error(err.message || "فشل حفظ إعدادات النظام التعليمي");
    } finally {
      setSaving(false);
    }
  };

  const visibleCount = useMemo(() => tabs.filter((t) => t.visible).length, [tabs]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل إعدادات النظام التعليمي...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Settings className="w-3.5 h-3.5" />
              تخصيص الواجهة والسكاشن
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {visibleCount} من {tabs.length} سكاشن ظاهرة
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            إعدادات مسميات وسكاشن النظام التعليمي
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            تحكم بحرية كاملة في الاسم الرئيسي للنظام وتخصيص أسماء السكاشن والقوائم الجانبية (مثل تغيير سكشن "المهندسين" إلى "المعلمين" أو "المدربين" أو "المحاضرين") وترتيبها وإظهارها أو إخفائها.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={resetAllToDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl border border-border/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            استعادة الافتراضي
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
            حفظ التعديلات
          </button>
        </div>
      </div>

      {/* Quick Terminology Presets */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-primary" />
            قوالب جاهزة بضغطة واحدة (تسميات سريعة للنشاط)
          </h3>
          <span className="text-[11px] text-muted-foreground">
            اختر قالباً يناسب طبيعة مركزك لتطبيق المسميات فوراً
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
                className="group p-3.5 bg-card hover:bg-muted/40 border border-border/80 hover:border-primary/40 rounded-xl text-right transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {preset.name}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${preset.badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {preset.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-primary font-medium">
                  <span>تطبيق هذا القالب</span>
                  <ArrowRight className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
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
          {/* System Name Box */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <GraduationCap className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">
                المسمى الرئيسي للنظام (يظهر أعلى القائمة الجانبية والهيدر)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">
                  الاسم بالعربية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={systemTitle}
                  onChange={(e) => setSystemTitle(e.target.value)}
                  placeholder="مثال: النظام التعليمي أو أكاديمية التدريب"
                  maxLength={60}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">
                  الاسم بالإنجليزية (اختياري)
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
                  تخصيص وترتيب وإظهار سكاشن النظام والقائمة الجانبية
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                استخدم الأسهم ⬆ ⬇ لإعادة الترتيب أو أيقونة العين لإخفاء السكشن
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
                            title="تحريك لأعلى"
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTab(index, "down")}
                            disabled={isLast}
                            title="تحريك لأسفل"
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
                              {tab.labelAr || tab.defaultLabelAr}
                            </span>
                            {tab.locked && (
                              <Lock className="w-3 h-3 text-muted-foreground" title="تاب أساسي" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono block truncate">
                            الأصل: {tab.defaultLabelAr}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Arabic Label Editor */}
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
                            title="استعادة الاسم الأصلي"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleVisibility(index)}
                          title={tab.visible ? "إخفاء هذا التاب" : "إظهار هذا التاب"}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            tab.visible
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                          }`}
                        >
                          {tab.visible ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">ظاهر</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">مخفي</span>
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
              معاينة حية لشكل القائمة الجانبية
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Real-time Preview</span>
          </div>

          {/* Miniature AppSidebar Mockup matching user screenshot */}
          <div
            className="w-full bg-[#0b1329] text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-sans select-none"
            dir="rtl"
          >
            {/* Back to Apps header button */}
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-[11px]">الرجوع للتطبيقات</span>
              </div>
            </div>

            {/* App Sidebar Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate tracking-wide">
                  {systemTitle || "النظام التعليمي"}
                </h4>
                <span className="text-[10px] text-slate-400 block truncate font-mono">
                  {systemTitleEn || "Education System"}
                </span>
              </div>
            </div>

            {/* Page Explanations Pill */}
            <div className="px-4 py-2 border-b border-slate-800/50 flex items-center gap-2 text-slate-400 text-xs">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] font-medium">شرح الصفحة</span>
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
                        <span className="truncate">{tab.labelAr || tab.defaultLabelAr}</span>
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
              هذه المعاينة تطابق تماماً ما يظهر في القائمة الجانبية لحسابك
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EducationSettingsTab;
