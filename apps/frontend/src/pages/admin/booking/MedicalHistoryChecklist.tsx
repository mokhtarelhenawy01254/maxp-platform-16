import { useState, useMemo } from "react";
import { Search, CheckCircle2, HeartPulse, AlertCircle } from "lucide-react";

export interface MedicalHistoryItem {
  code: string;
  label: string;
  checked: boolean;
}

export interface MedicalHistoryValue {
  conditions: MedicalHistoryItem[];
  allergies: MedicalHistoryItem[];
}

export const DEFAULT_MEDICAL_HISTORY: MedicalHistoryValue = {
  conditions: [
    { code: "diabetes", label: "سكر", checked: false },
    { code: "hypertension", label: "ضغط مرتفع", checked: false },
    { code: "heart", label: "أمراض القلب", checked: false },
    { code: "rheumatism", label: "روماتيزم", checked: false },
    { code: "liver", label: "أمراض الكبد", checked: false },
    { code: "kidney", label: "أمراض الكلى", checked: false },
    { code: "asthma", label: "ربو", checked: false },
    { code: "epilepsy", label: "صرع", checked: false },
    { code: "ulcer", label: "قرحة المعدة", checked: false },
    { code: "cancer", label: "سرطانات", checked: false },
    { code: "surgery", label: "عمليات سابقة", checked: false },
    { code: "pregnancy", label: "حمل", checked: false },
    { code: "anemia", label: "أنيميا", checked: false },
    { code: "thyroid", label: "غدة درقية", checked: false },
    { code: "clotting", label: "جلطات", checked: false },
    { code: "aspirinSensitivity", label: "الحساسية للأسبرين", checked: false },
    { code: "bloodAnemia", label: "فقر الدم", checked: false },
    { code: "arthritisRheumatism", label: "الروماتيزم/التهاب المفاصل", checked: false },
    { code: "artificialHeartValve", label: "صمامات قلب صناعية", checked: false },
    { code: "backProblems", label: "مشاكل الظهر", checked: false },
    { code: "abnormalBleeding", label: "نزيف غير طبيعي", checked: false },
    { code: "bloodDisorders", label: "أمراض الدم", checked: false },
    { code: "malignancy", label: "أورام خبيثة", checked: false },
    { code: "chemicalAddiction", label: "إدمان كيميائي", checked: false },
    { code: "chemotherapy", label: "علاج كيميائي", checked: false },
    { code: "circulatoryProblems", label: "مشاكل الدورة الدموية", checked: false },
    { code: "congenitalHeartDefect", label: "عيوب قلب خلقية", checked: false },
    { code: "cortisoneTreatment", label: "علاج كورتيزون", checked: false },
    { code: "persistentCough", label: "كحة مستمرة", checked: false },
    { code: "coughingBlood", label: "كحة بالدم", checked: false },
    { code: "fainting", label: "إغماء متكرر", checked: false },
    { code: "glaucoma", label: "جلوكوما (المياه الزرقاء)", checked: false },
    { code: "headache", label: "صداع مزمن", checked: false },
    { code: "heartMurmur", label: "لغط بالقلب", checked: false },
    { code: "heartProblems", label: "مشاكل الصمامات والشرايين", checked: false },
    { code: "hepatitis", label: "التهاب الكبد الوبائي", checked: false },
    { code: "hernia", label: "فتق", checked: false },
    { code: "hivImmunity", label: "نقص المناعة المكتسبة", checked: false },
    { code: "jawPain", label: "ألم بمفصل الفك", checked: false },
    { code: "mitralValveProlapse", label: "ارتخاء الصمام الميترالي", checked: false },
    { code: "pacemaker", label: "منظم ضربات القلب", checked: false },
    { code: "radiationTherapy", label: "علاج إشعاعي سابق", checked: false },
    { code: "respiratoryDiseases", label: "أمراض الجهاز التنفسي", checked: false },
    { code: "rheumaticFever", label: "حمى روماتيزمية", checked: false },
    { code: "scarletFever", label: "حمى قرمزية", checked: false },
    { code: "shortnessOfBreath", label: "ضيق تنفس واختناق", checked: false },
    { code: "skinRash", label: "طفح جلدي وحساسية مزمنة", checked: false },
    { code: "thrombosis", label: "جلطة وريدية/شريانية", checked: false },
    { code: "footAnkleSwelling", label: "تورم القدمين والكاحل", checked: false },
    { code: "thyroidProblems", label: "اضطرابات الغدة الدرقية", checked: false },
    { code: "smokingHabit", label: "عادة التدخين", checked: false },
    { code: "tonsillitis", label: "التهاب اللوزتين المتكرر", checked: false },
    { code: "tuberculosis", label: "درن / سل", checked: false },
    { code: "pepticUlcer", label: "قرحة المعدة والاثنى عشر", checked: false },
    { code: "venerealDiseases", label: "أمراض تناسلية", checked: false },
  ],
  allergies: [
    { code: "penicillin", label: "حساسية بنسلين", checked: false },
    { code: "anesthesia", label: "حساسية مخدر موضعي", checked: false },
    { code: "antibiotics", label: "حساسية مضادات حيوية", checked: false },
    { code: "aspirin", label: "حساسية أسبرين", checked: false },
    { code: "latex", label: "حساسية لاتكس", checked: false },
    { code: "food", label: "حساسية طعام معينة", checked: false },
    { code: "penicillinGeneric", label: "مشتقات البنسلين", checked: false },
    { code: "codeine", label: "كودايين", checked: false },
    { code: "localAnesthetic", label: "مخدر ليدوكايين / أرتيكايين", checked: false },
    { code: "sulfa", label: "مركبات السلفا", checked: false },
    { code: "iodine", label: "صبغات اليود والمطهرات", checked: false },
    { code: "latexGeneric", label: "قفازات اللاتكس والمطاط", checked: false },
    { code: "barbiturates", label: "باربتيورات ومهدئات", checked: false },
  ],
};

