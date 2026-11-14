import { useState, useEffect } from "react";
import { X, Plus, Trash2, Building2, Phone, Shield, Check, AlertCircle } from "lucide-react";
import { EducationBranch, Classroom } from "../../../services/educationBranchesService";
import { Switch } from "../../../components/ui/switch";

interface EducationBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EducationBranch>) => Promise<void>;
  branch: EducationBranch | null;
  isEn?: boolean;
}

const CLASSROOM_TYPES = [
  { value: "THEORY", labelAr: "قاعة نظري / عامة", labelEn: "Theory / General Room" },
  { value: "LAB", labelAr: "معمل برمجة / حاسب", labelEn: "Computer / Coding Lab" },
  { value: "ROBOTICS", labelAr: "معمل روبوتكس وذكاء اصطناعي", labelEn: "Robotics & AI Lab" },
  { value: "WORKSHOP", labelAr: "ورشة تدريب عملية", labelEn: "Hands-on Workshop" },
];

export function EducationBranchModal({
  isOpen,
  onClose,
  onSave,
  branch,
  isEn = false,
}: EducationBranchModalProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branch) {
      setName(branch.name || "");
      setCity(branch.city || "");
      setAddress(branch.address || "");
      setPhone(branch.phone || "");
      setEmail(branch.email || "");
      setGoogleMapsUrl(branch.googleMapsUrl || "");
      setWorkingHours(branch.workingHours || "");
      setManagerName(branch.managerName || "");
      setManagerPhone(branch.managerPhone || "");
      setIsActive(branch.isActive !== false);
      setClassrooms(
        Array.isArray(branch.classrooms)
          ? branch.classrooms.map((c, i) => ({
              id: c.id || `room_${Date.now()}_${i}`,
              name: c.name || `قاعة ${i + 1}`,
              capacity: Number(c.capacity) || 20,
              type: c.type || "THEORY",
              isActive: c.isActive !== false,
            }))
          : []
      );
    } else {
      setName("");
      setCity("");
      setAddress("");
      setPhone("");
      setEmail("");
      setGoogleMapsUrl("");
      setWorkingHours("");
      setManagerName("");
      setManagerPhone("");
      setIsActive(true);
      setClassrooms([
        { id: `room_${Date.now()}_1`, name: "معمل 1", capacity: 15, type: "LAB", isActive: true },
        { id: `room_${Date.now()}_2`, name: "قاعة A", capacity: 25, type: "THEORY", isActive: true },
      ]);
    }
    setError(null);
  }, [branch, isOpen]);

  if (!isOpen) return null;

  const handleAddClassroom = () => {
    const nextIdx = classrooms.length + 1;
    setClassrooms([
      ...classrooms,
      {
        id: `room_${Date.now()}_${nextIdx}`,
        name: `قاعة ${nextIdx}`,
        capacity: 20,
        type: "THEORY",
        isActive: true,
      },
    ]);
  };

  const handleRemoveClassroom = (index: number) => {
    setClassrooms(classrooms.filter((_, i) => i !== index));
  };

  const handleUpdateClassroom = (index: number, updates: Partial<Classroom>) => {
    setClassrooms(
      classrooms.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isEn ? "Branch name is required" : "اسم الفرع مطلوب");
      return;
    }
    if (!phone.trim()) {
      setError(isEn ? "Branch phone is required" : "رقم هاتف الفرع مطلوب");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        workingHours: workingHours.trim() || undefined,
        managerName: managerName.trim() || undefined,
        managerPhone: managerPhone.trim() || undefined,
        classrooms: classrooms.map((c) => ({
          ...c,
          name: c.name.trim() || "قاعة",
          capacity: Math.max(1, Number(c.capacity) || 1),
        })),
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to save branch" : "فشل حفظ بيانات الفرع"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        dir={isEn ? "ltr" : "rtl"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {branch
                  ? isEn
                    ? "Edit Branch & Classrooms"
                    : "تعديل بيانات الفرع والقاعات"
                  : isEn
                  ? "Add New Branch & Classrooms"
                  : "إضافة فرع ومقر تدريبي جديد"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isEn ? "Manage branch location, contacts and training capacity" : "تعريف الموقع، بيانات التواصل، وقاعات ومعامل التدريب"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>{isEn ? "Basic Details" : "البيانات الأساسية للمقر"}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isEn ? "Branch Name" : "اسم الفرع / المقر"} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? "e.g. City Center Campus" : "مثال: فرع مدينة نصر / المقر الرئيسي"}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isEn ? "City / Area" : "المدينة / المنطقة"}
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={isEn ? "e.g. Cairo" : "مثال: القاهرة / الإسكندرية"}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isEn ? "Detailed Address" : "العنوان بالتفصيل"}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isEn ? "Street, Building, Floor..." : "الشارع، رقم المبنى، الدور، علامة مميزة..."}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Contact & Location */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span>{isEn ? "Contact & Map" : "التواصل والموقع الجغرافي"}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isEn ? "Primary Phone" : "هاتف الفرع للتواصل"} <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isEn ? "Branch Email" : "البريد الإلكتروني للفرع"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="branch@academy.com"
                  dir="ltr"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isEn ? "Google Maps URL" : "رابط خرائط Google"}
                </label>
                <input
                  type="url"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  dir="ltr"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isEn ? "Working Hours" : "ساعات ومواعيد العمل"}
                </label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder={isEn ? "Sat-Thu: 9AM - 9PM" : "السبت - الخميس: 9 ص - 9 م"}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Manager Info */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>{isEn ? "Branch Manager (Optional)" : "إدارة الفرع (اختياري)"}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isEn ? "Manager Name" : "اسم مدير الفرع"}
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder={isEn ? "e.g. Eng. Ahmed" : "مثال: م. أحمد مصطفى"}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isEn ? "Manager Phone" : "هاتف المدير المباشر"}
                </label>
                <input
                  type="tel"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Classrooms Manager */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  {isEn ? "Classrooms & Labs" : "القاعات والمعامل التدريبية"}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {isEn ? "Define training rooms with their student capacities" : "تحديد القاعات التابعة للفرع مع السعة الاستيعابية لكل قاعة"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddClassroom}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[38px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? "Add Room" : "إضافة قاعة"}</span>
              </button>
            </div>

            {classrooms.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                {isEn ? "No classrooms added yet. Click Add Room above." : "لم يتم إضافة قاعات بعد. اضغط إضافة قاعة بالأعلى."}
              </div>
            ) : (
              <div className="space-y-2">
                {classrooms.map((room, idx) => (
                  <div
                    key={room.id || idx}
                    className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => handleUpdateClassroom(idx, { name: e.target.value })}
                        placeholder={isEn ? "Room name (e.g. Lab 1)" : "اسم القاعة / المعمل"}
                        className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="w-full sm:w-28 space-y-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={room.capacity}
                          onChange={(e) =>
                            handleUpdateClassroom(idx, { capacity: Number(e.target.value) || 1 })
                          }
                          className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-center font-mono tabular-nums focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {isEn ? "seats" : "طالب"}
                        </span>
                      </div>
                    </div>

                    <div className="w-full sm:w-44">
                      <select
                        value={room.type || "THEORY"}
                        onChange={(e) => handleUpdateClassroom(idx, { type: e.target.value })}
                        className="w-full bg-background border border-input rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        {CLASSROOM_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {isEn ? t.labelEn : t.labelAr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveClassroom(idx)}
                      title={isEn ? "Remove classroom" : "حذف القاعة"}
                      aria-label="Remove room"
                      className="p-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0 self-end sm:self-center min-h-[38px] min-w-[38px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Status */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-foreground">
                {isEn ? "Branch Status" : "حالة تشغيل الفرع"}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {isActive
                  ? isEn
                    ? "Branch is active and available for demo days & sessions"
                    : "الفرع نشط ومتاح لجدولة الحصص والديمو داي"
                  : isEn
                  ? "Branch is currently paused/inactive"
                  : "الفرع متوقف مؤقتاً ولا يستقبل حجوزات جديدة"}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Toggle active status"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px]"
          >
            {isEn ? "Cancel" : "إلغاء"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all min-h-[44px] shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isEn ? "Save Branch" : "حفظ بيانات الفرع"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
