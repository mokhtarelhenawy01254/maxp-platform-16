import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
;
import { BookingPatient } from "./shared";
import { Check, Eye, Pencil, Plus, Search, Trash2, ExternalLink } from 'lucide-react'
import PatientModal from "./PatientModal";

interface Props {
  patients: BookingPatient[];
  search: string;
  onSearchChange: (v: string) => void;
  onView: (id: string) => void;
  onEdit: (p: Partial<BookingPatient>) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  modalPatient: Partial<BookingPatient> | null | undefined;
  onModalClose: () => void;
  onSave: (d: Partial<BookingPatient>) => Promise<void>;
}

const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };

export default function PatientsTab({
  patients, search, onSearchChange,
  onView, onEdit, onToggleActive, onDelete,
  modalPatient, onModalClose, onSave
}: Props) {
  const navigate = useNavigate();
  const filtered = useMemo(() => patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.firstName || "").toLowerCase().includes(q)
      || (p.lastName || "").toLowerCase().includes(q)
      || (p.phone || "").toLowerCase().includes(q);
  }), [patients, search]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">إدارة المرضى</h2>
        <div className="flex gap-3">
          <div className="relative"><Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={search} onChange={e => onSearchChange(e.target.value)} /></div>
          <button onClick={() => onEdit({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" />إضافة مريض</button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا يوجد مرضى</p>
      ) : (<>
        {/* Mobile cards */}
        <div className="block md:hidden space-y-3">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!p.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold text-sm">{p.firstName} {p.lastName || ""}</h3><p className="text-xs text-gray-500 dark:text-gray-400">{GENDER_LABEL[p.gender || ""] || ""} {p.bloodType ? `· فصيلة ${p.bloodType}` : ""}</p></div>
                <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${p.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{p.isActive ? "نشط" : "غير نشط"}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{p.phone ? <span dir="ltr">{p.phone}</span> : "—"}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">الزيارات: {p.visitCount ?? 0}</p>
              <div className="flex gap-2">
                <button onClick={() => onView(p.id)} className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"><Eye className="w-3.5 h-3.5 inline ml-1" />عرض</button>
                <button onClick={() => navigate(`/admin/booking/patients/${p.id}`)} className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><ExternalLink className="w-3.5 h-3.5 inline ml-1" />صفحة</button>
                <button onClick={() => onEdit(p)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><Pencil className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                <button onClick={() => onToggleActive(p.id, p.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${p.isActive ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"}`}>{p.isActive ? "تعطيل" : "تفعيل"}</button>
                <button onClick={() => onDelete(p.id)} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"><Trash2 className="w-3.5 h-3.5 inline ml-1" />حذف</button>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["الاسم", "الهاتف", "الجنس", "فصيلة الدم", "الزيارات", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(p => (
              <tr key={p.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm ${!p.isActive ? "opacity-60" : ""}`}>
                <td className="py-3 px-4 font-medium">{p.firstName} {p.lastName || ""}</td>
                <td className="py-3 px-4" dir="ltr">{p.phone || "—"}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{GENDER_LABEL[p.gender || ""] || "—"}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{p.bloodType || "—"}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{p.visitCount ?? 0}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${p.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{p.isActive ? "نشط" : "غير نشط"}</span></td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => onView(p.id)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="عرض الملف"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => navigate(`/admin/booking/patients/${p.id}`)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="فتح صفحة مستقلة"><ExternalLink className="w-4 h-4" /></button>
                    <button onClick={() => onEdit(p)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onToggleActive(p.id, p.isActive)} className={`p-1.5 rounded ${p.isActive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"}`} title={p.isActive ? "تعطيل" : "تفعيل"}><Check className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>)}
      {modalPatient !== undefined && <PatientModal patient={modalPatient} onClose={onModalClose} onSave={onSave} />}
    </div>
  );
}
