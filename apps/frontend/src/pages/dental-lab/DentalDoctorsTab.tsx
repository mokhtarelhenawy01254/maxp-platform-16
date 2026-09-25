import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Archive, BadgePercent, Banknote, Eye, Loader2, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, Users, X as XMarkIcon } from "lucide-react";
import {
  DentalLabDoctor, ClinicDoctorItem, DentalWorkType, fetchDoctors, fetchDoctorsFull, createDoctor, updateDoctor, deleteDoctor,
  restoreDoctor, permanentDeleteDoctor,
  fetchWorkTypes, fetchDoctorPricing, saveDoctorPricing, recordDoctorBulkPayment,
  MODAL_CONTENT_CLS, MODAL_INPUT_CLS, fmtMoney,
} from "./shared";

function PricingModal({ doctor, onClose, onSaved }: { doctor: DentalLabDoctor; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [wts, existing] = await Promise.all([fetchWorkTypes(), fetchDoctorPricing(doctor.id).catch(() => ({}))]);
        setWorkTypes(wts.filter(w => w.isActive));
        const map: Record<string, string> = {};
        for (const w of wts) map[w.id] = existing[w.id] != null ? String(existing[w.id]) : "";
        setPrices(map);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
      } finally {
        setLoading(false);
      }
    })();
  }, [doctor.id, t]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const clean: Record<string, number> = {};
      for (const [id, v] of Object.entries(prices)) {
        if (v.trim() !== "") clean[id] = Number(v);
      }
      await saveDoctorPricing(doctor.id, clean);
      toast.success(t("dentalLab.doctors.pricing.saved"));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">{t("dentalLab.doctors.pricing.title")}</h3>
          <button onClick={onClose} disabled={saving} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{doctor.name} — {t("dentalLab.doctors.pricing.hint")}</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-3">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {workTypes.map(w => (
              <div key={w.id} className="flex items-center justify-between gap-3 border dark:border-gray-700 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{w.name}</p>
                  <p className="text-xs text-gray-400">{t("dentalLab.doctors.pricing.defaultPrice")}: {fmtMoney(w.price)}</p>
                </div>
                <input
                  className={`${inputCls} w-28`}
                  type="number"
                  placeholder={t("dentalLab.doctors.pricing.emptyDefault")}
                  value={prices[w.id] ?? ""}
                  onChange={e => setPrices(prev => ({ ...prev, [w.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgePercent className="w-4 h-4" />}
            {saving ? t("dentalLab.common.saving") : t("dentalLab.doctors.pricing.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkPaymentModal({ doctor, onClose, onSaved }: { doctor: DentalLabDoctor; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(doctor.outstanding ?? ""));
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      setError("يرجى إدخال مبلغ صحيح");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await recordDoctorBulkPayment(doctor.id, { amount: val, method, note });
      toast.success(`تم تسجيل دفعة بقيمة ${fmtMoney(res.totalPaid)} وتوزيعها على ${res.allocations.length} فاتورة`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-600" />
            تحصيل دفعة على الحساب
          </h3>
          <button onClick={onClose} disabled={saving} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          الطبيب: <span className="font-semibold text-gray-800 dark:text-gray-200">{doctor.name}</span> — المتبقي الحالي: <span className="font-semibold text-red-600">{fmtMoney(doctor.outstanding ?? 0)}</span>
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-3">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">المبلغ المحصل *</label>
            <input
              type="number"
              className={MODAL_INPUT_CLS}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">سيتم توزيع المبلغ تلقائياً على الفواتير المفتوحة والأقدم أولاً (FIFO).</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">طريقة الدفع</label>
            <select className={MODAL_INPUT_CLS} value={method} onChange={e => setMethod(e.target.value)}>
              <option value="CASH">نقدي (كاش)</option>
              <option value="BANK">تحويل بنكي</option>
              <option value="VODAFONE_CASH">فودافون كاش / محفظة</option>
              <option value="CARD">بطاقة / فيزا</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ملاحظات أو رقم الإيصال</label>
            <input className={MODAL_INPUT_CLS} value={note} onChange={e => setNote(e.target.value)} placeholder="مثلاً: إيصال رقم #..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || !amount || Number(amount) <= 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
            {saving ? t("dentalLab.common.saving") : "تسجيل الدفعة وتوزيعها"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DoctorForm {
  id?: string;
  name: string;
  phone: string;
  clinicName: string;
  governorate: string;
  portalPin: string;
  creditLimit: number;
  notes: string;
  doctors?: ClinicDoctorItem[];
  isActive: boolean;
}

export default function DentalDoctorsTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalLabDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [summary, setSummary] = useState<{ totalBilled: number; totalPaid: number; totalOutstanding: number } | null>(null);
  const [modal, setModal] = useState<DoctorForm | null>(null);
  const [pricingDoctor, setPricingDoctor] = useState<DentalLabDoctor | null>(null);
  const [bulkDoctor, setBulkDoctor] = useState<DentalLabDoctor | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // حقول إضافة دكتور فرعي داخل العيادة
  const [docNameInput, setDocNameInput] = useState("");
  const [docPhoneInput, setDocPhoneInput] = useState("");
  const [docSpecInput, setDocSpecInput] = useState("");

  const handleAddClinicDoctor = () => {
    if (!docNameInput.trim() || !modal) return;
    const newDoc: ClinicDoctorItem = {
      id: "doc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: docNameInput.trim(),
      phone: docPhoneInput.trim() || undefined,
      specialty: docSpecInput.trim() || undefined,
    };
    setModal({
      ...modal,
      doctors: [...(modal.doctors || []), newDoc],
    });
    setDocNameInput("");
    setDocPhoneInput("");
    setDocSpecInput("");
  };

  const handleRemoveClinicDoctor = (index: number) => {
    if (!modal) return;
    const list = [...(modal.doctors || [])];
    list.splice(index, 1);
    setModal({ ...modal, doctors: list });
  };

  const load = useCallback(async (quiet = false) => {
    setLoading(true);
    try {
      const res = await fetchDoctorsFull({
        search: search.trim() || undefined,
        archived: viewMode === "ARCHIVED",
      });
      setRows(res.items);
      setActiveCount(res.activeCount);
      setArchivedCount(res.archivedCount);
      if (res.summary) setSummary(res.summary);
      setError(null);
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [search, viewMode, t]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setError(null);
    setDocNameInput("");
    setDocPhoneInput("");
    setDocSpecInput("");
    setModal({ name: "", phone: "", clinicName: "", governorate: "", portalPin: "", creditLimit: 0, notes: "", doctors: [], isActive: true });
  };

  const openEdit = (d: DentalLabDoctor) => {
    setError(null);
    setDocNameInput("");
    setDocPhoneInput("");
    setDocSpecInput("");
    setModal({
      id: d.id,
      name: d.name,
      phone: d.phone || "",
      clinicName: d.clinicName || "",
      governorate: d.governorate || "",
      portalPin: d.portalPin || "",
      creditLimit: d.creditLimit ?? 0,
      notes: d.notes || "",
      doctors: Array.isArray(d.doctors) ? JSON.parse(JSON.stringify(d.doctors)) : [],
      isActive: d.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) { setError(t("dentalLab.common.name")); return; }
    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        phone: modal.phone.trim() || undefined,
        clinicName: modal.clinicName.trim() || undefined,
        governorate: modal.governorate.trim() || undefined,
        portalPin: modal.portalPin.trim() || undefined,
        creditLimit: Number(modal.creditLimit) || 0,
        notes: modal.notes.trim() || undefined,
        doctors: modal.doctors && modal.doctors.length > 0 ? modal.doctors : [],
      };
      if (modal.id) {
        await updateDoctor(modal.id, { ...payload, isActive: modal.isActive });
        toast.success(t("dentalLab.doctors.updated"));
      } else {
        await createDoctor({ ...payload, isActive: true });
        toast.success(t("dentalLab.doctors.created"));
      }
      setModal(null);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: DentalLabDoctor) => {
    if (removingId) return;
    if (!window.confirm(`${t("dentalLab.common.confirmDelete")} (${d.name})`)) return;
    setRemovingId(d.id);
    try {
      const res = await deleteDoctor(d.id);
      toast.success(res.message || t("dentalLab.doctors.deleted"));
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingId(null);
    }
  };

  const handleRestore = async (d: DentalLabDoctor) => {
    if (removingId) return;
    setRemovingId(d.id);
    try {
      await restoreDoctor(d.id);
      toast.success("تمت استعادة الطبيب إلى القائمة النشطة بنجاح");
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingId(null);
    }
  };

  const handlePermanentDelete = async (d: DentalLabDoctor) => {
    if (removingId) return;
    if (!window.confirm(`تحذير: هل أنت متأكد من الحذف النهائي للطبيب (${d.name}) من قاعدة البيانات بالكامل؟`)) return;
    setRemovingId(d.id);
    try {
      await permanentDeleteDoctor(d.id);
      toast.success("تم حذف الطبيب نهائياً من قاعدة البيانات");
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingId(null);
    }
  };

  const toggleActive = async (d: DentalLabDoctor) => {
    try {
      await updateDoctor(d.id, { isActive: !d.isActive });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.doctors.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" />{t("dentalLab.doctors.newDoctor")}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      {/* View Switcher Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border dark:border-gray-700 w-fit">
          <button
            onClick={() => setViewMode("ACTIVE")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === "ACTIVE"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>الأطباء النشطين</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => setViewMode("ARCHIVED")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === "ARCHIVED"
                ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>الأطباء المؤرشفين</span>
            {archivedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                {archivedCount}
              </span>
            )}
          </button>
        </div>

        {viewMode === "ARCHIVED" && (
          <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg">
            الأطباء المؤرشفين محتفظ بسجلاتهم المالية السابقة ولا يمكن تعيين حالات جديدة لهم.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.doctors.ledger.totalOutstanding")}</p>
          <p className="text-xl font-bold mt-1">
            {fmtMoney(summary ? summary.totalOutstanding : rows.reduce((s, d) => s + (d.outstanding ?? 0), 0))} {t("dentalLab.common.egp")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.doctors.ledger.totalBilled")}</p>
          <p className="text-xl font-bold mt-1">
            {fmtMoney(summary ? summary.totalBilled : rows.reduce((s, d) => s + (d.totalBilled ?? 0), 0))} {t("dentalLab.common.egp")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.doctors.ledger.overCredit")}</p>
          <p className={`text-xl font-bold mt-1 ${rows.some(d => d.creditExceeded) ? "text-red-600 dark:text-red-400" : ""}`}>
            {rows.filter(d => d.creditExceeded).length} {t("dentalLab.common.doctor")}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold">{viewMode === "ACTIVE" ? t("dentalLab.doctors.title") : "الأطباء المؤرشفين"}</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t("dentalLab.doctors.ledger.title")}</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
            <input className={`${inputCls} pr-9 w-64`} value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("dentalLab.common.search")} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            {viewMode === "ACTIVE" ? (
              <>
                <Users className="w-10 h-10 mx-auto mb-3" />
                {t("dentalLab.common.noResults")}
              </>
            ) : (
              <>
                <Archive className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                <p>لا يوجد أطباء في الأرشيف</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  {[t("dentalLab.common.name"), t("dentalLab.common.phone"), t("dentalLab.doctors.clinicName"), t("dentalLab.doctors.governorate"), t("dentalLab.doctors.ledger.billed"), t("dentalLab.doctors.ledger.paid"), t("dentalLab.doctors.ledger.outstanding"), t("dentalLab.doctors.ledger.activeCases"), t("dentalLab.doctors.creditLimit"), t("dentalLab.doctors.ledger.creditStatus"), t("dentalLab.common.status"), t("dentalLab.common.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(d => (
                  <tr key={d.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-3 font-bold">
                      <Link
                        to={`/dental-lab/doctors/${d.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                        title="عرض صفحة تفاصيل الطبيب"
                      >
                        <span>{d.name}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400" dir="ltr">{d.phone || "—"}</td>
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{d.clinicName || "—"}</span>
                        {d.doctors && d.doctors.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
                              <Users className="w-3 h-3" /> {d.doctors.length} أطباء بالعيادة
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">{d.governorate || "—"}</td>
                    <td className="py-3 px-3">{fmtMoney(d.totalBilled ?? 0)}</td>
                    <td className="py-3 px-3 text-green-600 dark:text-green-400">{fmtMoney(d.totalPaid ?? 0)}</td>
                    <td className={`py-3 px-3 font-semibold ${(d.outstanding ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                      {fmtMoney(d.outstanding ?? 0)}
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-300">
                      {d.activeCases ?? 0}
                      {(d.overdueCases ?? 0) > 0 && (
                        <span className="mr-1 text-xs text-red-500">({d.overdueCases} {t("dentalLab.doctors.ledger.overdue")})</span>
                      )}
                    </td>
                    <td className="py-3 px-3">{d.creditLimit ? fmtMoney(d.creditLimit) : "—"}</td>
                    <td className="py-3 px-3">
                      {d.creditExceeded ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                          {t("dentalLab.doctors.ledger.creditExceeded")}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800">
                          {t("dentalLab.doctors.ledger.creditOk")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => toggleActive(d)}
                        className={`text-xs px-2 py-0.5 rounded-full border ${d.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}
                      >
                        {d.isActive ? t("dentalLab.common.active") : t("dentalLab.common.inactive")}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        <Link
                          to={`/dental-lab/doctors/${d.id}`}
                          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="عرض تفاصيل الطبيب"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {viewMode === "ACTIVE" ? (
                          <>
                            <button onClick={() => openEdit(d)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title={t("dentalLab.common.edit")}>
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setBulkDoctor(d)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="تحصيل دفعة على الحساب">
                              <Banknote className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPricingDoctor(d)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title={t("dentalLab.doctors.pricing.title")}>
                              <BadgePercent className="w-4 h-4" />
                            </button>
                            <button onClick={() => remove(d)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="أرشفة / حذف الطبيب">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleRestore(d)} disabled={removingId !== null} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg disabled:opacity-40" title="استعادة إلى القائمة النشطة">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPricingDoctor(d)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title={t("dentalLab.doctors.pricing.title")}>
                              <BadgePercent className="w-4 h-4" />
                            </button>
                            <button onClick={() => handlePermanentDelete(d)} disabled={removingId !== null} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="حذف نهائي من قاعدة البيانات">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {bulkDoctor && (
        <BulkPaymentModal
          doctor={bulkDoctor}
          onClose={() => setBulkDoctor(null)}
          onSaved={() => { setBulkDoctor(null); load(true); }}
        />
      )}

      {pricingDoctor && (
        <PricingModal
          doctor={pricingDoctor}
          onClose={() => setPricingDoctor(null)}
          onSaved={() => { setPricingDoctor(null); load(true); }}
        />
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3" onClick={() => !saving && setModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? t("dentalLab.doctors.editTitle") : t("dentalLab.doctors.createTitle")}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("dentalLab.common.name")} *</label>
                <input className={inputCls} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.common.phone")}</label>
                <input className={inputCls} value={modal.phone} onChange={e => setModal({ ...modal, phone: e.target.value })} dir="ltr" />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.doctors.clinicName")}</label>
                <input className={inputCls} value={modal.clinicName} onChange={e => setModal({ ...modal, clinicName: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.doctors.governorate")}</label>
                <input className={inputCls} value={modal.governorate} onChange={e => setModal({ ...modal, governorate: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.doctors.portalPin")}</label>
                <input className={inputCls} value={modal.portalPin} onChange={e => setModal({ ...modal, portalPin: e.target.value })} dir="ltr" />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.doctors.creditLimit")}</label>
                <input className={inputCls} type="number" value={modal.creditLimit} onChange={e => setModal({ ...modal, creditLimit: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t("dentalLab.common.notes")}</label>
                <textarea className={`${inputCls} min-h-[70px] resize-y`} value={modal.notes} onChange={e => setModal({ ...modal, notes: e.target.value })} />
              </div>

              {/* قائمة أطباء العيادة (للمراكز والعيادات التي تضم أكثر من طبيب) */}
              <div className="sm:col-span-2 border-t dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>أطباء العيادة / الفريق الطبي التابع للعيادة</span>
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">إذا كانت العيادة أو المركز يضم أكثر من دكتور، يمكنك تسجيل أسمائهم هنا لربط أوردراتهم بنفس حساب العيادة الموحد دون تشتيت الحسابات.</p>
                  </div>
                </div>

                {/* فورم إضافة دكتور للعيادة */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg border dark:border-gray-700 mb-3">
                  <input
                    className={`${inputCls} text-xs`}
                    placeholder="اسم الدكتور (مثال: د. سارة أحمد)"
                    value={docNameInput}
                    onChange={e => setDocNameInput(e.target.value)}
                  />
                  <input
                    className={`${inputCls} text-xs`}
                    placeholder="التخصص (مثال: تركيبات / زراعة)"
                    value={docSpecInput}
                    onChange={e => setDocSpecInput(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input
                      className={`${inputCls} text-xs flex-1`}
                      placeholder="الهاتف (اختياري)"
                      value={docPhoneInput}
                      onChange={e => setDocPhoneInput(e.target.value)}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      disabled={!docNameInput.trim()}
                      onClick={handleAddClinicDoctor}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-40 shrink-0"
                    >
                      إضافة
                    </button>
                  </div>
                </div>

                {/* قائمة الأطباء المضافين */}
                {modal.doctors && modal.doctors.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {modal.doctors.map((doc, idx) => (
                      <div key={doc.id || idx} className="flex items-center justify-between bg-white dark:bg-gray-800 border dark:border-gray-700 px-3 py-1.5 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{doc.name}</span>
                          {doc.specialty && <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px]">{doc.specialty}</span>}
                          {doc.phone && <span className="text-gray-400 text-[10px]" dir="ltr">{doc.phone}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveClinicDoctor(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                          title="حذف الطبيب من العيادة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">لم يتم إضافة أطباء إضافيين للعيادة بعد (الحساب يسجل باسم الطبيب الرئيسي أعلاه).</p>
                )}
              </div>

              {modal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
                  <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  {t("dentalLab.common.active")}
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                {t("dentalLab.common.cancel")}
              </button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}