import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Pencil, Trash2, Search, DoorOpen, Monitor, Stethoscope, ChevronDown, ChevronUp } from "lucide-react";
import { api, fetchJson, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, RadiologyRoom, RadiologyDevice } from "./shared";

interface RoomForm {
  id?: string;
  name: string;
  capacityPerHour: string;
  deviceIds: string[];
  doctorIds: string[];
  isActive: boolean;
}

interface RadiologistOpt {
  id: string;
  name: string;
}

export default function RoomsTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<RadiologyRoom[]>([]);
  const [devices, setDevices] = useState<RadiologyDevice[]>([]);
  const [doctors, setDoctors] = useState<RadiologistOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<RoomForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addDeviceFor, setAddDeviceFor] = useState<string | null>(null);
  const [addDoctorFor, setAddDoctorFor] = useState<string | null>(null);
  const [busyDeviceRoom, setBusyDeviceRoom] = useState<string | null>(null);
  const [busyDoctorRoom, setBusyDoctorRoom] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("rooms"));
      if (showInactive) url.searchParams.set("includeInactive", "true");
      const data = await fetchJson<RadiologyRoom[]>(url.toString());
      setItems(data || []);
      setError(null);
    } catch (e) {
      if (!opts?.silent) setError(e instanceof Error ? e.message : t("radiology.rooms.loadFailed"));
    }
  }, [showInactive, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      Promise.all([
        refresh({ silent: true }),
        fetchJson<RadiologyDevice[]>(`${api("devices")}&includeInactive=true`).then(d => setDevices(d || [])).catch(() => setDevices([])),
        fetchJson<RadiologistOpt[]>(api("radiologists")).then(d => setDoctors(d || [])).catch(() => setDoctors([])),
      ]).finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [refresh]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(r =>
      r.name.toLowerCase().includes(term)
      || (r.devices || []).some(d => d.name.toLowerCase().includes(term))
      || (r.doctors || []).some(d => d.name.toLowerCase().includes(term))
    );
  }, [items, search]);

  const activeDevices = useMemo(() => devices.filter(d => d.isActive !== false), [devices]);
  const activeDoctors = useMemo(() => doctors, [doctors]);

  const save = async () => {
    if (!modal || saving) return;
    if (!modal.name.trim()) { setError(t("radiology.rooms.nameRequired")); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: modal.name.trim(),
        capacityPerHour: Number(modal.capacityPerHour) || 1,
        deviceIds: modal.deviceIds,
        doctorIds: modal.doctorIds,
        isActive: modal.isActive,
      };
      if (modal.id) await fetchJson(api(`rooms/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      else await fetchJson(api("rooms"), { method: "POST", body: JSON.stringify(payload) });
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("radiology.rooms.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: RadiologyRoom) => {
    if (removingId) return;
    if (!window.confirm(String(t("radiology.rooms.deleteConfirm", { name: r.name })))) return;
    setRemovingId(r.id);
    try {
      await fetchJson(api(`rooms/${r.id}`), { method: "DELETE" });
      await refresh({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("radiology.rooms.deleteFailed"));
    } finally {
      setRemovingId(null);
    }
  };

  const toggleDevice = async (room: RadiologyRoom, device: { id: string }, isAdd: boolean) => {
    if (busyDeviceRoom) return;
    setBusyDeviceRoom(room.id);
    setError(null);
    try {
      if (isAdd) await fetchJson(api(`rooms/${room.id}/devices/${device.id}`), { method: "POST" });
      else await fetchJson(api(`rooms/${room.id}/devices/${device.id}`), { method: "DELETE" });
      setAddDeviceFor(null);
      await refresh({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("radiology.rooms.assignFailed"));
    } finally {
      setBusyDeviceRoom(null);
    }
  };

  const toggleDoctor = async (room: RadiologyRoom, doctor: { id: string }, isAdd: boolean) => {
    if (busyDoctorRoom) return;
    setBusyDoctorRoom(room.id);
    setError(null);
    try {
      if (isAdd) await fetchJson(api(`rooms/${room.id}/doctors/${doctor.id}`), { method: "POST" });
      else await fetchJson(api(`rooms/${room.id}/doctors/${doctor.id}`), { method: "DELETE" });
      setAddDoctorFor(null);
      await refresh({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("radiology.rooms.assignFailed"));
    } finally {
      setBusyDoctorRoom(null);
    }
  };

  const deviceNotInRoom = (room: RadiologyRoom) => (d: RadiologyDevice) =>
    !(room.devices || []).some(x => x.id === d.id);

  const doctorNotInRoom = (room: RadiologyRoom) => (d: RadiologistOpt) =>
    !(room.doctors || []).some(x => x.id === d.id);

  const renderRow = (r: RadiologyRoom) => {
    const expanded = expandedId === r.id;
    const availableDevices = activeDevices.filter(deviceNotInRoom(r));
    const availableDoctors = activeDoctors.filter(doctorNotInRoom(r));
    return (
      <div key={r.id} className="border-b dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          <button onClick={() => setExpandedId(expanded ? null : r.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <DoorOpen className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="font-medium flex-1 min-w-[140px]">{r.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {t("radiology.rooms.capacityPerHour", { count: r.capacityPerHour })}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            <Monitor className="w-3.5 h-3.5" />
            {t("radiology.rooms.deviceCount", { count: (r.devices || []).length })}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            <Stethoscope className="w-3.5 h-3.5" />
            {t("radiology.rooms.doctorCount", { count: (r.doctors || []).length })}
          </span>
          <span>
            {r.isActive ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">{t("radiology.rooms.active")}</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{t("radiology.rooms.inactive")}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setModal({ id: r.id, name: r.name, capacityPerHour: String(r.capacityPerHour), deviceIds: (r.devices || []).map(d => d.id), doctorIds: (r.doctors || []).map(d => d.id), isActive: r.isActive })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={String(t("radiology.edit"))}><Pencil className="w-4 h-4" /></button>
            <button onClick={() => remove(r)} disabled={removingId !== null} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-40" title={String(t("radiology.delete"))}><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        {expanded && (
          <div className="px-6 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-300 flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" />{t("radiology.rooms.devicesLabel")}</h4>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(r.devices || []).length === 0 && <span className="text-xs text-gray-400 dark:text-gray-500">{t("radiology.rooms.noDevices")}</span>}
                {(r.devices || []).map(d => (
                  <span key={d.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800 border dark:border-gray-600">
                    {d.name}{d.modality ? <span className="text-[10px] text-gray-400" dir="ltr">({d.modality})</span> : null}
                    <button onClick={() => toggleDevice(r, d, false)} disabled={busyDeviceRoom !== null} className="text-gray-400 hover:text-red-500 disabled:opacity-40" title={String(t("radiology.rooms.removeDevice"))}><XMarkIcon className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select className={`${MODAL_INPUT_CLS} text-xs`} value={addDeviceFor === r.id ? "add" : ""} onChange={e => { if (e.target.value) toggleDevice(r, availableDevices.find(d => d.id === e.target.value)!, true); }}>
                  <option value="">{t("radiology.rooms.addDevicePlaceholder")}</option>
                  {availableDevices.map(d => <option key={d.id} value={d.id}>{d.name}{d.modality ? ` (${d.modality})` : ""}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-300 flex items-center gap-1.5 mb-2"><Stethoscope className="w-3.5 h-3.5" />{t("radiology.rooms.doctorsLabel")}</h4>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(r.doctors || []).length === 0 && <span className="text-xs text-gray-400 dark:text-gray-500">{t("radiology.rooms.noDoctors")}</span>}
                {(r.doctors || []).map(d => (
                  <span key={d.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800 border dark:border-gray-600">
                    {d.name}
                    <button onClick={() => toggleDoctor(r, d, false)} disabled={busyDoctorRoom !== null} className="text-gray-400 hover:text-red-500 disabled:opacity-40" title={String(t("radiology.rooms.removeDoctor"))}><XMarkIcon className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select className={`${MODAL_INPUT_CLS} text-xs`} value={addDoctorFor === r.id ? "add" : ""} onChange={e => { if (e.target.value) toggleDoctor(r, availableDoctors.find(d => d.id === e.target.value)!, true); }}>
                  <option value="">{t("radiology.rooms.addDoctorPlaceholder")}</option>
                  {availableDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.rooms.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.rooms.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
          <button onClick={() => setModal({ name: "", capacityPerHour: "1", deviceIds: [], doctorIds: [], isActive: true })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.rooms.newRoom")}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input className={`${MODAL_INPUT_CLS} pr-9`} value={search} onChange={e => setSearch(e.target.value)} placeholder={String(t("radiology.rooms.searchPlaceholder"))} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
          {t("radiology.rooms.showInactive")}
        </label>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.loadingEllipsis")}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <DoorOpen className="w-10 h-10 mx-auto mb-3" />
          {search ? t("radiology.rooms.noResults") : t("radiology.rooms.noRooms")}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            {filtered.map(renderRow)}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? t("radiology.rooms.editRoom") : t("radiology.rooms.newRoomModal")}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.rooms.name")} *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder={String(t("radiology.rooms.namePlaceholder"))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.rooms.capacityPerHourLabel")}</label>
                <input type="number" min={1} className={MODAL_INPUT_CLS} dir="ltr" value={modal.capacityPerHour} onChange={e => setModal({ ...modal, capacityPerHour: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.rooms.devicesLabel")}</label>
                <select multiple className={`${MODAL_INPUT_CLS} min-h-[90px]`} value={modal.deviceIds} onChange={e => setModal({ ...modal, deviceIds: Array.from(e.target.selectedOptions, o => o.value) })}>
                  {activeDevices.map(d => <option key={d.id} value={d.id}>{d.name}{d.modality ? ` (${d.modality})` : ""}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{t("radiology.rooms.multiSelectHint")}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.rooms.doctorsLabel")}</label>
                <select multiple className={`${MODAL_INPUT_CLS} min-h-[90px]`} value={modal.doctorIds} onChange={e => setModal({ ...modal, doctorIds: Array.from(e.target.selectedOptions, o => o.value) })}>
                  {activeDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{t("radiology.rooms.multiSelectHint")}</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                {t("radiology.rooms.enabled")}
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">{t("radiology.cancel")}</button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
