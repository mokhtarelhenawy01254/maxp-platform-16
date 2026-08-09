import { useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, FileText } from "lucide-react";
import { MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "نسبة مئوية" },
  { value: "NONE", label: "بدون خصم" },
];

interface LocalContract {
  id: string;
  name: string;
  discountType: string;
  discountPercent: number;
  isActive: boolean;
}

interface ContractForm {
  id?: string;
  name: string;
  discountType: string;
  discountPercent: string;
  isActive: boolean;
}

let uidCounter = 1;
const uid = () => `local-${Date.now()}-${uidCounter++}`;

const discountLabel = (type: string) =>
  DISCOUNT_TYPES.find(d => d.value === type)?.label || type || "—";

export default function RadiologyContractsTab() {
  const [contracts, setContracts] = useState<LocalContract[]>([]);
  const [modal, setModal] = useState<ContractForm | null>(null);

  const openCreate = () => setModal({ name: "", discountType: "PERCENTAGE", discountPercent: "0", isActive: true });

  const openEdit = (c: LocalContract) => setModal({
    id: c.id,
    name: c.name,
    discountType: c.discountType,
    discountPercent: String(c.discountPercent),
    isActive: c.isActive,
  });

  const save = () => {
    if (!modal) return;
    if (!modal.name.trim()) return;
    const percent = Number(modal.discountPercent) || 0;
    if (modal.id) {
      setContracts(prev => prev.map(c => c.id === modal.id
        ? { ...c, name: modal.name.trim(), discountType: modal.discountType, discountPercent: percent, isActive: modal.isActive }
        : c));
    } else {
      setContracts(prev => [...prev, { id: uid(), name: modal.name.trim(), discountType: modal.discountType, discountPercent: percent, isActive: modal.isActive }]);
    }
    setModal(null);
  };

  const remove = (id: string) => {
    if (!window.confirm("تأكيد حذف التعاقد؟")) return;
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">التعاقدات</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">الجهات التعاقدية مع نوع الخصم (بيانات محلية حالياً)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />إضافة تعاقد
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3" />
          لا توجد تعاقدات بعد — أضف أول تعاقد
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">الاسم</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">نوع الخصم</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">النسبة</th>
                  <th className="text-right py-3 px-4">الحالة</th>
                  <th className="text-right py-3 px-4">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4">{discountLabel(c.discountType)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.discountType === "PERCENTAGE" ? `${c.discountPercent}%` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      {c.isActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">نشط</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">معطل</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل تعاقد" : "تعاقد جديد"}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم التعاقد *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="مثال: شركة الأمل للتأمين" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الخصم</label>
                  <select className={MODAL_INPUT_CLS} value={modal.discountType} onChange={e => setModal({ ...modal, discountType: e.target.value })}>
                    {DISCOUNT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النسبة (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={MODAL_INPUT_CLS}
                    value={modal.discountPercent}
                    onChange={e => setModal({ ...modal, discountPercent: e.target.value })}
                    disabled={modal.discountType === "NONE"}
                  />
                </div>
              </div>
              {modal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  مفعّل
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={save} disabled={!modal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
