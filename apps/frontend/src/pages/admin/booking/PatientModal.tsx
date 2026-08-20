import { useEffect, useState } from "react";
import { BookingPatient, ReferringPhysician, PriceList, InsuranceCompany, InsuranceMemberType, PATIENT_STATUS_MAP, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, tryParseJSON, api, fetchJson } from "./shared";
import MedicalHistoryChecklist, { MedicalHistoryValue } from "./MedicalHistoryChecklist";
import { toast } from "sonner";

import { X } from 'lucide-react'
interface Props {
  patient?: Partial<BookingPatient> | null;
  onClose: () => void;
  onSave: (d: Partial<BookingPatient>) => Promise<void>;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const MARITAL_STATUS = [
  { value: "", label: "╪║┘è╪▒ ┘à╪¡╪»╪»" },
  { value: "SINGLE", label: "╪ú╪╣╪▓╪¿/╪╣╪▓╪¿╪º╪í" },
  { value: "MARRIED", label: "┘à╪¬╪▓┘ê╪¼/┘à╪¬╪▓┘ê╪¼╪⌐" },
  { value: "DIVORCED", label: "┘à╪╖┘ä┘é/┘à╪╖┘ä┘é╪⌐" },
  { value: "WIDOW", label: "╪ú╪▒┘à┘ä/╪ú╪▒┘à┘ä╪⌐" },
];

const SOURCES = [
  { value: "", label: "╪║┘è╪▒ ┘à╪¡╪»╪»" },
  { value: "whatsapp", label: "┘ê╪º╪¬╪│╪º╪¿" },
  { value: "facebook", label: "┘ü┘è╪│╪¿┘ê┘â" },
  { value: "web", label: "┘à┘ê┘é╪╣ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è" },
  { value: "dashboard", label: "┘ä┘ê╪¡╪⌐ ╪º┘ä╪¬╪¡┘â┘à" },
  { value: "physician", label: "╪╖╪¿┘è╪¿ ┘à╪¡┘ê┘æ┘ä" },
  { value: "walkin", label: "╪▓┘è╪º╪▒╪⌐ ┘à╪¿╪º╪┤╪▒╪⌐" },
];

const toList = (v: unknown): string => {
  const arr = tryParseJSON<string[]>(v) || (Array.isArray(v) ? v : null);
  return arr ? arr.join("╪î ") : "";
};

const fromList = (s: string): string[] | undefined => {
  const items = s.split(/[╪î,;]/).map(x => x.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
};

const toDateInput = (d?: string): string => {
  if (!d) return "";
  return d.split("T")[0] || d;
};

const parseMedicalHistory = (v: unknown): MedicalHistoryValue | null => {
  const parsed = tryParseJSON<MedicalHistoryValue>(v);
  if (parsed && parsed.conditions && Array.isArray(parsed.conditions)) return parsed;
  return null;
};

export default function PatientModal({ patient, onClose, onSave }: Props) {
  const [form, setForm] = useState<{
    firstName: string; lastName: string; phone: string; email: string;
    gender: string; birthDate: string; bloodType: string;
    nationalId: string; nationalIdImage: string; address: string;
    allergies: string; chronicDiseases: string; medications: string;
    notes: string; isActive: boolean; password: string;
    status: string; source: string; maritalStatus: string; occupation: string; city: string;
    referringPhysicianId: string;
    priceListId: string;
    title: string; insuranceNumber: string; insuranceCompanyId: string; memberTypeId: string;
    homePhone: string; workPhone: string; fax: string; postalCode: string;
    medicalHistory: MedicalHistoryValue | null;
  }>({
    firstName: patient?.firstName || "",
    lastName: patient?.lastName || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    gender: patient?.gender || "",
    birthDate: toDateInput(patient?.birthDate),
    bloodType: patient?.bloodType || "",
    nationalId: patient?.nationalId || "",
    nationalIdImage: patient?.nationalIdImage || "",
    address: patient?.address || "",
    allergies: toList(patient?.allergies),
    chronicDiseases: toList(patient?.chronicDiseases),
    medications: toList(patient?.medications),
    notes: patient?.notes || "",
    isActive: patient?.isActive ?? true,
    password: "",
    status: (patient?.status || "ACTIVE") as string,
    source: patient?.source || "",
    maritalStatus: patient?.maritalStatus || "",
    occupation: patient?.occupation || "",
    city: patient?.city || "",
    referringPhysicianId: patient?.referringPhysicianId || "",
    priceListId: patient?.priceListId || "",
    title: patient?.title || "",
    insuranceNumber: patient?.insuranceNumber || "",
    insuranceCompanyId: patient?.insuranceCompanyId || "",
    memberTypeId: patient?.memberTypeId || "",
    homePhone: patient?.homePhone || "",
    workPhone: patient?.workPhone || "",
    fax: patient?.fax || "",
    postalCode: patient?.postalCode || "",
    medicalHistory: parseMedicalHistory(patient?.medicalHistory),
  });

  const [referringPhysicians, setReferringPhysicians] = useState<ReferringPhysician[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [memberTypes, setMemberTypes] = useState<InsuranceMemberType[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      fetchJson<ReferringPhysician[]>(api("referring-physicians")),
      fetchJson<PriceList[]>(api("price-lists")),
      fetchJson<InsuranceCompany[]>(api("insurance-companies")),
      fetchJson<InsuranceMemberType[]>(api("insurance-member-types")),
    ]).then(([physicians, lists, companies, types]) => {
      if (physicians.status === "fulfilled") setReferringPhysicians(physicians.value);
      if (lists.status === "fulfilled") setPriceLists(lists.value);
      if (companies.status === "fulfilled") setInsuranceCompanies(companies.value);
      if (types.status === "fulfilled") setMemberTypes(types.value);
    }).catch(() => { /* keep empty lists */ });
  }, []);