interface Props {
  value?: MedicalHistoryValue | null;
  onChange: (v: MedicalHistoryValue) => void;
  readOnly?: boolean;
}

const mergeWithDefaults = (v: MedicalHistoryValue | null | undefined): MedicalHistoryValue => {
  const conditions = v?.conditions || [];
  const allergies = v?.allergies || [];
  const condMap = new Map(conditions.map((c) => [c.code, c]));
  const allergMap = new Map(allergies.map((a) => [a.code, a]));
  return {
    conditions: DEFAULT_MEDICAL_HISTORY.conditions.map((d) => condMap.get(d.code) || d),
    allergies: DEFAULT_MEDICAL_HISTORY.allergies.map((d) => allergMap.get(d.code) || d),
  };
};

export default function MedicalHistoryChecklist({ value, onChange, readOnly }: Props) {
  const merged = mergeWithDefaults(value);
  const [searchTerm, setSearchTerm] = useState("");

  const toggle = (key: "conditions" | "allergies", code: string) => {
    if (readOnly) return;
    onChange({
      ...merged,
      [key]: merged[key].map((item) =>
        item.code === code ? { ...item, checked: !item.checked } : item
      ),
    });
  };

  const selectedConditionsCount = useMemo(
    () => merged.conditions.filter((c) => c.checked).length,
    [merged.conditions]
  );
  const selectedAllergiesCount = useMemo(
    () => merged.allergies.filter((a) => a.checked).length,
    [merged.allergies]
  );

  const filterItems = (items: MedicalHistoryItem[]) => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(term));
  };

  const renderGroup = (
    key: "conditions" | "allergies",
    title: string,
    icon: typeof HeartPulse,
    selectedCount: number
  ) => {
    const Icon = icon;
    const filtered = filterItems(merged[key]);

    return (
      <div className="space-y-2.5 bg-muted/20 border border-border/60 rounded-xl p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon className="w-4 h-4 text-primary" />
            <h4 className="text-xs sm:text-sm font-bold text-foreground">{title}</h4>
          </div>
          <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full border border-border/60 bg-card text-muted-foreground">
            المحدد: <strong className="text-foreground">{selectedCount}</strong>
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 bg-card rounded-lg border border-border/50">
            لا توجد بنود مطابقة لكلمة البحث
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
            {filtered.map((item) => (
              <label
                key={item.code}
                className={`flex items-center gap-2 border rounded-xl px-2.5 py-1.5 text-xs transition-all select-none ${
                  item.checked
                    ? "border-primary/40 bg-primary/10 text-primary font-medium shadow-xs"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40"
                } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={readOnly}
                  onChange={() => toggle(key, item.code)}
                  className="rounded border-border text-primary focus:ring-primary/40 accent-primary"
                />
                <span className="truncate flex-1">{item.label}</span>
                {item.checked && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Quick Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث سريع في الحالات المرضية أو مسببات الحساسية..."
          className="w-full bg-card border border-border/70 text-foreground text-xs rounded-xl pr-9 pl-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 shadow-xs"
        />
      </div>

      {renderGroup("conditions", "الحالات المرضية والأمراض المزمنة", HeartPulse, selectedConditionsCount)}
      {renderGroup("allergies", "الحساسية الدوائية والمواد السريرية", AlertCircle, selectedAllergiesCount)}
    </div>
  );
}
