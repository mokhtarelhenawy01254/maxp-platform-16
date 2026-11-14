import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  Power,
  Users,
  DoorOpen,
  RefreshCw,
} from "lucide-react";
import {
  educationBranchesService,
  EducationBranch,
} from "../../../services/educationBranchesService";
import { EducationBranchModal } from "./EducationBranchModal";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

export default function EducationBranchesPage() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [branches, setBranches] = useState<EducationBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<EducationBranch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<EducationBranch | null>(null);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await educationBranchesService.getBranches();
      setBranches(res.data || []);
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to load branches" : "تعذر تحميل قائمة الفروع"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (statusFilter === "ACTIVE" && !b.isActive) return false;
      if (statusFilter === "INACTIVE" && b.isActive) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchCity = b.city?.toLowerCase().includes(q);
      const matchAddress = b.address?.toLowerCase().includes(q);
      const matchPhone = b.phone?.toLowerCase().includes(q);
      return matchName || matchCity || matchAddress || matchPhone;
    });
  }, [branches, search, statusFilter]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalBranches = branches.length;
    let totalRooms = 0;
    let totalCapacity = 0;
    for (const b of branches) {
      const rooms = Array.isArray(b.classrooms) ? b.classrooms : [];
      totalRooms += rooms.length;
      for (const r of rooms) {
        totalCapacity += Number(r.capacity) || 0;
      }
    }
    return { totalBranches, totalRooms, totalCapacity };
  }, [branches]);

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (branch: EducationBranch) => {
    setEditingBranch(branch);
    setModalOpen(true);
  };

  const handleSave = async (data: Partial<EducationBranch>) => {
    if (editingBranch) {
      await educationBranchesService.updateBranch(editingBranch.id, data);
      toast.success(isEn ? "Branch updated successfully" : "تم تحديث بيانات الفرع بنجاح");
    } else {
      await educationBranchesService.createBranch(data);
      toast.success(isEn ? "New branch added successfully" : "تمت إضافة الفرع الجديد بنجاح");
    }
    await loadBranches();
  };

  const handleToggleStatus = async (branch: EducationBranch) => {
    try {
      await educationBranchesService.toggleBranchStatus(branch.id);
      toast.success(
        branch.isActive
          ? isEn
            ? "Branch deactivated"
            : "تم تعطيل الفرع مؤقتاً"
          : isEn
          ? "Branch activated"
          : "تم تفعيل الفرع بنجاح"
      );
      await loadBranches();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to update branch status" : "تعذر تعديل حالة الفرع"));
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;
    try {
      await educationBranchesService.deleteBranch(branchToDelete.id);
      toast.success(isEn ? "Branch deleted successfully" : "تم حذف الفرع بنجاح");
      setBranchToDelete(null);
      await loadBranches();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to delete branch" : "تعذر حذف الفرع"));
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto" dir={isEn ? "ltr" : "rtl"}>
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary shrink-0" />
            <span>{isEn ? "Center Branches & Classrooms" : "فروع ومقرات المركز"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn
              ? "Manage physical academy campuses, classroom capacities, and location links"
              : "إدارة مقرات الأكاديمية والفروع الميدانية وسعات القاعات والمعامل"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadBranches}
            disabled={loading}
            title={isEn ? "Refresh" : "تحديث"}
            className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? "Add New Branch" : "إضافة فرع جديد"}</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 sm:p-4 rounded-xl border border-border bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {isEn ? "Total Branches" : "عدد الفروع والمقرات"}
            </div>
            <div className="text-base font-bold text-foreground font-mono tabular-nums">
              {metrics.totalBranches} {isEn ? "branches" : "فرع"}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-border bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {isEn ? "Total Classrooms & Labs" : "إجمالي القاعات والمعامل"}
            </div>
            <div className="text-base font-bold text-foreground font-mono tabular-nums">
              {metrics.totalRooms} {isEn ? "rooms" : "قاعة ومعمل"}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-border bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {isEn ? "Total Capacity" : "السعة الاستيعابية الإجمالية"}
            </div>
            <div className="text-base font-bold text-foreground font-mono tabular-nums">
              {metrics.totalCapacity} {isEn ? "seats" : "طالب"}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-xl bg-card border border-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? "Search by branch name, city, address or phone…" : "بحث باسم الفرع، المدينة، العنوان أو الهاتف…"}
            className="w-full bg-background border border-input rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
              statusFilter === "ALL"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {isEn ? "All" : "الكل"}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
              statusFilter === "ACTIVE"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {isEn ? "Active" : "النشطة"}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
              statusFilter === "INACTIVE"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {isEn ? "Inactive" : "المتوقفة"}
          </button>
        </div>
      </div>

      {/* Branches List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-border bg-card animate-pulse space-y-3">
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted/70 rounded w-2/3" />
              <div className="h-4 bg-muted/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {search.trim()
                ? isEn
                  ? "No branches matching search"
                  : "لا توجد نتائج مطابقة لبحثك"
                : isEn
                ? "No branches added yet"
                : "لم يتم تعريف أي فروع للمركز حتى الآن"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {isEn
                ? "Click 'Add New Branch' above to register your first training facility and rooms."
                : "اضغط على زر 'إضافة فرع جديد' لإضافة المقر وقاعات ومعامل التدريب الخاصة به."}
            </p>
          </div>
          {!search.trim() && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? "Add First Branch" : "إضافة أول فرع"}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBranches.map((branch) => {
            const rooms = Array.isArray(branch.classrooms) ? branch.classrooms : [];
            const branchCapacity = rooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);

            return (
              <div
                key={branch.id}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
              >
                {/* Branch Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-foreground">
                          {branch.name}
                        </h2>
                        {branch.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {isEn ? "Active" : "نشط"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            {isEn ? "Inactive" : "متوقف"}
                          </span>
                        )}
                      </div>
                      {branch.city && (
                        <div className="text-xs text-muted-foreground font-medium">
                          {branch.city}
                        </div>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(branch)}
                        title={branch.isActive ? (isEn ? "Deactivate" : "تعطيل الفرع") : (isEn ? "Activate" : "تفعيل الفرع")}
                        className={`p-1.5 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center ${
                          branch.isActive
                            ? "text-emerald-600 hover:bg-emerald-500/10"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(branch)}
                        title={isEn ? "Edit branch" : "تعديل بيانات الفرع"}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBranchToDelete(branch)}
                        title={isEn ? "Delete branch" : "حذف الفرع"}
                        className="p-1.5 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Address */}
                  {branch.address && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{branch.address}</span>
                    </div>
                  )}

                  {/* Phone & Working Hours */}
                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                    <a
                      href={`tel:${branch.phone}`}
                      className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors font-mono font-medium"
                      dir="ltr"
                    >
                      <Phone className="w-3 h-3 text-primary" />
                      <span>{branch.phone}</span>
                    </a>

                    {branch.workingHours && (
                      <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>{branch.workingHours}</span>
                      </div>
                    )}

                    {branch.googleMapsUrl && (
                      <a
                        href={branch.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{isEn ? "Open in Google Maps" : "الموقع على الخريطة"}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Classrooms Badges */}
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <DoorOpen className="w-3.5 h-3.5 text-primary" />
                      <span>{isEn ? "Classrooms & Labs" : "القاعات والمعامل"}</span>
                      <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        ({rooms.length})
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono tabular-nums font-medium">
                      {isEn ? `Capacity: ${branchCapacity} seats` : `السعة: ${branchCapacity} طالب`}
                    </span>
                  </div>

                  {rooms.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground italic">
                      {isEn ? "No classrooms registered" : "لا توجد قاعات مسجلة"}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {rooms.map((room) => (
                        <span
                          key={room.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border font-medium ${
                            room.isActive
                              ? "bg-muted/60 text-foreground border-border"
                              : "bg-muted/30 text-muted-foreground border-border/50 line-through"
                          }`}
                        >
                          <span>{room.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                            ({room.capacity} {isEn ? "seats" : "طالب"})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <EducationBranchModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBranch(null);
        }}
        onSave={handleSave}
        branch={editingBranch}
        isEn={isEn}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!branchToDelete}
        onCancel={() => setBranchToDelete(null)}
        onConfirm={handleDelete}
        title={isEn ? "Delete Branch" : "تأكيد حذف الفرع"}
        content={
          isEn
            ? `Are you sure you want to delete branch "${branchToDelete?.name}"? Any linked rooms will be removed.`
            : `هل أنت متأكد من رغبتك في حذف فرع "${branchToDelete?.name}"؟ سيتم حذف جميع القاعات التابعة له.`
        }
        confirmLabel={isEn ? "Delete Branch" : "نعم، حذف الفرع"}
        cancelLabel={isEn ? "Cancel" : "إلغاء"}
        confirmColor="error"
      />
    </div>
  );
}
