import { useState, useEffect } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "جديد", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "مكتمل", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "ملغي", color: "bg-red-100 text-red-700" },
};

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function ServiceOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const r = await fetch(`/api/v1/service-orders`, { headers: authHeaders() as any });
      const d = await r.json();
      if (d.success) setOrders(d.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const r = await fetch(`/api/v1/service-orders/${id}/status`, {
        method: "PUT",
        headers: { ...authHeaders() as any, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (d.success) { tToast.success("admin_ServiceOrdersPage.msg_1aba"); fetchOrders(); }
      else toast.error(d.error);
    } catch (e) { tToast.error("admin_ServiceOrdersPage.error_error_1393"); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto rtl" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">طلبات الخدمات</h1>

      {orders.length === 0 ? (
        <p className="text-center text-gray-400 py-12">لا توجد طلبات بعد</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{o.customerName}</span>
                    <span className="text-sm text-gray-500">{o.phone}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${(STATUS_MAP[o.status] || STATUS_MAP.NEW).color}`}>{(STATUS_MAP[o.status] || STATUS_MAP.NEW).label}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{o.service?.name}</span>
                    {o.description && <span className="mr-2">— {o.description}</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(o.createdAt).toLocaleDateString("ar-EG")}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <select className="border rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600" value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {(o.referenceFiles?.length > 0) && (
                    <button onClick={() => setSelected(o)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><EyeIcon className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">ملفات الطلب</h2>
              <button onClick={() => setSelected(null)}><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">{selected.customerName} — {selected.service?.name}</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(selected.referenceFiles || []).map((f: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm truncate">{f.originalName}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">فتح</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
