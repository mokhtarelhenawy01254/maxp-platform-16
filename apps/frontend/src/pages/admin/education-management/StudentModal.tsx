import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, User, Loader2, Mail, Lock, BookOpen, Plus, Check, Phone, MapPin, Hash } from "lucide-react";
import type { EducationStudent, Customer, EducationSubject } from "./types";
import { MODAL_CLS, INPUT_CLS } from "./types";

export interface StudentModalProps {
  student?: Partial<EducationStudent> | null;
  subjects?: EducationSubject[];
  customers: Customer[];
  customerResults: Customer[];
  onCustomerSearch: (q: string) => void;
  onClose: () => void;
  onSave: (d: Partial<EducationStudent>) => Promise<void>;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  student,
  subjects = [],
  customers,
  customerResults,
  onCustomerSearch,
  onClose,
  onSave,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    grade: "",
    notes: "",
    customerId: "",
    ...student,
    code: (student as any)?.code || "",
    phone2: (student as any)?.phone2 || "",
    address: (student as any)?.address || "",
    gender: student?.gender
      ? String(student.gender).toUpperCase() === "FEMALE"
        ? "FEMALE"
        : "MALE"
      : "MALE",
  });

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(() => {
    if (!student?.subjects) return [];
    if (Array.isArray(student.subjects)) {
      return student.subjects
        .map((s: any) => (typeof s === "string" ? s : s?.id || s?.name))
        .filter(Boolean);
    }
    return [];
  });

  const initialCustomer =
    student?.customer ||
    customers.find((c) => c.id === (student?.customerId || form.customerId)) ||
    null;

  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    phone2?: string;
  } | null>(initialCustomer);

  const [customerSearch, setCustomerSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSelfGuardian, setIsSelfGuardian] = useState(false);
  const [isManualGuardian, setIsManualGuardian] = useState(false);
  const [manualGuardian, setManualGuardian] = useState({
    name: "",
    phone: "",
    phone2: "",
  });
  const [guardianPhone2, setGuardianPhone2] = useState<string>(
    (student?.customer && (student.customer as any).phone2) ||
    (initialCustomer && (initialCustomer as any).phone2) ||
    ""
  );
  const [guardianEmail, setGuardianEmail] = useState(
    student?.customer?.email ||
    (initialCustomer && "email" in initialCustomer ? (initialCustomer as any).email : "") ||
    ""
  );
  const [guardianPassword, setGuardianPassword] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce customer search when typing (single source of search trigger)
  useEffect(() => {
    const query = customerSearch.trim();
    if (query.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      onCustomerSearch(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearch, onCustomerSearch]);

  const handleSelectCustomer = (c: Customer) => {
    setForm((prev) => ({ ...prev, customerId: c.id }));
    setSelectedCustomer(c);
    if (c.email) setGuardianEmail(c.email);
    if (c.phone2) setGuardianPhone2(c.phone2);
    setCustomerSearch("");
    setShowResults(false);
  };

  const handleClearCustomer = () => {
    setForm((prev) => ({ ...prev, customerId: "" }));
    setSelectedCustomer(null);
    setGuardianPhone2("");
    setCustomerSearch("");
    setShowResults(false);
  };

  const hasGuardian =
    !!form.customerId ||
    (isSelfGuardian && !!form.phone.trim()) ||
    (isManualGuardian && !!manualGuardian.name.trim() && !!manualGuardian.phone.trim());

  const toggleSubject = (subId: string, subName?: string) => {
    const isSelected =
      selectedSubjectIds.includes(subId) ||
      (subName ? selectedSubjectIds.includes(subName) : false);

    if (isSelected) {
      setSelectedSubjectIds(
        selectedSubjectIds.filter((id) => id !== subId && id !== subName)
      );
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subId]);
    }
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || saving) return;
    if (!hasGuardian) {
      alert(t("education.students.guardianAlert", isEn ? "Select an existing guardian, or enter a new guardian, or enable 'Student is their own guardian'." : "اختر ولي أمر موجود، أو اضغط «إدخال ولي أمر جديد» واكتب اسمه ورقمه — أو فعّل «أنا ولي الأمر»."));
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        code: form.code ? form.code.trim() : "",
        firstName: form.firstName.trim(),
        lastName: form.lastName ? form.lastName.trim() : "",
        phone: form.phone ? form.phone.trim() : "",
        phone2: form.phone2 ? form.phone2.trim() : "",
        address: form.address ? form.address.trim() : "",
        gender: form.gender ? (String(form.gender).toUpperCase() === "FEMALE" ? "FEMALE" : "MALE") : "MALE",
        subjects: selectedSubjectIds,
        ...(guardianEmail.trim() ? { guardianEmail: guardianEmail.trim() } : {}),
        ...(guardianPassword.trim() ? { guardianPassword: guardianPassword.trim() } : {}),
        ...(guardianPhone2.trim() ? { guardianPhone2: guardianPhone2.trim() } : {}),
      };
      if (isSelfGuardian) {
        payload.isSelfGuardian = true;
        payload.customerId = "";
        payload.guardianPhone2 = form.phone2 ? form.phone2.trim() : "";
      } else if (isManualGuardian && manualGuardian.name.trim()) {
        payload.guardianName = manualGuardian.name.trim();
        payload.guardianPhone = manualGuardian.phone.trim();
        payload.guardianPhone2 = manualGuardian.phone2 ? manualGuardian.phone2.trim() : "";
        payload.customerId = "";
      }
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"}
        onClick={(e) => e.stopPropagation()}
        dir={isEn ? "ltr" : "rtl"}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">
            {student?.id
              ? t("education.students.modalTitleEdit", isEn ? "Edit Student Details" : "تعديل بيانات الطالب")
              : t("education.students.modalTitleNew", isEn ? "Add New Student" : "إضافة طالب جديد")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {/* Student Code Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>{t("education.students.code", isEn ? "Student Code" : "كود الطالب")}</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-normal">
                  {student?.id
                    ? t("education.students.codeUnique", isEn ? "Unique student identifier" : "معرف فريد للطالب")
                    : t("education.students.codeOptional", isEn ? "Optional — auto-generated if blank" : "اختياري — سيتم إنشاؤه تلقائياً إذا تُرك فارغاً")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const rnd = Math.floor(1000 + Math.random() * 9000);
                    setForm((prev) => ({ ...prev, code: `STU-${rnd}` }));
                  }}
                  className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                >
                  {t("education.students.autoCode", isEn ? "Auto Generate" : "توليد تلقائي")}
                </button>
              </div>
            </div>
            <input
              className={INPUT_CLS + " font-mono tracking-wide"}
              value={form.code || ""}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. STU-1001"
              dir="ltr"
            />
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("education.students.firstName", isEn ? "First Name" : "الاسم الأول")} *
              </label>
              <input
                className={INPUT_CLS}
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                placeholder={isEn ? "e.g. Adam" : "مثال: سفيان"}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("education.students.lastName", isEn ? "Last Name" : "الاسم الأخير")}
              </label>
              <input
                className={INPUT_CLS}
                value={form.lastName || ""}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
                placeholder={isEn ? "e.g. Ahmed" : "مثال: أحمد"}
              />
            </div>
          </div>

          {/* Student Phones: Primary & Secondary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>{t("education.students.phone", isEn ? "Student Primary Phone" : "هاتف الطالب (الأساسي)")}</span>
                <span className="text-[10px] text-muted-foreground font-normal">{isEn ? "Primary" : "أساسي"}</span>
              </label>
              <input
                className={INPUT_CLS}
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>{t("education.students.phone2", isEn ? "Secondary Phone Number" : "رقم هاتف إضافي للطالب")}</span>
                <span className="text-[10px] text-primary/80 font-normal">{t("education.students.addressOptional", isEn ? "Optional" : "اختياري")}</span>
              </label>
              <input
                className={INPUT_CLS}
                value={form.phone2 || ""}
                onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                placeholder={isEn ? "Alternate phone / WhatsApp" : "رقم بديل / واتساب إضافي"}
                dir="ltr"
              />
            </div>
          </div>

          {/* Gender & Grade */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("education.students.gender", isEn ? "Gender" : "الجنس")}
              </label>
              <select
                className={INPUT_CLS}
                value={form.gender || "MALE"}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="MALE">{t("education.students.male", isEn ? "Male" : "ذكر")}</option>
                <option value="FEMALE">{t("education.students.female", isEn ? "Female" : "أنثى")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("education.students.grade", isEn ? "Grade / Level" : "المرحلة / الصف")}
              </label>
              <input
                className={INPUT_CLS}
                value={form.grade || ""}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                placeholder={t("education.students.gradePlaceholder", isEn ? "e.g. Grade 7 / Middle School" : "مثال: الصف الأول الإعدادي")}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{t("education.students.address", isEn ? "Address / Residence" : "العنوان / السكن")}</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">{t("education.students.addressOptional", isEn ? "Optional" : "اختياري")}</span>
            </label>
            <input
              className={INPUT_CLS}
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={t("education.students.addressPlaceholder", isEn ? "e.g. Cairo - Maadi or current residence address..." : "مثال: القاهرة - المعادي - شارع 9 أو عنوان السكن الحالي...")}
            />
          </div>

          {/* Subjects Section: المواد المتاحة لدينا */}
          <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-muted/15">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>{t("education.students.subjectsTitle", isEn ? "Academic Subjects (Available Subjects)" : "المواد الدراسية (المواد المتاحة لدينا)")}</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {selectedSubjectIds.length > 0
                  ? t("education.students.subjectsCount", { count: selectedSubjectIds.length, defaultValue: isEn ? `${selectedSubjectIds.length} subjects selected` : `${selectedSubjectIds.length} مادة مختارة` })
                  : t("education.students.noSubjectsSelected", isEn ? "No subjects selected" : "لم يتم تحديد مواد")}
              </span>
            </div>

            {subjects && subjects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {subjects.map((sub) => {
                  const isSelected =
                    selectedSubjectIds.includes(sub.id) ||
                    selectedSubjectIds.includes(sub.name);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleSubject(sub.id, sub.name)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary"
                          : "bg-background border border-border/80 text-foreground hover:bg-muted/60 hover:border-primary/40"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      ) : (
                        <Plus className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground py-1">
                {t("education.students.noSubjectsAvailable", isEn ? "No subjects registered in the system yet. You can add them from the 'Subjects' tab." : "لا توجد مواد مسجلة حالياً في النظام. يمكنك إضافتها من تبويب «المواد».")}
              </div>
            )}
          </div>

          {/* Guardian / Parent Section */}
          <div className="space-y-2" ref={searchContainerRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                {t("education.students.guardianTitle", isEn ? "Guardian (Customer) *" : "ولي الأمر (العميل) *")}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  className="rounded text-primary focus:ring-primary"
                  checked={isSelfGuardian}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsSelfGuardian(checked);
                    if (checked) {
                      setIsManualGuardian(false);
                      handleClearCustomer();
                    }
                  }}
                />
                <span>{t("education.students.selfGuardianCheck", isEn ? "Student is their own guardian (Adult/Direct)" : "الطالب هو ولي أمر نفسه (بالغ/مباشر)")}</span>
              </label>
            </div>

            {isSelfGuardian ? (
              <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${form.phone?.trim() ? "border-primary/30 bg-primary/5 text-primary" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                <User className="w-4 h-4 shrink-0" />
                <span>{t("education.students.selfGuardianNotice", isEn ? "Student will be automatically registered as their own guardian with their phone numbers." : "سيتم تسجيل الطالب كولي أمر نفسه تلقائياً بأرقام هواتفه (الأساسي والإضافي).")}</span>
              </div>
            ) : selectedCustomer ? (
              <div className="p-2.5 rounded-lg border border-primary/40 bg-primary/5 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {selectedCustomer.firstName} {selectedCustomer.lastName || ""}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
                        {selectedCustomer.phone && <span>{t("education.students.guardianPhone", isEn ? "Phone:" : "الهاتف:")} {selectedCustomer.phone}</span>}
                        {((selectedCustomer as any).phone2 || guardianPhone2) && (
                          <span className="text-primary font-medium">| {isEn ? "Secondary:" : "إضافي:"} {(selectedCustomer as any).phone2 || guardianPhone2}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    title={t("education.students.changeGuardian", isEn ? "Change Guardian" : "تغيير ولي الأمر")}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t("education.students.changeGuardian", isEn ? "Change" : "تغيير")}</span>
                  </button>
                </div>

                {/* Option for additional phone for selected guardian */}
                <div className="pt-2 border-t border-border/40 flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {t("education.students.additionalGuardianPhone", isEn ? "Additional phone for guardian:" : "رقم هاتف إضافي لولي الأمر:")}
                  </label>
                  <input
                    type="text"
                    className={INPUT_CLS + " py-1 text-xs"}
                    placeholder={isEn ? "Alternate phone number" : "رقم بديل / هاتف إضافي لولي الأمر"}
                    value={guardianPhone2}
                    onChange={(e) => setGuardianPhone2(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
            ) : isManualGuardian ? (
              <div className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{t("education.students.manualGuardianTitle", isEn ? "Enter New Guardian:" : "إدخال ولي أمر جديد:")}</span>
                  <button
                    type="button"
                    onClick={() => setIsManualGuardian(false)}
                    className="text-muted-foreground hover:text-foreground text-[11px]"
                  >
                    {t("education.students.backToSearch", isEn ? "Back to Search" : "العودة للبحث")}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    className={INPUT_CLS}
                    placeholder={t("education.students.manualGuardianName", isEn ? "Guardian Name *" : "اسم ولي الأمر *")}
                    value={manualGuardian.name}
                    onChange={(e) => setManualGuardian({ ...manualGuardian, name: e.target.value })}
                  />
                  <input
                    className={INPUT_CLS}
                    placeholder={t("education.students.manualGuardianPhone", isEn ? "Guardian Phone *" : "هاتف ولي الأمر *")}
                    value={manualGuardian.phone}
                    onChange={(e) => setManualGuardian({ ...manualGuardian, phone: e.target.value })}
                    dir="ltr"
                  />
                  <input
                    className={INPUT_CLS}
                    placeholder={t("education.students.manualGuardianPhone2", isEn ? "Guardian Secondary Phone" : "هاتف إضافي لولي الأمر")}
                    value={manualGuardian.phone2}
                    onChange={(e) => setManualGuardian({ ...manualGuardian, phone2: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            ) : (
              <div className="relative space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    className={INPUT_CLS + (isEn ? " pl-9 pr-8" : " pr-9 pl-8")}
                    placeholder={t("education.students.searchGuardianPlaceholder", isEn ? "Search guardian by name or phone..." : "ابحث عن ولي أمر بالاسم أو الهاتف...")}
                    value={customerSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerSearch(val);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                  />
                  <Search className={`w-3.5 h-3.5 absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none`} />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch("");
                        setShowResults(false);
                      }}
                      className={`absolute ${isEn ? "right-2.5" : "left-2.5"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setManualGuardian({ name: customerSearch, phone: "", phone2: "" });
                      setIsManualGuardian(true);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    {t("education.students.addManualGuardian", isEn ? "+ Enter new guardian manually" : "+ إدخال ولي أمر جديد يدوياً")}
                  </button>
                </div>

                {showResults && customerSearch.trim().length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-border/60">
                    {customerSearch.trim().length < 2 ? (
                      <div className="px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                        {t("education.students.minSearchChars", isEn ? "Type 2 or more characters to search..." : "اكتب حرفين أو أكثر للبحث...")}
                      </div>
                    ) : customerResults.length > 0 ? (
                      customerResults.map((c) => (
                        <div
                          key={c.id}
                          className="px-3 py-2.5 hover:bg-muted/60 cursor-pointer text-xs flex items-center justify-between transition-colors"
                          onClick={() => handleSelectCustomer(c)}
                        >
                          <div>
                            <span className="font-semibold text-foreground">
                              {c.firstName} {c.lastName || ""}
                            </span>
                            {c.phone && (
                              <span className={`text-muted-foreground ${isEn ? "ml-2" : "mr-2"} font-mono text-[11px]`}>
                                ({c.phone}{c.phone2 ? ` / ${c.phone2}` : ""})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-primary font-medium">
                            {t("education.students.selectGuardian", isEn ? "Select" : "اختيار")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-center text-xs space-y-1.5">
                        <p className="text-muted-foreground">{t("education.students.noGuardianMatch", { query: customerSearch, defaultValue: isEn ? `No guardian found matching "${customerSearch}"` : `لا يوجد ولي أمر مطابق للبحث "${customerSearch}"` })}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setManualGuardian({ name: customerSearch, phone: "", phone2: "" });
                            setIsManualGuardian(true);
                            setShowResults(false);
                          }}
                          className="text-xs text-primary font-semibold hover:underline block mx-auto"
                        >
                          {t("education.students.addNewGuardianWithQuery", { query: customerSearch, defaultValue: isEn ? `+ Add "${customerSearch}" as new guardian` : `+ إضافة "${customerSearch}" كولي أمر جديد` })}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t("education.students.notes", isEn ? "Notes" : "ملاحظات")}
            </label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t("education.students.notesPlaceholder", isEn ? "Any additional notes about the student..." : "أي ملاحظات إضافية عن الطالب...")}
            />
          </div>

          {/* Parent Portal Access Section */}
          <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>{t("education.students.parentPortalTitle", isEn ? "Parent Portal Login Credentials (/parent)" : "بيانات دخول بوابة ولي الأمر (/parent)")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  {t("education.students.parentEmail", isEn ? "Email Address (Username)" : "البريد الإلكتروني (اسم المستخدم)")}
                </label>
                <input
                  type="email"
                  className={INPUT_CLS}
                  placeholder="parent@example.com"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  {student?.id
                    ? t("education.students.parentPasswordEdit", isEn ? "New Password (optional)" : "كلمة المرور الجديدة (اختياري)")
                    : t("education.students.parentPassword", isEn ? "Password for Parent Portal" : "كلمة المرور لبوابة ولي الأمر")}
                </label>
                <input
                  type="password"
                  className={INPUT_CLS}
                  placeholder="••••••••"
                  value={guardianPassword}
                  onChange={(e) => setGuardianPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t("education.students.parentPortalHelp", isEn ? "These credentials allow the guardian to log in directly via /parent/login to monitor sessions and hours." : "تُستخدم هذه البيانات ليسجل ولي الأمر الدخول مباشرة عبر الرابط /parent/login لمتابعة حصص وساعات أبنائه.")}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80"
          >
            {t("education.actions.cancel", isEn ? "Cancel" : "إلغاء")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!form.firstName.trim() || saving || !hasGuardian}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{saving ? t("education.actions.saving", isEn ? "Saving..." : "جارٍ الحفظ...") : t("education.actions.save", isEn ? "Save" : "حفظ")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
