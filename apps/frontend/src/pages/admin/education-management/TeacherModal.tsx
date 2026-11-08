import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { EducationTeacher, EducationSubject } from "./types";
import { MODAL_CLS, INPUT_CLS } from "./types";

export interface TeacherModalProps {
  teacher?: Partial<EducationTeacher> | null;
  subjects: EducationSubject[];
  onClose: () => void;
  onSave: (d: Partial<EducationTeacher>) => Promise<void>;
}

export const TeacherModal: React.FC<TeacherModalProps> = ({
  teacher,
  subjects,
  onClose,
  onSave,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [name, setName] = useState(teacher?.name || "");
  const [phone, setPhone] = useState(teacher?.phone || "");
  const [email, setEmail] = useState(teacher?.email || "");
  const [bio, setBio] = useState(teacher?.bio || "");
  const [qualifications, setQualifications] = useState(
    teacher?.qualifications || ""
  );
  const [password, setPassword] = useState("");
  const [subjectRates, setSubjectRates] = useState<
    { subjectId: string; hourlyRate: number }[]
  >(
    teacher?.subjectRates?.map((sr) => ({
      subjectId: sr.subjectId,
      hourlyRate: sr.hourlyRate,
    })) || []
  );

  const addRate = (subjectId: string) => {
    if (subjectRates.some((sr) => sr.subjectId === subjectId)) return;
    setSubjectRates([...subjectRates, { subjectId, hourlyRate: 0 }]);
  };
  const updRate = (subjectId: string, hourlyRate: number) => {
    setSubjectRates(
      subjectRates.map((sr) =>
        sr.subjectId === subjectId ? { ...sr, hourlyRate } : sr
      )
    );
  };
  const delRate = (subjectId: string) => {
    setSubjectRates(subjectRates.filter((sr) => sr.subjectId !== subjectId));
  };

  const remainingSubjects = subjects.filter(
    (s) => s.isActive && !subjectRates.some((sr) => sr.subjectId === s.id)
  );

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">
            {teacher?.id
              ? (isEn ? "Edit Instructor Details" : "تعديل بيانات المهندس")
              : (isEn ? "Add New Instructor" : "إضافة مهندس جديد")}
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
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {isEn ? "Instructor Name *" : "اسم المهندس *"}
            </label>
            <input
              className={INPUT_CLS}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الهاتف</label>
              <input
                className={INPUT_CLS}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                البريد الإلكتروني
              </label>
              <input
                className={INPUT_CLS}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              السيرة الذاتية
            </label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              المؤهلات العلمية
            </label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {teacher?.id
                ? (isEn ? "New Password (leave blank to keep current)" : "كلمة المرور الجديدة (اتركها فارغة للتخطي)")
                : (isEn ? "Password (for Instructor Portal)" : "كلمة المرور (لبوابة المهندس)")}
            </label>
            <input
              type="password"
              className={INPUT_CLS}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-xs font-medium text-foreground">
              تسعير المواد الدراسية (سعر الساعة)
            </label>
            {subjectRates.map((sr) => {
              const subj = subjects.find((s) => s.id === sr.subjectId);
              return (
                <div key={sr.subjectId} className="flex items-center gap-2">
                  <span className="text-xs w-28 text-foreground truncate">
                    {subj?.name || "—"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="bg-background border border-input rounded-lg px-2.5 py-1 text-xs w-24 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    value={sr.hourlyRate}
                    onChange={(e) =>
                      updRate(sr.subjectId, Number(e.target.value))
                    }
                  />
                  <span className="text-[11px] text-muted-foreground">
                    ج.م/س
                  </span>
                  <button
                    type="button"
                    onClick={() => delRate(sr.subjectId)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {remainingSubjects.length > 0 && (
              <select
                className={INPUT_CLS + " mt-1"}
                value=""
                onChange={(e) => {
                  if (e.target.value) addRate(e.target.value);
                }}
              >
                <option value="">+ إضافة مادة وتحديد سعر الساعة</option>
                {remainingSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                ...teacher,
                name,
                phone,
                email,
                password: password || undefined,
                bio,
                qualifications,
                subjectRates,
              })
            }
            disabled={!name.trim()}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};
