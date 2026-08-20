import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Search } from "lucide-react";
import { bookingApi, fetchJson, MODAL_INPUT_CLS, MODAL_CONTENT_CLS } from "./shared";

interface LabPatient {
  id: string; firstName: string; lastName?: string; phone?: string;
  gender?: string; status?: string; isActive: boolean; createdAt: string;
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: "┘å╪┤╪╖", INACTIVE: "╪║┘è╪▒ ┘å╪┤╪╖", REVIEW: "┘é┘è╪» ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐" };

export default function LabPatientsTab() {
  const [items, setItems] = useState<LabPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Partial<LabPatient> | null>(null);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchJson<LabPatient[]>(`${bookingApi("patients")}?limit=200`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪º┘ä┘à╪▒╪╢┘ë");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(p =>
    !search || (p.firstName || "").includes(search) || (p.phone || "").includes(search)
  );

  const openNew = () => { setFirstName(""); setPhone(""); setModal({}); };

  const save = async () => {
    if (saving) return;
    if (!firstName.trim()) { toast.error("╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢ ┘à╪╖┘ä┘ê╪¿"); return; }
    setSaving(true);
    try {
      const body = { firstName: firstName.trim(), phone: phone.trim() || undefined };
      await fetchJson(bookingApi("patients"), { method: "POST", body: JSON.stringify(body) });
      toast.success("╪¬┘à ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä┘à╪▒┘è╪╢");
      setModal(null);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪º┘ä╪¡┘ü╪╕");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: LabPatient) => {
    try {
      await fetchJson(bookingApi(`patients/${p.id}`), { method: "PUT", body: JSON.stringify({ isActive: !p.isActive }) });
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪º┘ä╪¬╪¡╪»┘è╪½");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">╪º┘ä┘à╪▒╪╢┘ë</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="╪¿╪¡╪½ ╪¿╪º┘ä╪º╪│┘à ╪ú┘ê ╪º┘ä┘ç╪º╪¬┘ü"
              className={`${MODAL_INPUT_CLS} pr-9 max-w-xs`} />
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />┘à╪▒┘è╪╢ ╪¼╪»┘è╪»
          </button>
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" />╪¬╪¡╪»┘è╪½
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400">╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-gray-400">┘ä╪º ┘è┘ê╪¼╪» ┘à╪▒╪╢┘ë</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">╪º┘ä╪º╪│┘à</th>
                <th className="py-3 px-4 text-right font-medium">╪º┘ä┘ç╪º╪¬┘ü</th>
                <th className="py-3 px-4 text-right font-medium">╪º┘ä╪¼┘å╪│</th>
                <th className="py-3 px-4 text-right font-medium">╪º┘ä╪¡╪º┘ä╪⌐</th>
                <th className="py-3 px-4 text-right font-medium">╪Ñ╪¼╪▒╪º╪í</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b dark:border-gray-700/50 last:border-0">
                  <td className="py-3 px-4 font-medium">{p.firstName} {p.lastName || ""}</td>
                  <td className="py-3 px-4" dir="ltr">{p.phone || "ΓÇö"}</td>
                  <td className="py-3 px-4">{p.gender || "ΓÇö"}</td>
                  <td className="py-3 px-4">{STATUS_LABEL[p.status || ""] || (p.isActive ? "┘å╪┤╪╖" : "╪║┘è╪▒ ┘å╪┤╪╖")}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => toggle(p)} className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                      {p.isActive ? "╪¬╪╣╪╖┘è┘ä" : "╪¬┘ü╪╣┘è┘ä"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">┘à╪▒┘è╪╢ ╪¼╪»┘è╪»</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢ *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className={MODAL_INPUT_CLS} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">╪º┘ä┘ç╪º╪¬┘ü</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={MODAL_INPUT_CLS} dir="ltr" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg">╪Ñ┘ä╪║╪º╪í</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "╪¼╪º╪▒┘è ╪º┘ä╪¡┘ü╪╕..." : "╪¡┘ü╪╕"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
