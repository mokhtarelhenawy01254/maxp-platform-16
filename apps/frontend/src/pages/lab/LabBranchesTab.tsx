import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { bookingApi, fetchJson } from "./shared";

interface LabBranch {
  id: string; name: string; address?: string; phone?: string; isActive: boolean;
}

export default function LabBranchesTab() {
  const [items, setItems] = useState<LabBranch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchJson<LabBranch[]>(`${bookingApi("branches")}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪º┘ä┘ü╪▒┘ê╪╣");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (b: LabBranch) => {
    try {
      await fetchJson(bookingApi(`branches/${b.id}`), { method: "PUT", body: JSON.stringify({ isActive: !b.isActive }) });
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪º┘ä╪¬╪¡╪»┘è╪½");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">╪º┘ä┘ü╪▒┘ê╪╣</h2>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">
          <RefreshCw className="w-4 h-4" />╪¬╪¡╪»┘è╪½
        </button>
      </div>
      {loading ? (
        <p className="text-center py-10 text-gray-400">╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä...</p>
      ) : items.length === 0 ? (
        <p className="text-center py-10 text-gray-400">┘ä╪º ╪¬┘ê╪¼╪» ┘ü╪▒┘ê╪╣</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(b => (
            <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <p className="font-semibold">{b.name}</p>
              {b.address && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{b.address}</p>}
              {b.phone && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1" dir="ltr">{b.phone}</p>}
              <button onClick={() => toggle(b)} className="mt-3 text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                {b.isActive ? "╪¬╪╣╪╖┘è┘ä" : "╪¬┘ü╪╣┘è┘ä"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
