import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDateFormat } from "../../hooks/useDateFormat";
import {
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserIcon,
  CakeIcon,
  SparklesIcon,
  GiftIcon,
  HeartIcon,
  ComputerDesktopIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BellAlertIcon,
  IdentificationIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  BanknotesIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { useAuth } from "../../hooks/useAuthSimple";
import { useTheme } from "../../hooks/useTheme";
import api from "../../services/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  avatar: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationalId: string;
  address: string;
  city: string;
  country: string;
  hireDate: string;
  contractType: string;
  status: string;
  baseSalary: number;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  department: { name: string } | null;
  position: { title: string } | null;
  manager: { firstName: string; lastName: string } | null;
  documents_rel: EmployeeDocument[];
}

interface EmployeeDocument {
  type?: string;
  title?: string;
  name?: string;
  createdAt?: string;
}

interface CustodyAsset {
  id: string;
  name: string;
  status?: string;
  code?: string;
  serialNumber?: string;
  assignedDate?: string;
}

interface WarningRecord {
  id: string;
  title: string;
  severity?: string;
  incidentDate?: string;
  description?: string;
  actionTaken?: string;
  acknowledgedAt?: string | null;
}

interface MerchantUserExtras {
  phone?: string | null;
  avatar?: string | null;
}

type ProfileIcon = React.ElementType<{ className?: string }>;

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const maybeError = error as { response?: { data?: { error?: string } } };
  return maybeError.response?.data?.error || fallback;
};

const statusConfig: Record<string, { label: string; color: string; dot: string; glow: string }> = {
  ACTIVE: { label: "نشط", color: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30", dot: "bg-emerald-400", glow: "shadow-emerald-500/20" },
  ON_LEAVE: { label: "في إجازة", color: "bg-amber-500/15 text-amber-400 ring-amber-500/30", dot: "bg-amber-400", glow: "shadow-amber-500/20" },
  SUSPENDED: { label: "موقوف", color: "bg-red-500/15 text-red-400 ring-red-500/30", dot: "bg-red-400", glow: "shadow-red-500/20" },
  TERMINATED: { label: "منتهي", color: "bg-slate-500/15 text-slate-400 ring-slate-500/30", dot: "bg-slate-400", glow: "" },
};

const contractLabels: Record<string, string> = {
  FULL_TIME: "دوام كامل",
  PART_TIME: "دوام جزئي",
  CONTRACT: "عقد",
  TEMPORARY: "مؤقت",
  INTERNSHIP: "تدريب",
  FREELANCE: "حر",
};

const maritalLabels: Record<string, string> = {
  SINGLE: "أعزب / عزباء",
  MARRIED: "متزوج / ة",
  DIVORCED: "مطلق / ة",
  WIDOWED: "أرمل / ة",
};

const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}{suffix}</span>;
};

const InfoField = ({
  label,
  value,
  editing,
  onChange,
  type = "text",
  children,
}: {
  label: string;
  value: string;
  editing?: boolean;
  onChange?: (v: string) => void;
  type?: string;
  children?: React.ReactNode;
}) => (
  <div className="group">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{label}</p>
    {editing && onChange ? (
      children || (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none"
        />
      )
    ) : (
      <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{value || "—"}</p>
    )}
  </div>
);

const TABS = [
  { value: "overview", label: "نظرة عامة", icon: ChartBarIcon },
  { value: "personal", label: "البيانات الشخصية", icon: IdentificationIcon },
  { value: "job", label: "الوظيفة والراتب", icon: WalletIcon },
  { value: "custody", label: "عهدتي", icon: ComputerDesktopIcon },
  { value: "documents", label: "المستندات", icon: DocumentTextIcon },
  { value: "warnings", label: "الإنذارات", icon: BellAlertIcon },
  { value: "events", label: "المناسبات", icon: CakeIcon },
];

