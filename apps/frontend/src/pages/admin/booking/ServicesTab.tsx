import { Search as MagnifyingGlassIcon, Pencil as PencilIcon, Circle as DocumentDuplicateIcon, Eye as EyeIcon, Plus as PlusIcon } from 'lucide-react';
import { useMemo } from "react";
;
import { BookingService, BookingBranch, ServiceFormData } from "./shared";
import ServiceModal from "./ServiceModal";
import ServiceDetailModal from "./ServiceDetailModal";

interface Props {
  services: BookingService[];
  branches: BookingBranch[];
  search: string;
  onSearchChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: "all" | "active" | "inactive") => void;
  onEdit: (s: Partial<BookingService>) => void;
  onDetail: (s: BookingService) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onClone: (s: BookingService) => void;
  modalService: Partial<BookingService> | null | undefined;
  onModalClose: () => void;
  onSave: (d: ServiceFormData) => Promise<void>;
  detailService: BookingService | null;
  onDetailClose: () => void;
}

export default function ServicesTab({
  services, branches, search, onSearchChange,
  filterStatus, onFilterStatusChange,
  onEdit, onDetail, onToggleActive, onClone,
  modalService, onModalClose, onSave,
  detailService, onDetailClose
}: Props) {
  const filtered = useMemo(() => services.filter(s => {
    const matchesSearch = !search || s.name.includes(search);
    const matchesStatus = filterStatus === "all" || (filterStatus === "active" && s.isActive) || (filterStatus === "inactive" && !s.isActive);
    return matchesSearch && matchesStatus;
  }), [services, search, filterStatus]);
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">إدارة الخدمات</h2>
        <div className="flex gap-3">
          <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filterStatus} onChange={e => onFilterStatusChange(e.target.value as "all" | "active" | "inactive")}>
            <option value="active">النشطة</option>
            <option value="inactive">غير النشطة</option>
            <option value="all">الكل</option>
          </select>
          <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={search} onChange={e => onSearchChange(e.target.value)} /></div>
          <button onClick={() => onEdit({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة خدمة</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => {
          const bs = s.branchServices || [];
          const visibleBranches = bs.filter(b => b.isActive).slice(0, 3);
          const extraCount = bs.filter(b => b.isActive).length - 3;
          return (
            <div key={s.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!s.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold">{s.name}</h3><p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{s.description || "—"}</p></div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{s.isActive ? "نشط" : "غير نشط"}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {visibleBranches.map(b => (
                  <span key={b.id} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{b.branch.name}</span>
                ))}
                {extraCount > 0 && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded">+{extraCount}</span>}
                {bs.length === 0 && <span className="text-xs text-gray-400 dark:text-gray-500">لا توجد فروع</span>}
              </div>
              {bs.map(b => (b.packages || []).length > 0 && (
                <div key={b.id} className="mb-1">
                  {b.packages!.map((pkg, i) => (
                    <div key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 inline-block px-2 py-0.5 rounded ml-1 mb-1">{pkg.count} جلسات - {pkg.price} ج.م ({b.branch.name})</div>
                  ))}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button onClick={() => onDetail(s)} className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"><EyeIcon className="w-3.5 h-3.5 inline ml-1" />عرض</button>
                <button onClick={() => onEdit(s)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                <button onClick={() => onToggleActive(s.id, s.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${s.isActive ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"}`}>{s.isActive ? "تعطيل" : "تفعيل"}</button>
                <button onClick={() => onClone(s)} className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"><DocumentDuplicateIcon className="w-3.5 h-3.5 inline ml-1" />استنساخ</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full text-gray-400 dark:text-gray-500 text-center py-12">لا توجد خدمات</p>}
      </div>
      {modalService !== undefined && <ServiceModal service={modalService} branches={branches} onClose={onModalClose} onSave={onSave} />}
      {detailService && <ServiceDetailModal service={detailService} onClose={onDetailClose} />}
    </div>
  );
}
