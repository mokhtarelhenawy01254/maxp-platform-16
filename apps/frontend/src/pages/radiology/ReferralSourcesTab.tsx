import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Building2, Stethoscope } from "lucide-react";
import { api, bookingApi, fetchJson, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface ReferralSource {
  id: string;
  name: string;
  type: string;
  phone?: string | null;
  contactName?: string | null;
  marketingRepId?: string | null;
  marketingRepName?: string | null;
  insuranceCompanyId?: string | null;
  physicians?: { id: string; name: string }[];
  isActive?: boolean;
}

interface MarketingRep { id: string; name: string; }
interface Physician { id: string; name: string; }
interface InsuranceEntity { id: string; name: string; }

const TYPE_LABEL: Record<string, string> = {
  CLINIC: "radiology.referralSources.typeClinic",
  MEDICAL_CENTER: "radiology.referralSources.typeMedicalCenter",
  LAB: "radiology.referralSources.typeLab",
  HOSPITAL: "radiology.referralSources.typeHospital",
  COMPANY: "radiology.referralSources.typeCompany",
  MEDICAL_NETWORK: "radiology.referralSources.typeMedicalNetwork",
  OTHER: "radiology.referralSources.typeOther",
};

export default function ReferralSourcesTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ReferralSource[]>([]);
  const [reps, setReps] = useState<MarketingRep[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [entities, setEntities] = useState<InsuranceEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ReferralSource | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("OTHER");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [marketingRepId, setMarketingRepId] = useState("");
  const [insuranceCompanyId, setInsuranceCompanyId] = useState("");
  const [selectedPhysicianIds, setSelectedPhysicianIds] = useState<string[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sources, repList, physList, entList] = await Promise.all([
        fetchJson<ReferralSource[]>(api("referral-sources")),
        fetchJson<MarketingRep[]>(api("marketing-reps")).catch(() => []),
        fetchJson<Physician[]>(api("referring-physicians?limit=1000")).catch(() => []),
        fetchJson<InsuranceEntity[]>(bookingApi("insurance-companies")).catch(() => []),
      ]);
      setItems(Array.isArray(sources) ? sources : []);
      setReps(Array.isArray(repList) ? repList : []);
      setPhysicians(Array.isArray(physList) ? physList : []);
      setEntities(Array.isArray(entList) ? entList : []);
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : t("radiology.referralSources.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setModal({ id: "", name: "", type: "OTHER" });
    setName(""); setType("OTHER"); setPhone(""); setContactName("");
    setMarketingRepId(""); setInsuranceCompanyId(""); setSelectedPhysicianIds([]);
  };

  const save = async () => {
    if (saving) return;
    if (!name.trim()) { toast.error(t("radiology.referralSources.nameRequired")); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        phone: phone.trim() || undefined,
        contactName: contactName.trim() || undefined,
        marketingRepId: marketingRepId || undefined,
        insuranceCompanyId: insuranceCompanyId || undefined,
      };
      if (modal?.id) {
        await fetchJson(api(`referral-sources/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
        await fetchJson(api(`referral-sources/${modal.id}/physicians`), { method: "PUT", body: JSON.stringify({ physicianIds: selectedPhysicianIds }) });
      } else {
        const created = await fetchJson<{ id: string }>(api("referral-sources"), { method: "POST", body: JSON.stringify(payload) });
        await fetchJson(api(`referral-sources/${created.id}/physicians`), { method: "PUT", body: JSON.stringify({ physicianIds: selectedPhysicianIds }) });
      }
      toast.success(modal?.id ? t("radiology.referralSources.updated") : t("radiology.referralSources.added"));
      setModal(null);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.referralSources.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: ReferralSource) => {
    try {
      await fetchJson(api(`referral-sources/${c.id}`), { method: "PUT", body: JSON.stringify({ isActive: c.isActive === false }) });
      toast.success(c.isActive === false ? t("radiology.referralSources.activated") : t("radiology.referralSources.deactivated"));
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.referralSources.updateFailed"));
    }
  };

  const openEdit = (s: ReferralSource) => {
    setModal(s);
    setName(s.name); setType(s.type || "OTHER"); setPhone(s.phone || ""); setContactName(s.contactName || "");
    setMarketingRepId(s.marketingRepId || ""); setInsuranceCompanyId(s.insuranceCompanyId || "");
    setSelectedPhysicianIds((s.physicians || []).map(p => p.id));
  };

  const togglePhysician = (id: string) => {
    setSelectedPhysicianIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.referralSources.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.referralSources.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm"><RefreshCw className="w-4 h-4" />{t("radiology.refresh")}</button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Plus className="w-4 h-4" />{t("radiology.referralSources.newSource")}</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">{t("radiology.referralSources.noSources")}</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">{t("radiology.referralSources.source")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.referralSources.type")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.referralSources.rep")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.referralSources.physicians")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.referralSources.status")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.referralSources.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-b dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 font-medium"><span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{c.name}</span></td>
                  <td className="py-3 px-4">{TYPE_LABEL[c.type] ? t(TYPE_LABEL[c.type]) : c.type}</td>
                  <td className="py-3 px-4">{c.marketingRepName || "ΓÇö"}</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 flex-wrap">
                      <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                      {(c.physicians || []).length > 0
                        ? (c.physicians || []).map(p => <span key={p.id} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">{p.name}</span>)
                        : <span className="text-gray-400">ΓÇö</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.isActive === false ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"}`}>
                      {c.isActive === false ? t("radiology.referralSources.inactive") : t("radiology.referralSources.active")}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg">{t("radiology.referralSources.edit")}</button>
                      <button onClick={() => toggle(c)} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg">{c.isActive === false ? t("radiology.referralSources.activate") : t("radiology.referralSources.deactivate")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? t("radiology.referralSources.editSource") : t("radiology.referralSources.newSourceModal")}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referralSources.nameRequired")}</label>
                <input className={MODAL_INPUT_CLS} value={name} onChange={e => setName(e.target.value)} placeholder={t("radiology.referralSources.namePlaceholder")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referralSources.type")}</label>
                <select className={MODAL_INPUT_CLS} value={type} onChange={e => setType(e.target.value)}>
                  {Object.keys(TYPE_LABEL).map(k => <option key={k} value={k}>{t(TYPE_LABEL[k])}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referralSources.phone")}</label>
                  <input className={MODAL_INPUT_CLS} value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referralSources.contactName")}</label>
                  <input className={MODAL_INPUT_CLS} value={contactName} onChange={e => setContactName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referralSources.rep")}</label>
                <select className={MODAL_INPUT_CLS} value={marketingRepId} onChange={e => setMarketingRepId(e.target.value)}>
                  <option value="">{t("radiology.referralSources.noRep")}</option>
                  {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referralSources.insuranceLink")}</label>
                <select className={MODAL_INPUT_CLS} value={insuranceCompanyId} onChange={e => setInsuranceCompanyId(e.target.value)}>
                  <option value="">{t("radiology.referralSources.noInsuranceLink")}</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referralSources.linkPhysicians")}</label>
                <div className="border rounded-lg p-2 max-h-40 overflow-y-auto dark:border-gray-600">
                  {physicians.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">{t("radiology.referralSources.noPhysiciansAvailable")}</p>
                  ) : physicians.map(p => (
                    <label key={p.id} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedPhysicianIds.includes(p.id)} onChange={() => togglePhysician(p.id)} className="accent-blue-600" />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg disabled:opacity-50">{t("radiology.cancel")}</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
