import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Pencil, Trash2, Search, ArrowRightLeft, Zap, List, CalendarDays, CalendarRange, CalendarCheck, UserPlus, ChevronDown, ScanLine, Info } from "lucide-react";
import { api, bookingApi, fetchJson, RadiologyExamType, RadiologyExamAddition, RadiologyDevice, RADIOLOGY_PATIENT_FLAGS, parsePatientFlags, flagMeta, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, RadiologyIdSettings, DEFAULT_ID_SETTINGS, formatSequentialId, fetchIdSettings } from "./shared";
import ScheduleCalendar, { ViewMode, dayKey, addDays, egyptWeekStart } from "./ScheduleCalendar";

interface Appointment {
  id: string; bookingNo?: number; patientName: string; patientPhone?: string;
  patientGender?: string; patientAge?: string;
  nationalId?: string; insuranceNumber?: string;
  patientFlags?: string[] | string;
  examTypeId?: string; examTypeName?: string;
  examTypeIds?: string[] | string;
  deviceId?: string; deviceName?: string;
  insuranceCompanyId?: string;
  additionIds?: string[] | string;
  additionAmount?: number;
  referralDoctor?: string;
  emergency?: boolean;
  appointmentDate?: string; appointmentTime?: string;
  branchId?: string; status: string; notes?: string; createdAt: string;
  studyId?: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "radiology.appointmentStatus.SCHEDULED", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  CHECKED_IN: { label: "radiology.appointmentStatus.CHECKED_IN", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  DONE: { label: "radiology.appointmentStatus.DONE", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  CANCELLED: { label: "radiology.appointmentStatus.CANCELLED", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

const STATUS_CHAIN: Record<string, string> = { SCHEDULED: "CHECKED_IN", CHECKED_IN: "DONE", DONE: "", CANCELLED: "" };

interface Form {
  id?: string; patientId: string; patientName: string; patientPhone: string;
  patientGender: string; patientAge: string;
  nationalId: string; nationalIdImage?: string; insuranceNumber: string; patientFlags: string[];
  examTypeIds: string[]; insuranceCompanyId: string; additionIds: string[];
  deviceId: string;
  referringPhysicianId: string; referralDoctor: string; emergency: boolean;
  appointmentDate: string; appointmentTime: string; status: string; notes: string;
}

const emptyForm = (): Form => ({
  patientId: "", patientName: "", patientPhone: "", patientGender: "", patientAge: "", nationalId: "", nationalIdImage: "", insuranceNumber: "", patientFlags: [],
  examTypeIds: [], insuranceCompanyId: "", additionIds: [], deviceId: "",
  referringPhysicianId: "", referralDoctor: "", emergency: false,
  appointmentDate: new Date().toISOString().slice(0, 10), appointmentTime: "", status: "SCHEDULED", notes: "",
});

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function ScheduleTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<Appointment[]>([]);
  const [examTypes, setExamTypes] = useState<RadiologyExamType[]>([]);
  const [additions, setAdditions] = useState<RadiologyExamAddition[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(todayKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [view, setView] = useState<ViewMode>("list");
  const [anchorDate, setAnchorDate] = useState(todayKey());
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName: string; lastName?: string; phone?: string; nationalId?: string; insuranceNumber?: string; gender?: string; birthDate?: string }[]>([]);
  const [physicianSearch, setPhysicianSearch] = useState("");
  const [physicianResults, setPhysicianResults] = useState<{ id: string; name: string; specialty?: string }[]>([]);
  const [examSearch, setExamSearch] = useState("");
  const [examOpen, setExamOpen] = useState(false);
  const [examFiltered, setExamFiltered] = useState<RadiologyExamType[]>([]);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ firstName: "", phone: "", gender: "", nationalId: "", birthDate: "", nationalIdImage: "" });
  const [savingNewPatient, setSavingNewPatient] = useState(false);
  const [entityPrice, setEntityPrice] = useState<number | null>(null);
  const [devices, setDevices] = useState<RadiologyDevice[]>([]);
  const [coverage, setCoverage] = useState<Record<string, { covered: boolean; entityPrice?: number | null; basePrice?: number }>>({});
  const [cardScan, setCardScan] = useState<string | null>(null);
  const [cardScanTarget, setCardScanTarget] = useState<"modal" | "newPatient" | null>(null);
  const [cardOcrBusy, setCardOcrBusy] = useState(false);
  const cardInputRef = useRef<HTMLInputElement | null>(null);
  const [idSettings, setIdSettings] = useState<RadiologyIdSettings>(DEFAULT_ID_SETTINGS);

  const loadCatalog = useCallback(async () => {
    try {
      const [ets, adds, ins, devs] = await Promise.all([
        fetchJson<RadiologyExamType[]>(`${api("exam-types")}&limit=500`),
        fetchJson<RadiologyExamType[]>(`${api("exam-types")}&isAddition=true&limit=100`).catch(() => []),
        fetchJson<{ id: string; name: string }[]>(bookingApi("insurance-companies")).catch(() => []),
        fetchJson<RadiologyDevice[]>(`${api("devices")}&includeInactive=true`).catch(() => []),
      ]);
      setExamTypes(Array.isArray(ets) ? ets : []);
      setAdditions(Array.isArray(adds) ? adds : []);
      setInsuranceCompanies(Array.isArray(ins) ? ins : []);
      setDevices(Array.isArray(devs) ? devs : []);
    } catch { /* catalog optional */ }
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("appointments"));
      url.searchParams.set("limit", "300");
      if (status) url.searchParams.set("status", status);
      if (search.trim()) url.searchParams.set("patientName", search.trim());
      if (view === "list") {
        if (dateFrom) url.searchParams.set("dateFrom", dateFrom);
        if (dateTo) url.searchParams.set("dateTo", dateTo);
      } else {
        const a = new Date(anchorDate + "T12:00:00");
        let from = dayKey(a), to = dayKey(a);
        if (view === "week") { const s = egyptWeekStart(a); from = dayKey(s); to = dayKey(addDays(s, 6)); }
        if (view === "month") { from = dayKey(new Date(a.getFullYear(), a.getMonth(), 1)); to = dayKey(new Date(a.getFullYear(), a.getMonth() + 1, 0)); }
        url.searchParams.set("dateFrom", from);
        url.searchParams.set("dateTo", to);
      }
      const res = await fetchJson<{ items?: Appointment[]; total?: number }>(url.toString());
      setItems(res.items || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.schedule.loadFailed"));
    }
  }, [status, search, dateFrom, dateTo, view, anchorDate]);

  useEffect(() => {
    loadCatalog();
    refresh();
    fetchIdSettings().then(setIdSettings);
  }, [loadCatalog, refresh]);

  useEffect(() => {
    if (!patientSearch.trim()) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const url = new URL(bookingApi("patients"));
        url.searchParams.set("search", patientSearch.trim());
        url.searchParams.set("limit", "8");
        const rows = await fetchJson<{ id: string; firstName: string; lastName?: string; phone?: string; nationalId?: string; insuranceNumber?: string }[]>(url.toString());
        setPatientResults(Array.isArray(rows) ? rows : []);
      } catch { setPatientResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [patientSearch]);

  useEffect(() => {
    if (!physicianSearch.trim()) { setPhysicianResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const url = new URL(api("referring-physicians"));
        url.searchParams.set("search", physicianSearch.trim());
        url.searchParams.set("limit", "20");
        const rows = await fetchJson<{ id: string; name: string; specialty?: string }[]>(url.toString());
        setPhysicianResults(Array.isArray(rows) ? rows : []);
      } catch { setPhysicianResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [physicianSearch]);

  useEffect(() => {
    if (!examSearch.trim()) { setExamFiltered(examTypes.filter(t => t.isActive !== false)); return; }
    const term = examSearch.trim().toLowerCase();
    setExamFiltered(examTypes.filter(t =>
      t.isActive !== false &&
      (t.name?.toLowerCase().includes(term) || (t.category || "").toLowerCase().includes(term) || (t.abbreviation || "").toLowerCase().includes(term))
    ));
  }, [examSearch, examTypes]);

  useEffect(() => {
    if (!modal?.examTypeIds.length || !modal.insuranceCompanyId) { setEntityPrice(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(api("entity-prices"));
        url.searchParams.set("insuranceCompanyId", modal.insuranceCompanyId);
        url.searchParams.set("examTypeId", modal.examTypeIds[0] || "");
        const rows = await fetchJson<{ price: number }[]>(url.toString());
        if (!cancelled) setEntityPrice(rows && rows.length ? Number(rows[0]?.price) : null);
      } catch {
        if (!cancelled) setEntityPrice(null);
      }
    })();
    return () => { cancelled = true; };
  }, [modal?.examTypeIds, modal?.insuranceCompanyId]);

  useEffect(() => {
    if (!modal?.examTypeIds.length || !modal.insuranceCompanyId) { setCoverage({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(api("coverage"));
        url.searchParams.set("insuranceCompanyId", modal.insuranceCompanyId);
        url.searchParams.set("examTypeIds", modal.examTypeIds.join(","));
        const rows = await fetchJson<{ examTypeId: string; covered: boolean; entityPrice?: number | null; basePrice?: number }[]>(url.toString());
        if (!cancelled) {
          const map: Record<string, { covered: boolean; entityPrice?: number | null; basePrice?: number }> = {};
          (Array.isArray(rows) ? rows : []).forEach(r => { map[r.examTypeId] = { covered: r.covered, entityPrice: r.entityPrice, basePrice: r.basePrice }; });
          setCoverage(map);
        }
      } catch {
        if (!cancelled) setCoverage({});
      }
    })();
    return () => { cancelled = true; };
  }, [modal?.examTypeIds, modal?.insuranceCompanyId]);

  const parseEgyptianNationalId = (raw: string) => {
    const id = raw.replace(/\D/g, "");
    if (id.length !== 14) return null;
    const century = Number(id[0]);
    if (century !== 2 && century !== 3) return null;
    const year = century === 2 ? 1900 + Number(id.slice(1, 3)) : 2000 + Number(id.slice(1, 3));
    const month = Number(id.slice(3, 5));
    const day = Number(id.slice(5, 7));
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const gender = Number(id[12]) % 2 === 1 ? "male" : "female";
    const dob = new Date(Date.UTC(year, month - 1, day));
    const age = Math.max(0, Math.floor((Date.now() - dob.getTime()) / (31557600000)));
    return { gender, age: String(age), year, month, day };
  };

  const birthFromNationalId = (raw: string): string => {
    const parsed = parseEgyptianNationalId(raw);
    if (!parsed) return "";
    const mm = String(parsed.month).padStart(2, "0");
    const dd = String(parsed.day).padStart(2, "0");
    return `${parsed.year}-${mm}-${dd}`;
  };

  const applyNationalId = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 14);
    const parsed = parseEgyptianNationalId(digits);
    setModal(m => m ? {
      ...m,
      nationalId: digits,
      patientGender: parsed ? parsed.gender : m.patientGender,
      patientAge: parsed ? parsed.age : m.patientAge,
    } : m);
  };

  const openCardScanner = (target: "modal" | "newPatient") => {
    setCardScanTarget(target);
    setCardScan(null);
    if (cardInputRef.current) cardInputRef.current.click();
  };

  const handleCardScanFile = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setCardScan(dataUrl);
      if (cardScanTarget === "newPatient") {
        setNewPatient(p => ({ ...p, nationalIdImage: dataUrl }));
      } else {
        setModal(m => m ? { ...m, nationalIdImage: dataUrl } : m);
      }
    };
    reader.readAsDataURL(file);

