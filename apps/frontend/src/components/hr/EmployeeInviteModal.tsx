import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Link2,
  Copy,
  Check,
  Share2,
  Clock,
  Trash2,
  Loader2,
  Plus,
  Send,
  Building2,
  Briefcase,
  ShieldCheck,
  Calendar,
  AlertCircle
} from "lucide-react";
import api from "../../services/api";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  title: string;
  departmentId?: string | null;
}

interface InvitationItem {
  id: string;
  token: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  email?: string | null;
  phone?: string | null;
  invitationLink?: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; title: string } | null;
}

interface EmployeeInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments?: Department[];
  onInvitationCreated?: () => void;
}

export const EmployeeInviteModal: React.FC<EmployeeInviteModalProps> = ({
  open,
  onOpenChange,
  departments,
  onInvitationCreated,
}) => {
  const [activeTab, setActiveTab] = useState<"create" | "active">("create");
  const [positions, setPositions] = useState<Position[]>([]);
  const [localDepartments, setLocalDepartments] = useState<Department[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const effectiveDepartments = (departments && departments.length > 0) ? departments : localDepartments;

  // Form states
  const [departmentId, setDepartmentId] = useState<string>("none");
  const [positionId, setPositionId] = useState<string>("none");
  const [role, setRole] = useState<string>("AGENT");
  const [contractType, setContractType] = useState<string>("FULL_TIME");
  const [expiryDays, setExpiryDays] = useState<string>("7");
  const [email, setEmail] = useState<string>("" );
  const [phone, setPhone] = useState<string>("" );

  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Active links list
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (!departments || departments.length === 0) {
        fetchDepartments();
      }
      fetchPositions();
      fetchActiveInvitations();
    } else {
      setGeneratedLink(null);
      setCopied(false);
    }
  }, [open]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/hr/departments");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setLocalDepartments(res.data.data);
      }
    } catch {
      // Ignored
    }
  };

  const fetchPositions = async () => {
    try {
      setLoadingPositions(true);
      const res = await api.get("/hr/positions");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPositions(res.data.data);
      }
    } catch {
      // Non-critical if positions list fails
    } finally {
      setLoadingPositions(false);
    }
  };

  const fetchActiveInvitations = async () => {
    try {
      setLoadingList(true);
      const res = await api.get("/hr/employee-invitations", {
        params: { status: "PENDING" },
      });
      if (res.data?.success && Array.isArray(res.data.data?.invitations)) {
        setInvitations(res.data.data.invitations);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingList(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setGeneratedLink(null);

      const payload = {
        role,
        departmentId: departmentId !== "none" ? departmentId : undefined,
        positionId: positionId !== "none" ? positionId : undefined,
        contractType,
        expiryDays: parseInt(expiryDays, 10) || 7,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      const res = await api.post("/hr/employee-invitations", payload);

      if (res.data?.success) {
        const link = res.data.data?.invitationLink;
        setGeneratedLink(link);
        toast.success("تم إنشاء رابط الدعوة بنجاح");
        fetchActiveInvitations();
        onInvitationCreated?.();
      } else {
        toast.error(res.data?.message || "فشل إنشاء رابط الدعوة");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إنشاء الرابط");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (linkToCopy?: string) => {
    const text = linkToCopy || generatedLink;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("تم نسخ الرابط إلى الحافظة");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("فشل نسخ الرابط");
    }
  };

  const shareViaWhatsApp = (linkToShare?: string) => {
    const targetLink = linkToShare || generatedLink;
    if (!targetLink) return;
    const selectedDeptName = effectiveDepartments.find((d) => d.id === departmentId)?.name;
    const selectedPosTitle = positions.find((p) => p.id === positionId)?.title;

    let greeting = "السلام عليكم ورحمة الله،\nيسعدنا دعوتك للانضمام إلى فريق عملنا";
    if (selectedPosTitle) {
      greeting += ` كـ "${selectedPosTitle}"`;
    }
    if (selectedDeptName) {
      greeting += ` في ${selectedDeptName}`;
    }
    greeting += `.\nيرجى استخدام الرابط التالي لتسجيل بياناتك وحسابك:\n${targetLink}\n(الرابط صالح لمدة ${expiryDays} أيام).`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(greeting)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleRevoke = async (id: string) => {
    try {
      setRevokingId(id);
      const res = await api.delete(`/hr/employee-invitations/${id}`);
      if (res.data?.success) {
        toast.success("تم إلغاء رابط الدعوة");
        setInvitations((prev) => prev.filter((item) => item.id !== id));
      } else {
        toast.error(res.data?.message || "فشل إلغاء الرابط");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إلغاء الرابط");
    } finally {
      setRevokingId(null);
    }
  };

  // Filter positions by selected department if applicable
  const filteredPositions = positions.filter((pos) => {
    if (departmentId === "none") return true;
    return !pos.departmentId || pos.departmentId === departmentId;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                دعوة موظف جديد للانضمام الذاتي
              </DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                أنشئ رابطاً مخصصاً يُرسل للموظف ليسجل بياناته وكلمة مروره بنفسه
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "create"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400"
              }`}
            >
              إنشاء رابط جديد
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "active"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400"
              }`}
            >
              الروابط السارية
              {invitations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500 text-white">
                  {invitations.length}
                </span>
              )}
            </button>
          </div>
        </DialogHeader>

        {activeTab === "create" ? (
          <form onSubmit={handleGenerate} className="space-y-4 pt-2">
            {/* Generated Link Alert Banner */}
            {generatedLink && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Check className="h-4 w-4" />
                    تم إنشاء الرابط وجاهز للإرسال:
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 text-emerald-800 dark:text-emerald-200">
                    صالح لمدة {expiryDays} أيام
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1.5">
                  <Input
                    readOnly
                    value={generatedLink}
                    className="h-8 text-xs font-mono bg-transparent border-none focus-visible:ring-0 select-all truncate text-zinc-700 dark:text-zinc-300"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard()}
                    className="h-8 px-2.5 text-xs gap-1 border-zinc-300 dark:border-zinc-700 active:scale-95"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "تم النسخ" : "نسخ"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => shareViaWhatsApp()}
                    className="h-8 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                  >
                    <Send className="h-3.5 w-3.5" />
                    واتساب
                  </Button>
                </div>
              </div>
            )}

            {/* Department and Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                  <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                  القسم التابع له
                </Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <SelectValue placeholder="اختر القسم (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم محدد</SelectItem>
                    {effectiveDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                  <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                  المسمى الوظيفي
                </Label>
                <Select value={positionId} onValueChange={setPositionId}>
                  <SelectTrigger className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <SelectValue placeholder="اختر المسمى (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مسمى محدد</SelectItem>
                    {filteredPositions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Role & Contract */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                  الصلاحية في النظام
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENT">موظف عادي (Agent)</SelectItem>
                    <SelectItem value="MANAGER">مدير قسم (Manager)</SelectItem>
                    <SelectItem value="COMPANY_ADMIN">مشرف شركة (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  نوع العقد
                </Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">دوام كامل (Full-Time)</SelectItem>
                    <SelectItem value="PART_TIME">دوام جزئي (Part-Time)</SelectItem>
                    <SelectItem value="CONTRACT">عقد محدد المدة (Contract)</SelectItem>
                    <SelectItem value="INTERNSHIP">تدريب (Internship)</SelectItem>
                    <SelectItem value="FREELANCE">عمل حر (Freelance)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expiry and Optional Email Binding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  مدة صلاحية الرابط
                </Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 أيام</SelectItem>
                    <SelectItem value="7">7 أيام (موصى به)</SelectItem>
                    <SelectItem value="14">14 يوماً</SelectItem>
                    <SelectItem value="30">30 يوماً</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  تقييد ببريد معين (اختياري)
                </Label>
                <Input
                  type="email"
                  placeholder="اتركه فارغاً ليصبح الرابط عاماً للمنصب"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-900 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                إغلاق
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={generating}
                className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    توليد رابط الدعوة
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3 pt-2">
            {loadingList ? (
              <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                جاري تحميل الروابط السارية...
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-8 text-center space-y-1.5 text-zinc-400">
                <AlertCircle className="h-8 w-8 mx-auto opacity-40" />
                <p className="text-xs">لا توجد روابط دعوة نشطة حالياً</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("create")}
                  className="text-xs mt-2"
                >
                  <Plus className="h-3.5 w-3.5 ml-1" />
                  إنشاء رابط جديد
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <span>{inv.position?.title || "موظف"}</span>
                        {inv.department && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {inv.department.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-600">
                          {inv.role}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                        <span>ينتهي: {new Date(inv.expiresAt).toLocaleDateString("ar-EG")}</span>
                        {inv.email && <span className="truncate">({inv.email})</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(inv.invitationLink)}
                        className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                        title="نسخ الرابط"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => shareViaWhatsApp(inv.invitationLink)}
                        className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="مشاركة واتساب"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={revokingId === inv.id}
                        onClick={() => handleRevoke(inv.id)}
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="إلغاء الرابط"
                      >
                        {revokingId === inv.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                إغلاق
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
