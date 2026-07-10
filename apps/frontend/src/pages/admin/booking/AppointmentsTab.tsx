import {
  XMarkIcon, EyeIcon, CheckIcon, PlusIcon
} from "@heroicons/react/24/outline";
import {
  BookingAppointment, BookingBranch, BookingDoctor, BookingService,
  STATUS_MAP, MODAL_INPUT_CLS
} from "./shared";
import AppointmentModal from "./AppointmentModal";

interface Props {
  loading: boolean;
  appointments: BookingAppointment[];
  branches: BookingBranch[];
  doctors: BookingDoctor[];
  services: BookingService[];
  filters: { status: string; branchId: string; dateFrom: string; dateTo: string };
  onFiltersChange: (f: { status: string; branchId: string; dateFrom: string; dateTo: string }) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBulkUpdateStatus: (status: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onEdit: (a: Partial<BookingAppointment>) => void;
  modalAppointment: Partial<BookingAppointment> | null | undefined;
  onModalClose: () => void;
  onSave: (d: Partial<BookingAppointment>) => Promise<void>;
}

export default function AppointmentsTab({
  loading, appointments, branches, doctors, services,
  filters, onFiltersChange,
  selectedIds, onToggleSelect, onToggleSelectAll,
  onBulkUpdateStatus, onBulkDelete, onClearSelection,
  onUpdateStatus, onEdit,
  modalAppointment, onModalClose, onSave
}: Props) {
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">المواعيد</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <select className={MODAL_INPUT_CLS} value={filters.status} onChange={e => onFiltersChange({ ...filters, status: e.target.value })}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className={MODAL_INPUT_CLS} value={filters.branchId} onChange={e => onFiltersChange({ ...filters, branchId: e.target.value })}>
            <option value="">كل الفروع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input type="date" className={MODAL_INPUT_CLS} value={filters.dateFrom} onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value })} />
          <input type="date" className={MODAL_INPUT_CLS} value={filters.dateTo} onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value })} />
          <button onClick={() => onEdit({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />حجز موعد</button>
        </div>
      </div>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300 ml-2">{selectedIds.size} موعد محدد</span>
          <button onClick={() => onBulkUpdateStatus("confirmed")} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60">تأكيد</button>
          <button onClick={() => onBulkUpdateStatus("cancelled")} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60">إلغاء</button>
          <button onClick={() => onBulkUpdateStatus("completed")} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60">إتمام</button>
          <button onClick={() => onBulkUpdateStatus("no_show")} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">لم يحضر</button>
          <span className="w-px h-5 bg-blue-200 dark:bg-blue-800"></span>
          <button onClick={onBulkDelete} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60">حذف</button>
          <button onClick={onClearSelection} className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">إلغاء التحديد</button>
        </div>
      )}
      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-12 text-gray-400 dark:text-gray-500">جاري التحميل...</p>
        ) : appointments.length === 0 ? (
          <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواعيد</p>
        ) : appointments.map(a => (
          <div key={a.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => onToggleSelect(a.id)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                <div>
                  <h3 className="font-bold text-sm">{a.customerName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.customerPhone}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs mb-3">
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">{a.branchName || "—"}</span>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">{a.appointmentDate}</span>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">{a.startTime}</span>
              {a.createdByName && (
                <span className={`px-2 py-1 rounded-lg text-xs ${a.createdByType === 'ai_service' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                  {a.createdByType === 'ai_service' ? 'أجنت: ' : 'موظف: '}{a.createdByName}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {a.status === "pending" && (
                <>
                  <button onClick={() => onUpdateStatus(a.id, "confirmed")} className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50"><CheckIcon className="w-3 h-3 inline ml-1" />تأكيد</button>
                  <button onClick={() => onUpdateStatus(a.id, "cancelled")} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"><XMarkIcon className="w-3 h-3 inline ml-1" />إلغاء</button>
                </>
              )}
              {a.status === "confirmed" && (
                <button onClick={() => onUpdateStatus(a.id, "completed")} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><CheckIcon className="w-3 h-3 inline ml-1" />إتمام</button>
              )}
              <button onClick={() => onEdit(a)} className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"><EyeIcon className="w-3 h-3 inline ml-1" />عرض</button>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
            <th className="py-3 px-4 w-10">
              <input type="checkbox" checked={selectedIds.size === appointments.length && appointments.length > 0} onChange={onToggleSelectAll}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
            </th>
            {["العميل", "الهاتف", "الفرع", "التاريخ", "الوقت", "المسجل", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 dark:text-gray-500">جاري التحميل...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواعيد</td></tr>
            ) : appointments.map(a => (
              <tr key={a.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm ${selectedIds.has(a.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                <td className="py-3 px-4">
                  <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => onToggleSelect(a.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                </td>
                <td className="py-3 px-4 font-medium">{a.customerName}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{a.customerPhone}</td>
                <td className="py-3 px-4">{a.branchName || "—"}</td>
                <td className="py-3 px-4">{a.appointmentDate}</td>
                <td className="py-3 px-4">{a.startTime}</td>
                <td className="py-3 px-4 text-xs">
                  {a.createdByName ? (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${a.createdByType === 'ai_service' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                      <span className="text-[10px] opacity-70">{a.createdByType === 'ai_service' ? 'أجنت' : 'موظف'}</span>
                      <span>{a.createdByName}</span>
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    {a.status === "pending" && (
                      <>
                        <button onClick={() => onUpdateStatus(a.id, "confirmed")} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="تأكيد"><CheckIcon className="w-4 h-4" /></button>
                        <button onClick={() => onUpdateStatus(a.id, "cancelled")} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="إلغاء"><XMarkIcon className="w-4 h-4" /></button>
                      </>
                    )}
                    {a.status === "confirmed" && (
                      <button onClick={() => onUpdateStatus(a.id, "completed")} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="إتمام"><CheckIcon className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => onEdit(a)} className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded" title="عرض"><EyeIcon className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalAppointment !== undefined && <AppointmentModal appointment={modalAppointment} branches={branches} branchDoctors={doctors} services={services} onClose={onModalClose} onSave={onSave} />}
    </div>
  );
}