    setCardOcrBusy(true);
    try {
      const { extractNationalIdFromImage } = await import("./cardOcr");
      const result = await extractNationalIdFromImage(file);
      if (result.nationalId) {
        if (cardScanTarget === "newPatient") {
          setNewPatient(p => ({ ...p, nationalId: result.nationalId || "" }));
        } else {
          applyNationalId(result.nationalId);
        }
        toast.success(t("radiology.schedule.cardOcrFound"));
      } else {
        toast.warning(t("radiology.schedule.cardOcrNotFound"));
      }
    } catch {
      toast.warning(t("radiology.schedule.cardOcrFailed"));
    } finally {
      setCardOcrBusy(false);
    }
  };

  const applyScannedCard = () => {
    const target = cardScanTarget;
    setCardScan(null);
    setCardScanTarget(null);
    if (target === "newPatient") {
      if (newPatient.nationalId.replace(/\D/g, "").length === 14) {
        const parsed = parseEgyptianNationalId(newPatient.nationalId);
        if (parsed) {
          setNewPatient(p => ({ ...p, gender: parsed.gender, birthDate: birthFromNationalId(newPatient.nationalId) }));
          toast.success(t("radiology.schedule.cardDataExtracted"));
        }
      }
    } else if (modal && modal.nationalId.replace(/\D/g, "").length === 14) {
      const parsed = parseEgyptianNationalId(modal.nationalId);
      if (parsed) {
        setModal(m => m ? { ...m, patientGender: parsed.gender, patientAge: parsed.age } : m);
        toast.success(t("radiology.schedule.cardDataExtracted"));
      }
    }
  };

  const toggleExam = (id: string) => {
    setModal(m => m ? {
      ...m,
      examTypeIds: m.examTypeIds.includes(id)
        ? m.examTypeIds.filter(x => x !== id)
        : [...m.examTypeIds, id],
    } : m);
    setExamSearch("");
    setExamOpen(false);
  };

  const openNewPatient = () => { setNewPatient({ firstName: "", phone: "", gender: "", nationalId: "", birthDate: "", nationalIdImage: "" }); setNewPatientOpen(true); };

  const saveNewPatient = async () => {
    if (savingNewPatient) return;
    if (!newPatient.firstName.trim()) { toast.error(t("radiology.schedule.patientNameRequired")); return; }
    setSavingNewPatient(true);
    try {
      const nationalId = newPatient.nationalId.replace(/\D/g, "");
      const existing = await findExistingPatient(
        { nationalId, patientPhone: newPatient.phone.trim(), patientName: newPatient.firstName.trim(), patientId: "" } as Form,
        newPatient.firstName.trim(),
      );
      if (existing) {
        setModal(m => m ? { ...m, patientId: existing.id, patientName: existing.name, patientPhone: newPatient.phone.trim(), nationalId } : m);
        toast.info(t("radiology.schedule.duplicatePatientLinked", { name: existing.name }));
        setNewPatientOpen(false);
        setPatientSearch("");
        setPatientResults([]);
        return;
      }
      const body: Record<string, string | undefined> = {
        firstName: newPatient.firstName.trim(),
        phone: newPatient.phone.trim() || undefined,
        nationalId: nationalId || undefined,
        nationalIdImage: newPatient.nationalIdImage || undefined,
        gender: newPatient.gender || undefined,
        birthDate: newPatient.birthDate || undefined,
      };
      const created = await fetchJson<{ id: string; firstName: string; lastName?: string; phone?: string; gender?: string; birthDate?: string; nationalId?: string }>(bookingApi("patients"), { method: "POST", body: JSON.stringify(body) });
      const parsed = newPatient.nationalId.replace(/\D/g, "").length === 14 ? parseEgyptianNationalId(newPatient.nationalId.replace(/\D/g, "")) : null;
      setModal(m => m ? {
        ...m,
        patientId: created.id,
        patientName: `${created.firstName}${created.lastName ? " " + created.lastName : ""}`,
        patientPhone: created.phone || newPatient.phone.trim(),
        nationalId: created.nationalId || newPatient.nationalId.replace(/\D/g, ""),
        patientGender: created.gender || parsed?.gender || newPatient.gender || m.patientGender,
        patientAge: parsed ? parsed.age : m.patientAge,
      } : m);
      toast.success(t("radiology.schedule.patientAdded"));
      setNewPatientOpen(false);
      setPatientSearch("");
      setPatientResults([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.schedule.addPatientFailed"));
    } finally {
      setSavingNewPatient(false);
    }
  };

  const pickPatient = (p: { id: string; firstName: string; lastName?: string; phone?: string; nationalId?: string; insuranceNumber?: string; gender?: string; birthDate?: string }) => {
    let gender = p.gender ? (p.gender === "male" || p.gender === "M" ? "male" : "female") : "";
    let age = "";
    if (p.birthDate) {
      const dob = new Date(p.birthDate);
      if (!Number.isNaN(dob.getTime())) {
        const a = Math.max(0, Math.floor((Date.now() - dob.getTime()) / 31557600000));
        if (a > 0) age = String(a);
      }
    }
    setModal(m => m ? { ...m, patientId: p.id, patientName: `${p.firstName}${p.lastName ? " " + p.lastName : ""}`, patientPhone: p.phone || "", nationalId: p.nationalId || m.nationalId, insuranceNumber: p.insuranceNumber || m.insuranceNumber, patientGender: gender || m.patientGender, patientAge: age || m.patientAge } : m);
    setPatientSearch("");
    setPatientResults([]);
  };

  const pickPhysician = (p: { id: string; name: string }) => {
    setModal(m => m ? { ...m, referringPhysicianId: p.id, referralDoctor: p.name } : m);
    setPhysicianSearch("");
    setPhysicianResults([]);
  };

  const syncPatientRecord = async (f: Form): Promise<string | null> => {
    const fields: Record<string, string> = {};
    if (f.patientPhone.trim()) fields["phone"] = f.patientPhone.trim();
    if (f.nationalId.trim()) fields["nationalId"] = f.nationalId.trim();
    if (f.nationalIdImage) fields["nationalIdImage"] = f.nationalIdImage;
    if (f.insuranceNumber.trim()) fields["insuranceNumber"] = f.insuranceNumber.trim();
    if (f.patientId) {
      if (Object.keys(fields).length) {
        await fetchJson(bookingApi(`patients/${f.patientId}`), { method: "PUT", body: JSON.stringify(fields) });
      }
      return f.patientId;
    }
    const name = f.patientName.trim() || patientSearch.trim();
    if (!name) return null;
    const existing = await findExistingPatient(f, name);
    if (existing) {
      if (Object.keys(fields).length) {
        await fetchJson(bookingApi(`patients/${existing.id}`), { method: "PUT", body: JSON.stringify(fields) });
      }
      toast.info(t("radiology.schedule.duplicatePatientLinked", { name: existing.name }));
      return existing.id;
    }
    const parts = name.split(/\s+/);
    const created = await fetchJson<{ id: string }>(bookingApi("patients"), {
      method: "POST",
      body: JSON.stringify({ firstName: parts[0], lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined, ...fields }),
    });
    return created.id;
  };

  const findExistingPatient = async (f: Form, _name: string): Promise<{ id: string; name: string } | null> => {
    const queries: string[] = [];
    if (f.nationalId.trim()) queries.push(f.nationalId.trim());
    if (f.patientPhone.trim()) queries.push(f.patientPhone.trim());
    if (!queries.length) return null;
    try {
      const url = new URL(bookingApi("patients"));
      url.searchParams.set("search", queries[0] || "");
      url.searchParams.set("limit", "10");
      const rows = await fetchJson<{ id: string; firstName: string; lastName?: string; phone?: string; nationalId?: string }[]>(url.toString());
      const list = Array.isArray(rows) ? rows : [];
      const nationalId = f.nationalId.trim();
      const phone = f.patientPhone.trim();
      const match = list.find(p =>
        (nationalId && p.nationalId === nationalId) ||
        (phone && p.phone === phone)
      );
      if (!match) return null;
      return { id: match.id, name: `${match.firstName}${match.lastName ? " " + match.lastName : ""}` };
    } catch {
      return null;
    }
  };

  const buildPayload = (f: Form) => ({
    patientId: f.patientId || undefined,
    patientName: f.patientName.trim(),
    patientPhone: f.patientPhone.trim() || undefined,
    patientGender: f.patientGender || undefined,
    patientAge: f.patientAge.trim() || undefined,
    nationalId: f.nationalId.trim() || undefined,
    insuranceNumber: f.insuranceNumber.trim() || undefined,
    patientFlags: f.patientFlags.length ? f.patientFlags : undefined,
    examTypeIds: f.examTypeIds.length ? f.examTypeIds : undefined,
    examTypeId: f.examTypeIds[0] || undefined,
    insuranceCompanyId: f.insuranceCompanyId || undefined,
    deviceId: f.deviceId || undefined,
    additionIds: f.additionIds,
    referringPhysicianId: f.referringPhysicianId || undefined,
    referralDoctor: f.referralDoctor.trim() || undefined,
    emergency: f.emergency,
    appointmentDate: f.appointmentDate || undefined,
    appointmentTime: f.appointmentTime || undefined,
    status: f.status || "SCHEDULED",
    notes: f.notes.trim() || undefined,
  });

  const save = async (convertAfter = false) => {
    if (!modal || saving) return;
    if (!modal.patientName.trim()) { toast.error(t("radiology.schedule.patientNameRequired")); return; }
    if (!modal.examTypeIds.length) { toast.error(t("radiology.schedule.selectExam")); return; }
    setSaving(true);
    try {
      const patientId = await syncPatientRecord(modal);
      const payload = buildPayload({ ...modal, patientId: patientId || "", status: convertAfter ? "CHECKED_IN" : modal.status });
      let id = modal.id;
      if (modal.id) {
        await fetchJson(api(`appointments/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        const created = await fetchJson<{ id: string }>(api("appointments"), { method: "POST", body: JSON.stringify(payload) });
        id = created.id;
      }
      if (convertAfter && id) {
        await fetchJson(api(`appointments/${id}/convert`), { method: "POST" });
        toast.success(t("radiology.schedule.studyCreatedWalkIn"));
        setModal(null);
        window.location.href = "/radiology/studies";
        return;
      }
      toast.success(modal.id ? t("radiology.schedule.bookingUpdated") : t("radiology.schedule.bookingCreated"));
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.schedule.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const advance = async (a: Appointment) => {
    const next = STATUS_CHAIN[a.status];
    if (!next) return;
    try {
      await fetchJson(api(`appointments/${a.id}`), { method: "PUT", body: JSON.stringify({ status: next }) });
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.schedule.updateFailed"));
    }
  };

  const remove = async (a: Appointment) => {
    if (!window.confirm(t("radiology.schedule.deleteConfirm", { name: a.patientName }) as string)) return;
    try {
      await fetchJson(api(`appointments/${a.id}`), { method: "DELETE" });
      toast.success(t("radiology.schedule.bookingDeleted"));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.schedule.deleteFailed"));
    }
  };

  const convert = async (a: Appointment) => {
    if (converting === a.id) return;
    if (!window.confirm(t("radiology.schedule.convertConfirm", { name: a.patientName }) as string)) return;
    setConverting(a.id);
    try {
      const r = await fetchJson<{ studies?: { id: string }[]; study?: { id: string } }>(api(`appointments/${a.id}/convert`), { method: "POST" });
      toast.success(t("radiology.schedule.studyCreated"));
      await refresh({ silent: true });
      if (r?.study?.id || r?.studies?.length) window.location.href = "/radiology/studies";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.schedule.convertFailed"));
    } finally {
      setConverting(null);
    }
  };

  const openNew = (asWalkIn = false) => {
    setModal({ ...emptyForm(), status: asWalkIn ? "CHECKED_IN" : "SCHEDULED" });
    setPatientSearch("");
    setPhysicianSearch("");
    setExamSearch("");
    setExamOpen(false);
    setNewPatientOpen(false);
    setEntityPrice(null);
    setCoverage({});
    setCardScan(null);
    setCardScanTarget(null);
    setCardOcrBusy(false);
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "—");
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";

  const shiftAnchor = (dir: number) => {
    const a = new Date(anchorDate + "T12:00:00");
    if (view === "day") setAnchorDate(dayKey(addDays(a, dir)));
    else if (view === "week") setAnchorDate(dayKey(addDays(a, dir * 7)));
    else { const x = new Date(a.getFullYear(), a.getMonth() + dir, 1); setAnchorDate(dayKey(x)); }
  };
  const gotoToday = () => setAnchorDate(todayKey());
  const selectDay = (key: string) => { setAnchorDate(key); setView("day"); };

  const VIEW_TABS: { id: ViewMode; label: string; icon: typeof List }[] = [
    { id: "list", label: t("radiology.scheduleCalendar.viewList"), icon: List },
    { id: "day", label: t("radiology.scheduleCalendar.viewDay"), icon: CalendarDays },
    { id: "week", label: t("radiology.scheduleCalendar.viewWeek"), icon: CalendarRange },
    { id: "month", label: t("radiology.scheduleCalendar.viewMonth"), icon: CalendarCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.schedule.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.schedule.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1.5 border dark:border-gray-600 rounded-lg p-1">
          {VIEW_TABS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === v.id ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
              <v.icon className="w-4 h-4" />{v.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setDateFrom(todayKey()); setDateTo(todayKey()); }} className="px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">{t("radiology.schedule.today")}</button>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input className={`${MODAL_INPUT_CLS} pr-9 w-44`} placeholder={t("radiology.schedule.searchByPatient")} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={MODAL_INPUT_CLS} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">{t("radiology.allStatuses")}</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
          </select>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw className="w-4 h-4" />{t("radiology.refresh")}</button>
          <button onClick={() => openNew(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"><Zap className="w-4 h-4" />{t("radiology.schedule.walkIn")}</button>
          <button onClick={() => openNew(false)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Plus className="w-4 h-4" />{t("radiology.schedule.newBooking")}</button>
        </div>
      </div>

      {view === "list" && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-300">{t("radiology.schedule.from")}</label>
          <input type="date" className={MODAL_INPUT_CLS} style={{ width: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <label className="text-sm text-gray-600 dark:text-gray-300">{t("radiology.schedule.to")}</label>
          <input type="date" className={MODAL_INPUT_CLS} style={{ width: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      )}

      {view !== "list" ? (
        <ScheduleCalendar
          view={view as "day" | "week" | "month"}
          anchorDate={anchorDate}
          items={items}
          onShift={shiftAnchor}
          onToday={gotoToday}
          onSelectDay={selectDay}
        />
      ) : items.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.schedule.noBookings")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {[t("radiology.schedule.bookingId"), t("radiology.schedule.patient"), t("radiology.schedule.exam"), t("radiology.schedule.date"), t("radiology.schedule.time"), t("radiology.schedule.status"), t("radiology.schedule.notes"), t("radiology.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(a => {
                  const meta = STATUS_META[a.status] || STATUS_META["SCHEDULED"];
                  return (
                    <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300" dir="ltr">
                        <span className="text-xs font-mono font-medium">{formatSequentialId(idSettings.bookingPrefix, a.bookingNo, idSettings.digits, idSettings.enabled) || a.id.slice(0, 8)}</span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {a.patientName}{a.emergency ? <span className="mr-2 text-xs text-red-500">{t("radiology.schedule.emergency")}</span> : null}
                        {parsePatientFlags(a.patientFlags).map(f => {
                          const meta = flagMeta(f);
                          return meta ? <span key={f} className={`mr-1.5 px-2 py-0.5 rounded-full text-[11px] ${meta.color}`}>{t(meta.label)}</span> : null;
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {a.examTypeName || "—"}
                        {(a.examTypeIds && (Array.isArray(a.examTypeIds) ? a.examTypeIds.length : 1) > 1) ? <span className="mr-1.5 text-xs text-blue-600 dark:text-blue-400">+{Array.isArray(a.examTypeIds) ? a.examTypeIds.length - 1 : 0}</span> : null}
                        {a.deviceName ? <span className="mr-1.5 text-xs text-gray-400">({a.deviceName})</span> : null}
                        {a.additionAmount ? ` (+${Number(a.additionAmount).toFixed(0)}${t("radiology.currency")})` : ""}
                      </td>
                      <td className="py-3 px-4">{fmtDate(a.appointmentDate)}</td>
                      <td className="py-3 px-4" dir="ltr">{a.appointmentTime || "—"}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${meta?.color}`}>{t(meta?.label as never)}</span></td>
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500 max-w-[160px] truncate">{a.notes || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {a.studyId ? (
                            <button onClick={() => navigate(`/radiology/study/${a.studyId}`)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.details.viewDetails") as string}><Info className="w-4 h-4" /></button>
                          ) : null}
                          <button onClick={() => setModal({ ...emptyForm(), id: a.id, patientId: (a as { patientId?: string }).patientId || "", patientName: a.patientName, patientPhone: a.patientPhone || "", patientGender: a.patientGender || "", patientAge: a.patientAge || "", nationalId: (a as { nationalId?: string }).nationalId || "", insuranceNumber: (a as { insuranceNumber?: string }).insuranceNumber || "", patientFlags: parsePatientFlags((a as { patientFlags?: string[] | string }).patientFlags), examTypeIds: Array.isArray((a as { examTypeIds?: string[] | string }).examTypeIds) ? (a as { examTypeIds?: string[] }).examTypeIds || [] : (typeof (a as { examTypeIds?: string | string[] }).examTypeIds === "string" ? JSON.parse((a as { examTypeIds?: string }).examTypeIds || "[]") as string[] : []), deviceId: (a as { deviceId?: string }).deviceId || "", insuranceCompanyId: a.insuranceCompanyId || "", additionIds: Array.isArray(a.additionIds) ? a.additionIds as string[] : (typeof a.additionIds === "string" ? JSON.parse(a.additionIds) as string[] : []), referringPhysicianId: (a as { referringPhysicianId?: string }).referringPhysicianId || "", referralDoctor: a.referralDoctor || "", emergency: !!a.emergency, appointmentDate: a.appointmentDate ? a.appointmentDate.slice(0, 10) : "", appointmentTime: a.appointmentTime || "", status: a.status, notes: a.notes || "" })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.schedule.edit")}><Pencil className="w-4 h-4" /></button>
                          {a.status !== "CANCELLED" && a.status !== "DONE" ? (
                            <button onClick={() => convert(a)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title={t("radiology.schedule.convertToStudy")}><ArrowRightLeft className="w-4 h-4" /></button>
                          ) : null}
                          {STATUS_CHAIN[a.status] ? (
                            <button onClick={() => advance(a)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title={t("radiology.schedule.advanceStatus")}><RefreshCw className="w-4 h-4" /></button>
                          ) : null}
                          <button onClick={() => remove(a)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("radiology.schedule.delete")}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? t("radiology.schedule.editBooking") : (modal.status === "CHECKED_IN" ? t("radiology.schedule.walkInModal") : t("radiology.schedule.newBookingModal"))}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 relative">
                <div className="flex items-center justify-between">
                  <label className={labelCls}>{t("radiology.schedule.patientRequired")}</label>
                  <button type="button" onClick={openNewPatient} className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mb-1"><UserPlus className="w-3.5 h-3.5" />{t("radiology.schedule.addNewPatient")}</button>
                </div>
                <input className={MODAL_INPUT_CLS} value={patientSearch || modal.patientName} onChange={e => { setPatientSearch(e.target.value); if (!e.target.value) setModal({ ...modal, patientId: "", patientName: "", patientPhone: "" }); }} placeholder={t("radiology.schedule.searchPatient")} />
                {patientSearch.trim() && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl">
                    {patientResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">{t("radiology.schedule.noResults")}</div>
                    ) : patientResults.map(p => (
                      <button key={p.id} type="button" onClick={() => pickPatient(p)} className="block w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        <span className="font-medium">{p.firstName} {p.lastName || ""}</span>
                        {p.phone ? <span className="text-xs text-gray-500 dark:text-gray-400"> — {p.phone}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
                {newPatientOpen ? (
                  <div className="mt-3 rounded-lg border dark:border-gray-600 p-3 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t("radiology.schedule.patientName")}</label>
                        <input className={MODAL_INPUT_CLS} value={newPatient.firstName} onChange={e => setNewPatient({ ...newPatient, firstName: e.target.value })} placeholder={t("radiology.schedule.fullNamePlaceholder")} />
                      </div>
                      <div>
                        <label className={labelCls}>{t("radiology.schedule.phone")}</label>
                        <input className={MODAL_INPUT_CLS} dir="ltr" value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} placeholder="01xxxxxxxxx" />
                      </div>
                      <div>
                        <label className={labelCls}>{t("radiology.schedule.gender")}</label>
                        <select className={MODAL_INPUT_CLS} value={newPatient.gender} onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}>
                          <option value="">{t("radiology.gender.unspecified")}</option>
                          <option value="male">{t("radiology.gender.male")}</option>
                          <option value="female">{t("radiology.gender.female")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("radiology.schedule.nationalIdHint")}</label>
                        <div className="flex gap-2">
                          <input className={MODAL_INPUT_CLS} dir="ltr" value={newPatient.nationalId} onChange={e => setNewPatient({ ...newPatient, nationalId: e.target.value.replace(/\D/g, "").slice(0, 14) })} placeholder={t("radiology.schedule.nationalId14")} />
                          <button type="button" onClick={() => openCardScanner("newPatient")} className="shrink-0 flex items-center gap-1 px-3 py-2 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                            <ScanLine className="w-3.5 h-3.5" />{t("radiology.schedule.scanCard")}
                          </button>
                        </div>
                        {newPatient.nationalIdImage ? (
                          <img src={newPatient.nationalIdImage} alt="بطاقة الرقم القومي" className="mt-2 w-24 h-16 object-cover rounded-lg border dark:border-gray-600" />
                        ) : null}
                      </div>
                      <div>
                        <label className={labelCls}>{t("radiology.schedule.birthDate")}</label>
                        <input type="date" className={MODAL_INPUT_CLS} value={newPatient.birthDate} onChange={e => setNewPatient({ ...newPatient, birthDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setNewPatientOpen(false)} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 border rounded-lg">{t("radiology.cancel")}</button>
                      <button type="button" onClick={saveNewPatient} disabled={savingNewPatient} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {savingNewPatient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}{t("radiology.schedule.saveAndSelectPatient")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div>
                <label className={labelCls}>{t("radiology.schedule.phone")}</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.patientPhone} onChange={e => setModal({ ...modal, patientPhone: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t("radiology.schedule.gender")}</label>
                <select className={MODAL_INPUT_CLS} value={modal.patientGender} onChange={e => setModal({ ...modal, patientGender: e.target.value })}>
                  <option value="">{t("radiology.gender.unspecified")}</option>
                  <option value="male">{t("radiology.gender.male")}</option>
                  <option value="female">{t("radiology.gender.female")}</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("radiology.schedule.age")}</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.patientAge} onChange={e => setModal({ ...modal, patientAge: e.target.value })} placeholder={t("radiology.schedule.agePlaceholder")} />
              </div>
              <div className="sm:col-span-2 relative">
                <label className={labelCls}>{t("radiology.schedule.examTypes")} ({modal.examTypeIds.length})</label>
                <div className="relative">
                  <input
                    className={`${MODAL_INPUT_CLS} pl-8`}
                    value={examSearch}
                    onChange={e => { setExamSearch(e.target.value); setExamOpen(true); }}
                    onFocus={() => setExamOpen(true)}
                    onBlur={() => setExamOpen(false)}
                    placeholder={t("radiology.schedule.searchExam")}
                  />
                  <ChevronDown className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  {examOpen ? (
                    <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl" onMouseDown={e => e.preventDefault()}>
                      {examFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">{t("radiology.schedule.noExams")}</div>
                      ) : examFiltered.slice(0, 60).map(et => {
                        const selected = modal.examTypeIds.includes(et.id);
                        return (
                          <button key={et.id} type="button" onClick={() => toggleExam(et.id)} className={`block w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between gap-2 ${selected ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}>
                            <span className="min-w-0">
                              <span className="font-medium">{et.name}</span>
                              {et.category ? <span className="text-xs text-gray-500 dark:text-gray-400"> ({et.category})</span> : null}
                            </span>
                            {selected ? <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">✓</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                {modal.examTypeIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {modal.examTypeIds.map(id => {
                      const et = examTypes.find(t => t.id === id);
                      const cov = coverage[id];
                      return (
                        <span key={id} className={`flex items-center gap-1.5 text-xs border dark:border-gray-600 rounded-full px-2.5 py-1 ${cov && !cov.covered ? "border-amber-500 text-amber-600 dark:text-amber-400" : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"}`}>
                          <span className="font-medium">{et?.name || "—"}</span>
                          {cov && !cov.covered ? <span className="text-[10px] font-semibold">{t("radiology.schedule.notCovered")}</span> : null}
                          <button type="button" onClick={() => toggleExam(id)} className="text-gray-400 hover:text-red-500"><XMarkIcon className="w-3 h-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t("radiology.schedule.priceLabel")}</label>
                <div className="rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {(() => {
                      const exams = modal.examTypeIds.map(id => examTypes.find(t => t.id === id)).filter(Boolean);
                      const base = exams.reduce((s, et) => {
                        const cov = coverage[et?.id || ""];
                        const price = entityPrice !== null && modal.examTypeIds[0] === et?.id ? entityPrice : (cov && cov.entityPrice != null ? cov.entityPrice : (et ? Number(et.price) || 0 : 0));
                        return s + price;
                      }, 0);
                      const add = additions.filter(a => modal.additionIds.includes(a.id)).reduce((s, a) => s + a.price, 0);
                      return `${Number(base + add).toFixed(0)} ${t("radiology.currency")}${entityPrice !== null ? ` (${t("radiology.schedule.tariffSuffix", { name: insuranceCompanies.find(c => c.id === modal.insuranceCompanyId)?.name || t("radiology.schedule.insuranceOptional") })})` : ""}`;
                    })()}
                  </span>
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("radiology.schedule.insuranceOptional")}</label>
                <select className={MODAL_INPUT_CLS} value={modal.insuranceCompanyId} onChange={e => setModal({ ...modal, insuranceCompanyId: e.target.value })}>
                  <option value="">{t("radiology.schedule.directPatientPayment")}</option>
                  {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("radiology.schedule.device")}</label>
                <select className={MODAL_INPUT_CLS} value={modal.deviceId} onChange={e => setModal({ ...modal, deviceId: e.target.value })}>
                  <option value="">{t("radiology.schedule.noDevice")}</option>
                  {devices.filter(d => d.isActive !== false).map(d => (
                    <option key={d.id} value={d.id}>{d.name}{d.room ? ` — ${d.room}` : ""}</option>
                  ))}
                </select>
              </div>
              {modal.insuranceCompanyId && Object.keys(coverage).some(k => !coverage[k]?.covered) ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {t("radiology.schedule.coverageWarning")}
                  </p>
                </div>
              ) : null}
              <div>
                <label className={labelCls}>{t("radiology.schedule.nationalIdHint")}</label>
                <div className="flex gap-2">
                  <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.nationalId} onChange={e => applyNationalId(e.target.value)} placeholder={t("radiology.schedule.nationalId14")} />
                  <button type="button" onClick={() => openCardScanner("modal")} className="shrink-0 flex items-center gap-1 px-3 py-2 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                    <ScanLine className="w-3.5 h-3.5" />{t("radiology.schedule.scanCard")}
                  </button>
                </div>
                {modal.nationalIdImage ? (
                  <img src={modal.nationalIdImage} alt="بطاقة الرقم القومي" className="mt-2 w-24 h-16 object-cover rounded-lg border dark:border-gray-600" />
                ) : null}
              </div>
              <div>
                <label className={labelCls}>{t("radiology.schedule.insuranceNumberLabel")}</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.insuranceNumber} onChange={e => setModal({ ...modal, insuranceNumber: e.target.value })} />
              </div>
              <div className="relative">
                <label className={labelCls}>{t("radiology.schedule.referringDoctor")}</label>
                <input className={MODAL_INPUT_CLS} value={physicianSearch || modal.referralDoctor} onChange={e => { setPhysicianSearch(e.target.value); if (!e.target.value) setModal({ ...modal, referringPhysicianId: "", referralDoctor: "" }); }} placeholder={t("radiology.schedule.searchDoctor")} />
                {physicianSearch.trim() && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl">
                    {physicianResults.length === 0 ? <div className="px-3 py-2 text-sm text-gray-500">{t("radiology.schedule.noResults")}</div> : physicianResults.map(p => (
                      <button key={p.id} type="button" onClick={() => pickPhysician(p)} className="block w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"><span className="font-medium">{p.name}</span></button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>{t("radiology.schedule.date")}</label>
                <input type="date" className={MODAL_INPUT_CLS} value={modal.appointmentDate} onChange={e => setModal({ ...modal, appointmentDate: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t("radiology.schedule.time")}</label>
                <input type="time" className={MODAL_INPUT_CLS} value={modal.appointmentTime} onChange={e => setModal({ ...modal, appointmentTime: e.target.value })} />
                {(() => {
                  const d = modal.appointmentDate, tm = modal.appointmentTime;
                  if (!d || !tm) return null;
                  const clash = items.find(a => a.id !== modal.id && a.status !== "CANCELLED" && a.appointmentDate?.slice(0, 10) === d && a.appointmentTime === tm);
                  return clash ? (
                    <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {t("radiology.schedule.timeSlotTaken", { name: clash.patientName })}
                    </p>
                  ) : null;
                })()}
              </div>
              {additions.length > 0 ? (
                <div className="sm:col-span-2">
                  <label className={labelCls}>{t("radiology.schedule.examAdditions")}</label>
                  <div className="flex flex-wrap gap-2">
                    {additions.map(a => (
                      <label key={a.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-600 rounded-lg px-3 py-1.5 cursor-pointer">
                        <input type="checkbox" checked={modal.additionIds.includes(a.id)} onChange={() => setModal({ ...modal, additionIds: modal.additionIds.includes(a.id) ? modal.additionIds.filter(x => x !== a.id) : [...modal.additionIds, a.id] })} className="rounded border-gray-300 dark:border-gray-600" />
                        {a.name} ({Number(a.price).toFixed(0)} {t("radiology.currency")})
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="sm:col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.emergency} onChange={e => setModal({ ...modal, emergency: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />{t("radiology.schedule.emergencyCase")}
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t("radiology.schedule.medicalRiskFlags")}</label>
                <div className="flex flex-wrap gap-2">
                  {RADIOLOGY_PATIENT_FLAGS.map(f => (
                    <label key={f.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-600 rounded-lg px-3 py-1.5 cursor-pointer">
                      <input type="checkbox" checked={modal.patientFlags.includes(f.value)} onChange={() => setModal({ ...modal, patientFlags: modal.patientFlags.includes(f.value) ? modal.patientFlags.filter(x => x !== f.value) : [...modal.patientFlags, f.value] })} className="rounded border-gray-300 dark:border-gray-600" />
                      {t(f.label)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t("radiology.schedule.notes")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.notes} onChange={e => setModal({ ...modal, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg disabled:opacity-50">{t("radiology.cancel")}</button>
              {!modal.id && modal.status === "CHECKED_IN" ? (
                <button onClick={() => save(true)} disabled={saving} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}{t("radiology.schedule.saveAndConvert")}
                </button>
              ) : (
                <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={cardInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { handleCardScanFile(e.target.files?.[0] || null); e.target.value = ""; }}
      />

      {cardScan && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => { setCardScan(null); setCardScanTarget(null); }}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("radiology.schedule.cardScanTitle")}</h3>
              <button onClick={() => { setCardScan(null); setCardScanTarget(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <img src={cardScan} alt="البطاقة" className="w-full max-h-64 object-contain rounded-lg border dark:border-gray-600 mb-4" />
            {cardOcrBusy ? (
              <p className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-3">
                <Loader2 className="w-4 h-4 animate-spin" />{t("radiology.schedule.cardOcrReading")}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t("radiology.schedule.cardScanHint")}</p>
            )}
            {cardScanTarget === "newPatient" ? (
              <input className={MODAL_INPUT_CLS} dir="ltr" value={newPatient.nationalId} onChange={e => setNewPatient({ ...newPatient, nationalId: e.target.value.replace(/\D/g, "").slice(0, 14) })} placeholder={t("radiology.schedule.nationalId14")} />
            ) : (
              <input className={MODAL_INPUT_CLS} dir="ltr" value={modal?.nationalId || ""} onChange={e => applyNationalId(e.target.value)} placeholder={t("radiology.schedule.nationalId14")} />
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setCardScan(null); setCardScanTarget(null); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg">{t("radiology.cancel")}</button>
              <button onClick={applyScannedCard} disabled={cardOcrBusy} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t("radiology.schedule.cardScanConfirm")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
