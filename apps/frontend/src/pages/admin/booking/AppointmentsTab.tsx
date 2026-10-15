import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  X, Eye, Check, Plus, CalendarDays,
  ChevronUp, ChevronDown, ArrowRight
} from "lucide-react";
import {
  BookingAppointment, BookingBranch, BookingDoctor, BookingService, BookingPatient,
  STATUS_MAP, api, getAuthHeaders
} from "./shared";
import AppointmentModal from "./AppointmentModal";
import AppointmentsFilterBar from "./AppointmentsFilterBar";

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
  patients: BookingPatient[];
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
  onViewPatient?: (patientId: string) => void;
}

export default function AppointmentsTab({
  loading, appointments, total = 0, page = 1, limit = 50,
  branches, doctors, services, patients,
  filters, onFiltersChange,
  selectedIds, onToggleSelect, onToggleSelectAll,
  onBulkUpdateStatus, onBulkDelete, onClearSelection,
  onUpdateStatus, onEdit, onPageChange,
  sortBy, sortOrder, onSortChange,
  modalAppointment, onModalClose, onSave,
  onViewPatient
}: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    return !!(filters.status || filters.branchId || filters.dateFrom || filters.dateTo);
  });

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

  const createInvoiceFor = useCallback(async (a: BookingAppointment) => {
    if (!a.patientId) {
      toast.error("الموعد غير مرتبط بمريض");
      return;
    }
    try {
      const res = await fetch(api(`invoices/from-appointment/${a.id}`), { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({}) });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || "فشل إنشاء الفاتورة"); return; }
      toast.success(`تم إنشاء الفاتورة ${data.data.invoiceNumber} بمبلغ ${data.data.total} ج.م`);
    } catch {
      toast.error("فشل إنشاء الفاتورة");
    }
  }, []);

  const SORT_FIELDS: Record<string, string> = {
    "العميل": "customerName", "التاريخ": "appointmentDate", "الوقت": "startTime", "الحالة": "status"
  };
  const sortHeader = (label: string) => {
    const field = SORT_FIELDS[label];
    if (!field) return <th key={label} className="text-right py-2.5 px-3 font-medium">{label}</th>;
    const active = sortBy === field;
    return (
      <th key={label} className="text-right py-2.5 px-3 cursor-pointer select-none font-medium hover:text-foreground transition-colors" onClick={() => onSortChange?.(field, active && sortOrder === 'desc' ? 'asc' : 'desc')}>
        <span className="inline-flex items-center gap-1">{label}
          {active && (sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-primary" /> : <ChevronUp className="w-3.5 h-3.5 text-primary" />)}
        </span>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      <AppointmentsFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        branches={branches}
        patients={patients}
        onViewPatient={onViewPatient}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        onNewAppointment={() => onEdit({})}
        selectedIds={selectedIds}
        onBulkUpdateStatus={onBulkUpdateStatus}
        onBulkDelete={onBulkDelete}
        onClearSelection={onClearSelection}
      />

      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-12 text-muted-foreground text-xs">جاري التحميل...</p>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border/70 rounded-xl p-6">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40 text-primary" />
            <p className="text-xs">لا توجد مواعيد مسجلة</p>
          </div>
        ) : appointments.map(a => (
          <div key={a.id} className="bg-card rounded-xl border border-border/70 p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(a.id)}
                  onChange={() => onToggleSelect(a.id)}
                  className="rounded border-border/70 text-primary focus:ring-primary/40"
                />
                <div>
                  <h3 className="font-bold text-sm text-foreground">{a.customerName}</h3>
                  <p className="text-xs font-mono tabular-nums text-muted-foreground" dir="ltr">{a.customerPhone}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_MAP[a.status]?.color || ""}`}>
                {STATUS_MAP[a.status]?.label || a.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-md">{a.branchName || "—"}</span>
              <span className="bg-muted text-muted-foreground font-mono tabular-nums px-2 py-0.5 rounded-md">{a.appointmentDate}</span>
              <span className="bg-muted text-muted-foreground font-mono tabular-nums px-2 py-0.5 rounded-md">{a.startTime}</span>
              {a.serviceName && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">{a.serviceName}</span>}
              {a.createdByName && (
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${a.createdByType === 'ai_service' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                  {a.createdByType === 'ai_service' ? 'وكيل ذكي' : 'موظف'}: {a.createdByName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
              {a.status === "pending" && (
                <>
                  <button onClick={() => confirmAndUpdate(a.id, "confirmed", "مؤكد")} disabled={updatingId === a.id} className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 disabled:opacity-50 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>تأكيد</span>
                  </button>
                  <button onClick={() => confirmAndUpdate(a.id, "cancelled", "ملغي")} disabled={updatingId === a.id} className="text-xs px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-md hover:bg-rose-500/20 disabled:opacity-50 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    <span>إلغاء</span>
                  </button>
                </>
              )}
              {a.status === "confirmed" && (
                <button onClick={() => confirmAndUpdate(a.id, "completed", "مكتمل")} disabled={updatingId === a.id} className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md hover:bg-blue-500/20 disabled:opacity-50 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>إتمام</span>
                </button>
              )}
              <button onClick={() => onEdit(a)} className="text-xs px-2.5 py-1 bg-muted text-muted-foreground border border-border/70 rounded-md hover:bg-muted/80 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>عرض</span>
              </button>
              {a.patientId && onViewPatient && (
                <button onClick={() => onViewPatient(a.patientId!)} className="text-xs px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  <span>الملف</span>
                </button>
              )}
              {a.patientId && !a.paymentStatus && (
                <button onClick={() => createInvoiceFor(a)} className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  <span>فاتورة</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl border border-border/70 overflow-x-auto shadow-sm">
        <table className="w-full min-w-[900px] text-xs">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
              <th className="py-2.5 px-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === appointments.length && appointments.length > 0}
                  onChange={onToggleSelectAll}
                  className="rounded border-border/70 text-primary focus:ring-primary/40"
                />
              </th>
              {["العميل", "الهاتف", "الفرع", "الخدمة", "التاريخ", "الوقت", "المسجل", "الحالة", ""].map(h => h === "" ? <th key={h} className="text-right py-2.5 px-3"></th> : sortHeader(h))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">جاري التحميل...</td></tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40 text-primary" />
                  <p>لا توجد مواعيد مسجلة</p>
                </td>
              </tr>
            ) : appointments.map((a, idx) => (
              <tr key={a.id} className={`hover:bg-muted/40 transition-colors ${idx % 2 ? 'bg-muted/15' : ''} ${selectedIds.has(a.id) ? "bg-primary/5" : ""}`}>
                <td className="py-2.5 px-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(a.id)}
                    onChange={() => onToggleSelect(a.id)}
                    className="rounded border-border/70 text-primary focus:ring-primary/40"
                  />
                </td>
                <td className="py-2.5 px-3 font-semibold text-foreground">{a.customerName}</td>
                <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground" dir="ltr">{a.customerPhone}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{a.branchName || "—"}</td>
                <td className="py-2.5 px-3 font-medium text-foreground">{a.serviceName || "—"}</td>
                <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{a.appointmentDate}</td>
                <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{a.startTime}</td>
                <td className="py-2.5 px-3">
                  {a.createdByName ? (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] ${a.createdByType === 'ai_service' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                      <span className="text-[9px] opacity-70">{a.createdByType === 'ai_service' ? 'وكيل' : 'موظف'}</span>
                      <span>{a.createdByName}</span>
                    </span>
                  ) : <span className="text-muted-foreground/60">—</span>}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${STATUS_MAP[a.status]?.color || ""}`}>
                    {STATUS_MAP[a.status]?.label || a.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-left">
                  <div className="flex items-center justify-end gap-1">
                    {a.status === "pending" && (
                      <>
                        <button onClick={() => confirmAndUpdate(a.id, "confirmed", "مؤكد")} disabled={updatingId === a.id} className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50" title="تأكيد"><Check className="w-4 h-4" /></button>
                        <button onClick={() => confirmAndUpdate(a.id, "cancelled", "ملغي")} disabled={updatingId === a.id} className="p-1 text-rose-600 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50" title="إلغاء"><X className="w-4 h-4" /></button>
                      </>
                    )}
                    {a.status === "confirmed" && (
                      <button onClick={() => confirmAndUpdate(a.id, "completed", "مكتمل")} disabled={updatingId === a.id} className="p-1 text-blue-600 hover:bg-blue-500/10 rounded transition-colors disabled:opacity-50" title="إتمام"><Check className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => onEdit(a)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors" title="عرض وتعديل"><Eye className="w-4 h-4" /></button>
                    {a.patientId && onViewPatient && (
                      <button onClick={() => onViewPatient(a.patientId!)} className="p-1 text-primary hover:bg-primary/10 rounded transition-colors" title="فتح ملف المريض"><ArrowRight className="w-4 h-4" /></button>
                    )}
                    {a.patientId && !a.paymentStatus && (
                      <button onClick={() => createInvoiceFor(a)} className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded transition-colors" title="إنشاء فاتورة"><Plus className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 text-xs text-muted-foreground">
          <span>إجمالي <strong className="font-mono tabular-nums text-foreground">{total}</strong> موعد — الصفحة <strong className="font-mono tabular-nums text-foreground">{page}</strong> من <strong className="font-mono tabular-nums text-foreground">{totalPages}</strong></span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="px-2.5 py-1 border border-border/70 rounded-lg bg-card disabled:opacity-40 hover:bg-muted/60 transition-colors"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 1 || p === 1 || p === totalPages).map((p, idx, arr) => (
              <span key={p} className="flex">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 self-center text-xs">...</span>}
                <button
                  onClick={() => onPageChange?.(p)}
                  className={`px-2.5 py-1 border rounded-lg font-mono tabular-nums transition-colors ${
                    p === page
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/70 hover:bg-muted/60"
                  }`}
                >
                  {p}
                </button>
              </span>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="px-2.5 py-1 border border-border/70 rounded-lg bg-card disabled:opacity-40 hover:bg-muted/60 transition-colors"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {modalAppointment !== undefined && (
        <AppointmentModal
          appointment={modalAppointment}
          branches={branches}
          branchDoctors={doctors}
          services={services}
          patients={patients}
          onClose={onModalClose}
          onSave={onSave}
          onViewPatient={onViewPatient}
        />
      )}
    </div>
  );
}
