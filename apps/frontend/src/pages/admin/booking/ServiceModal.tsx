import { useState } from "react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { BookingService, BookingBranch, ServiceFormData, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface Props {
  service?: Partial<BookingService> | null;
  branches: BookingBranch[];
  onClose: () => void;
  onSave: (d: ServiceFormData) => Promise<void>;
}

interface BranchPkg { count: number; price: number }



export default function ServiceModal({ service, branches, onClose, onSave }: Props) {
  const initBranchAssignments = () => {
    if (!service?.branchServices) return {} as Record<string, BranchPkg[]>;
    const acc: Record<string, BranchPkg[]> = {};
    for (const bs of service.branchServices) {
      acc[bs.branchId] = (bs.packages || []).map(p => ({ count: p.count, price: p.price }));
    }
    return acc;
  };
  const [name, setName] = useState(service?.name || "");
  const [desc, setDesc] = useState(service?.description || "");
  const [branchPkgs, setBranchPkgs] = useState<Record<string, BranchPkg[]>>(initBranchAssignments);

  const toggleBranch = (branchId: string) => {
    const next = { ...branchPkgs };
    if (next[branchId]) { delete next[branchId]; }
    else { next[branchId] = []; }
    setBranchPkgs(next);
  };

  const addPkg = (branchId: string) => setBranchPkgs({ ...branchPkgs, [branchId]: [...(branchPkgs[branchId] || []), { count: 1, price: 0 }] });
  const updPkg = (branchId: string, i: number, k: "count" | "price", v: number) => {
    const pkgs = [...(branchPkgs[branchId] || [])];
    const cur = pkgs[i];
    if (!cur) return;
    pkgs[i] = k === "count" ? { count: v, price: cur.price } : { count: cur.count, price: v };
    setBranchPkgs({ ...branchPkgs, [branchId]: pkgs });
  };
  const delPkg = (branchId: string, i: number) => {
    const pkgs = (branchPkgs[branchId] || []).filter((_, idx) => idx !== i);
    const next = { ...branchPkgs };
    if (pkgs.length) next[branchId] = pkgs; else delete next[branchId];
    setBranchPkgs(next);
  };
  const hasBranches = Object.keys(branchPkgs).length > 0;

  const handleSave = () => {
    onSave({
      name, description: desc,
      assignedBranchIds: Object.keys(branchPkgs),
      branches: Object.entries(branchPkgs).map(([branchId, pkgs]) => ({
        branchId,
        packages: pkgs.filter(p => p.count > 0)
      }))
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-w-2xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{service?.id ? "تعديل خدمة" : "إضافة خدمة"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label><input className={MODAL_INPUT_CLS} value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label><textarea className={MODAL_INPUT_CLS} rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الفروع المقدمة فيها الخدمة</label>
            {!hasBranches && <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">اختر فرعاً واحداً على الأقل</p>}
            <div className="space-y-2 max-h-64 overflow-y-auto border dark:border-gray-600 rounded-lg p-2">
              {branches.filter(b => b.isActive).map(b => {
                const checked = !!branchPkgs[b.id];
                return (
                  <div key={b.id} className="border dark:border-gray-600 rounded-lg">
                    <label className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                      <input type="checkbox" checked={checked} onChange={() => toggleBranch(b.id)} className="rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm font-medium">{b.name}</span>
                    </label>
                    {checked && (
                      <div className="pr-8 pb-2 space-y-1">
                        {(branchPkgs[b.id] || []).map((pkg, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="number" min={1} className="w-20 border dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100" placeholder="جلسات" value={pkg.count} onChange={e => updPkg(b.id, i, "count", Number(e.target.value))} />
                            <input type="number" min={0} className="w-24 border dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100" placeholder="السعر" value={pkg.price} onChange={e => updPkg(b.id, i, "price", Number(e.target.value))} />
                            <button onClick={() => delPkg(b.id, i)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><TrashIcon className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                        <button onClick={() => addPkg(b.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">+ إضافة باقة</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={handleSave} disabled={!name || !hasBranches} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}
