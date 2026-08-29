import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BadgePercent, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Users, X as XMarkIcon } from "lucide-react";
import {
  DentalLabDoctor, DentalWorkType, fetchDoctors, createDoctor, updateDoctor, deleteDoctor,
  fetchWorkTypes, fetchDoctorPricing, saveDoctorPricing,
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

interface DoctorForm {
  id?: string;
  name: string;
  phone: string;
  clinicName: string;
  governorate: string;
  portalPin: string;
  creditLimit: number;
  notes: string;
  isActive: boolean;
}

export default function DentalDoctorsTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalLabDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<DoctorForm | null>(null);
  const [pricingDoctor, setPricingDoctor] = useState<DentalLabDoctor | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    setLoading(true);
    try {
      let data = await fetchDoctors();
      if (search.trim()) {
        const q = search.trim();
        data = data.filter(d => d.name.includes(q) || (d.phone || "").includes(q) || (d.clinicName || "").includes(q));
      }
      setRows(data);
      setError(null);
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setError(null);
    setModal({ name: "", phone: "", clinicName: "", governorate: "", portalPin: "", creditLimit: 0, notes: "", isActive: true });
  };

  const openEdit = (d: DentalLabDoctor) => {
    setError(null);
    setModal({
      id: d.id,
      name: d.name,
      phone: d.phone || "",
      clinicName: d.clinicName || "",
      governorate: d.governorate || "",
      portalPin: d.portalPin || "",
      creditLimit: d.creditLimit ?? 0,
      notes: d.notes || "",
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
      await deleteDoctor(d.id);
      toast.success(t("dentalLab.doctors.deleted"));
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.doctors.ledger.totalOutstanding")}</p>
          <p className="text-xl font-bold mt-1">{fmtMoney(rows.reduce((s, d) => s + (d.outstanding ?? 0), 0))} {t("dentalLab.common.egp")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.doctors.ledger.totalBilled")}</p>
          <p className="text-xl font-bold mt-1">{fmtMoney(rows.reduce((s, d) => s + (d.totalBilled ?? 0), 0))} {t("dentalLab.common.egp")}</p>
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
            <h3 className="font-semibold">{t("dentalLab.doctors.title")}</h3>
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
            <Users className="w-10 h-10 mx-auto mb-3" />
            {t("dentalLab.common.noResults")}
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
                    <td className="py-3 px-3 font-medium">{d.name}</td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400" dir="ltr">{d.phone || "—"}</td>
                    <td className="py-3 px-3">{d.clinicName || "—"}</td>
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
                        <button onClick={() => openEdit(d)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title={t("dentalLab.common.edit")}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPricingDoctor(d)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title={t("dentalLab.doctors.pricing.title")}>
                          <BadgePercent className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(d)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title={t("dentalLab.common.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pricingDoctor && (
        <PricingModal
          doctor={pricingDoctor}
          onClose={() => setPricingDoctor(null)}
          onSaved={() => { setPricingDoctor(null); load(true); }}
        />
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
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