import { useState, useMemo } from "react";
import { PencilIcon, TrashIcon, CheckIcon, PlusIcon } from "@heroicons/react/24/outline";
import { BookingBranch, BranchFormData, DAY_NAMES } from "./shared";
import BranchModal from "./BranchModal";

interface Props {
  branches: BookingBranch[];
  selectedBranchId?: string;
  onEdit: (b: Partial<BookingBranch>) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  modalBranch: Partial<BookingBranch> | null | undefined;
  onModalClose: () => void;
  onSave: (d: BranchFormData) => Promise<void>;
}

const PAGE_SIZE = 10;

export default function BranchesTab({ branches, selectedBranchId, onEdit, onToggleActive, onDelete, modalBranch, onModalClose, onSave }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = branches;
    if (selectedBranchId) list = list.filter(b => b.id === selectedBranchId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || (b.address || "").toLowerCase().includes(q));
    }
    return list;
  }, [branches, selectedBranchId, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">إدارة الفروع</h2>
        <div className="flex gap-2">
          <input className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          <button onClick={() => onEdit({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة فرع</button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد فروع</p>
      ) : (<>
      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {paged.map(b => (
          <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-sm">{b.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{b.address || "—"}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${b.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{b.isActive ? "نشط" : "غير نشط"}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex flex-wrap gap-1">{(b.phones?.length ? b.phones : b.phone ? [b.phone] : []).map((p, i) => <span key={i} dir="ltr" className="inline-block bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{p}</span>) || "—"}</div>
            
            {/* Working days circular badges */}
            <div className="flex gap-1 justify-start mb-3">
              {(() => {
                const wd = typeof b.workingDays === 'object' ? b.workingDays : null;
                const DAYS_ORDER = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
                const DAY_INITIALS: Record<string, string> = { sat: "س", sun: "ح", mon: "ن", tue: "ث", wed: "ر", thu: "خ", fri: "ج" };
                return DAYS_ORDER.map(d => {
                  const isActive = wd && wd[d];
                  const hours = wd ? wd[d] : "";
                  return (
                    <div
                      key={d}
                      title={isActive ? `${DAY_NAMES[d]}: ${hours}` : `${DAY_NAMES[d]}: مغلق`}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold select-none border transition-all ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          : "bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800"
                      }`}
                    >
                      {DAY_INITIALS[d]}
                    </div>
                  );
                });
              })()}
            </div>

            {b.location && (
              <div className="text-xs mb-3">
                {/^https?:\/\//.test(b.location) ? (
                  <a
                    href={b.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    📍 فتح الموقع الجغرافي
                  </a>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 truncate block" title={b.location}>
                    📍 {b.location}
                  </span>
                )}
              </div>
            )}
            {(() => {
              const gd = b.genderDays ? (typeof b.genderDays === 'string' ? null : b.genderDays) : null;
              if (!gd || (!gd.male.length && !gd.female.length)) return null;
              return (
                <div className="text-xs mb-3 space-y-1">
                  {gd.male.length > 0 && <div className="text-blue-600 dark:text-blue-400">👨 الرجال: {gd.male.map(d => DAY_NAMES[d] || d).join("، ")}</div>}
                  {gd.female.length > 0 && <div className="text-pink-600 dark:text-pink-400">👩 السيدات: {gd.female.map(d => DAY_NAMES[d] || d).join("، ")}</div>}
                </div>
              );
            })()}
            <div className="flex gap-2">
              <button onClick={() => onEdit(b)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><PencilIcon className="w-3 h-3 inline ml-1" />تعديل</button>
              <button onClick={() => onToggleActive(b.id, b.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${b.isActive ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"}`}>{b.isActive ? "تعطيل" : "تفعيل"}</button>
              <button onClick={() => onDelete(b.id)} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon className="w-3 h-3 inline ml-1" />حذف</button>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["الاسم", "العنوان", "الموقع", "الهاتف", "أيام العمل", "الجنس", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
          <tbody>{paged.map(b => (
            <tr key={b.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
              <td className="py-3 px-4 font-medium">{b.name}</td>
              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{b.address || "—"}</td>
              <td className="py-3 px-4 text-xs">
                {b.location ? (
                  /^https?:\/\//.test(b.location) ? (
                    <a
                      href={b.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all font-semibold"
                    >
                      📍 فتح الخريطة
                    </a>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 max-w-[150px] truncate block" title={b.location}>
                      📍 {b.location}
                    </span>
                  )
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {(b.phones?.length ? b.phones : b.phone ? [b.phone] : []).map((p, i) => <span key={i} dir="ltr" className="text-xs inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{p}</span>) || "—"}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-1 justify-start">
                  {(() => {
                    const wd = typeof b.workingDays === 'object' ? b.workingDays : null;
                    const DAYS_ORDER = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
                    const DAY_INITIALS: Record<string, string> = { sat: "س", sun: "ح", mon: "ن", tue: "ث", wed: "ر", thu: "خ", fri: "ج" };
                    return DAYS_ORDER.map(d => {
                      const isActive = wd && wd[d];
                      const hours = wd ? wd[d] : "";
                      return (
                        <div
                          key={d}
                          title={isActive ? `${DAY_NAMES[d]}: ${hours}` : `${DAY_NAMES[d]}: مغلق`}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold select-none border transition-all ${
                            isActive
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                              : "bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800"
                          }`}
                        >
                          {DAY_INITIALS[d]}
                        </div>
                      );
                    });
                  })()}
                </div>
              </td>
              <td className="py-3 px-4 text-xs">{
                (() => {
                  const gd = b.genderDays ? (typeof b.genderDays === 'string' ? null : b.genderDays) : null;
                  if (!gd || (!gd.male.length && !gd.female.length)) return <span className="text-gray-400 dark:text-gray-500">—</span>;
                  return (
                    <div className="space-y-1">
                      {gd.male.length > 0 && <div className="text-blue-600 dark:text-blue-400">👨 {gd.male.map(d => DAY_NAMES[d] || d).join("، ")}</div>}
                      {gd.female.length > 0 && <div className="text-pink-600 dark:text-pink-400">👩 {gd.female.map(d => DAY_NAMES[d] || d).join("، ")}</div>}
                    </div>
                  );
                })()
              }</td>
              <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${b.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{b.isActive ? "نشط" : "غير نشط"}</span></td>
              <td className="py-3 px-4">
                <div className="flex gap-1">
                  <button onClick={() => onEdit(b)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => onToggleActive(b.id, b.isActive)} className={`p-1.5 rounded ${b.isActive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"}`} title={b.isActive ? "تعطيل" : "تفعيل"}><CheckIcon className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(b.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button disabled={safePage <= 0} onClick={() => setPage(safePage - 1)} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-default">السابق</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{safePage + 1} / {totalPages}</span>
          <button disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-default">التالي</button>
        </div>
      )}
      </>)}
      {modalBranch !== undefined && <BranchModal branch={modalBranch} onClose={onModalClose} onSave={onSave} />}
    </div>
  );
}
