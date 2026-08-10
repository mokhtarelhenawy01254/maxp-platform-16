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
    { code: "malignancy", label: "سرطان", checked: false },
    { code: "chemicalAddiction", label: "إدمان كيميائي", checked: false },
    { code: "chemotherapy", label: "علاج كيميائي", checked: false },
    { code: "circulatoryProblems", label: "مشاكل الدورة الدموية", checked: false },
    { code: "congenitalHeartDefect", label: "عيوب قلب خلقية", checked: false },
    { code: "cortisoneTreatment", label: "علاج كورتيزون", checked: false },
    { code: "persistentCough", label: "كحة مستمرة", checked: false },
    { code: "coughingBlood", label: "كحة بالدم", checked: false },
    { code: "fainting", label: "إغماء", checked: false },
    { code: "glaucoma", label: "جلوكوما", checked: false },
    { code: "headache", label: "صداع", checked: false },
    { code: "heartMurmur", label: "لغط القلب", checked: false },
    { code: "heartProblems", label: "مشاكل القلب", checked: false },
    { code: "hepatitis", label: "التهاب الكبد", checked: false },
    { code: "hernia", label: "فتق", checked: false },
    { code: "hivImmunity", label: "إيدز/مناعة", checked: false },
    { code: "jawPain", label: "ألم بالفك", checked: false },
    { code: "mitralValveProlapse", label: "ارتخاء الصمام الميترالي", checked: false },
    { code: "pacemaker", label: "جهاز تنظيم ضربات القلب", checked: false },
    { code: "radiationTherapy", label: "علاج إشعاعي", checked: false },
    { code: "respiratoryDiseases", label: "أمراض الجهاز التنفسي", checked: false },
    { code: "rheumaticFever", label: "حمى روماتيزمية", checked: false },
    { code: "scarletFever", label: "حمى قرمزية", checked: false },
    { code: "shortnessOfBreath", label: "ضيق تنفس", checked: false },
    { code: "skinRash", label: "طفح جلدي", checked: false },
    { code: "thrombosis", label: "جلطة", checked: false },
    { code: "footAnkleSwelling", label: "تورم القدمين/الكاحل", checked: false },
    { code: "thyroidProblems", label: "مشاكل الغدة الدرقية", checked: false },
    { code: "smokingHabit", label: "عادة التدخين", checked: false },
    { code: "tonsillitis", label: "التهاب اللوزتين", checked: false },
    { code: "tuberculosis", label: "درن/سل", checked: false },
    { code: "pepticUlcer", label: "قرحة", checked: false },
    { code: "venerealDiseases", label: "أمراض تناسلية", checked: false },
  ],
  allergies: [
    { code: "penicillin", label: "حساسية بنسلين", checked: false },
    { code: "anesthesia", label: "حساسية مخدر", checked: false },
    { code: "antibiotics", label: "حساسية مضادات حيوية", checked: false },
    { code: "aspirin", label: "حساسية أسبرين", checked: false },
    { code: "latex", label: "حساسية لاتكس", checked: false },
    { code: "food", label: "حساسية طعام", checked: false },
    { code: "penicillinGeneric", label: "بنسلين", checked: false },
    { code: "codeine", label: "كودايين", checked: false },
    { code: "localAnesthetic", label: "مخدر موضعي", checked: false },
    { code: "sulfa", label: "سلفا", checked: false },
    { code: "iodine", label: "يود", checked: false },
    { code: "latexGeneric", label: "لاتكس", checked: false },
    { code: "barbiturates", label: "باربتيورات", checked: false },
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
  const condMap = new Map(conditions.map(c => [c.code, c]));
  const allergMap = new Map(allergies.map(a => [a.code, a]));
  return {
    conditions: DEFAULT_MEDICAL_HISTORY.conditions.map(d => condMap.get(d.code) || d),
    allergies: DEFAULT_MEDICAL_HISTORY.allergies.map(d => allergMap.get(d.code) || d),
  };
};

export default function MedicalHistoryChecklist({ value, onChange, readOnly }: Props) {
  const merged = mergeWithDefaults(value);

  const toggle = (key: "conditions" | "allergies", code: string) => {
    if (readOnly) return;
    onChange({
      ...merged,
      [key]: merged[key].map(item => (item.code === code ? { ...item, checked: !item.checked } : item)),
    });
  };

  const renderGroup = (key: "conditions" | "allergies", title: string) => (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {merged[key].map(item => (
          <label
            key={item.code}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer select-none ${item.checked
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              disabled={readOnly}
              onChange={() => toggle(key, item.code)}
              className="accent-blue-600"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderGroup("conditions", "الحالات المرضية")}
      {renderGroup("allergies", "الحساسية")}
    </div>
  );
}
