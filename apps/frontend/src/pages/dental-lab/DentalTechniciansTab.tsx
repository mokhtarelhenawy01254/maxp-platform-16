import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Users, Wallet, X as XMarkIcon } from "lucide-react";
import {
  DentalTechnician, DentalTechnicianRole, fetchTechnicians, createTechnician, updateTechnician, deleteTechnician,
  fetchTeam, TeamMember,
  ROLE_CONFIG, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, fmtMoney,
} from "./shared";

interface TechnicianForm {
  id?: string;
  name: string;
  phone: string;
  role: DentalTechnicianRole;
  userId: string;
  wagePerStage: string;
  isActive: boolean;
}

export default function DentalTechniciansTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalTechnician[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [wageDefault, setWageDefault] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<TechnicianForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    setLoading(true);
    try {
      const [data, teamRows] = await Promise.all([
        fetchTechnicians(),
        fetchTeam().catch(() => [] as TeamMember[]),
      ]);
      let list = data.items || [];
      if (search.trim()) {
        const q = search.trim();
        list = list.filter(x => x.name.includes(q) || (x.phone || "").includes(q));
      }
      setRows(list);
      setTeam(teamRows);
      setWageDefault(data.wageDefaults?.defaultPerStage ?? 0);
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
    setModal({ name: "", phone: "", role: "TECHNICIAN", userId: "", wagePerStage: "", isActive: true });
  };

  const openEdit = (x: DentalTechnician) => {
    setError(null);
    setModal({
      id: x.id,
      name: x.name,
      phone: x.phone || "",
      role: x.role,
      userId: x.userId || "",
      wagePerStage: x.wagePerStage != null ? String(x.wagePerStage) : "",
      isActive: x.isActive,
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
        role: modal.role,
        userId: modal.userId.trim() || undefined,
        wagePerStage: modal.wagePerStage.trim() === "" ? undefined : Number(modal.wagePerStage),
      };
      if (modal.id) {
        await updateTechnician(modal.id, { ...payload, isActive: modal.isActive });
        toast.success(t("dentalLab.technicians.updated"));
      } else {
        await createTechnician({ ...payload, isActive: true });
        toast.success(t("dentalLab.technicians.created"));
      }
      setModal(null);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (x: DentalTechnician) => {
    if (removingId) return;
    if (!window.confirm(`${t("dentalLab.common.confirmDelete")} (${x.name})`)) return;
    setRemovingId(x.id);
    try {
      await deleteTechnician(x.id);
      toast.success(t("dentalLab.technicians.deleted"));
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingId(null);
    }
  };

  const toggleActive = async (x: DentalTechnician) => {
    try {
      await updateTechnician(x.id, { isActive: !x.isActive });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const roleBadge = (role: string) => {
    const meta = ROLE_CONFIG[role as DentalTechnicianRole];
    if (!meta) return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{role}</span>;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${meta.color}`}>{meta.label}</span>;
  };

  const teamName = (userId?: string) => {
    if (!userId) return "—";
    const m = team.find(mm => mm.userId === userId);
    return m ? (m.name || m.email || userId) : userId;
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const totalWages = rows.reduce((s, x) => s + (x.totalEarnings ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.technicians.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" />{t("dentalLab.technicians.newTechnician")}
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
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.technicians.wages.defaultRate")}</p>
          <p className="text-xl font-bold mt-1">{fmtMoney(wageDefault)} {t("dentalLab.common.egp")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.technicians.wages.totalWages")}</p>
          <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{fmtMoney(totalWages)} {t("dentalLab.common.egp")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.technicians.wages.count")}</p>
          <p className="text-xl font-bold mt-1">{rows.length} {t("dentalLab.technicians.wages.techs")}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold">{t("dentalLab.technicians.title")}</h3>
            <Wallet className="w-4 h-4 text-gray-400" />
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
                  {[t("dentalLab.common.name"), t("dentalLab.common.phone"), t("dentalLab.technicians.role"), t("dentalLab.technicians.wages.rate"), t("dentalLab.technicians.wages.done"), t("dentalLab.technicians.wages.earned"), t("dentalLab.technicians.wages.account"), t("dentalLab.common.status"), t("dentalLab.common.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(x => (
                  <tr key={x.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-3 font-medium">{x.name}</td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400" dir="ltr">{x.phone || "—"}</td>
                    <td className="py-3 px-3">{roleBadge(x.role)}</td>
                    <td className="py-3 px-3">{x.wagePerStage != null ? fmtMoney(x.wagePerStage) : t("dentalLab.technicians.wages.default")}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-300">{x.completedStages ?? 0}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(x.totalEarnings)}</td>
                    <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{teamName(x.userId)}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => toggleActive(x)}
                        className={`text-xs px-2 py-0.5 rounded-full border ${x.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}
                      >
                        {x.isActive ? t("dentalLab.common.active") : t("dentalLab.common.inactive")}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(x)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title={t("dentalLab.common.edit")}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(x)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title={t("dentalLab.common.delete")}>
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

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? t("dentalLab.technicians.editTitle") : t("dentalLab.technicians.createTitle")}</h3>
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
                <label className={labelCls}>{t("dentalLab.technicians.role")}</label>
                <select className={inputCls} value={modal.role} onChange={e => setModal({ ...modal, role: e.target.value as DentalTechnicianRole })}>
                  {(Object.keys(ROLE_CONFIG) as DentalTechnicianRole[]).map(r => (
                    <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.technicians.wages.rate")}</label>
                <input className={inputCls} type="number" value={modal.wagePerStage} onChange={e => setModal({ ...modal, wagePerStage: e.target.value })} placeholder={t("dentalLab.technicians.wages.defaultHint")} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t("dentalLab.technicians.wages.account")}</label>
                <select className={inputCls} value={modal.userId} onChange={e => setModal({ ...modal, userId: e.target.value })}>
                  <option value="">{t("dentalLab.technicians.wages.noAccount")}</option>
                  {team.map(m => (
                    <option key={m.userId} value={m.userId}>{m.name || m.email || m.userId}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{t("dentalLab.technicians.wages.accountHint")}</p>
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