import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Layers, Clock, Coins, Stethoscope, Check, ArrowUpRight } from "lucide-react";
import {
  BookingService,
  BookingBranch,
  BookingDoctor,
  ServiceFormData,
  ServiceCategory,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "./shared";
import ServiceBranchPackagesEditor, { BranchPkg } from "./ServiceBranchPackagesEditor";

interface Props {
  service?: Partial<BookingService> | null;
  branches: BookingBranch[];
  doctors: BookingDoctor[];
  categories: ServiceCategory[];
  onClose: () => void;
  onSave: (d: ServiceFormData) => Promise<void>;
}

export default function ServiceModal({
  service,
  branches,
  doctors,
  categories,
  onClose,
  onSave,
}: Props) {
  const navigate = useNavigate();

  const initBranchAssignments = () => {
    if (!service?.branchServices) return {} as Record<string, BranchPkg[]>;
    const acc: Record<string, BranchPkg[]> = {};
    for (const bs of service.branchServices) {
      acc[bs.branchId] = (bs.packages || []).map((p) => ({
        count: p.count,
        price: p.price,
      }));
    }
    return acc;
  };

  const [name, setName] = useState(service?.name || "");
  const [desc, setDesc] = useState(service?.description || "");
  const [requiresConsultation, setRequiresConsultation] = useState(
    service?.requiresConsultation ?? true
  );
  const [durationMinutes, setDurationMinutes] = useState(
    service?.durationMinutes || 30
  );
  const [basePrice, setBasePrice] = useState(
    service?.basePrice?.toString() || ""
  );
  const [categoryId, setCategoryId] = useState(service?.categoryId || "");
  const [doctorIds, setDoctorIds] = useState<string[]>(
    service?.doctorServices?.map((ds) => ds.doctorId) || []
  );
  const [branchPkgs, setBranchPkgs] = useState<Record<string, BranchPkg[]>>(
    initBranchAssignments
  );
  const [saving, setSaving] = useState(false);

  const toggleDoctor = (doctorId: string) => {
    setDoctorIds((prev) =>
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  const toggleBranch = (branchId: string) => {
    const next = { ...branchPkgs };
    if (next[branchId]) {
      delete next[branchId];
    } else {
      next[branchId] = [];
    }
    setBranchPkgs(next);
  };

  const addPkg = (branchId: string) =>
    setBranchPkgs({
      ...branchPkgs,
      [branchId]: [...(branchPkgs[branchId] || []), { count: 1, price: 0 }],
    });

  const updPkg = (
    branchId: string,
    i: number,
    k: "count" | "price",
    v: number
  ) => {
    const pkgs = [...(branchPkgs[branchId] || [])];
    const cur = pkgs[i];
    if (!cur) return;
    pkgs[i] =
      k === "count"
        ? { count: v, price: cur.price }
        : { count: cur.count, price: v };
    setBranchPkgs({ ...branchPkgs, [branchId]: pkgs });
  };

  const delPkg = (branchId: string, i: number) => {
    const pkgs = (branchPkgs[branchId] || []).filter((_, idx) => idx !== i);
    const next = { ...branchPkgs };
    if (pkgs.length) next[branchId] = pkgs;
    else delete next[branchId];
    setBranchPkgs(next);
  };

  const hasBranches = Object.keys(branchPkgs).length > 0;

  const handleSave = async () => {
    if (!name.trim() || !hasBranches) return;
    try {
      setSaving(true);
      await onSave({
        id: service?.id,
        name: name.trim(),
        description: desc.trim(),
        requiresConsultation,
        durationMinutes,
        basePrice: basePrice !== "" ? Number(basePrice) : undefined,
        categoryId: categoryId || undefined,
        doctorIds,
        assignedBranchIds: Object.keys(branchPkgs),
        branches: Object.entries(branchPkgs).map(([branchId, pkgs]) => ({
          branchId,
          packages: pkgs.filter((p) => p.count > 0),
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border/80 rounded-2xl shadow-2xl text-foreground font-sans`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {service?.id ? "تعديل خدمة سريرية" : "إضافة خدمة جديدة"}
              </h3>
              <p className="text-xs text-muted-foreground">
                إعدادات الباقات، التسعير الأساسي، والأطباء والفروع المرتبطة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              اسم الخدمة <span className="text-destructive">*</span>
            </label>
            <input
              className={MODAL_INPUT_CLS}
              placeholder="مثال: كشف جلدية واستشارة، فحص أسنان شامل..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              وصف الخدمة
            </label>
            <textarea
              className={MODAL_INPUT_CLS}
              rows={2}
              placeholder="تفاصيل الإجراء، التعليمات، أو التحضيرات للمريض..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                القسم السريري (التخصص)
              </label>
              <select
                className={MODAL_INPUT_CLS}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">بدون قسم</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>المدة التقريبية (دقيقة)</span>
              </label>
              <input
                type="number"
                min={5}
                step={5}
                className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Number(e.target.value) || 30)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Coins className="w-3 h-3 text-muted-foreground" />
                <span>السعر الأساسي (ج.م)</span>
              </label>
              <input
                type="number"
                min={0}
                className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
                placeholder="0.00"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />
              <button
                type="button"
                onClick={() => navigate("/admin/booking/price-lists")}
                className="text-[11px] text-primary hover:underline mt-1.5 inline-flex items-center gap-1"
              >
                <span>إدارة قوائم الأسعار التعاقدية</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/70 rounded-xl cursor-pointer w-full hover:bg-muted/60 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresConsultation}
                  onChange={(e) => setRequiresConsultation(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/40 accent-primary"
                />
                <span className="text-xs font-medium text-foreground">
                  يتطلب استشارة طبية مسبقة
                </span>
              </label>
            </div>
          </div>

          {/* Doctors Section */}
          <div className="border-t border-border/60 pt-3">
            <label className="block text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-primary" />
              <span>الأطباء المقدمون للخدمة</span>
            </label>
            {doctors.filter((d) => d.isActive).length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 bg-muted/30 border border-border/60 rounded-xl text-center">
                لا يوجد أطباء نشطون حالياً
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto border border-border/70 rounded-xl p-2.5 bg-muted/20">
                {doctors
                  .filter((d) => d.isActive)
                  .map((d) => {
                    const checked = doctorIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDoctor(d.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                          checked
                            ? "bg-primary/10 border-primary/40 text-primary font-medium"
                            : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 text-primary" />}
                        <span>
                          {d.title} {d.name}
                          {d.specialty ? ` (${d.specialty})` : ""}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Branches and Packages Section via Subcomponent */}
          <ServiceBranchPackagesEditor
            branches={branches}
            branchPkgs={branchPkgs}
            onToggleBranch={toggleBranch}
            onAddPkg={addPkg}
            onUpdPkg={updPkg}
            onDelPkg={delPkg}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium border border-border/70 rounded-xl bg-card text-foreground hover:bg-muted/60 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || !hasBranches || saving}
            className="px-4 py-2 text-xs sm:text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? "جاري الحفظ..." : service?.id ? "حفظ التعديلات" : "إضافة الخدمة"}
          </button>
        </div>
      </div>
    </div>
  );
}
