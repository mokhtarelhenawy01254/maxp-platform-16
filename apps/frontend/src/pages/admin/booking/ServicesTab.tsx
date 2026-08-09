import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, PencilIcon, DocumentDuplicateIcon, EyeIcon, PlusIcon, FolderPlusIcon } from "@heroicons/react/24/outline";
import { BookingService, BookingBranch, BookingDoctor, ServiceFormData, ServiceCategory } from "./shared";
import ServiceModal from "./ServiceModal";
import ServiceDetailModal from "./ServiceDetailModal";
import CategoryModal from "./CategoryModal";

interface Props {
  services: BookingService[];
  branches: BookingBranch[];
  doctors: BookingDoctor[];
  categories: ServiceCategory[];
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
  onCategorySave: (d: Partial<ServiceCategory>) => Promise<void>;
  onCategoryDelete: (id: string) => void;
  detailService: BookingService | null;
  onDetailClose: () => void;
}

const categoryColor = (c?: string) => c || "bg-gray-100 dark:bg-gray-700";

export default function ServicesTab({
  services, branches, doctors, categories, search, onSearchChange,
  filterStatus, onFilterStatusChange,
  onEdit, onDetail, onToggleActive, onClone,
  modalService, onModalClose, onSave,
  onCategorySave, onCategoryDelete,
  detailService, onDetailClose
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [categoryModal, setCategoryModal] = useState<Partial<ServiceCategory> | null | undefined>(undefined);
  const navigate = useNavigate();

  const filtered = useMemo(() => services.filter(s => {
    const matchesSearch = !search || s.name.includes(search);
    const matchesStatus = filterStatus === "all" || (filterStatus === "active" && s.isActive) || (filterStatus === "inactive" && !s.isActive);
    const matchesCategory = activeCategory === "all" || s.categoryId === activeCategory || (!s.categoryId && activeCategory === "none");
    return matchesSearch && matchesStatus && matchesCategory;
  }), [services, search, filterStatus, activeCategory]);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">إدارة الخدمات</h2>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => setCategoryModal({})} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"><FolderPlusIcon className="w-4 h-4" />قسم جديد</button>
          <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filterStatus} onChange={e => onFilterStatusChange(e.target.value as "all" | "active" | "inactive")}>
            <option value="active">النشطة</option>
            <option value="inactive">غير النشطة</option>
            <option value="all">الكل</option>
          </select>
          <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={search} onChange={e => onSearchChange(e.target.value)} /></div>
          <button onClick={() => onEdit({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة خدمة</button>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setActiveCategory("all")} className={`px-3 py-1.5 text-sm rounded-lg border ${activeCategory === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-200"}`}>كل الخدمات</button>
        <button onClick={() => setActiveCategory("none")} className={`px-3 py-1.5 text-sm rounded-lg border ${activeCategory === "none" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-200"}`}>بدون قسم</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`px-3 py-1.5 text-sm rounded-lg border ${activeCategory === c.id ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-200"}`}>
            {c.icon && <span className="ml-1">{c.icon}</span>}{c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => {
          const bs = s.branchServices || [];
          const visibleBranches = bs.filter(b => b.isActive).slice(0, 3);
          const extraCount = bs.filter(b => b.isActive).length - 3;
          const cat = s.categoryId ? catMap.get(s.categoryId) : undefined;
          const doctorCount = s.doctorServices?.length || 0;
          return (
            <div key={s.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!s.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cat && <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor(cat.color)} dark:text-gray-200`}>{cat.icon && <span className="ml-0.5">{cat.icon}</span>}{cat.name}</span>}
                    <h3 className="font-bold">{s.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{s.description || "—"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{s.isActive ? "نشط" : "غير نشط"}</span>
              </div>
              {(s.basePrice !== undefined && s.basePrice !== null) && <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">السعر الأساسي: {s.basePrice} ج.م</p>}
              <button onClick={() => navigate("/admin/booking/price-lists")} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-1 inline-block">إدارة قوائم الأسعار التعاقدية</button>
              {s.durationMinutes && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">المدة: {s.durationMinutes} دقيقة</p>}
              <div className="flex flex-wrap gap-1 mb-2">
                {visibleBranches.map(b => (
                  <span key={b.id} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{b.branch.name}</span>
                ))}
                {extraCount > 0 && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded">+{extraCount}</span>}
                {bs.length === 0 && <span className="text-xs text-gray-400 dark:text-gray-500">لا توجد فروع</span>}
              </div>
              {doctorCount > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {s.doctorServices!.slice(0, 3).map(ds => (
                    <span key={ds.id} className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">{ds.doctor?.title} {ds.doctor?.name}</span>
                  ))}
                  {doctorCount > 3 && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded">+{doctorCount - 3}</span>}
                </div>
              )}
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
      {modalService !== undefined && <ServiceModal service={modalService} branches={branches} doctors={doctors} categories={categories} onClose={onModalClose} onSave={onSave} />}
      {detailService && <ServiceDetailModal service={detailService} onClose={onDetailClose} />}
      {categoryModal !== undefined && <CategoryModal category={categoryModal} onClose={() => setCategoryModal(undefined)} onSave={onCategorySave} onDelete={onCategoryDelete} />}
    </div>
  );
}
