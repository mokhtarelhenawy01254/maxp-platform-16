import { useState, useMemo } from "react";
import { Pencil, Trash2, Plus, Search, MapPin, Building2, Phone } from "lucide-react";
import { BookingBranch, BranchFormData, DAY_NAMES, FACILITY_TYPE_LABEL } from "./shared";
import BranchModal from "./BranchModal";

interface Props {
  branches: BookingBranch[];
  selectedBranchId?: string;
  onEdit: (b: Partial<BookingBranch>) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  modalBranch: Partial<BookingBranch> | null | undefined;
  onModalClose: () => void;
  onSave: (d: BranchFormData) => Promise<void>;
}

const PAGE_SIZE = 10;
const DAYS_ORDER = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const DAY_INITIALS: Record<string, string> = { sat: "س", sun: "ح", mon: "ن", tue: "ث", wed: "ر", thu: "خ", fri: "ج" };

export default function BranchesTab({
  branches, selectedBranchId, onEdit, onToggleActive, onDelete,
  modalBranch, onModalClose, onSave,
}: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = branches;
    if (selectedBranchId) list = list.filter((b) => b.id === selectedBranchId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || (b.address || "").toLowerCase().includes(q));
    }
    return list;
  }, [branches, selectedBranchId, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">إدارة الفروع والمراكز</h2>
          <p className="text-xs text-muted-foreground mt-0.5">تحديد مواعيد العمل، ساعات الاستقبال، والعيادات المتاحة</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              className="border border-border/70 rounded-lg pr-8 pl-3 py-1.5 text-xs sm:text-sm w-44 sm:w-56 bg-card text-foreground shadow-sm hover:border-border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40"
              placeholder="بحث بالاسم أو العنوان..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <button
            onClick={() => onEdit({})}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm hover:bg-primary/90 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فرع</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border/70 rounded-xl p-6">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-primary" />
          <p className="text-xs">لا توجد فروع مسجلة</p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="block md:hidden space-y-3">
            {paged.map((b) => (
              <div key={b.id} className={`bg-card rounded-xl border border-border/70 p-4 shadow-sm space-y-3 ${!b.isActive ? "opacity-60" : ""}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{b.name}</h3>
                    <p className="text-xs text-muted-foreground">{b.address || "—"}</p>
                    {b.facilityType && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {FACILITY_TYPE_LABEL[b.facilityType] || b.facilityType}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${b.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"}`}>
                    {b.isActive ? "نشط" : "غير نشط"}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                  {(b.phones?.length ? b.phones : b.phone ? [b.phone] : []).map((p, i) => (
                    <span key={i} dir="ltr" className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[11px] font-mono tabular-nums">
                      <Phone className="w-2.5 h-2.5" />{p}
                    </span>
                  ))}
                </div>

                {/* Working days circular badges */}
                <div className="flex gap-1 justify-start">
                  {DAYS_ORDER.map((d) => {
                    const wd = typeof b.workingDays === "object" ? b.workingDays : null;
                    const isActive = wd && wd[d];
                    const hours = wd ? wd[d] : "";
                    return (
                      <div
                        key={d}
                        title={isActive ? `${DAY_NAMES[d]}: ${hours}` : `${DAY_NAMES[d]}: مغلق`}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold select-none border transition-all ${isActive ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/40 text-muted-foreground/60 border-border/40"}`}
                      >
                        {DAY_INITIALS[d]}
                      </div>
                    );
                  })}
                </div>

                {b.location && (
                  <div className="text-xs">
                    {/^https?:\/\//.test(b.location) ? (
                      <a href={b.location} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <MapPin className="w-3.5 h-3.5" /><span>فتح الموقع الجغرافي</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{b.location}</span>
                    )}
                  </div>
                )}

                <div className="flex gap-1.5 pt-2 border-t border-border/60">
                  <button onClick={() => onEdit(b)} className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-500/20 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /><span>تعديل</span>
                  </button>
                  <button onClick={() => onToggleActive(b.id, b.isActive)} className={`text-xs px-2.5 py-1 rounded-md ${b.isActive ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"}`}>
                    {b.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                  <button onClick={() => onDelete(b.id)} className="text-xs px-2.5 py-1 bg-rose-500/10 text-rose-600 rounded-md hover:bg-rose-500/20 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /><span>حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-xl border border-border/70 overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-medium">
                  {["اسم الفرع", "العنوان", "الهواتف", "أيام وساعات العمل", "النوع", "الموقع", "الحالة", ""].map((h) => (
                    <th key={h} className="text-right py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paged.map((b) => (
                  <tr key={b.id} className={`hover:bg-muted/40 transition-colors ${!b.isActive ? "opacity-60" : ""}`}>
                    <td className="py-2.5 px-3 font-semibold text-foreground">{b.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{b.address || "—"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground font-mono tabular-nums" dir="ltr">
                      {(b.phones?.length ? b.phones : b.phone ? [b.phone] : []).join(" · ") || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 justify-start">
                        {DAYS_ORDER.map((d) => {
                          const wd = typeof b.workingDays === "object" ? b.workingDays : null;
                          const isActive = wd && wd[d];
                          const hours = wd ? wd[d] : "";
                          return (
                            <div
                              key={d}
                              title={isActive ? `${DAY_NAMES[d]}: ${hours}` : `${DAY_NAMES[d]}: مغلق`}
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold select-none border transition-all ${isActive ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground/50 border-border/30"}`}
                            >
                              {DAY_INITIALS[d]}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {FACILITY_TYPE_LABEL[b.facilityType || "clinic"] || b.facilityType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {b.location ? (
                        /^https?:\/\//.test(b.location) ? (
                          <a href={b.location} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <MapPin className="w-3.5 h-3.5" /><span>خريطة</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{b.location}</span>
                        )
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${b.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"}`}>
                        {b.isActive ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onEdit(b)} className="p-1 text-blue-600 hover:bg-blue-500/10 rounded transition-colors" title="تعديل"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => onToggleActive(b.id, b.isActive)} className={`p-1 rounded transition-colors ${b.isActive ? "text-rose-500 hover:bg-rose-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`} title={b.isActive ? "تعطيل" : "تفعيل"}><Plus className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(b.id)} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
              <span>صفحة <strong className="font-mono tabular-nums text-foreground">{safePage + 1}</strong> من <strong className="font-mono tabular-nums text-foreground">{totalPages}</strong></span>
              <div className="flex gap-1">
                <button disabled={safePage <= 0} onClick={() => setPage(safePage - 1)} className="px-2.5 py-1 border border-border/70 rounded-lg bg-card disabled:opacity-40 hover:bg-muted/60 transition-colors">السابق</button>
                <button disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)} className="px-2.5 py-1 border border-border/70 rounded-lg bg-card disabled:opacity-40 hover:bg-muted/60 transition-colors">التالي</button>
              </div>
            </div>
          )}
        </>
      )}

      {modalBranch !== undefined && <BranchModal branch={modalBranch} onClose={onModalClose} onSave={onSave} />}
    </div>
  );
}
