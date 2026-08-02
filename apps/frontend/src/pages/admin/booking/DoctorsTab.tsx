import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, PencilIcon, TrashIcon, PlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import { BookingDoctor, BookingBranch, BookingService } from "./shared";
import DoctorModal from "./DoctorModal";

interface Props {
  doctors: BookingDoctor[];
  branches: BookingBranch[];
  services?: BookingService[];
  search: string;
  onSearchChange: (v: string) => void;
  onEdit: (d: Partial<BookingDoctor>) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  modalDoctor: Partial<BookingDoctor> | null | undefined;
  onModalClose: () => void;
  onSave: (d: Partial<BookingDoctor>) => Promise<void>;
}

export default function DoctorsTab({
  doctors, branches, services = [], search, onSearchChange,
  onEdit, onToggleActive, onDelete,
  modalDoctor, onModalClose, onSave
}: Props) {
  const navigate = useNavigate();
  const filtered = useMemo(() => doctors.filter(d => !search || (d.name || '').includes(search) || (d.specialty || '').includes(search)), [doctors, search]);
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">إدارة الأطباء</h2>
        <div className="flex gap-3">
          <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={search} onChange={e => onSearchChange(e.target.value)} /></div>
          <button onClick={() => onEdit({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة طبيب</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(d => {
          const branch = branches.find(b => b.id === d.branchId);
          return (
            <div key={d.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!d.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold">{d.title ? d.title + " " : ""}{d.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{d.specialty}</p></div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${d.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{d.isActive ? "نشط" : "غير نشط"}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{branch?.name || "—"}</p>
              {(d.serviceIds && d.serviceIds.length > 0) && <div className="text-xs text-purple-600 dark:text-purple-300 mb-3">{d.serviceIds.length} خدمات</div>}
              <div className="flex gap-2">
                <button onClick={() => navigate(`/admin/booking/doctors/${d.id}`)} className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"><EyeIcon className="w-3.5 h-3.5 inline ml-1" />صفحة</button>
                <button onClick={() => onEdit(d)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                <button onClick={() => onToggleActive(d.id, d.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${d.isActive ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"}`}>{d.isActive ? "تعطيل" : "تفعيل"}</button>
                <button onClick={() => onDelete(d.id)} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon className="w-3.5 h-3.5 inline ml-1" />حذف</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full text-gray-400 dark:text-gray-500 text-center py-12">لا يوجد أطباء</p>}
      </div>
      {modalDoctor !== undefined && <DoctorModal doctor={modalDoctor} branches={branches} services={services} onClose={onModalClose} onSave={onSave} />}
    </div>
  );
}
