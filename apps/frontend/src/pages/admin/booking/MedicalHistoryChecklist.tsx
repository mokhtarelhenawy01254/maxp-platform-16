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
    { code: "diabetes", label: "╪│┘â╪▒", checked: false },
    { code: "hypertension", label: "╪╢╪║╪╖ ┘à╪▒╪¬┘ü╪╣", checked: false },
    { code: "heart", label: "╪ú┘à╪▒╪º╪╢ ╪º┘ä┘é┘ä╪¿", checked: false },
    { code: "rheumatism", label: "╪▒┘ê┘à╪º╪¬┘è╪▓┘à", checked: false },
    { code: "liver", label: "╪ú┘à╪▒╪º╪╢ ╪º┘ä┘â╪¿╪»", checked: false },
    { code: "kidney", label: "╪ú┘à╪▒╪º╪╢ ╪º┘ä┘â┘ä┘ë", checked: false },
    { code: "asthma", label: "╪▒╪¿┘ê", checked: false },
    { code: "epilepsy", label: "╪╡╪▒╪╣", checked: false },
    { code: "ulcer", label: "┘é╪▒╪¡╪⌐ ╪º┘ä┘à╪╣╪»╪⌐", checked: false },
    { code: "cancer", label: "╪│╪▒╪╖╪º┘å╪º╪¬", checked: false },
    { code: "surgery", label: "╪╣┘à┘ä┘è╪º╪¬ ╪│╪º╪¿┘é╪⌐", checked: false },
    { code: "pregnancy", label: "╪¡┘à┘ä", checked: false },
    { code: "anemia", label: "╪ú┘å┘è┘à┘è╪º", checked: false },
    { code: "thyroid", label: "╪║╪»╪⌐ ╪»╪▒┘é┘è╪⌐", checked: false },
    { code: "clotting", label: "╪¼┘ä╪╖╪º╪¬", checked: false },
    { code: "aspirinSensitivity", label: "╪º┘ä╪¡╪│╪º╪│┘è╪⌐ ┘ä┘ä╪ú╪│╪¿╪▒┘è┘å", checked: false },
    { code: "bloodAnemia", label: "┘ü┘é╪▒ ╪º┘ä╪»┘à", checked: false },
    { code: "arthritisRheumatism", label: "╪º┘ä╪▒┘ê┘à╪º╪¬┘è╪▓┘à/╪º┘ä╪¬┘ç╪º╪¿ ╪º┘ä┘à┘ü╪º╪╡┘ä", checked: false },
    { code: "artificialHeartValve", label: "╪╡┘à╪º┘à╪º╪¬ ┘é┘ä╪¿ ╪╡┘å╪º╪╣┘è╪⌐", checked: false },
    { code: "backProblems", label: "┘à╪┤╪º┘â┘ä ╪º┘ä╪╕┘ç╪▒", checked: false },
    { code: "abnormalBleeding", label: "┘å╪▓┘è┘ü ╪║┘è╪▒ ╪╖╪¿┘è╪╣┘è", checked: false },
    { code: "bloodDisorders", label: "╪ú┘à╪▒╪º╪╢ ╪º┘ä╪»┘à", checked: false },
    { code: "malignancy", label: "╪│╪▒╪╖╪º┘å", checked: false },
    { code: "chemicalAddiction", label: "╪Ñ╪»┘à╪º┘å ┘â┘è┘à┘è╪º╪ª┘è", checked: false },
    { code: "chemotherapy", label: "╪╣┘ä╪º╪¼ ┘â┘è┘à┘è╪º╪ª┘è", checked: false },
    { code: "circulatoryProblems", label: "┘à╪┤╪º┘â┘ä ╪º┘ä╪»┘ê╪▒╪⌐ ╪º┘ä╪»┘à┘ê┘è╪⌐", checked: false },
    { code: "congenitalHeartDefect", label: "╪╣┘è┘ê╪¿ ┘é┘ä╪¿ ╪«┘ä┘é┘è╪⌐", checked: false },
    { code: "cortisoneTreatment", label: "╪╣┘ä╪º╪¼ ┘â┘ê╪▒╪¬┘è╪▓┘ê┘å", checked: false },
    { code: "persistentCough", label: "┘â╪¡╪⌐ ┘à╪│╪¬┘à╪▒╪⌐", checked: false },
    { code: "coughingBlood", label: "┘â╪¡╪⌐ ╪¿╪º┘ä╪»┘à", checked: false },
    { code: "fainting", label: "╪Ñ╪║┘à╪º╪í", checked: false },
    { code: "glaucoma", label: "╪¼┘ä┘ê┘â┘ê┘à╪º", checked: false },
    { code: "headache", label: "╪╡╪»╪º╪╣", checked: false },
    { code: "heartMurmur", label: "┘ä╪║╪╖ ╪º┘ä┘é┘ä╪¿", checked: false },
    { code: "heartProblems", label: "┘à╪┤╪º┘â┘ä ╪º┘ä┘é┘ä╪¿", checked: false },
    { code: "hepatitis", label: "╪º┘ä╪¬┘ç╪º╪¿ ╪º┘ä┘â╪¿╪»", checked: false },
    { code: "hernia", label: "┘ü╪¬┘é", checked: false },
    { code: "hivImmunity", label: "╪Ñ┘è╪»╪▓/┘à┘å╪º╪╣╪⌐", checked: false },
    { code: "jawPain", label: "╪ú┘ä┘à ╪¿╪º┘ä┘ü┘â", checked: false },
    { code: "mitralValveProlapse", label: "╪º╪▒╪¬╪«╪º╪í ╪º┘ä╪╡┘à╪º┘à ╪º┘ä┘à┘è╪¬╪▒╪º┘ä┘è", checked: false },
    { code: "pacemaker", label: "╪¼┘ç╪º╪▓ ╪¬┘å╪╕┘è┘à ╪╢╪▒╪¿╪º╪¬ ╪º┘ä┘é┘ä╪¿", checked: false },
    { code: "radiationTherapy", label: "╪╣┘ä╪º╪¼ ╪Ñ╪┤╪╣╪º╪╣┘è", checked: false },
    { code: "respiratoryDiseases", label: "╪ú┘à╪▒╪º╪╢ ╪º┘ä╪¼┘ç╪º╪▓ ╪º┘ä╪¬┘å┘ü╪│┘è", checked: false },
    { code: "rheumaticFever", label: "╪¡┘à┘ë ╪▒┘ê┘à╪º╪¬┘è╪▓┘à┘è╪⌐", checked: false },
    { code: "scarletFever", label: "╪¡┘à┘ë ┘é╪▒┘à╪▓┘è╪⌐", checked: false },
    { code: "shortnessOfBreath", label: "╪╢┘è┘é ╪¬┘å┘ü╪│", checked: false },
    { code: "skinRash", label: "╪╖┘ü╪¡ ╪¼┘ä╪»┘è", checked: false },
    { code: "thrombosis", label: "╪¼┘ä╪╖╪⌐", checked: false },
    { code: "footAnkleSwelling", label: "╪¬┘ê╪▒┘à ╪º┘ä┘é╪»┘à┘è┘å/╪º┘ä┘â╪º╪¡┘ä", checked: false },
    { code: "thyroidProblems", label: "┘à╪┤╪º┘â┘ä ╪º┘ä╪║╪»╪⌐ ╪º┘ä╪»╪▒┘é┘è╪⌐", checked: false },
    { code: "smokingHabit", label: "╪╣╪º╪»╪⌐ ╪º┘ä╪¬╪»╪«┘è┘å", checked: false },
    { code: "tonsillitis", label: "╪º┘ä╪¬┘ç╪º╪¿ ╪º┘ä┘ä┘ê╪▓╪¬┘è┘å", checked: false },
    { code: "tuberculosis", label: "╪»╪▒┘å/╪│┘ä", checked: false },
    { code: "pepticUlcer", label: "┘é╪▒╪¡╪⌐", checked: false },
    { code: "venerealDiseases", label: "╪ú┘à╪▒╪º╪╢ ╪¬┘å╪º╪│┘ä┘è╪⌐", checked: false },
  ],
  allergies: [
    { code: "penicillin", label: "╪¡╪│╪º╪│┘è╪⌐ ╪¿┘å╪│┘ä┘è┘å", checked: false },
    { code: "anesthesia", label: "╪¡╪│╪º╪│┘è╪⌐ ┘à╪«╪»╪▒", checked: false },
    { code: "antibiotics", label: "╪¡╪│╪º╪│┘è╪⌐ ┘à╪╢╪º╪»╪º╪¬ ╪¡┘è┘ê┘è╪⌐", checked: false },
    { code: "aspirin", label: "╪¡╪│╪º╪│┘è╪⌐ ╪ú╪│╪¿╪▒┘è┘å", checked: false },
    { code: "latex", label: "╪¡╪│╪º╪│┘è╪⌐ ┘ä╪º╪¬┘â╪│", checked: false },
    { code: "food", label: "╪¡╪│╪º╪│┘è╪⌐ ╪╖╪╣╪º┘à", checked: false },
    { code: "penicillinGeneric", label: "╪¿┘å╪│┘ä┘è┘å", checked: false },
    { code: "codeine", label: "┘â┘ê╪»╪º┘è┘è┘å", checked: false },
    { code: "localAnesthetic", label: "┘à╪«╪»╪▒ ┘à┘ê╪╢╪╣┘è", checked: false },
    { code: "sulfa", label: "╪│┘ä┘ü╪º", checked: false },
    { code: "iodine", label: "┘è┘ê╪»", checked: false },
    { code: "latexGeneric", label: "┘ä╪º╪¬┘â╪│", checked: false },
    { code: "barbiturates", label: "╪¿╪º╪▒╪¿╪¬┘è┘ê╪▒╪º╪¬", checked: false },
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
      {renderGroup("conditions", "╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à╪▒╪╢┘è╪⌐")}
      {renderGroup("allergies", "╪º┘ä╪¡╪│╪º╪│┘è╪⌐")}
    </div>
  );
}
