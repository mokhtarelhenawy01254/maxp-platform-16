import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Pencil, Trash2, Plus, Eye, Clock, UserCheck, Stethoscope } from "lucide-react";
import { BookingDoctor, BookingBranch, BookingService } from "./shared";
import DoctorModal from "./DoctorModal";
import DoctorAvailabilityModal from "./DoctorAvailabilityModal";

interface Props {
  doctors: BookingDoctor[];
  branches: BookingBranch[];
  services?: BookingService[];
  search: string;
  onSearchChange: (v: string) => void;
  onEdit: (d: Partial<BookingDoctor>) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onAvailabilitySaved?: () => void;
  modalDoctor: Partial<BookingDoctor> | null | undefined;
  onModalClose: () => void;
  onSave: (d: Partial<BookingDoctor>) => Promise<void>;
}

export default function DoctorsTab({
  doctors,
  branches,
  services = [],
  search,
  onSearchChange,
  onEdit,
  onToggleActive,
  onDelete,
  onAvailabilitySaved,
  modalDoctor,
  onModalClose,
  onSave,
}: Props) {
  const navigate = useNavigate();
  const [availabilityDoctor, setAvailabilityDoctor] = useState<BookingDoctor | null>(null);

  const filtered = useMemo(
    () =>
      doctors.filter(
        (d) =>
          !search ||
          (d.name || "").includes(search) ||
          (d.specialty || "").includes(search)
      ),
    [doctors, search]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">إدارة الكادر الطبي</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            الأطباء المعتمدون، التخصصات، المواعيد المتاحة، والربط بالفروع
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              className="border border-border/70 rounded-lg pr-8 pl-3 py-1.5 text-xs sm:text-sm w-44 sm:w-56 bg-card text-foreground shadow-sm hover:border-border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40"
              placeholder="بحث بالطبيب أو التخصص..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button
            onClick={() => onEdit({})}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm hover:bg-primary/90 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طبيب</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((d) => {
          const branch = branches.find((b) => b.id === d.branchId);
          return (
            <div
              key={d.id}
              className={`bg-card rounded-xl border border-border/70 p-4 shadow-sm space-y-3 transition-all hover:border-border ${
                !d.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      {d.title ? d.title + " " : ""}
                      {d.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{d.specialty}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                    d.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {d.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
                <span>الفرع: <strong className="text-foreground">{branch?.name || "—"}</strong></span>
                {d.serviceIds && d.serviceIds.length > 0 && (
                  <span className="text-primary font-mono tabular-nums text-[11px] bg-primary/10 px-2 py-0.5 rounded-md">
                    {d.serviceIds.length} خدمات
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                <button
                  onClick={() => navigate(`/admin/booking/doctors/${d.id}`)}
                  className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>صفحة</span>
                </button>
                <button
                  onClick={() => setAvailabilityDoctor(d)}
                  className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md hover:bg-amber-500/20 flex items-center gap-1 transition-colors"
                >
                  <Clock className="w-3 h-3" />
                  <span>الأوقات</span>
                </button>
                <button
                  onClick={() => onEdit(d)}
                  className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-500/20 flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  <span>تعديل</span>
                </button>
                <button
                  onClick={() => onToggleActive(d.id, d.isActive)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    d.isActive
                      ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  }`}
                >
                  {d.isActive ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  onClick={() => onDelete(d.id)}
                  className="text-xs px-2.5 py-1 bg-rose-500/10 text-rose-600 rounded-md hover:bg-rose-500/20 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-border/70 rounded-xl p-6">
            <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-40 text-primary" />
            <p className="text-xs">لا يوجد أطباء مسجلون</p>
          </div>
        )}
      </div>

      {modalDoctor !== undefined && (
        <DoctorModal
          doctor={modalDoctor}
          branches={branches}
          services={services}
          onClose={onModalClose}
          onSave={onSave}
        />
      )}

      {availabilityDoctor && (
        <DoctorAvailabilityModal
          doctor={availabilityDoctor}
          onClose={() => setAvailabilityDoctor(null)}
          onSaved={() => onAvailabilitySaved?.()}
        />
      )}
    </div>
  );
}
