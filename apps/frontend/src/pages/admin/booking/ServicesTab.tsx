import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Pencil, Copy, Eye, Plus, FolderPlus, Clock, Sparkles } from "lucide-react";
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

const categoryColor = (c?: string) => c || "bg-muted text-muted-foreground";

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
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">دليل الخدمات والإجراءات</h2>
          <p className="text-xs text-muted-foreground mt-0.5">تسعير الخدمات، الباقات، مدد الجلسات، والأقسام السريرية</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryModal({})}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/70 rounded-lg text-xs sm:text-sm font-medium hover:bg-muted/60 transition-colors shadow-sm"
          >
            <FolderPlus className="w-3.5 h-3.5 text-primary" />
            <span>قسم جديد</span>
          </button>
          <select
            className="border border-border/70 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-card text-foreground shadow-sm hover:border-border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40"
            value={filterStatus}
            onChange={e => onFilterStatusChange(e.target.value as "all" | "active" | "inactive")}
          >
            <option value="active">النشطة</option>
            <option value="inactive">غير النشطة</option>
            <option value="all">الكل</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              className="border border-border/70 rounded-lg pr-8 pl-3 py-1.5 text-xs sm:text-sm w-44 sm:w-56 bg-card text-foreground shadow-sm hover:border-border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40"
              placeholder="بحث بالخدمة..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
          <button
            onClick={() => onEdit({})}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm hover:bg-primary/90 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة خدمة</span>
          </button>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border/70 hover:bg-muted/60"
          }`}
        >
          كل الخدمات
        </button>
        <button
          onClick={() => setActiveCategory("none")}
          className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${
            activeCategory === "none"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border/70 hover:bg-muted/60"
          }`}
        >
          بدون قسم
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${
              activeCategory === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/70 hover:bg-muted/60"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map(s => {
          const bs = s.branchServices || [];
          const visibleBranches = bs.filter(b => b.isActive).slice(0, 3);
          const extraCount = bs.filter(b => b.isActive).length - 3;
          const cat = s.categoryId ? catMap.get(s.categoryId) : undefined;
          const doctorCount = s.doctorServices?.length || 0;
          return (
            <div
              key={s.id}
              className={`bg-card rounded-xl border border-border/70 p-4 shadow-sm space-y-3 transition-all hover:border-border ${
                !s.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {cat && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border border-border/60 ${categoryColor(cat.color)}`}>
                        {cat.name}
                      </span>
                    )}
                    <h3 className="font-bold text-sm text-foreground">{s.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.description || "—"}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                    s.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {s.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>

              {(s.basePrice !== undefined && s.basePrice !== null) && (
                <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">السعر الأساسي:</span>
                  <span className="text-base font-bold font-mono tabular-nums text-foreground">
                    {Number(s.basePrice).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button
                  onClick={() => navigate("/admin/booking/price-lists")}
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>قوائم الأسعار التعاقدية</span>
                </button>
                {s.durationMinutes && (
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                    {s.durationMinutes} دقيقة
                  </span>
                )}
              </div>

              {/* Branches & Doctors */}
              <div className="space-y-1.5 pt-1 border-t border-border/50">
                <div className="flex flex-wrap gap-1">
                  {visibleBranches.map(b => (
                    <span key={b.id} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {b.branch.name}
                    </span>
                  ))}
                  {extraCount > 0 && <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono tabular-nums">+{extraCount}</span>}
                  {bs.length === 0 && <span className="text-xs text-muted-foreground/60">لا توجد فروع محددة</span>}
                </div>

                {doctorCount > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.doctorServices!.slice(0, 3).map(ds => (
                      <span key={ds.id} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {ds.doctor?.title} {ds.doctor?.name}
                      </span>
                    ))}
                    {doctorCount > 3 && <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono tabular-nums">+{doctorCount - 3}</span>}
                  </div>
                )}
              </div>

              {bs.map(b => (b.packages || []).length > 0 && (
                <div key={b.id} className="pt-1">
                  {b.packages!.map((pkg, i) => (
                    <div key={i} className="text-[11px] bg-primary/5 text-primary border border-primary/20 inline-block px-2 py-0.5 rounded ml-1 mb-1 font-mono tabular-nums">
                      {pkg.count} جلسات — {pkg.price} ج.م ({b.branch.name})
                    </div>
                  ))}
                </div>
              ))}

              <div className="flex gap-1.5 pt-2 border-t border-border/60">
                <button
                  onClick={() => onDetail(s)}
                  className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>عرض</span>
                </button>
                <button
                  onClick={() => onEdit(s)}
                  className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-500/20 flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  <span>تعديل</span>
                </button>
                <button
                  onClick={() => onToggleActive(s.id, s.isActive)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    s.isActive
                      ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  }`}
                >
                  {s.isActive ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  onClick={() => onClone(s)}
                  className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>استنساخ</span>
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-border/70 rounded-xl p-6">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40 text-primary" />
            <p className="text-xs">لا توجد خدمات مطابقة</p>
          </div>
        )}
      </div>

      {modalService !== undefined && (
        <ServiceModal
          service={modalService}
          branches={branches}
          doctors={doctors}
          categories={categories}
          onClose={onModalClose}
          onSave={onSave}
        />
      )}
      {detailService && <ServiceDetailModal service={detailService} onClose={onDetailClose} />}
      {categoryModal !== undefined && (
        <CategoryModal
          category={categoryModal}
          onClose={() => setCategoryModal(undefined)}
          onSave={onCategorySave}
          onDelete={onCategoryDelete}
        />
      )}
    </div>
  );
}