  const valid = form.firstName.trim() !== "";

  const handleNationalIdImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, nationalIdImage: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (saving || !valid) return;
    setSaving(true);
    try {
      await onSave({
        ...patient,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        gender: form.gender || undefined,
        birthDate: form.birthDate || undefined,
        bloodType: form.bloodType || undefined,
        nationalId: form.nationalId.trim() || undefined,
        nationalIdImage: form.nationalIdImage || undefined,
        address: form.address.trim() || undefined,
        allergies: fromList(form.allergies),
        chronicDiseases: fromList(form.chronicDiseases),
        medications: fromList(form.medications),
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
        password: form.password || undefined,
        status: form.status || undefined,
        source: form.source || undefined,
        maritalStatus: form.maritalStatus || undefined,
        occupation: form.occupation.trim() || undefined,
        city: form.city.trim() || undefined,
        referringPhysicianId: form.referringPhysicianId || undefined,
        priceListId: form.priceListId || undefined,
        title: form.title.trim() || undefined,
        insuranceNumber: form.insuranceNumber.trim() || undefined,
        insuranceCompanyId: form.insuranceCompanyId || undefined,
        memberTypeId: form.memberTypeId || undefined,
        homePhone: form.homePhone.trim() || undefined,
        workPhone: form.workPhone.trim() || undefined,
        fax: form.fax.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        medicalHistory: form.medicalHistory
          ? { conditions: form.medicalHistory.conditions, allergies: form.medicalHistory.allergies }
          : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä┘à╪▒┘è╪╢");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{patient?.id ? "╪¬╪╣╪»┘è┘ä ┘à╪▒┘è╪╢" : "╪Ñ╪╢╪º┘ü╪⌐ ┘à╪▒┘è╪╢"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪º╪│┘à ╪º┘ä╪ú┘ê┘ä *</label><input className={MODAL_INPUT_CLS} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪º╪│┘à ╪º┘ä╪ú╪«┘è╪▒</label><input className={MODAL_INPUT_CLS} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘ç╪º╪¬┘ü</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪▒┘é┘à ╪º┘ä┘é┘ê┘à┘è (╪º╪«╪¬┘è╪º╪▒┘è)</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} placeholder="14 ╪▒┘é┘à╪º┘ï" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪╣┘å┘ê╪º┘å</label><input className={MODAL_INPUT_CLS} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="╪º┘ä╪╣┘å┘ê╪º┘å ╪º┘ä┘â╪º┘à┘ä" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪╡┘ê╪▒╪⌐ ╪º┘ä╪¿╪╖╪º┘é╪⌐ (╪º╪«╪¬┘è╪º╪▒┘è)</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer border dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                {form.nationalIdImage ? "╪¬╪║┘è┘è╪▒ ╪º┘ä╪╡┘ê╪▒╪⌐" : "≡ƒô╕ ╪º╪«╪¬╪▒ ╪╡┘ê╪▒╪⌐ ╪º┘ä╪¿╪╖╪º┘é╪⌐"}
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleNationalIdImage(f); }} />
              </label>
              {form.nationalIdImage && (
                <div className="relative shrink-0">
                  <img src={form.nationalIdImage} alt="╪¿╪╖╪º┘é╪⌐" className="w-16 h-12 object-cover rounded-lg border dark:border-gray-600" />
                  <button type="button" onClick={() => setForm({ ...form, nationalIdImage: "" })} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-4">├ù</button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪¼┘å╪│</label>
              <select className={MODAL_INPUT_CLS} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">╪║┘è╪▒ ┘à╪¡╪»╪»</option>
                <option value="male">╪░┘â╪▒</option>
                <option value="female">╪ú┘å╪½┘ë</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪¬╪º╪▒┘è╪« ╪º┘ä┘à┘è┘ä╪º╪»</label><input type="date" className={MODAL_INPUT_CLS} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘ü╪╡┘è┘ä╪⌐ ╪º┘ä╪»┘à</label>
              <select className={MODAL_INPUT_CLS} value={form.bloodType} onChange={e => setForm({ ...form, bloodType: e.target.value })}>
                <option value="">╪║┘è╪▒ ┘à╪¡╪»╪»</option>
                {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪¡╪º┘ä╪⌐</label>
              <select className={MODAL_INPUT_CLS} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(PATIENT_STATUS_MAP).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪º╪¼╪¬┘à╪º╪╣┘è╪⌐</label>
              <select className={MODAL_INPUT_CLS} value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })}>
                {MARITAL_STATUS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘à╪╡╪»╪▒ ╪º┘ä╪Ñ╪¡╪º┘ä╪⌐</label>
              <select className={MODAL_INPUT_CLS} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à┘ç┘å╪⌐</label><input className={MODAL_INPUT_CLS} value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à╪»┘è┘å╪⌐</label><input className={MODAL_INPUT_CLS} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä</label>
            <select className={MODAL_INPUT_CLS} value={form.referringPhysicianId} onChange={e => setForm({ ...form, referringPhysicianId: e.target.value })}>
              <option value="">╪¿╪»┘ê┘å</option>
              {referringPhysicians.map(r => <option key={r.id} value={r.id}>{r.name}{r.specialty ? ` (${r.specialty})` : ""}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘é╪º╪ª┘à╪⌐ ╪º┘ä╪ú╪│╪╣╪º╪▒</label>
            <select className={MODAL_INPUT_CLS} value={form.priceListId} onChange={e => setForm({ ...form, priceListId: e.target.value })}>
              <option value="">╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐</option>
              {priceLists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘ä┘é╪¿ (╪»┘â╪¬┘ê╪▒╪î ┘à┘ç┘å╪»╪│...)</label><input className={MODAL_INPUT_CLS} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪▒┘é┘à ╪º┘ä╪¬╪ú┘à┘è┘å</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.insuranceNumber} onChange={e => setForm({ ...form, insuranceNumber: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å</label>
              <select className={MODAL_INPUT_CLS} value={form.insuranceCompanyId} onChange={e => setForm({ ...form, insuranceCompanyId: e.target.value })}>
                <option value="">╪¿╪»┘ê┘å</option>
                {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐</label>
              <select className={MODAL_INPUT_CLS} value={form.memberTypeId} onChange={e => setForm({ ...form, memberTypeId: e.target.value })}>
                <option value="">╪¿╪»┘ê┘å</option>
                {memberTypes.map(m => <option key={m.id} value={m.id}>{m.name}{m.coveragePercent ? ` (╪¬╪║╪╖┘è╪⌐ ${m.coveragePercent}┘¬)` : ""}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘ç╪º╪¬┘ü ╪º┘ä┘à┘å╪▓┘ä</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.homePhone} onChange={e => setForm({ ...form, homePhone: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘ç╪º╪¬┘ü ╪º┘ä╪╣┘à┘ä</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.workPhone} onChange={e => setForm({ ...form, workPhone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘ü╪º┘â╪│</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.fax} onChange={e => setForm({ ...form, fax: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪▒┘à╪▓ ╪º┘ä╪¿╪▒┘è╪»┘è</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪¡╪│╪º╪│┘è╪⌐ (╪º┘ü╪╡┘ä ╪¿┘ü╪º╪╡┘ä╪⌐)</label><input className={MODAL_INPUT_CLS} value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪ú┘à╪▒╪º╪╢ ┘à╪▓┘à┘å╪⌐ (╪º┘ü╪╡┘ä ╪¿┘ü╪º╪╡┘ä╪⌐)</label><input className={MODAL_INPUT_CLS} value={form.chronicDiseases} onChange={e => setForm({ ...form, chronicDiseases: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪ú╪»┘ê┘è╪⌐ ╪¡╪º┘ä┘è╪⌐ (╪º┘ü╪╡┘ä ╪¿┘ü╪º╪╡┘ä╪⌐)</label><input className={MODAL_INPUT_CLS} value={form.medications} onChange={e => setForm({ ...form, medications: e.target.value })} /></div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">╪º┘ä╪¬╪º╪▒┘è╪« ╪º┘ä╪╖╪¿┘è</p>
            <MedicalHistoryChecklist value={form.medicalHistory} onChange={v => setForm({ ...form, medicalHistory: v })} />
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘à┘ä╪º╪¡╪╕╪º╪¬</label><textarea className={MODAL_INPUT_CLS} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{patient?.id ? "┘â┘ä┘à╪⌐ ┘à╪▒┘ê╪▒ ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒┘è╪╢ (╪º╪¬╪▒┘â┘ç╪º ┘ü╪º╪▒╪║╪⌐ ┘ä┘ä╪º╪¡╪¬┘ü╪º╪╕)" : "┘â┘ä┘à╪⌐ ┘à╪▒┘ê╪▒ ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒┘è╪╢ (╪º╪«╪¬┘è╪º╪▒┘è)"}</label><input type="password" className={MODAL_INPUT_CLS} dir="ltr" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          {patient?.id && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              ┘à╪▒┘è╪╢ ┘å╪┤╪╖
            </label>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">╪Ñ┘ä╪║╪º╪í</button>
          <button onClick={handleSave} disabled={!valid || saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">╪¡┘ü╪╕</button>
        </div>
      </div>
    </div>
  );
}