const SectionCard = ({
  icon: Icon,
  title,
  accent = "violet",
  children,
}: {
  icon: ProfileIcon;
  title: string;
  accent?: string;
  children: React.ReactNode;
}) => {
  const accents: Record<string, string> = {
    violet: "from-violet-500/20 to-violet-500/0 text-violet-600 dark:text-violet-400",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-600 dark:text-rose-400",
    indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-600 dark:text-indigo-400",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-600 dark:text-amber-400",
  };
  const cls = accents[accent] || accents.violet;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-xl transition-all duration-300"
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${cls.split(" ")[0]} ${cls.split(" ")[1]}`} />
      <div className="p-6">
        <h3 className={`flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest mb-6 ${cls.split(" ")[2]}`}>
          <Icon className="w-4 h-4" />
          {title}
        </h3>
        {children}
      </div>
    </motion.div>
  );
};

const Profile: React.FC = () => {
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const { derivedTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const isMerchantUser = user?.role === "MERCHANT";
  const isAffiliateUser = user?.role === "AFFILIATE";
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [myCustody, setMyCustody] = useState<CustodyAsset[]>([]);
  const [warnings, setWarnings] = useState<WarningRecord[]>([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    maritalStatus: "",
    gender: "",
    dateOfBirth: "",
    nationalId: "",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const fetchMyCustody = useCallback(async (employeeId: string) => {
    try {
      const response = await api.get(`/hr/assets?assignedTo=${employeeId}`);
      setMyCustody(response.data.assets || []);
    } catch {
      // Optional HR widgets should not block the profile shell.
    }
  }, []);

  const fetchMyWarnings = useCallback(async () => {
    try {
      const response = await api.get("/hr/warnings/my-history");
      setWarnings(response.data.warnings || []);
    } catch {
      // Optional HR widgets should not block the profile shell.
    }
  }, []);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      if (user?.role === "MERCHANT" || user?.role === "AFFILIATE") {
        const merchantUser = user as typeof user & MerchantUserExtras;
        setEmployee(null);
        setFormData((prev) => ({
          ...prev,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phone: merchantUser?.phone || "",
        }));
        return;
      }
      try {
        const response = await api.get("/hr/employees/me");
        const empData = response.data.employee;
        setEmployee(empData);
        setFormData({
          firstName: empData.firstName || user?.firstName || "",
          lastName: empData.lastName || user?.lastName || "",
          email: empData.email || user?.email || "",
          phone: empData.phone || "",
          address: empData.address || "",
          city: empData.city || "",
          country: empData.country || "",
          maritalStatus: empData.maritalStatus || "",
          gender: empData.gender || "",
          dateOfBirth: empData.dateOfBirth ? empData.dateOfBirth.split('T')[0] : "",
          nationalId: empData.nationalId || "",
          emergencyContactName: empData.emergencyContactName || "",
          emergencyContactRelation: empData.emergencyContactRelation || "",
          emergencyContactPhone: empData.emergencyContactPhone || "",
        });
        if (empData.id) {
          fetchMyCustody(empData.id);
          fetchMyWarnings();
        }
      } catch {
        setFormData((prev) => ({
          ...prev,
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          email: user?.email || "",
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [fetchMyCustody, fetchMyWarnings, user]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000);
    fetchProfileData();
    return () => clearTimeout(timer);
  }, [fetchProfileData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put("/hr/employees/me", formData);
      if (response.data.success) {
        toast.success("تم تحديث بياناتك بنجاح ✓");
        setIsEditing(false);
        fetchProfileData();
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "حدث خطأ أثناء التحديث"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("الرجاء اختيار ملف صورة صالح"); return; }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post("/user/image-gallery/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data?.success) {
        if (employee?.id) await api.put(`/hr/employees/${employee.id}`, { avatar: res.data.image.url });
        toast.success("تم تحديث الصورة الشخصية بنجاح");
        fetchProfileData();
      }
    } catch { toast.error("فشل في رفع الصورة. يرجى المحاولة مرة أخرى."); }
    finally { setUploading(false); }
  };

  const field = (key: keyof typeof formData) => ({
    value: formData[key],
    onChange: (v: string) => setFormData((p) => ({ ...p, [key]: v })),
  });

  const calculateAge = (dob: string) => {
    if (!dob) return "-";
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const calculateTenure = (date: string) => {
    if (!date) return "-";
    const start = new Date(date);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    if (years > 0) return `${years} سنة${months > 0 ? ` و ${months} شهر` : ""}`;
    return `${months} شهر`;
  };

  const getNextOccasion = (dateStr: string) => {
    if (!dateStr) return null;
    const today = new Date();
    const nextDate = new Date(dateStr);
    nextDate.setFullYear(today.getFullYear());
    if (nextDate < today) nextDate.setFullYear(today.getFullYear() + 1);
    const diffDays = Math.ceil(Math.abs(nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { date: nextDate, days: diffDays };
  };

  const getInitials = (first: string, last: string) => `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
  const userAvatar = (user as (typeof user & MerchantUserExtras))?.avatar || "";

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${derivedTheme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
        <div className="text-center">
          <div className="relative mx-auto mb-8 w-20 h-20">
            <div className={`absolute inset-0 rounded-full border-2 ${derivedTheme === 'dark' ? 'border-violet-500/20' : 'border-violet-200'}`} />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
          </div>
          <p className={`text-sm ${derivedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'} font-medium`}>جاري تحميل ملفك الشخصي...</p>
        </div>
      </div>
    );
  }

  if (isMerchantUser || isAffiliateUser) {
    const externalUser = user as typeof user & MerchantUserExtras;
    const companyName = user?.company?.name || "الشركة المرتبط بها";
    const fullName = `${formData.firstName} ${formData.lastName}`.trim() || user?.email || "حساب المستخدم";
    const portalPath = isMerchantUser ? "/merchant-portal" : "/affiliates/dashboard";
    const accountTitle = isMerchantUser ? "حساب تاجر دروب شيبنج" : "حساب مسوق أفليت";
    const accountDescription = isMerchantUser
      ? `هذا الحساب مخصص لإدارة منتجات وطلبات التاجر فقط داخل شركة ${companyName}.`
      : `هذا الحساب مخصص لإدارة روابطك، منتجاتك، طلباتك، وعُمولاتك فقط داخل شركة ${companyName}.`;
    const portalCta = isMerchantUser ? "فتح بورتال التاجر" : "فتح لوحة المسوق";
    const toolsHeading = isMerchantUser ? "الأدوات المتاحة للتاجر" : "الأدوات المتاحة للمسوق";
    const tools = isMerchantUser
      ? [
          {
            label: "منتجاتي ومخزوني",
            description: "تحديث سعر التاجر، المخزون، وحالة المزامنة للمنتجات المرتبطة بك.",
            to: "/merchant-portal#merchant-products",
            icon: ClipboardDocumentListIcon,
          },
          {
            label: "طلبات الدروب شيبنج",
            description: "متابعة طلباتك وتحديث الحالة ورقم التتبع بدون رؤية طلبات تجار آخرين.",
            to: "/merchant-portal#merchant-orders",
            icon: ChartBarIcon,
          },
          {
            label: "عمولاتي ومستحقاتي",
            description: "عرض نسبة التاجر ومؤشرات الاستحقاق الخاصة بحسابك فقط.",
            to: "/merchant-portal#merchant-commissions",
            icon: BanknotesIcon,
          },
        ]
      : [
          {
            label: "لوحة المسوق",
            description: "متابعة كود الأفليت، الروابط، المبيعات، ونظرة عامة على الأداء.",
            to: "/affiliates/dashboard",
            icon: ChartBarIcon,
          },
          {
            label: "منتجاتي وطلباتي",
            description: "استيراد منتجات الشركة، إنشاء طلبات، ومراجعة طلباتك المرتبطة فقط.",
            to: "/affiliates/products",
            icon: ShoppingBagIcon,
          },
          {
            label: "العملاء والعمولات",
            description: "متابعة العملاء المرتبطين بك وطلبات السحب والعمولات الخاصة بحسابك.",
            to: "/affiliates/commission",
            icon: BanknotesIcon,
          },
        ];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-slate-50 dark:bg-[#080b14] transition-colors duration-300"
        dir="rtl"
      >
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <section className="relative overflow-hidden rounded-3xl border border-amber-200/70 dark:border-amber-400/20 bg-white dark:bg-slate-950 shadow-sm dark:shadow-2xl">
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background:
                  derivedTheme === "dark"
                    ? "radial-gradient(circle at 15% 0%, rgba(245,158,11,0.24), transparent 34%), linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.98))"
                    : "radial-gradient(circle at 15% 0%, rgba(245,158,11,0.18), transparent 34%), linear-gradient(135deg, #fffaf0, #ffffff)",
              }}
            />
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {externalUser?.avatar ? (
                    <img
                      src={externalUser.avatar}
                      alt="avatar"
                      className="h-20 w-20 rounded-2xl border-2 border-amber-300 object-cover shadow-lg shadow-amber-500/20"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-2xl font-black text-white shadow-lg shadow-amber-500/30">
                      {getInitials(formData.firstName, formData.lastName) || "T"}
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-sm font-bold text-amber-600 dark:text-amber-300">{accountTitle}</p>
                    <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{fullName}</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {accountDescription}
                    </p>
                  </div>
                </div>
                <Link
                  to={portalPath}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                >
                  {portalCta}
                </Link>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: "البريد الإلكتروني", value: formData.email || "—", icon: EnvelopeIcon },
              { label: "رقم الهاتف", value: formData.phone || externalUser?.phone || "—", icon: PhoneIcon },
              { label: "الشركة", value: companyName, icon: BuildingOfficeIcon },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-white/[0.06] dark:bg-slate-900/80"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                <p className="mt-2 break-words text-sm font-semibold text-slate-950 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.06] dark:bg-slate-900/80">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-300">{toolsHeading}</p>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">صلاحيات محدودة ومباشرة</h2>
              </div>
              <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
                لا تظهر هنا بيانات الموظفين أو الرواتب أو العهد أو ملفات الشركة الداخلية؛ أي إدارة للشركة تظل مع مقدم الخدمة.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {tools.map((tool) => (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 dark:border-white/[0.06] dark:bg-slate-950/60 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-amber-500 dark:bg-amber-400 dark:text-slate-950">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-slate-950 dark:text-white">{tool.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{tool.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    );
  }

  const statsData = [
    {
      label: "تاريخ الانضمام",
      value: employee?.hireDate ? formatDate(employee.hireDate) : "—",
      icon: CalendarDaysIcon,
      gradient: "from-violet-600 to-indigo-600",
      glow: "shadow-violet-500/30",
    },
    {
      label: "مدة الخدمة",
      value: calculateTenure(employee?.hireDate || ""),
      icon: ClockIcon,
      gradient: "from-indigo-600 to-blue-600",
      glow: "shadow-indigo-500/30",
    },
    {
      label: "رصيد إجازة سنوية",
      value: `${employee?.annualLeaveBalance ?? 0} يوم`,
      icon: SparklesIcon,
      gradient: "from-emerald-600 to-teal-600",
      glow: "shadow-emerald-500/30",
    },
    {
      label: "رصيد إجازة مرضية",
      value: `${employee?.sickLeaveBalance ?? 0} يوم`,
      icon: ShieldCheckIcon,
      gradient: "from-amber-500 to-orange-600",
      glow: "shadow-amber-500/30",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-50 dark:bg-[#080b14] transition-colors duration-300"
      dir="rtl"
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      {/* Global ambient effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full opacity-10 dark:opacity-20 transition-opacity duration-300" style={{ background: "radial-gradient(ellipse, #7c3aed 0%, #4f46e5 40%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">

        {/* ═══════════════ HERO HEADER ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden mb-6 border border-white/[0.06]"
        >
          {/* Cover */}
          <div
            className="relative h-40 sm:h-52"
            style={{
              background: "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #1a0533 100%)",
            }}
          >
            {/* Animated shimmer lines */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(139,92,246,0.15) 40px, rgba(139,92,246,0.15) 41px)",
                }}
              />
            </div>
            {/* Blobs */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 65%)", transform: "translate(30%, -40%)" }} />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 65%)", transform: "translate(-30%, 40%)" }} />
            {/* Actions row top-right */}
            <div className="absolute top-4 left-4">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div key="editing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-violet-500/40 disabled:opacity-60"
                    >
                      {saving ? <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                      {saving ? "جاري الحفظ..." : "حفظ"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-black/30 hover:bg-black/50 text-white rounded-xl transition-all border border-white/20 backdrop-blur"
                    >
                      <XMarkIcon className="w-4 h-4" /> إلغاء
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="view"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-black/30 hover:bg-black/50 text-white rounded-xl transition-all border border-white/20 backdrop-blur hover:border-violet-400/50"
                  >
                    <PencilIcon className="w-4 h-4" /> تعديل الملف
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Avatar + Info row, overlapping cover */}
          <div
            className="relative px-6 sm:px-8 pb-6 bg-white dark:bg-[#0d0d1a] transition-colors duration-300"
          >
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
              {/* Avatar */}
              <div className="relative cursor-pointer group shrink-0" onClick={handleAvatarClick}>
                <div className="absolute -inset-1.5 rounded-2xl opacity-80 blur-md" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }} />
                <div className="relative">
                  {employee?.avatar || userAvatar ? (
                    <img
                      src={employee?.avatar || userAvatar}
                      alt="avatar"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-violet-500/40"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center border-2 border-violet-500/30"
                      style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #6d28d9 100%)" }}
                    >
                      <span className="text-white font-black text-3xl sm:text-4xl">
                        {getInitials(formData.firstName, formData.lastName)}
                      </span>
                    </div>
                  )}
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-violet-400" />
                  </div>
                )}
                {!uploading && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 rounded-2xl transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center gap-1">
                      <CameraIcon className="w-6 h-6 text-white" />
                      <span className="text-[10px] text-white/90 font-semibold">تغيير الصورة</span>
                    </div>
                  </div>
                )}
                <span className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-400 border-2 border-white dark:border-[#0d0d1a] rounded-full shadow shadow-emerald-500/60 transition-colors duration-300" />
              </div>

              {/* Name & role */}
              <div className="flex-1 pt-2 sm:pt-0 sm:pb-1 text-slate-900 dark:text-white">
                {isEditing ? (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <input
                      value={formData.firstName}
                      onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                      className="px-3 py-2 text-lg font-bold rounded-xl border border-violet-500/40 bg-violet-50 dark:bg-violet-950/40 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 outline-none w-36"
                      placeholder="الاسم الأول"
                    />
                    <input
                      value={formData.lastName}
                      onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                      className="px-3 py-2 text-lg font-bold rounded-xl border border-violet-500/40 bg-violet-50 dark:bg-violet-950/40 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 outline-none w-36"
                      placeholder="اسم العائلة"
                    />
                  </div>
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1.5 transition-colors">
                    {formData.firstName} {formData.lastName}
                  </h1>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {employee?.status && statusConfig[employee.status] && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full ring-1 ring-inset ${statusConfig[employee.status].color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[employee.status].dot} animate-pulse`} />
                      {statusConfig[employee.status].label}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <BriefcaseIcon className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                    {employee?.position?.title || "موظف"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <BuildingOfficeIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {employee?.department?.name || "بدون قسم"}
                  </span>
                  {employee?.employeeNumber && (
                    <span className="font-mono text-xs bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-lg border border-violet-200 dark:border-violet-500/20">
                      #{employee.employeeNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════ TABS ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl overflow-hidden border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-2xl transition-all duration-300"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab bar */}
            <div className="border-b border-slate-100 dark:border-white/[0.06] overflow-x-auto scrollbar-hide">
              <TabsList className="flex w-max min-w-full bg-transparent border-none h-auto p-1.5 gap-0.5">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="relative outline-none group flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border-none transition-all whitespace-nowrap
                      text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5
                      data-[state=active]:text-violet-600 dark:data-[state=active]:text-white data-[state=active]:bg-violet-50 dark:data-[state=active]:bg-gradient-to-br dark:data-[state=active]:from-violet-600/30 dark:data-[state=active]:to-indigo-600/20
                      data-[state=active]:shadow-none data-[state=active]:border-0"
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.value === "warnings" && warnings.length > 0 && (
                      <span className="w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                        {warnings.length}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6 sm:p-8">

              {/* ── Overview ── */}
              <TabsContent value="overview" className="mt-0 space-y-6 focus-visible:outline-none">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {statsData.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="relative overflow-hidden p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all group cursor-default"
                    >
                      <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r ${stat.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
                      <div className={`w-10 h-10 mb-4 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.glow} group-hover:scale-110 transition-transform`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Performance + Contact */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Performance */}
                  <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">تقييم الأداء</p>
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((s) =>
                        s <= 4
                          ? <StarSolid key={s} className="w-5 h-5 text-amber-500" />
                          : <StarSolid key={s} className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                      )}
                      <span className="text-sm font-bold text-slate-900 dark:text-white ms-2">4.0</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full w-4/5 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">ممتاز — آخر تقييم ربع سنوي</p>
                  </div>

                  {/* Quick Contact */}
                  <div className="md:col-span-2 p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">معلومات الاتصال السريعة</p>
                    <div className="space-y-3">
                      {[
                        { icon: EnvelopeIcon, value: formData.email, label: "البريد الإلكتروني" },
                        { icon: PhoneIcon, value: formData.phone, label: "الهاتف", editable: true, fkey: "phone" as keyof typeof formData },
                        { icon: MapPinIcon, value: formData.city ? `${formData.city}، ${formData.country}` : formData.country || "", label: "الموقع" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/15 flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          {isEditing && item.editable && item.fkey ? (
                            <input
                              value={formData[item.fkey]}
                              onChange={(e) => setFormData(p => ({ ...p, [item.fkey!]: e.target.value }))}
                              className="flex-1 px-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                          ) : (
                            <span className="text-sm text-slate-700 dark:text-slate-300">{item.value || "—"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── Personal ── */}
              <TabsContent value="personal" className="mt-0 focus-visible:outline-none space-y-5">
                <SectionCard icon={UserIcon} title="البيانات الشخصية" accent="violet">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    <InfoField label="الاسم الكامل" value={`${formData.firstName} ${formData.lastName}`} />

                    <div className="group">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">تاريخ الميلاد</p>
                      {isEditing ? (
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData(p => ({ ...p, dateOfBirth: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                      ) : (
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                          {employee?.dateOfBirth ? `${formatDate(employee.dateOfBirth)} (${calculateAge(employee.dateOfBirth)} عاماً)` : "—"}
                        </p>
                      )}
                    </div>

                    <div className="group">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">الجنس</p>
                      {isEditing ? (
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        >
                          <option value="">غير محدد</option>
                          <option value="MALE">ذكر</option>
                          <option value="FEMALE">أنثى</option>
                        </select>
                      ) : (
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                          {formData.gender === "MALE" ? "ذكر" : formData.gender === "FEMALE" ? "أنثى" : "—"}
                        </p>
                      )}
                    </div>

                    <InfoField label="رقم الهوية" editing={isEditing} {...field("nationalId")} />
                    <InfoField label="البريد الإلكتروني" value={formData.email} />

                    {/* Marital status with select */}
                    <div className="group">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">الحالة الاجتماعية</p>
                      {isEditing ? (
                        <select
                          value={formData.maritalStatus}
                          onChange={(e) => setFormData(p => ({ ...p, maritalStatus: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        >
                          <option value="">غير محدد</option>
                          <option value="SINGLE">أعزب / عزباء</option>
                          <option value="MARRIED">متزوج / ة</option>
                          <option value="DIVORCED">مطلق / ة</option>
                          <option value="WIDOWED">أرمل / ة</option>
                        </select>
                      ) : (
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{maritalLabels[formData.maritalStatus] || "—"}</p>
                      )}
                    </div>

                    <InfoField label="رقم الهاتف" editing={isEditing} {...field("phone")} />
                  </div>
                </SectionCard>

                <SectionCard icon={MapPinIcon} title="بيانات العنوان" accent="indigo">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
                    <InfoField label="العنوان التفصيلي" editing={isEditing} {...field("address")} />
                    <InfoField label="المدينة" editing={isEditing} {...field("city")} />
                    <InfoField label="الدولة" editing={isEditing} {...field("country")} />
                  </div>
                </SectionCard>

                <SectionCard icon={HeartIcon} title="جهة الاتصال في الطوارئ" accent="rose">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
                    <InfoField label="الاسم" editing={isEditing} {...field("emergencyContactName")} />
                    <InfoField label="صلة القرابة" editing={isEditing} {...field("emergencyContactRelation")} />
                    <InfoField label="رقم الهاتف" editing={isEditing} {...field("emergencyContactPhone")} />
                  </div>
                </SectionCard>
              </TabsContent>

              {/* ── Job & Salary ── */}
              <TabsContent value="job" className="mt-0 focus-visible:outline-none space-y-5">
                <SectionCard icon={BriefcaseIcon} title="التفاصيل الوظيفية" accent="indigo">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    {[
                      { label: "الرقم الوظيفي", value: employee?.employeeNumber || "" },
                      { label: "المسمى الوظيفي", value: employee?.position?.title || "" },
                      { label: "القسم", value: employee?.department?.name || "" },
                      { label: "نوع العقد", value: contractLabels[employee?.contractType || ""] || employee?.contractType || "" },
                      { label: "تاريخ الانضمام", value: employee?.hireDate ? formatDate(employee.hireDate) : "" },
                      { label: "مدة الخدمة", value: calculateTenure(employee?.hireDate || "") },
                      { label: "المدير المباشر", value: employee?.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "" },
                    ].map((item) => (
                      <InfoField key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard icon={BanknotesIcon} title="المعلومات المالية" accent="emerald">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                    {[
                      { label: "الراتب الأساسي", value: employee?.baseSalary, suffix: "", unit: "جنيه / شهر", accent: "emerald" },
                      { label: "رصيد الإجازة السنوية", value: employee?.annualLeaveBalance, suffix: "", unit: "يوم متاح", accent: "indigo" },
                      { label: "رصيد الإجازة المرضية", value: employee?.sickLeaveBalance, suffix: "", unit: "يوم متاح", accent: "violet" },
                    ].map((item) => {
                      const accentMap: Record<string, string> = {
                        emerald: "from-emerald-600 to-teal-600 shadow-emerald-500/30",
                        indigo: "from-indigo-600 to-blue-600 shadow-indigo-500/30",
                        violet: "from-violet-600 to-purple-600 shadow-violet-500/30",
                      };
                      return (
                        <div key={item.label} className={`relative p-5 rounded-2xl bg-gradient-to-br ${accentMap[item.accent]} shadow-lg text-center overflow-hidden`}>
                          <div className="absolute inset-0 bg-white/5" />
                          <p className="text-xs font-semibold text-white/70 mb-2 relative">{item.label}</p>
                          <p className="text-3xl font-extrabold text-white relative">
                            {item.value != null ? <AnimatedNumber value={Number(item.value)} /> : "—"}
                          </p>
                          <p className="text-xs text-white/60 mt-1 relative">{item.unit}</p>
                        </div>
                      );
                    })}
                  </div>
                  {(employee?.bankName || employee?.bankIban) && (
                    <div className="pt-5 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      <InfoField label="اسم البنك" value={employee?.bankName || ""} />
                      <InfoField label="رقم IBAN" value={employee?.bankIban || ""} />
                    </div>
                  )}
                </SectionCard>
              </TabsContent>

              {/* ── Custody ── */}
              <TabsContent value="custody" className="mt-0 focus-visible:outline-none">
                <SectionCard icon={ClipboardDocumentListIcon} title={`الأصول المسلمة لي ${myCustody.length > 0 ? `(${myCustody.length})` : ""}`} accent="violet">
                  {myCustody.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        <ComputerDesktopIcon className="w-10 h-10 text-violet-500/40" />
                      </div>
                      <p className="text-slate-500 text-sm">لا توجد عهدة مسلمة لك حالياً</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myCustody.map((asset) => (
                        <motion.div
                          key={asset.id}
                          whileHover={{ y: -2 }}
                          className="p-4 rounded-xl border border-white/[0.06] bg-slate-800/50 hover:bg-slate-800 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <ComputerDesktopIcon className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${asset.status === "ASSIGNED" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                              {asset.status === "ASSIGNED" ? "مُسلّم" : asset.status}
                            </span>
                          </div>
                          <h4 className="font-semibold text-white mb-2">{asset.name}</h4>
                          <div className="space-y-1 text-xs text-slate-500">
                            {asset.code && <div className="flex justify-between"><span>الكود</span><span className="font-mono text-slate-400">{asset.code}</span></div>}
                            {asset.serialNumber && <div className="flex justify-between"><span>الرقم التسلسلي</span><span className="font-mono text-slate-400">{asset.serialNumber}</span></div>}
                            {asset.assignedDate && <div className="flex justify-between"><span>تاريخ الاستلام</span><span>{formatDate(asset.assignedDate)}</span></div>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </TabsContent>

              {/* ── Documents ── */}
              <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
                <SectionCard icon={DocumentTextIcon} title="مستنداتي" accent="indigo">
                  {!employee?.documents_rel?.length ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                        <DocumentTextIcon className="w-10 h-10 text-indigo-500/40" />
                      </div>
                      <p className="text-slate-500 text-sm">لا توجد مستندات مرفقة في ملفك</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employee.documents_rel.map((doc, idx) => (
                        <motion.div
                          key={idx}
                          whileHover={{ y: -2 }}
                          className="p-4 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/10 dark:from-red-600/30 to-rose-600/10 dark:to-rose-600/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <DocumentTextIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">{doc.type}</span>
                          </div>
                          <h4 className="font-semibold text-slate-900 dark:text-white truncate">{doc.title || doc.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{formatDate(doc.createdAt)}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </TabsContent>

              {/* ── Warnings ── */}
              <TabsContent value="warnings" className="mt-0 focus-visible:outline-none">
                <SectionCard icon={BellAlertIcon} title={`سجل الإنذارات ${warnings.length > 0 ? `(${warnings.length})` : ""}`} accent="rose">
                  {warnings.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheckIcon className="w-10 h-10 text-emerald-500/60" />
                      </div>
                      <p className="text-emerald-400 text-sm font-semibold">ممتاز! لا توجد إنذارات مسجلة</p>
                      <p className="text-slate-500 text-xs mt-1">سجلك نظيف تماماً</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {warnings.map((warning) => {
                        const sev = warning.severity === "critical"
                          ? { border: "border-red-500/30 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5", badge: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400", label: "خطير" }
                          : warning.severity === "major"
                            ? { border: "border-orange-500/30 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/5", badge: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400", label: "جسيم" }
                            : { border: "border-blue-500/30 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/5", badge: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400", label: "تنبيه" };
                        return (
                          <div key={warning.id} className={`p-5 rounded-xl border ${sev.border} transition-all`}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">{warning.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{formatDate(warning.incidentDate)}</p>
                              </div>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sev.badge}`}>{sev.label}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{warning.description}</p>
                            {warning.actionTaken && (
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-1">الإجراء المتخذ:</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{warning.actionTaken}</p>
                              </div>
                            )}
                            {!warning.acknowledgedAt ? (
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await api.post(`/hr/warnings/${warning.id}/acknowledge`);
                                      if (res.data.success) { toast.success("تم تأكيد الاستلام بنجاح"); fetchMyWarnings(); }
                                    } catch { toast.error("فشل في تأكيد الاستلام"); }
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
                                >
                                  <CheckIcon className="w-3.5 h-3.5" /> تأكيد الاستلام
                                </button>
                              </div>
                            ) : (
                              <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs">
                                <CheckIcon className="w-3.5 h-3.5" />
                                <span>تم تأكيد الاستلام في {formatDate(warning.acknowledgedAt)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </TabsContent>

              {/* ── Events ── */}
              <TabsContent value="events" className="mt-0 focus-visible:outline-none">
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Birthday */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative overflow-hidden p-8 rounded-2xl border ${derivedTheme === 'dark' ? 'border-pink-500/20' : 'border-pink-200'} text-center`}
                    style={{ background: derivedTheme === 'dark' ? "linear-gradient(135deg, #4a1942 0%, #1e0514 100%)" : "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)" }}
                  >
                    <div className="absolute inset-0" style={{ backgroundImage: derivedTheme === 'dark' ? "radial-gradient(ellipse 60% 60% at 80% 30%, rgba(236,72,153,0.2) 0%, transparent 60%)" : "radial-gradient(ellipse 60% 60% at 80% 30%, rgba(251,113,133,0.1) 0%, transparent 60%)" }} />
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                        <CakeIcon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className={`text-lg font-bold ${derivedTheme === 'dark' ? 'text-white' : 'text-pink-900'} mb-2`}>عيد ميلادك القادم 🎂</h3>
                      {employee?.dateOfBirth ? (
                        <>
                          <p className={`text-sm ${derivedTheme === 'dark' ? 'text-pink-300/70' : 'text-pink-600/70'} mb-6`}>{formatDate(getNextOccasion(employee.dateOfBirth)?.date.toISOString() || "")}</p>
                          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                            <div className={`p-4 rounded-xl ${derivedTheme === 'dark' ? 'bg-white/10' : 'bg-white/60'} backdrop-blur shadow-sm`}>
                              <span className={`block text-3xl font-extrabold ${derivedTheme === 'dark' ? 'text-pink-300' : 'text-pink-600'}`}>{getNextOccasion(employee.dateOfBirth)?.days}</span>
                              <span className={`text-xs ${derivedTheme === 'dark' ? 'text-pink-300/60' : 'text-pink-600/60'}`}>يوم متبقي</span>
                            </div>
                            <div className={`p-4 rounded-xl ${derivedTheme === 'dark' ? 'bg-white/10' : 'bg-white/60'} backdrop-blur shadow-sm`}>
                              <span className={`block text-3xl font-extrabold ${derivedTheme === 'dark' ? 'text-rose-300' : 'text-rose-600'}`}>{(calculateAge(employee.dateOfBirth) as number) + 1}</span>
                              <span className={`text-xs ${derivedTheme === 'dark' ? 'text-rose-300/60' : 'text-rose-600/60'}`}>عامًا</span>
                            </div>
                          </div>
                        </>
                      ) : <p className="text-slate-500 text-sm">لم يتم تسجيل تاريخ الميلاد</p>}
                    </div>
                  </motion.div>

                  {/* Anniversary */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`relative overflow-hidden p-8 rounded-2xl border ${derivedTheme === 'dark' ? 'border-violet-500/20' : 'border-violet-200'} text-center`}
                    style={{ background: derivedTheme === 'dark' ? "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)" : "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" }}
                  >
                    <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 60% 60% at 20% 70%, rgba(139,92,246,0.3) 0%, transparent 60%)" }} />
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <GiftIcon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className={`text-lg font-bold ${derivedTheme === 'dark' ? 'text-white' : 'text-violet-900'} mb-2`}>ذكرى انضمامك 🎉</h3>
                      {employee?.hireDate ? (
                        <>
                          <p className="text-sm text-violet-600 dark:text-violet-300/70 mb-6">{formatDate(getNextOccasion(employee.hireDate)?.date.toISOString() || "")}</p>
                          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                            <div className="p-4 rounded-xl bg-white/40 dark:bg-white/10 backdrop-blur border border-white/20">
                              <span className="block text-3xl font-extrabold text-violet-600 dark:text-violet-300">{getNextOccasion(employee.hireDate)?.days}</span>
                              <span className="text-xs text-violet-600/60 dark:text-violet-300/60">يوم متبقي</span>
                            </div>
                            <div className="p-4 rounded-xl bg-white/40 dark:bg-white/10 backdrop-blur border border-white/20">
                              <span className="block text-3xl font-extrabold text-indigo-600 dark:text-indigo-300">{Math.floor((new Date().getTime() - new Date(employee.hireDate).getTime()) / (1000 * 60 * 60 * 24))}</span>
                              <span className="text-xs text-indigo-600/60 dark:text-indigo-300/60">يوم عمل</span>
                            </div>
                          </div>
                        </>
                      ) : <p className="text-slate-500 dark:text-slate-500 text-sm">لم يتم تسجيل تاريخ الانضمام</p>}
                    </div>
                  </motion.div>
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Profile;
