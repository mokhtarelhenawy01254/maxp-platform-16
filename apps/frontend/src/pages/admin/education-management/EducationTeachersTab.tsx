import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Phone,
  BookOpen,
  Power,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  MessageCircle,
  Users,
  GraduationCap,
  Sparkles,
  Filter,
  X,
} from "lucide-react";
import type { EducationTeacher, EducationSubject } from "./types";
import { TeacherModal } from "./TeacherModal";

export interface EducationTeachersTabProps {
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  enableSubjects?: boolean;
  teacherSearch: string;
  setTeacherSearch: (q: string) => void;
  teacherModal: Partial<EducationTeacher> | null | undefined;
  setTeacherModal: (t: Partial<EducationTeacher> | null | undefined) => void;
  handleSaveTeacher: (d: Partial<EducationTeacher>) => Promise<void>;
  handleToggleTeacher: (id: string, current: boolean) => Promise<void>;
  handleDeleteTeacher: (id: string) => Promise<void>;
}

export const EducationTeachersTab: React.FC<EducationTeachersTabProps> = ({
  teachers = [],
  subjects = [],
  enableSubjects = false,
  teacherSearch,
  setTeacherSearch,
  teacherModal,
  setTeacherModal,
  handleSaveTeacher,
  handleToggleTeacher,
  handleDeleteTeacher,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const q = teacherSearch.toLowerCase().trim();

  const filtered = teachers.filter((t) => {
    const matchesSearch =
      !q ||
      (t.name || "").toLowerCase().includes(q) ||
      (t.phone || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      (t.qualifications || "").toLowerCase().includes(q) ||
      (t.subjectRates || []).some((sr) =>
        (sr.subject?.name || "").toLowerCase().includes(q)
      );

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? t.isActive
        : !t.isActive;

    const matchesSubject =
      subjectFilter === "all"
        ? true
        : (t.subjectRates || []).some((sr) => sr.subjectId === subjectFilter);

    return matchesSearch && matchesStatus && matchesSubject;
  });

  const totalCount = teachers.length;
  const activeCount = teachers.filter((t) => t.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const withRatesCount = teachers.filter(
    (t) => t.subjectRates && t.subjectRates.length > 0
  ).length;

  const getInitials = (name: string) => {
    if (!name) return isEn ? "I" : "م";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleCopyPhone = (id: string, phone: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator?.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(phone)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
      })
      .catch(() => {});
  };

  const cleanPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return "";
    let p = phone.replace(/[^\d+]/g, "");
    if (p.startsWith("00")) p = p.slice(2);
    else if (p.startsWith("0")) p = "20" + p.slice(1);
    else if (!p.startsWith("+") && !p.startsWith("20") && p.length === 10) {
      p = "20" + p;
    }
    return p.replace(/^\+/, "");
  };

  return (
    <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
      {/* Quick Stats Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              {isEn ? "Total Staff" : "إجمالي الكوادر"}
            </div>
            <div className="text-base font-bold text-foreground font-mono tabular-nums">
              {totalCount}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              {isEn ? "Active" : "الكوادر النشطة"}
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {activeCount}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              {isEn ? "Inactive" : "معطل / متوقف"}
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {inactiveCount}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              {isEn ? "With Rates" : "محدد لهم أسعار"}
            </div>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              {withRatesCount}
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search & Filters */}
      <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 space-y-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground pointer-events-none" />
            <input
              className="bg-background border border-input rounded-lg pr-9 pl-8 py-2 text-xs text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/70"
              placeholder={
                isEn
                  ? "Search by name, phone, qualifications or subject..."
                  : "بحث بالاسم، رقم الهاتف، المؤهل، أو المادة..."
              }
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
            />
            {teacherSearch && (
              <button
                type="button"
                onClick={() => setTeacherSearch("")}
                className={`absolute ${isEn ? "right-2.5" : "left-2.5"} top-2.5 text-muted-foreground hover:text-foreground`}
                title={isEn ? "Clear search" : "مسح البحث"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills & Add button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isEn ? "All" : "الكل"} ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === "active"
                    ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isEn ? "Active" : "النشطين"} ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === "inactive"
                    ? "bg-background text-rose-600 dark:text-rose-400 shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isEn ? "Inactive" : "المعطلين"} ({inactiveCount})
              </button>
            </div>

            {/* Subject Filter Dropdown */}
            {enableSubjects && subjects && subjects.length > 0 && (
              <div className="relative">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="bg-background border border-input rounded-lg pr-3 pl-8 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="all">{isEn ? "All Subjects" : "جميع المواد"}</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Filter className="w-3 h-3 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              </div>
            )}

            {/* Add Instructor Button */}
            <button
              type="button"
              onClick={() => setTeacherModal({})}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {isEn ? "Add Instructor" : "إضافة مهندس"}
            </button>
          </div>
        </div>

        {/* Active Filters Summary if filtered */}
        {(teacherSearch || statusFilter !== "all" || subjectFilter !== "all") && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <span>
              {isEn
                ? `Showing ${filtered.length} of ${totalCount} instructors`
                : `تم العثور على ${filtered.length} من أصل ${totalCount} مهندس`}
            </span>
            {(teacherSearch || statusFilter !== "all" || subjectFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setTeacherSearch("");
                  setStatusFilter("all");
                  setSubjectFilter("all");
                }}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {isEn ? "Clear filters" : "إعادة ضبط التصفية"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Compact List View (صفوف أفقية مضغوطة ومنظمة) */}
      <div className="space-y-2">
        {filtered.map((t) => {
          const displayName = t.name || (isEn ? "Unnamed Instructor" : "مهندس بدون اسم");
          const waPhone = cleanPhoneForWhatsApp(t.phone);
          const hasRates = t.subjectRates && t.subjectRates.length > 0;

          return (
            <div
              key={t.id}
              className={`bg-card border border-border/70 rounded-xl p-3 sm:px-4 sm:py-3 shadow-2xs hover:border-primary/40 hover:bg-muted/10 transition-all ${
                !t.isActive ? "opacity-65 bg-muted/20" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Section 1: Teacher Identity & Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Avatar / Initials with Status Dot */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                      {getInitials(displayName)}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        t.isActive ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      title={t.isActive ? (isEn ? "Active" : "نشط") : (isEn ? "Inactive" : "معطل")}
                    />
                  </div>

                  {/* Name, Phone, and Qualifications */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/admin/education/teacher/${t.id}`}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate"
                      >
                        {displayName}
                      </Link>
                      <span
                        className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-medium border ${
                          t.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {t.isActive
                          ? (isEn ? "Active" : "نشط")
                          : (isEn ? "Inactive" : "معطل")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {t.phone ? (
                        <div className="flex items-center gap-1 font-mono tabular-nums">
                          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                          <a
                            href={`tel:${t.phone}`}
                            className="hover:text-primary transition-colors hover:underline"
                            dir="ltr"
                          >
                            {t.phone}
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(t.id, t.phone!, e)}
                            className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                            title={isEn ? "Copy phone" : "نسخ الرقم"}
                          >
                            {copiedId === t.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/70">
                          {isEn ? "No phone" : "بدون هاتف"}
                        </span>
                      )}

                      {t.qualifications && (
                        <span className={`text-[11px] text-muted-foreground truncate max-w-[200px] ${isEn ? "border-l pl-2" : "border-r pr-2"} border-border/60`}>
                          {t.qualifications}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Subjects & Hourly Rates */}
                {enableSubjects && (
                  <div className="lg:w-1/3 flex flex-wrap items-center gap-1.5 min-w-0">
                    {hasRates ? (
                      t.subjectRates!.map((sr) => (
                        <span
                          key={sr.id}
                          className="inline-flex items-center gap-1 text-[11px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-md font-mono tabular-nums"
                        >
                          <BookOpen className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                          <span className="font-sans font-medium">
                            {sr.subject?.name || (isEn ? "Subject" : "مادة")}:
                          </span>
                          <span>{sr.hourlyRate} {isEn ? "EGP/h" : "ج.م/س"}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground/70 italic flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-muted-foreground/50" />
                        {isEn ? "No rates specified" : "لا توجد أسعار محددة"}
                      </span>
                    )}
                  </div>
                )}

                {/* Section 3: Compact Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center border-t lg:border-t-0 border-border/50 pt-2 lg:pt-0 w-full lg:w-auto justify-end">
                  {/* WhatsApp Quick Action if valid phone exists */}
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                      title={isEn ? "Message on WhatsApp" : "مراسلة واتساب"}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* View Details Profile */}
                  <Link
                    to={`/admin/education/teacher/${t.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-muted/70 hover:bg-muted text-foreground text-xs rounded-lg transition-colors font-medium border border-border/60"
                    title={isEn ? "View profile details" : "عرض الملف والتفاصيل"}
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? "View" : "عرض"}</span>
                  </Link>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => setTeacherModal(t)}
                    className="p-1.5 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-lg transition-colors border border-border/60"
                    title={isEn ? "Edit Details" : "تعديل البيانات"}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle Active / Inactive */}
                  <button
                    type="button"
                    onClick={() => handleToggleTeacher(t.id, t.isActive)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                      t.isActive
                        ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                    }`}
                    title={t.isActive ? (isEn ? "Deactivate Instructor" : "تعطيل المهندس") : (isEn ? "Activate Instructor" : "تفعيل المهندس")}
                  >
                    <Power className="w-3 h-3" />
                    <span>{t.isActive ? (isEn ? "Deactivate" : "تعطيل") : (isEn ? "Activate" : "تفعيل")}</span>
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTeacher(t.id)}
                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title={isEn ? "Delete Instructor" : "حذف المهندس"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="bg-card border border-border/80 rounded-xl p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground">
                {teacherSearch || statusFilter !== "all" || subjectFilter !== "all"
                  ? isEn
                    ? "No instructors match your search"
                    : "لا يوجد مهندسين مطابقين لمعايير البحث"
                  : isEn
                  ? "No registered instructors yet"
                  : "لا يوجد مهندسين مسجلين حتى الآن"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {teacherSearch || statusFilter !== "all" || subjectFilter !== "all"
                  ? isEn
                    ? "Try clearing your filters or searching with different keywords."
                    : "جرّب تغيير كلمات البحث أو إلغاء التصفية لإظهار كافة النتائج."
                  : isEn
                  ? "Click the button below to add your first instructor."
                  : "اضغط على الزر أدناه لإضافة أول مهندس في النظام التعليمي."}
              </p>
            </div>
            {teacherSearch || statusFilter !== "all" || subjectFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setTeacherSearch("");
                  setStatusFilter("all");
                  setSubjectFilter("all");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs rounded-lg transition-colors font-medium"
              >
                <X className="w-3.5 h-3.5" />
                {isEn ? "Reset filters" : "إلغاء التصفية"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTeacherModal({})}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isEn ? "Add Instructor" : "إضافة مهندس"}
              </button>
            )}
          </div>
        )}
      </div>

      {teacherModal !== null && teacherModal !== undefined && (
        <TeacherModal
          teacher={teacherModal}
          subjects={subjects}
          enableSubjects={enableSubjects}
          onClose={() => setTeacherModal(undefined)}
          onSave={handleSaveTeacher}
        />
      )}
    </div>
  );
};
