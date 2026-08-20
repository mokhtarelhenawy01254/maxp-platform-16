import { useEffect, useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { BookingPatient, BookingAppointment, PatientDocument, STATUS_MAP, INVOICE_STATUS_MAP, PAYMENT_METHOD_LABEL, DOCUMENT_TYPES, MODAL_INPUT_CLS, api, getAuthHeaders, tryParseJSON, fetchJson } from "./shared";
import MedicalHistoryChecklist, { MedicalHistoryValue } from "./MedicalHistoryChecklist";
import PatientModal from "./PatientModal";
import { computeAge } from "./patientAge";

interface PatientInvoice {
  id: string; invoiceNumber: string; appointmentId?: string;
  total: number; discount: number; amountPaid: number; net: number; remaining: number;
  status: string; createdAt: string;
  payments?: { id: string; amount: number; method: string; paidAt: string }[];
}

interface PatientDetail extends BookingPatient {
  appointments: (BookingAppointment & {
    branch?: { id: string; name: string };
    doctor?: { id: string; title: string; name: string };
  })[];
  invoices?: PatientInvoice[];
  financialSummary?: {
    invoiceCount: number; totalBilled: number; totalPaid: number;
    outstanding: number; unpaidInvoices: number;
  };
}

const GENDER_LABEL: Record<string, string> = { male: "╪░┘â╪▒", female: "╪ú┘å╪½┘ë" };
const fmtMoney = (n?: number) => (n != null ? `${Number(n).toFixed(2)} ╪¼.┘à` : "ΓÇö");

const renderVitals = (v: unknown): string => {
  const parsed = tryParseJSON<Record<string, unknown>>(v);
  if (!parsed || Object.keys(parsed).length === 0) return "";
  return Object.entries(parsed).map(([k, val]) => {
    const labels: Record<string, string> = { pressure: "╪º┘ä╪╢╪║╪╖", weight: "╪º┘ä┘ê╪▓┘å", temp: "╪º┘ä╪¡╪▒╪º╪▒╪⌐", pulse: "╪º┘ä┘å╪¿╪╢", sugar: "╪º┘ä╪│┘â╪▒" };
    return `${labels[k] || k}: ${String(val)}`;
  }).join(" ┬╖ ");
};

const renderList = (v: unknown): string[] | null => {
  const arr = tryParseJSON<string[]>(v) || (Array.isArray(v) ? v : null);
  return arr && arr.length > 0 ? arr : null;
};

const parseMedicalHistory = (v: unknown): MedicalHistoryValue | null => {
  const parsed = tryParseJSON<MedicalHistoryValue>(v);
  if (parsed && parsed.conditions && Array.isArray(parsed.conditions)) return parsed;
  return null;
};

const PAGE_TABS = [
  { id: "data", label: "╪¿┘è╪º┘å╪º╪¬" },
  { id: "medical", label: "╪º┘ä╪¬╪º╪▒┘è╪« ╪º┘ä╪╖╪¿┘è" },
  { id: "appointments", label: "╪º┘ä┘à┘ê╪º╪╣┘è╪»" },
  { id: "documents", label: "╪º┘ä┘à╪│╪¬┘å╪»╪º╪¬" },
] as const;

type PageTab = typeof PAGE_TABS[number]["id"];

export default function PatientDetailPage({ patientId }: { patientId?: string }) {
  const id = patientId;
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PageTab>("data");
  const [editing, setEditing] = useState(false);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docType, setDocType] = useState("OTHER");
  const [docName, setDocName] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docFile, setDocFile] = useState<{ name: string; dataUrl: string; mimeType: string } | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(api(`patients/${id}`), { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "┘ü╪┤┘ä ╪º┘ä╪¬╪¡┘à┘è┘ä");
        if (!cancelled) setPatient(json.data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "╪«╪╖╪ú");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const allergies = renderList(patient?.allergies);
  const diseases = renderList(patient?.chronicDiseases);
  const medications = renderList(patient?.medications);
  const medicalHistory = parseMedicalHistory(patient?.medicalHistory);

  useEffect(() => {
    if (tab !== "documents" || !id) return;
    let cancelled = false;
    setDocumentsLoading(true);
    (async () => {
      try {
        const data = await fetchJson<PatientDocument[]>(api(`patient-documents/patient/${id}`));
        if (!cancelled) setDocuments(data);
      } catch (e: unknown) {
        if (!cancelled) setDocError(e instanceof Error ? e.message : "╪«╪╖╪ú");
      } finally {
        if (!cancelled) setDocumentsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, id]);

  const onDocFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setDocError(null);
    if (!file) { setDocFile(null); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (dataUrl.length > 5 * 1024 * 1024) {
        setDocError("╪¡╪¼┘à ╪º┘ä┘à┘ä┘ü ┘â╪¿┘è╪▒ ╪¼╪»╪º┘ï (╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë 5 ┘à┘è╪¼╪º╪¿╪º┘è╪¬)");
        setDocFile(null);
        setFileInputKey(k => k + 1);
        return;
      }
      setDocFile({ name: file.name, dataUrl, mimeType: file.type || "" });
    };
    reader.onerror = () => { setDocError("╪¬╪╣╪░╪▒ ┘é╪▒╪º╪í╪⌐ ╪º┘ä┘à┘ä┘ü"); setDocFile(null); };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!id || !docFile) return;
    setUploading(true);
    setDocError(null);
    try {
      await fetchJson(api("patient-documents"), {
        method: "POST",
        body: JSON.stringify({
          patientId: id,
          documentType: docType,
          name: docName.trim() || docFile.name,
          fileData: docFile.dataUrl,
          mimeType: docFile.mimeType || undefined,
          notes: docNotes.trim() || undefined,
        }),
      });
      setDocName("");
      setDocNotes("");
      setDocFile(null);
      setFileInputKey(k => k + 1);
      const data = await fetchJson<PatientDocument[]>(api(`patient-documents/patient/${id}`));
      setDocuments(data);
    } catch (e: unknown) {
      setDocError(e instanceof Error ? e.message : "╪«╪╖╪ú");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm("┘ç┘ä ╪¬╪▒┘è╪» ╪¡╪░┘ü ┘ç╪░╪º ╪º┘ä┘à╪│╪¬┘å╪»╪ƒ")) return;
    setDocError(null);
    try {
      await fetchJson(api(`patient-documents/${docId}`), { method: "DELETE" });
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e: unknown) {
      setDocError(e instanceof Error ? e.message : "╪«╪╖╪ú");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/booking/patients")} className="p-2 border dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" title="╪▒╪¼┘ê╪╣"><ArrowRightIcon className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">┘à┘ä┘ü ╪º┘ä┘à╪▒┘è╪╢</h1>
            {patient && <p className="text-sm text-gray-500 dark:text-gray-400">{patient.firstName} {patient.lastName || ""}</p>}
          </div>
        </div>
        {patient && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">╪¬╪╣╪»┘è┘ä</button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä...</p>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate("/admin/booking/patients")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">╪º┘ä╪╣┘ê╪»╪⌐ ┘ä┘ä┘à╪▒╪╢┘ë</button>
        </div>
      ) : patient ? (
        <div className="space-y-6 max-w-5xl">
          <div className="flex gap-2">
            {PAGE_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm rounded-lg font-semibold ${tab === t.id ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>{t.label}</button>
            ))}
          </div>

          {tab === "data" && (<>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <div>
                <p className="text-lg font-bold">{patient.firstName} {patient.lastName || ""}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{GENDER_LABEL[patient.gender || ""] || ""} {patient.bloodType ? `┬╖ ┘ü╪╡┘è┘ä╪⌐ ${patient.bloodType}` : ""}</p>
              </div>
              <div className="text-sm space-y-1.5">
                {patient.phone && <p dir="ltr">≡ƒô₧ {patient.phone}</p>}
                {patient.email && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">Γ£ë∩╕Å {patient.email}</p>}
                {patient.nationalId && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">≡ƒ¬¬ ╪º┘ä╪▒┘é┘à ╪º┘ä┘é┘ê┘à┘è: {patient.nationalId}</p>}
                {patient.address && <p>≡ƒôì {patient.address}</p>}
                {patient.birthDate && (
                  <p>≡ƒÄé {String(patient.birthDate).split("T")[0]}{computeAge(String(patient.birthDate)) && <span className="text-xs text-gray-500 dark:text-gray-400"> ┬╖ ╪º┘ä╪╣┘à╪▒: {computeAge(String(patient.birthDate))}</span>}</p>
                )}
                {patient.nationalIdImage && (
                  <div className="pt-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">╪╡┘ê╪▒╪⌐ ╪º┘ä╪¿╪╖╪º┘é╪⌐</p>
                    <img src={patient.nationalIdImage} alt="╪¿╪╖╪º┘é╪⌐ ╪º┘ä╪▒┘é┘à ╪º┘ä┘é┘ê┘à┘è" className="w-40 h-28 object-cover rounded-lg border dark:border-gray-600" />
                  </div>
                )}
              </div>
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {patient.status && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">╪º┘ä╪¡╪º┘ä╪⌐</p><p className="font-medium">{statusLabel(patient.status)}</p></div>}
                {patient.source && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">╪º┘ä┘à╪╡╪»╪▒</p><p className="font-medium">{patient.source}</p></div>}
                {patient.maritalStatus && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪º╪¼╪¬┘à╪º╪╣┘è╪⌐</p><p className="font-medium">{maritalLabel(patient.maritalStatus)}</p></div>}
                {patient.city && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">╪º┘ä┘à╪»┘è┘å╪⌐</p><p className="font-medium">{patient.city}</p></div>}
                {patient.occupation && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">╪º┘ä┘à┘ç┘å╪⌐</p><p className="font-medium">{patient.occupation}</p></div>}
                {patient.referringPhysician && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä</p><p className="font-medium">{patient.referringPhysician.name}</p></div>}
                {patient.priceList && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">┘é╪º╪ª┘à╪⌐ ╪º┘ä╪ú╪│╪╣╪º╪▒</p><p className="font-medium">{patient.priceList.name}</p></div>}
              </div>
              {allergies && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">╪º┘ä╪¡╪│╪º╪│┘è╪⌐</p><div className="flex flex-wrap gap-1">{allergies.map((a, i) => <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
              {diseases && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">╪ú┘à╪▒╪º╪╢ ┘à╪▓┘à┘å╪⌐</p><div className="flex flex-wrap gap-1">{diseases.map((d, i) => <span key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">{d}</span>)}</div></div>}
              {medications && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">╪ú╪»┘ê┘è╪⌐ ╪¡╪º┘ä┘è╪⌐</p><div className="flex flex-wrap gap-1">{medications.map((m, i) => <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{m}</span>)}</div></div>}
              {patient.notes && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">┘à┘ä╪º╪¡╪╕╪º╪¬</p><p className="text-sm">{patient.notes}</p></div>}
              {patient.customer && <div className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">╪╣┘à┘è┘ä ┘à╪▒╪¬╪¿╪╖: {patient.customer.firstName} {patient.customer.lastName || ""}</div>}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">╪º┘ä╪▓┘è╪º╪▒╪º╪¬</p>
                <p className="text-xl font-bold">{patient.appointments?.length || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">╪º┘ä┘ü┘ê╪º╪¬┘è╪▒</p>
                <p className="text-xl font-bold">{patient.financialSummary?.invoiceCount ?? patient.invoices?.length ?? 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à╪╖╪º┘ä╪¿</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtMoney(patient.financialSummary?.totalBilled)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">╪º┘ä┘à╪│╪»╪»</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmtMoney(patient.financialSummary?.totalPaid)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">╪º┘ä┘à╪¬╪¿┘é┘è</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{fmtMoney(patient.financialSummary?.outstanding)}</p>
              </div>
            </div>

            {/* Invoices */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h4 className="font-bold mb-3">╪º┘ä┘ü┘ê╪º╪¬┘è╪▒ ({patient.invoices?.length || 0})</h4>
              {(!patient.invoices || patient.invoices.length === 0) ? (
                <p className="text-center py-8 text-gray-400 dark:text-gray-500">┘ä╪º ╪¬┘ê╪¼╪» ┘ü┘ê╪º╪¬┘è╪▒</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{["╪▒┘é┘à ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐", "╪º┘ä╪¬╪º╪▒┘è╪«", "╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è", "╪º┘ä╪«╪╡┘à", "╪º┘ä┘à╪│╪»╪»", "╪º┘ä┘à╪¬╪¿┘é┘è", "╪º┘ä╪¡╪º┘ä╪⌐", "╪º┘ä╪»┘ü╪╣╪º╪¬"].map(h => <th key={h} className="text-right py-2.5 px-3">{h}</th>)}</tr></thead>
                    <tbody>{patient.invoices.map(inv => (
                      <tr key={inv.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-2.5 px-3 font-medium">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{String(inv.createdAt).split("T")[0]}</td>
                        <td className="py-2.5 px-3">{fmtMoney(inv.total)}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{fmtMoney(inv.discount)}</td>
                        <td className="py-2.5 px-3 text-green-600 dark:text-green-400">{fmtMoney(inv.amountPaid)}</td>
                        <td className="py-2.5 px-3 text-red-600 dark:text-red-400">{fmtMoney(inv.remaining)}</td>
                        <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${INVOICE_STATUS_MAP[inv.status]?.color || ""}`}>{INVOICE_STATUS_MAP[inv.status]?.label || inv.status}</span></td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">
                          {inv.payments?.length ? inv.payments.map((p, i) => <div key={i} dir="ltr">{fmtMoney(p.amount)} ┬╖ {PAYMENT_METHOD_LABEL[p.method] || p.method}</div>) : "ΓÇö"}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>)}

          {tab === "medical" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5 space-y-4">
              <MedicalHistoryChecklist value={medicalHistory} onChange={() => { /* read-only */ }} readOnly />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diseases && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">╪ú┘à╪▒╪º╪╢ ┘à╪▓┘à┘å╪⌐</p><div className="flex flex-wrap gap-1">{diseases.map((d, i) => <span key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">{d}</span>)}</div></div>}
                {allergies && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">╪º┘ä╪¡╪│╪º╪│┘è╪⌐</p><div className="flex flex-wrap gap-1">{allergies.map((a, i) => <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
              </div>
              {!medicalHistory && !diseases && !allergies && <p className="text-center py-8 text-gray-400 dark:text-gray-500">┘ä╪º ╪¬┘ê╪¼╪» ╪¿┘è╪º┘å╪º╪¬ ╪╖╪¿┘è╪⌐ ┘à╪│╪¼┘ä╪⌐</p>}
            </div>
          )}

          {tab === "appointments" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h4 className="font-bold mb-3">╪¬╪º╪▒┘è╪« ╪º┘ä╪▓┘è╪º╪▒╪º╪¬ ({patient.appointments?.length || 0})</h4>
              {(!patient.appointments || patient.appointments.length === 0) ? (
                <p className="text-center py-8 text-gray-400 dark:text-gray-500">┘ä╪º ╪¬┘ê╪¼╪» ╪▓┘è╪º╪▒╪º╪¬ ┘à╪│╪¼┘ä╪⌐ ╪¿╪╣╪»</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{["╪º┘ä╪¬╪º╪▒┘è╪«", "╪º┘ä┘ê┘é╪¬", "╪º┘ä┘ü╪▒╪╣", "╪º┘ä╪╖╪¿┘è╪¿", "╪º┘ä╪«╪»┘à╪⌐", "╪º┘ä╪¡┘è┘ê┘è╪⌐", "╪º┘ä╪¬╪┤╪«┘è╪╡", "╪º┘ä╪¡╪º┘ä╪⌐", "╪º┘ä╪»┘ü╪╣"].map(h => <th key={h} className="text-right py-2.5 px-3">{h}</th>)}</tr></thead>
                    <tbody>{patient.appointments.map(a => (
                      <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-2.5 px-3 whitespace-nowrap">{String(a.appointmentDate).split("T")[0]}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{a.startTime}</td>
                        <td className="py-2.5 px-3">{a.branch?.name || "ΓÇö"}</td>
                        <td className="py-2.5 px-3">{(a.doctor ? `${a.doctor.title || ""} ${a.doctor.name || ""}` : a.doctorName || "ΓÇö").trim()}</td>
                        <td className="py-2.5 px-3">{a.serviceName || "ΓÇö"}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">{renderVitals(a.vitals) || "ΓÇö"}</td>
                        <td className="py-2.5 px-3 max-w-[220px]">
                          {a.diagnosis ? (
                            <div>
                              <p className="truncate" title={a.diagnosis}>{a.diagnosis}</p>
                              {(a.treatmentPlan || a.prescription) && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate" title={`${a.treatmentPlan || ""} ${a.prescription || ""}`}>
                                  {a.treatmentPlan ? `╪«╪╖╪⌐: ${a.treatmentPlan}` : ""}{a.treatmentPlan && a.prescription ? " ┬╖ " : ""}{a.prescription ? `┘ê╪╡┘ü╪⌐: ${a.prescription}` : ""}
                                </p>
                              )}
                            </div>
                          ) : "ΓÇö"}
                        </td>
                        <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                        <td className="py-2.5 px-3 text-xs">
                          {a.paymentRequired || a.paymentStatus ? (
                            <span className={`px-2 py-0.5 rounded-full ${a.paymentStatus === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : a.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                              {a.paymentStatus === "paid" ? "┘à╪»┘ü┘ê╪╣" : a.paymentStatus === "partial" ? "╪¼╪▓╪ª┘è" : "╪║┘è╪▒ ┘à╪»┘ü┘ê╪╣"}
                            </span>
                          ) : "ΓÇö"}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {tab === "documents" && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                <h4 className="font-bold mb-3">╪Ñ╪╢╪º┘ü╪⌐ ┘à╪│╪¬┘å╪»</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">┘å┘ê╪╣ ╪º┘ä┘à╪│╪¬┘å╪»</label>
                    <select value={docType} onChange={e => setDocType(e.target.value)} className={MODAL_INPUT_CLS}>
                      {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">╪º╪│┘à ╪º┘ä┘à╪│╪¬┘å╪»</label>
                    <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="╪º╪«╪¬┘è╪º╪▒┘è" className={MODAL_INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">┘à┘ä╪º╪¡╪╕╪º╪¬</label>
                    <input value={docNotes} onChange={e => setDocNotes(e.target.value)} placeholder="╪º╪«╪¬┘è╪º╪▒┘è" className={MODAL_INPUT_CLS} />
                  </div>
                </div>
                <div className="mt-3">
                  <input key={fileInputKey} type="file" onChange={onDocFileChange} className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 file:font-semibold" />
                  {docFile && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">╪¬┘à ╪º╪«╪¬┘è╪º╪▒: {docFile.name}</p>}
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={handleUpload} disabled={!docFile || uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">{uploading ? "╪¼╪º╪▒┘ì ╪º┘ä╪▒┘ü╪╣..." : "╪▒┘ü╪╣ ╪º┘ä┘à╪│╪¬┘å╪»"}</button>
                </div>
                {docError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{docError}</p>}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                <h4 className="font-bold mb-3">╪º┘ä┘à╪│╪¬┘å╪»╪º╪¬ ({documents.length})</h4>
                {documentsLoading ? (
                  <p className="text-center py-8 text-gray-400 dark:text-gray-500">╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä...</p>
                ) : documents.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 dark:text-gray-500">┘ä╪º ╪¬┘ê╪¼╪» ┘à╪│╪¬┘å╪»╪º╪¬ ┘à╪▒┘ü┘ê╪╣╪⌐</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 border dark:border-gray-700 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${documentTypeColor(doc.documentType)}`}>{documentTypeLabel(doc.documentType)}</span>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.name || "╪¿╪»┘ê┘å ╪º╪│┘à"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{String(doc.uploadedAt).split("T")[0]}{doc.uploadedBy ? ` ┬╖ ${doc.uploadedBy}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {doc.fileData && <a href={doc.fileData} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">┘ü╪¬╪¡</a>}
                          <button onClick={() => handleDeleteDocument(doc.id)} className="text-sm text-red-600 dark:text-red-400 hover:underline">╪¡╪░┘ü</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
      {editing && patient && (
        <PatientModal
          patient={patient}
          onClose={() => setEditing(false)}
          onSave={async (d) => {
            await fetchJson(api(`patients/${id}`), { method: "PUT", body: JSON.stringify(d) });
            const res = await fetch(api(`patients/${id}`), { headers: getAuthHeaders() });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "┘ü╪┤┘ä ╪º┘ä╪¬╪¡┘à┘è┘ä");
            setPatient(json.data);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

const statusLabel = (s: string): string => {
  const labels: Record<string, string> = { ACTIVE: "┘å╪┤╪╖", INACTIVE: "╪║┘è╪▒ ┘å╪┤╪╖", REVIEW: "┘é┘è╪» ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐" };
  return labels[s] || s;
};

const maritalLabel = (s: string): string => {
  const labels: Record<string, string> = { SINGLE: "╪ú╪╣╪▓╪¿/╪╣╪▓╪¿╪º╪í", MARRIED: "┘à╪¬╪▓┘ê╪¼/┘à╪¬╪▓┘ê╪¼╪⌐", DIVORCED: "┘à╪╖┘ä┘é/┘à╪╖┘ä┘é╪⌐", WIDOW: "╪ú╪▒┘à┘ä/╪ú╪▒┘à┘ä╪⌐" };
  return labels[s] || s;
};

const documentTypeLabel = (t: string): string => DOCUMENT_TYPES.find(d => d.value === t)?.label || t;

const documentTypeColor = (t: string): string => {
  const colors: Record<string, string> = {
    DRIVING_LICENSE: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    INSURANCE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    PRESCRIPTION: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    IMAGE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    VIDEO: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };
  return colors[t] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};
