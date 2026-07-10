import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  XMarkIcon, EyeIcon, CheckIcon, PlusIcon, MagnifyingGlassIcon, CalendarDaysIcon,
  ChevronUpIcon, ChevronDownIcon, FunnelIcon
} from "@heroicons/react/24/outline";
import {
  BookingAppointment, BookingBranch, BookingDoctor, BookingService,
  STATUS_MAP, MODAL_INPUT_CLS
} from "./shared";
import AppointmentModal from "./AppointmentModal";

interface Filters {
  status: string; branchId: string; dateFrom: string; dateTo: string; search: string;
}

interface Props {
  loading: boolean;
  appointments: BookingAppointment[];
  total?: number;
  page?: number;
  limit?: number;
  branches: BookingBranch[];
  doctors: BookingDoctor[];
  services: BookingService[];
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBulkUpdateStatus: (status: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onEdit: (a: Partial<BookingAppointment>) => void;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, order: "asc" | "desc") => void;
  modalAppointment: Partial<BookingAppointment> | null | undefined;
  onModalClose: () => void;
  onSave: (d: Partial<BookingAppointment>) => Promise<void>;
}

export default function AppointmentsTab({
  loading, appointments, total = 0, page = 1, limit = 50,
  branches, doctors, services,
  filters, onFiltersChange,
  selectedIds, onToggleSelect, onToggleSelectAll,
  onBulkUpdateStatus, onBulkDelete, onClearSelection,
  onUpdateStatus, onEdit, onPageChange,
  sortBy, sortOrder, onSortChange,
  modalAppointment, onModalClose, onSave
}: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    return !!(filters.status || filters.branchId || filters.dateFrom || filters.dateTo);
  });

  const activeFiltersCount = [
    filters.status,
    filters.branchId,
    filters.dateFrom || filters.dateTo ? "date" : "",
  ].filter(Boolean).length;

  const confirmAndUpdate = useCallback((id: string, status: string, label: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    const oldStatus = appt.status;

    setUpdatingId(id);
    onUpdateStatus(id, status);
    setTimeout(() => setUpdatingId(null), 2000);

    toast.success(`تم تغيير حالة الموعد إلى "${label}"`, {
      action: {
        label: "تراجع",
        onClick: () => {
          onUpdateStatus(id, oldStatus);
        }
      }
    });
  }, [appointments, onUpdateStatus]);

  const totalPages = Math.ceil(total / limit);

  const SORT_FIELDS: Record<string, string> = {
    "العميل": "customerName", "التاريخ": "appointmentDate", "الوقت": "startTime", "الحالة": "status"
  };
  const sortHeader = (label: string) => {
    const field = SORT_FIELDS[label];
    if (!field) return <th key={label} className="text-right py-3 px-4">{label}</th>;
    const active = sortBy === field;
    return (
      <th key={label} className="text-right py-3 px-4 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onSortChange?.(field, active && sortOrder === 'desc' ? 'asc' : 'desc')}>
        <span className="inline-flex items-center gap-1">{label}
          {active && (sortOrder === 'desc' ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronUpIcon className="w-3 h-3" />)}
        </span>
      </th>
    );
  };

  const setQuickDate = (daysBack: number) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (daysBack === 0) onFiltersChange({ ...filters, dateFrom: fmt(today), dateTo: fmt(today) });
    else {
      const from = new Date(today);
      from.setDate(from.getDate() - daysBack);
      onFiltersChange({ ...filters, dateFrom: fmt(from), dateTo: fmt(today) });
    }
  };

  const isToday = filters.dateFrom && filters.dateTo &&
    filters.dateFrom === new Date().toISOString().split('T')[0] &&
    filters.dateTo === new Date().toISOString().split('T')[0];
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const isThisWeek = filters.dateFrom && filters.dateTo &&
    filters.dateTo === new Date().toISOString().split('T')[0] &&
    filters.dateFrom <= lastWeek.toISOString().split('T')[0];

  return (
    <div>
      {/* Top filters row: Search & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold ml-2">المواعيد</h2>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="بحث باسم العميل أو الهاتف..."
              className={`${MODAL_INPUT_CLS} pr-8${filters.search ? ' pl-8' : ''} w-48 sm:w-64 text-sm`}
              value={filters.search}
              onChange={e => onFiltersChange({ ...filters, search: e.target.value })} />
            {filters.search && (
              <button onClick={() => onFiltersChange({ ...filters, search: '' })}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
              showAdvancedFilters 
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            <span>تصفية متقدمة</span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
        <button onClick={() => onEdit({})} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-semibold shadow-sm"><PlusIcon className="w-4 h-4" />حجز موعد</button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 mb-4 bg-gray-50/50 dark:bg-gray-800/20 border dark:border-gray-700 rounded-xl transition-all duration-200">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الحالة</label>
            <select className={`${MODAL_INPUT_CLS} text-sm py-1.5`} value={filters.status} onChange={e => onFiltersChange({ ...filters, status: e.target.value })}>
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الفرع</label>
            <select className={`${MODAL_INPUT_CLS} text-sm py-1.5`} value={filters.branchId} onChange={e => onFiltersChange({ ...filters, branchId: e.target.value })}>
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الفترة الزمنية</label>
            <div className="flex items-center gap-2">
              <input type="date" className={`${MODAL_INPUT_CLS} text-sm py-1.5 w-full`} value={filters.dateFrom} onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value })} />
              <span className="text-gray-400 dark:text-gray-500">—</span>
              <input type="date" className={`${MODAL_INPUT_CLS} text-sm py-1.5 w-full`} value={filters.dateTo} onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value })} />
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setQuickDate(0)}
                  className={`text-xs px-2 py-1.5 rounded-lg font-medium border ${isToday ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>اليوم</button>
                <button onClick={() => setQuickDate(7)}
                  className={`text-xs px-2 py-1.5 rounded-lg font-medium border ${isThisWeek ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>٧أ</button>
                <button onClick={() => setQuickDate(30)}
                  className="text-xs px-2 py-1.5 rounded-lg font-medium border bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">٣٠أ</button>
                {(filters.dateFrom || filters.dateTo) && (
                  <button onClick={() => onFiltersChange({ ...filters, dateFrom: '', dateTo: '' })}
                    className="text-xs px-2 py-1.5 rounded-lg font-medium border text-red-600 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 ml-2">{selectedIds.size} محدد</span>
          <button onClick={() => onBulkUpdateStatus("confirmed")} className="text-xs px-2 py-1 rounded font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200">تأكيد</button>
          <button onClick={() => onBulkUpdateStatus("cancelled")} className="text-xs px-2 py-1 rounded font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200">إلغاء</button>
          <button onClick={() => onBulkUpdateStatus("completed")} className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200">إتمام</button>
          <button onClick={() => onBulkUpdateStatus("no_show")} className="text-xs px-2 py-1 rounded font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200">لم يحضر</button>
          <span className="w-px h-4 bg-blue-200 dark:bg-blue-800"></span>
          <button onClick={onBulkDelete} className="text-xs px-2 py-1 rounded font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200">حذف</button>
          <button onClick={onClearSelection} className="text-xs px-2 py-1 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded hover:bg-gray-50">إلغاء</button>
        </div>
      )}
      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-12 text-gray-400 dark:text-gray-500">جاري التحميل...</p>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <CalendarDaysIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد مواعيد</p>
          </div>
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
              {a.serviceName && <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg font-medium">الخدمة: {a.serviceName}</span>}
              {a.createdByName ? (
                <span className={`px-2 py-1 rounded-lg text-xs ${a.createdByType === 'ai_service' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                  {a.createdByType === 'ai_service' ? 'أجنت' : 'موظف'}: {a.createdByName}
                </span>
              ) : (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-400 px-2 py-1 rounded-lg">المسجل: —</span>
              )}
            </div>
            <div className="flex gap-2">
              {a.status === "pending" && (
                <>
                  <button onClick={() => confirmAndUpdate(a.id, "confirmed", "مؤكد")} disabled={updatingId === a.id} className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50">{updatingId === a.id ? 'جاري...' : <><CheckIcon className="w-3 h-3 inline ml-1" />تأكيد</>}</button>
                  <button onClick={() => confirmAndUpdate(a.id, "cancelled", "ملغي")} disabled={updatingId === a.id} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50">{updatingId === a.id ? 'جاري...' : <><XMarkIcon className="w-3 h-3 inline ml-1" />إلغاء</>}</button>
                </>
              )}
              {a.status === "confirmed" && (
                <button onClick={() => confirmAndUpdate(a.id, "completed", "مكتمل")} disabled={updatingId === a.id} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50">{updatingId === a.id ? 'جاري...' : <><CheckIcon className="w-3 h-3 inline ml-1" />إتمام</>}</button>
              )}
              <button onClick={() => onEdit(a)} className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"><EyeIcon className="w-3 h-3 inline ml-1" />عرض</button>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
            <th className="py-3 px-4 w-10">
              <input type="checkbox" checked={selectedIds.size === appointments.length && appointments.length > 0} onChange={onToggleSelectAll}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
            </th>
            {["العميل", "الهاتف", "الفرع", "الخدمة", "التاريخ", "الوقت", "المسجل", "الحالة", ""].map(h => h === "" ? <th key={h} className="text-right py-3 px-4"></th> : sortHeader(h))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400 dark:text-gray-500">جاري التحميل...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400 dark:text-gray-500">
                <CalendarDaysIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                لا توجد مواعيد
              </td></tr>
            ) : appointments.map((a, idx) => (
              <tr key={a.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm${idx % 2 ? ' bg-gray-50/50 dark:bg-gray-800/20' : ''} ${selectedIds.has(a.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                <td className="py-3 px-4">
                  <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => onToggleSelect(a.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                </td>
                <td className="py-3 px-4 font-medium">{a.customerName}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{a.customerPhone}</td>
                <td className="py-3 px-4">{a.branchName || "—"}</td>
                <td className="py-3 px-4">{a.serviceName || "—"}</td>
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
                        <button onClick={() => confirmAndUpdate(a.id, "confirmed", "مؤكد")} disabled={updatingId === a.id} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded disabled:opacity-50" title="تأكيد"><CheckIcon className="w-4 h-4" /></button>
                        <button onClick={() => confirmAndUpdate(a.id, "cancelled", "ملغي")} disabled={updatingId === a.id} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50" title="إلغاء"><XMarkIcon className="w-4 h-4" /></button>
                      </>
                    )}
                    {a.status === "confirmed" && (
                      <button onClick={() => confirmAndUpdate(a.id, "completed", "مكتمل")} disabled={updatingId === a.id} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded disabled:opacity-50" title="إتمام"><CheckIcon className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => onEdit(a)} className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded" title="عرض"><EyeIcon className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-xs sm:text-sm">إجمالي {total} موعد — الصفحة {page} من {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">السابق</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 1 || p === 1 || p === totalPages).map((p, idx, arr) => (
              <span key={p} className="flex">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 self-center text-xs">...</span>}
                <button onClick={() => onPageChange?.(p)}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-lg ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600'}`}>{p}</button>
              </span>
            ))}
            <button disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">التالي</button>
          </div>
        </div>
      )}
      {modalAppointment !== undefined && <AppointmentModal appointment={modalAppointment} branches={branches} branchDoctors={doctors} services={services} onClose={onModalClose} onSave={onSave} />}
    </div>
  );
}
