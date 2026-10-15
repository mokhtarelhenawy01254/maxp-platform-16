import { Phone, Mail, CreditCard, MapPin, Calendar } from "lucide-react";
import { BookingPatient } from "./shared";
import { computeAge } from "./patientAge";

const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };

const statusLabel = (s: string): string => {
  const labels: Record<string, string> = { ACTIVE: "نشط", INACTIVE: "غير نشط", REVIEW: "قيد المراجعة" };
  return labels[s] || s;
};

const maritalLabel = (s: string): string => {
  const labels: Record<string, string> = {
    SINGLE: "أعزب/عزباء",
    MARRIED: "متزوج/متزوجة",
    DIVORCED: "مطلق/مطلقة",
    WIDOW: "أرمل/أرملة",
  };
  return labels[s] || s;
};

interface Props {
  patient: BookingPatient;
  allergies: string[] | null;
  diseases: string[] | null;
  medications: string[] | null;
}

export default function PatientDetailBasicInfoCard({
  patient,
  allergies,
  diseases,
  medications,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-muted/20 border border-border/60 rounded-xl p-4">
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">
          {patient.firstName} {patient.lastName || ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {GENDER_LABEL[patient.gender || ""] || "غير محدد"}{" "}
          {patient.bloodType ? `· فصيلة ${patient.bloodType}` : ""}
        </p>
      </div>

      <div className="text-xs space-y-1.5">
        {patient.phone && (
          <p dir="ltr" className="flex items-center gap-1.5 text-foreground font-mono tabular-nums">
            <Phone className="w-3.5 h-3.5 text-primary" />
            <span>{patient.phone}</span>
          </p>
        )}
        {patient.email && (
          <p dir="ltr" className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{patient.email}</span>
          </p>
        )}
        {patient.nationalId && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            <span>
              الرقم القومي: <strong className="font-mono tabular-nums">{patient.nationalId}</strong>
            </span>
          </p>
        )}
        {patient.address && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{patient.address}</span>
          </p>
        )}
        {patient.birthDate && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>
              تاريخ الميلاد: <strong className="font-mono tabular-nums">{String(patient.birthDate).split("T")[0]}</strong>
            </span>
            {computeAge(String(patient.birthDate)) && (
              <span className="text-muted-foreground font-mono tabular-nums">
                {" "}
                · العمر: {computeAge(String(patient.birthDate))}
              </span>
            )}
          </p>
        )}
        {patient.nationalIdImage && (
          <div className="pt-2">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">صورة بطاقة الرقم القومي:</p>
            <img
              src={patient.nationalIdImage}
              alt="بطاقة الرقم القومي"
              className="w-32 h-20 object-cover rounded-lg border border-border/70 shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Badges Matrix */}
      <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-xs">
        {patient.status && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">الحالة السريرية</p>
            <p className="font-medium text-foreground">{statusLabel(patient.status)}</p>
          </div>
        )}
        {patient.source && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">المصدر</p>
            <p className="font-medium text-foreground">{patient.source}</p>
          </div>
        )}
        {patient.maritalStatus && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">الحالة الاجتماعية</p>
            <p className="font-medium text-foreground">{maritalLabel(patient.maritalStatus)}</p>
          </div>
        )}
        {patient.city && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">المدينة</p>
            <p className="font-medium text-foreground">{patient.city}</p>
          </div>
        )}
        {patient.occupation && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">المهنة</p>
            <p className="font-medium text-foreground">{patient.occupation}</p>
          </div>
        )}
        {patient.referringPhysician && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">الطبيب المحوّل</p>
            <p className="font-medium text-foreground">{patient.referringPhysician.name}</p>
          </div>
        )}
        {patient.priceList && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">قائمة الأسعار</p>
            <p className="font-medium text-foreground">{patient.priceList.name}</p>
          </div>
        )}
      </div>

      {allergies && (
        <div className="md:col-span-2 pt-2 border-t border-border/50">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">حساسية الأدوية/المواد:</p>
          <div className="flex flex-wrap gap-1">
            {allergies.map((a, i) => (
              <span
                key={i}
                className="text-xs bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-md font-medium"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {diseases && (
        <div className="md:col-span-2">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">الأمراض المزمنة:</p>
          <div className="flex flex-wrap gap-1">
            {diseases.map((d, i) => (
              <span
                key={i}
                className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {medications && (
        <div className="md:col-span-2">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">الأدوية الحالية:</p>
          <div className="flex flex-wrap gap-1">
            {medications.map((m, i) => (
              <span
                key={i}
                className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-medium"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {patient.notes && (
        <div className="md:col-span-2 pt-1 border-t border-border/50">
          <p className="text-[11px] font-medium text-muted-foreground mb-0.5">ملاحظات سريرية:</p>
          <p className="text-xs text-foreground bg-card p-2.5 rounded-lg border border-border/60">
            {patient.notes}
          </p>
        </div>
      )}
    </div>
  );
}
