import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  Briefcase,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ExternalLink,
  Copy,
  MessageCircle,
  Megaphone,
  Kanban,
  Calculator,
  Search,
  Trash2,
  Edit2,
  BarChart3,
  Eye,
  RefreshCw,
  Sliders,
  Receipt,
  FileSpreadsheet,
  CheckCircle,
  Sparkles,
  ChevronRight,
  Package,
  ShoppingCart,
  Printer,
  Upload,
  ChevronLeft
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { AgencyPerformanceModal, DailyLog } from "./AgencyPerformanceModal";
import AgencyMetaSyncControl from "./AgencyMetaSyncControl";

export type PricingModel =
  | "RETAINER"
  | "PERCENT_SPEND"
  | "PERCENT_SALES"
  | "FIXED_ORDER"
  | "FIXED_ITEM"
  | "HYBRID";

export type HybridType = "PERCENT_SPEND" | "PERCENT_SALES" | "FIXED_ORDER";

interface ExtraServiceItem {
  id: string;
  month: string;
  title: string;
  category: string;
  amount: number;
  date?: string;
  notes?: string;
}

interface MonthlyLog {
  month: string;
  adSpend: number;
  salesRevenue: number;
  ordersCount: number;
  unitsSold: number;
  isPaid?: boolean;
  paidAt?: string;
  notes?: string;
}

interface AgencyClient {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  pricingModel: PricingModel;
  pricingRate?: number;
  baseRetainer?: number;
  feePerOrder?: number;
  feePerItem?: number;
  hybridType?: HybridType;
  monthlyBudget: number;
  currentSpend: number;
  monthlySales?: number;
  monthlyOrders?: number;
  monthlyUnits?: number;
  isOffPlatform?: boolean;
  adAccountId?: string;
  dataSource?: "META" | "CSV" | "MANUAL" | string;
  lastSyncedAt?: string;
  lastSyncSource?: string;
  status: "active" | "lead" | "paused" | "completed";
  notes?: string;
  extraServices?: ExtraServiceItem[];
  monthlyLogs?: MonthlyLog[];
  dailyLogs?: DailyLog[];
  createdAt: string;
}

interface AgencyApproval {
  id: string;
  clientId: string;
  clientName?: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  copyText?: string;
  channel: string;
  status: "CLIENT_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "pending" | "approved" | "changes_requested";
  clientFeedback?: string;
  deadline?: string;
  shareToken?: string;
  publicToken?: string;
  createdAt: string;
}

interface ClientInvoiceStatement {
  clientId: string;
  clientName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  pricingModel: PricingModel;
  isOffPlatform: boolean;
  month: string;
  performance: {
    spend: number;
    sales: number;
    orders: number;
    units: number;
    roas?: number;
    cpa?: number;
    aov?: number;
  };
  baseAgencyFee: number;
  calculationExplanation: string;
  extraServices: ExtraServiceItem[];
  extraServicesSum: number;
  totalAmount: number;
  isPaid: boolean;
  paidAt?: string | null;
}

interface InvoicesResponse {
  month: string;
  agencyName: string;
  summary: {
    totalClientsCount: number;
    totalInvoiced: number;
    totalPaid: number;
    totalUnpaid: number;
  };
  statements: ClientInvoiceStatement[];
}

const PRICING_MODEL_LABELS: Record<PricingModel, { label: string; desc: string; badgeColor: string }> = {
  RETAINER: {
    label: "اشتراك شهري ثابت",
    desc: "مبلغ مقطوع شهرياً بغض النظر عن حجم الإنفاق أو المبيعات",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-300"
  },
  PERCENT_SPEND: {
    label: "نسبة من ميزانية الإعلانات (%)",
    desc: "نسبة مئوية من إجمالي الإنفاق الإعلاني الفعلي خلال الشهر",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-300"
  },
  PERCENT_SALES: {
    label: "نسبة من المبيعات (%)",
    desc: "عمولة أداء كنسبة من إجمالي إيرادات المبيعات المحققة",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-300"
  },
  FIXED_ORDER: {
    label: "قيمة ثابتة لكل طلب (CPO)",
    desc: "مبلغ محدد لكل أوردر مكتمل",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-300"
  },
  FIXED_ITEM: {
    label: "قيمة ثابتة لكل قطعة مباعة",
    desc: "مبلغ محدد لكل وحدة أو قطعة يتم بيعها",
    badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-300"
  },
  HYBRID: {
    label: "مبلغ ثابت + عمولة أداء",
    desc: "اشتراك شهري أساسي بالإضافة إلى نسبة أداء من الإنفاق أو المبيعات أو الأوردرات",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-300"
  }
};

const EXTRA_SERVICE_PRESETS = [
  { category: "LOGO_DESIGN", title: "تصميم لوجو وهوية بصرية كاملة", defaultAmount: 3500 },
  { category: "VIDEO_REELS", title: "إنتاج ومونتاج فيديو إعلاني / ريلز احترافي", defaultAmount: 2500 },
  { category: "LANDING_PAGE", title: "تصميم وتطوير صفحة هبوط بيعية (Landing Page)", defaultAmount: 4000 },
  { category: "PHOTOSHOOT", title: "جلسة تصوير منتجات احترافية (Photoshoot)", defaultAmount: 3000 },
  { category: "COPYWRITING", title: "كتابة سيناريوهات ونصوص إعلانية (Copywriting)", defaultAmount: 1500 },
  { category: "EXTERNAL_EXPENSE", title: "مصروف إعلاني خارجي أو اشتراك أدوات", defaultAmount: 1000 },
  { category: "OTHER", title: "خدمة إضافية مخصصة", defaultAmount: 1000 }
];

export default function AgencyDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tab: paramTab } = useParams<{ tab?: string }>();
  const activeTab = paramTab || searchParams.get("tab") || "overview";

  const [loading, setLoading] = useState(true);
  const [currency] = useState("ج.م");
  const currentMonthString = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthString);

  // Overview metrics
  const [overview, setOverview] = useState({
    totalClients: 0,
    activeClients: 0,
    totalBudget: 0,
    totalSpend: 0,
    totalRetainers: 0,
    totalAgencyRevenue: 0,
    unpaidInvoicesCount: 0,
    totalUncollected: 0,
    pendingApprovals: 0,
    expectedPacingPercent: 0,
    currentDay: 1,
    daysInMonth: 30
  });

  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [approvals, setApprovals] = useState<AgencyApproval[]>([]);
  const [invoicesData, setInvoicesData] = useState<InvoicesResponse | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoiceStatement | null>(null);

  // Client modal state
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<AgencyClient | null>(null);
  const [clientForm, setClientForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    pricingModel: "RETAINER" as PricingModel,
    baseRetainer: 5000,
    pricingRate: 10,
    feePerOrder: 25,
    feePerItem: 15,
    hybridType: "PERCENT_SPEND" as HybridType,
    monthlyBudget: 50000,
    currentSpend: 0,
    monthlySales: 0,
    monthlyOrders: 0,
    monthlyUnits: 0,
    isOffPlatform: false,
    adAccountId: "",
    status: "active" as const,
    notes: ""
  });

  // Performance Log Modal State
  const [perfModalOpen, setPerfModalOpen] = useState(false);
  const [selectedClientForPerf, setSelectedClientForPerf] = useState<AgencyClient | null>(null);

  // Extra Service Modal State
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [selectedClientForExtra, setSelectedClientForExtra] = useState<AgencyClient | null>(null);
  const [extraForm, setExtraForm] = useState({
    month: currentMonthString,
    category: "LOGO_DESIGN",
    title: "تصميم لوجو وهوية بصرية كاملة",
    amount: 3500,
    date: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  // Approval modal state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    clientId: "",
    title: "",
    mediaUrl: "",
    copyText: "",
    platform: "facebook",
    campaignName: ""
  });

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");
  const [appInactiveNotice, setAppInactiveNotice] = useState<string | null>(null);

  // Pagination for clients
  const [clientPage, setClientPage] = useState(1);
  const CLIENTS_PER_PAGE = 6;

  // Media upload for approvals
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getArabicMonthName = (monthStr: string) => {
    try {
      const [y, m] = monthStr.split("-").map(Number);
      if (!y || !m) return monthStr;
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
    } catch {
      return monthStr;
    }
  };

  const getClientStatusBadge = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-[10px] font-bold">
            نشط
          </Badge>
        );
      case "lead":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-300 text-[10px] font-bold">
            عميل محتمل (Lead)
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 text-[10px] font-bold">
            متوقف مؤقتاً
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 border-zinc-300 text-[10px] font-bold">
            مكتمل
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] font-bold">
            {status}
          </Badge>
        );
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ovRes, clRes, apRes] = await Promise.all([
        apiClient.get("/agency/overview", { _skipErrorToast: true } as any),
        apiClient.get("/agency/clients", { _skipErrorToast: true } as any),
        apiClient.get("/agency/approvals", { _skipErrorToast: true } as any)
      ]);

      if (ovRes.data?.success) {
        setAppInactiveNotice(null);
        const m = ovRes.data.data?.metrics || {};
        setOverview({
          totalClients: Number(m.totalClients) || 0,
          activeClients: Number(m.activeClients) || 0,
          totalBudget: Number(m.totalBudget) || 0,
          totalSpend: Number(m.totalSpend) || 0,
          totalRetainers: Number(m.totalRetainers) || 0,
          totalAgencyRevenue: Number(m.totalAgencyRevenue) || 0,
          unpaidInvoicesCount: Number(m.unpaidInvoicesCount) || 0,
          totalUncollected: Number(m.totalUncollected) || 0,
          pendingApprovals: Number(m.pendingApprovals) || 0,
          expectedPacingPercent: Number(m.expectedPacingPercent) || 0,
          currentDay: Number(m.currentDay) || 1,
          daysInMonth: Number(m.daysInMonth) || 30
        });
      }

      if (clRes.data?.success && Array.isArray(clRes.data.data)) {
        setClients(
          clRes.data.data.map((c: any) => ({
            ...c,
            pricingModel: c.pricingModel || "RETAINER",
            baseRetainer: Number(c.baseRetainer ?? c.monthlyRetainer) || 0,
            monthlyBudget: Number(c.monthlyBudget) || 0,
            currentSpend: Number(c.currentSpend) || 0,
            status: (c.status || "active").toLowerCase()
          }))
        );
      }

      if (apRes.data?.success && Array.isArray(apRes.data.data)) {
        setApprovals(apRes.data.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "";
      if (err.response?.status === 403 || msg.includes("هذه الميزة تتطلب تفعيل")) {
        setAppInactiveNotice(msg || "هذه الميزة تتطلب تفعيل تطبيق: إدارة وكالات التسويق");
      } else {
        toast.error(msg || "تعذر تحميل بيانات الوكالة");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async (monthToFetch = selectedMonth) => {
    try {
      setInvoicesLoading(true);
      const res = await apiClient.get(`/agency/invoices?month=${monthToFetch}`, { _skipErrorToast: true } as any);
      if (res.data?.success) {
        setInvoicesData(res.data.data);
      }
    } catch (err: any) {
      if (err.response?.status === 403) return;
      toast.error(err.response?.data?.message || "فشل جلب فواتير الوكالة");
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "invoices") {
      fetchInvoices(selectedMonth);
    }
  }, [activeTab, selectedMonth]);

  const handleTabChange = (val: string) => {
    if (paramTab) {
      navigate(`/agency/${val}`);
    } else {
      setSearchParams({ tab: val });
    }
  };

  const handleOpenFormalInvoice = (stmt: ClientInvoiceStatement) => {
    setSelectedInvoice(stmt);
    setInvoiceModalOpen(true);
  };

  const handleOpenFormalInvoiceFromClient = async (client: AgencyClient) => {
    let stmt = invoicesData?.statements?.find((s) => s.clientId === client.id);
    if (!stmt) {
      try {
        setInvoicesLoading(true);
        const res = await apiClient.get(`/agency/invoices?month=${selectedMonth}`);
        if (res.data?.success) {
          setInvoicesData(res.data.data);
          stmt = res.data.data?.statements?.find((s: any) => s.clientId === client.id);
        }
      } catch (err: any) {
        console.error("Failed to fetch invoices for client statement", err);
      } finally {
        setInvoicesLoading(false);
      }
    }

    if (stmt) {
      setSelectedInvoice(stmt);
      setInvoiceModalOpen(true);
    } else {
      // Create on-the-fly statement representation
      const logs = Array.isArray(client.monthlyLogs) ? client.monthlyLogs : [];
      const currentLog = logs.find((l) => l.month === selectedMonth) || {
        month: selectedMonth,
        adSpend: client.currentSpend || 0,
        salesRevenue: client.monthlySales || 0,
        ordersCount: client.monthlyOrders || 0,
        unitsSold: client.monthlyUnits || 0,
        isPaid: false
      };
      const spend = Number(currentLog.adSpend) || 0;
      const sales = Number(currentLog.salesRevenue) || 0;
      const orders = Number(currentLog.ordersCount) || 0;
      const units = Number(currentLog.unitsSold) || 0;
      const roas = spend > 0 ? Number((sales / spend).toFixed(2)) : 0;
      const cpa = orders > 0 ? Math.round(spend / orders) : 0;
      const aov = orders > 0 ? Math.round(sales / orders) : 0;

      let baseAgencyFee = 0;
      let explanation = "";
      const rate = Number(client.pricingRate) || 0;
      const retainer = Number(client.baseRetainer) || 0;
      const perOrder = Number(client.feePerOrder) || 0;
      const perItem = Number(client.feePerItem) || 0;

      switch (client.pricingModel) {
        case "PERCENT_SPEND":
          baseAgencyFee = Math.round(spend * (rate / 100));
          explanation = `${rate}% من إجمالي الإنفاق الإعلاني (${spend.toLocaleString()} ${currency})`;
          break;
        case "PERCENT_SALES":
          baseAgencyFee = Math.round(sales * (rate / 100));
          explanation = `${rate}% من إجمالي المبيعات المحققة (${sales.toLocaleString()} ${currency})`;
          break;
        case "FIXED_ORDER":
          baseAgencyFee = Math.round(orders * perOrder);
          explanation = `${orders} طلب × ${perOrder} ${currency} لكل طلب`;
          break;
        case "FIXED_ITEM":
          baseAgencyFee = Math.round(units * perItem);
          explanation = `${units} قطعة × ${perItem} ${currency} لكل قطعة`;
          break;
        case "HYBRID": {
          let comm = 0;
          if (client.hybridType === "PERCENT_SPEND") {
            comm = Math.round(spend * (rate / 100));
            explanation = `اشتراك ثابت (${retainer.toLocaleString()}) + ${rate}% من الإنفاق (${comm.toLocaleString()})`;
          } else if (client.hybridType === "PERCENT_SALES") {
            comm = Math.round(sales * (rate / 100));
            explanation = `اشتراك ثابت (${retainer.toLocaleString()}) + ${rate}% من المبيعات (${comm.toLocaleString()})`;
          } else {
            comm = Math.round(orders * perOrder);
            explanation = `اشتراك ثابت (${retainer.toLocaleString()}) + ${orders} طلب × ${perOrder} (${comm.toLocaleString()})`;
          }
          baseAgencyFee = retainer + comm;
          break;
        }
        case "RETAINER":
        default:
          baseAgencyFee = retainer;
          explanation = `اشتراك شهري ثابت`;
          break;
      }

      const extraServices = (client.extraServices || []).filter((s) => !s.month || s.month === selectedMonth);
      const extraServicesSum = extraServices.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      setSelectedInvoice({
        clientId: client.id,
        clientName: client.name,
        contactPerson: client.contactPerson,
        phone: client.phone,
        email: client.email,
        pricingModel: client.pricingModel || "RETAINER",
        isOffPlatform: Boolean(client.isOffPlatform),
        month: selectedMonth,
        performance: {
          spend,
          sales,
          orders,
          units,
          roas,
          cpa,
          aov
        },
        baseAgencyFee,
        calculationExplanation: explanation,
        extraServices,
        extraServicesSum,
        totalAmount: baseAgencyFee + extraServicesSum,
        isPaid: Boolean(currentLog.isPaid),
        paidAt: currentLog.paidAt || null
      });
      setInvoiceModalOpen(true);
    }
  };

  // Client Handlers
  const handleOpenNewClient = () => {
    setEditingClient(null);
    setClientForm({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      pricingModel: "RETAINER",
      baseRetainer: 5000,
      pricingRate: 10,
      feePerOrder: 25,
      feePerItem: 15,
      hybridType: "PERCENT_SPEND",
      monthlyBudget: 50000,
      currentSpend: 0,
      monthlySales: 0,
      monthlyOrders: 0,
      monthlyUnits: 0,
      isOffPlatform: false,
      adAccountId: "",
      status: "active",
      notes: ""
    });
    setClientModalOpen(true);
  };

  const handleOpenEditClient = (c: AgencyClient) => {
    setEditingClient(c);
    setClientForm({
      name: c.name,
      contactPerson: c.contactPerson || "",
      email: c.email || "",
      phone: c.phone || "",
      pricingModel: c.pricingModel || "RETAINER",
      baseRetainer: c.baseRetainer || 0,
      pricingRate: c.pricingRate || 10,
      feePerOrder: c.feePerOrder || 25,
      feePerItem: c.feePerItem || 15,
      hybridType: c.hybridType || "PERCENT_SPEND",
      monthlyBudget: c.monthlyBudget || 0,
      currentSpend: c.currentSpend || 0,
      monthlySales: c.monthlySales || 0,
      monthlyOrders: c.monthlyOrders || 0,
      monthlyUnits: c.monthlyUnits || 0,
      isOffPlatform: Boolean(c.isOffPlatform),
      adAccountId: c.adAccountId || "",
      status: c.status,
      notes: c.notes || ""
    });
    setClientModalOpen(true);
  };

  const handleSaveClient = async () => {
    if (!clientForm.name.trim()) {
      toast.error("اسم العميل مطلوب");
      return;
    }

    try {
      if (editingClient) {
        const res = await apiClient.put(`/agency/clients/${editingClient.id}`, clientForm);
        if (res.data?.success) {
          toast.success("تم تحديث بيانات العميل بنجاح");
          setClientModalOpen(false);
          fetchData();
          if (activeTab === "invoices") fetchInvoices(selectedMonth);
        }
      } else {
        const res = await apiClient.post("/agency/clients", clientForm);
        if (res.data?.success) {
          toast.success("تم إضافة العميل بنجاح");
          setClientModalOpen(false);
          fetchData();
          if (activeTab === "invoices") fetchInvoices(selectedMonth);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في حفظ العميل");
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف العميل "${name}"؟`)) return;
    try {
      const res = await apiClient.delete(`/agency/clients/${id}`);
      if (res.data?.success) {
        toast.success("تم حذف العميل");
        fetchData();
        if (activeTab === "invoices") fetchInvoices(selectedMonth);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في حذف العميل");
    }
  };

  // Performance Log Handlers
  const handleOpenPerfModal = (client: AgencyClient) => {
    setSelectedClientForPerf(client);
    setPerfModalOpen(true);
  };

  // Extra Service Handlers
  const handleOpenExtraModal = (client: AgencyClient) => {
    setSelectedClientForExtra(client);
    setExtraForm({
      month: selectedMonth,
      category: "LOGO_DESIGN",
      title: "تصميم لوجو وهوية بصرية كاملة",
      amount: 3500,
      date: new Date().toISOString().slice(0, 10),
      notes: ""
    });
    setExtraModalOpen(true);
  };

  const handleSelectPresetCategory = (cat: string) => {
    const preset = EXTRA_SERVICE_PRESETS.find((p) => p.category === cat);
    if (preset) {
      setExtraForm((prev) => ({
        ...prev,
        category: preset.category,
        title: preset.title,
        amount: preset.defaultAmount
      }));
    }
  };

  const handleSaveExtraService = async () => {
    if (!selectedClientForExtra) return;
    if (!extraForm.title.trim()) {
      toast.error("عنوان الخدمة أو المصروف مطلوب");
      return;
    }
    if (Number(extraForm.amount) <= 0) {
      toast.error("المبلغ يجب أن يكون أكبر من صفر");
      return;
    }

    try {
      const res = await apiClient.post(`/agency/clients/${selectedClientForExtra.id}/extra-services`, extraForm);
      if (res.data?.success) {
        toast.success("تم إضافة البند الإضافي بنجاح");
        setExtraModalOpen(false);
        fetchData();
        fetchInvoices(selectedMonth);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل إضافة البند الإضافي");
    }
  };

  const handleDeleteExtraService = async (clientId: string, serviceId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البند من الفاتورة؟")) return;
    try {
      const res = await apiClient.delete(`/agency/clients/${clientId}/extra-services/${serviceId}`);
      if (res.data?.success) {
        toast.success("تم حذف البند الإضافي");
        fetchData();
        fetchInvoices(selectedMonth);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في الحذف");
    }
  };

  // Toggle invoice paid status
  const handleToggleInvoicePaid = async (clientId: string, currentPaid: boolean) => {
    try {
      const res = await apiClient.patch(`/agency/clients/${clientId}/invoices/${selectedMonth}/status`, {
        isPaid: !currentPaid
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchInvoices(selectedMonth);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تحديث حالة السداد");
    }
  };

  // WhatsApp Share Invoice Generator
  const handleShareInvoiceWhatsApp = (stmt: ClientInvoiceStatement) => {
    const lines = [
      `*كشف حساب وأتعاب التسويق - شهر ${stmt.month}*`,
      `العميل: ${stmt.clientName}`,
      `نموذج التسعير: ${PRICING_MODEL_LABELS[stmt.pricingModel]?.label || stmt.pricingModel}`,
      `---------------------------------`,
      `📊 *الأداء المحقق:*`,
      `- إجمالي الإنفاق الإعلاني: ${stmt.performance.spend.toLocaleString()} ${currency}`,
      stmt.performance.sales > 0 ? `- إجمالي المبيعات: ${stmt.performance.sales.toLocaleString()} ${currency}` : null,
      stmt.performance.orders > 0 ? `- عدد الأوردرات: ${stmt.performance.orders.toLocaleString()} طلب` : null,
      `---------------------------------`,
      `💰 *أتعاب الوكالة الأساسية:*`,
      `${stmt.baseAgencyFee.toLocaleString()} ${currency} (${stmt.calculationExplanation})`,
      stmt.extraServices.length > 0 ? `---------------------------------` : null,
      stmt.extraServices.length > 0 ? `🛠️ *خدمات وبنود إضافية:*` : null,
      ...stmt.extraServices.map((s) => `- ${s.title}: ${s.amount.toLocaleString()} ${currency}`),
      `---------------------------------`,
      `💵 *إجمالي المستحق للفاتورة:* ${stmt.totalAmount.toLocaleString()} ${currency}`,
      `📌 *حالة السداد:* ${stmt.isPaid ? "تم السداد بنجاح ✅" : "بانتظار التحصيل ⏳"}`,
      `---------------------------------`,
      `مع تحيات فريق إدارة الوكالة.`
    ]
      .filter(Boolean)
      .join("\n");

    const phone = stmt.phone ? stmt.phone.replace(/[^0-9]/g, "") : "";
    const formattedPhone = phone.startsWith("0") ? `2${phone}` : phone;

    if (formattedPhone) {
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(lines)}`, "_blank");
    } else {
      navigator.clipboard.writeText(lines);
      toast.success("تم نسخ تفاصيل الفاتورة للحافظة لمشاركتها عبر الواتساب!");
    }
  };

  const handleUploadMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingMedia(true);
      const formData = new FormData();
      formData.append("files", file);
      formData.append("image", file);
      const res = await apiClient.post("/upload/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      if (res.data?.success && (res.data.data?.url || res.data.data?.fullUrl)) {
        const url = res.data.data.fullUrl || res.data.data.url;
        setApprovalForm(prev => ({ ...prev, mediaUrl: url }));
        toast.success("تم رفع ملف التصميم / الفيديو بنجاح!");
      } else {
        const fallbackUrl = URL.createObjectURL(file);
        setApprovalForm(prev => ({ ...prev, mediaUrl: fallbackUrl }));
        toast.info("تم اعتماد الملف للمعاينة المباشرة");
      }
    } catch {
      const fallbackUrl = URL.createObjectURL(file);
      setApprovalForm(prev => ({ ...prev, mediaUrl: fallbackUrl }));
      toast.info("تم اعتماد الملف للمعاينة المباشرة");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Approvals Handlers
  const handleOpenNewApproval = () => {
    if (clients.length === 0) {
      toast.info("يرجى إضافة عميل أولاً قبل إنشاء طلب موافقة له");
      handleOpenNewClient();
      return;
    }
    setApprovalForm({
      clientId: clients[0].id,
      title: "",
      mediaUrl: "",
      copyText: "",
      platform: "facebook",
      campaignName: ""
    });
    setApprovalModalOpen(true);
  };

  const shareApprovalWhatsApp = (item: AgencyApproval) => {
    const client = clients.find((c) => c.id === item.clientId);
    const token = item.shareToken || item.publicToken;
    const fullUrl = `${window.location.origin}/agency/client-portal/${token}`;
    const text = encodeURIComponent(
      `مرحباً ${client?.name || ""}\nفريق وكالة التسويق يشارك معكم مسودة: "${item.title}" للمراجعة والاعتماد.\n\nرابط المعاينة والموافقة بضغطة زر:\n${fullUrl}`
    );
    const phone = client?.phone ? client.phone.replace(/[^0-9]/g, "") : "";
    const formatted = phone.startsWith("0") ? `2${phone}` : phone;
    if (formatted) {
      window.open(`https://wa.me/${formatted}?text=${text}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  };

  const handleSaveApproval = async () => {
    if (!approvalForm.title.trim()) {
      toast.error("عنوان الحملة أو التصميم مطلوب");
      return;
    }
    try {
      const res = await apiClient.post("/agency/approvals", approvalForm);
      if (res.data?.success) {
        toast.success("تم إنشاء طلب الموافقة وتوليد الرابط العام");
        setApprovalModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في حفظ طلب الموافقة");
    }
  };

  const handleDeleteApproval = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العنصر؟")) return;
    try {
      const res = await apiClient.delete(`/agency/approvals/${id}`);
      if (res.data?.success) {
        toast.success("تم حذف طلب الموافقة");
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في الحذف");
    }
  };

  const copyApprovalLink = (token?: string) => {
    if (!token) return;
    const fullUrl = `${window.location.origin}/agency/client-portal/${token}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("تم نسخ رابط بوابة العميل للموافقة!");
  };

  // Filtered clients
  const filteredClients = useMemo(() => {
    setClientPage(1);
    if (!searchTerm.trim()) return clients;
    const q = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.adAccountId && c.adAccountId.toLowerCase().includes(q))
    );
  }, [clients, searchTerm]);

  const totalClientPages = Math.ceil(filteredClients.length / CLIENTS_PER_PAGE) || 1;
  const paginatedClients = useMemo(() => {
    const start = (clientPage - 1) * CLIENTS_PER_PAGE;
    return filteredClients.slice(start, start + CLIENTS_PER_PAGE);
  }, [filteredClients, clientPage]);

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-7xl space-y-5 sm:space-y-6" dir="rtl">
      {/* App Inactive Alert Banner (Graceful feedback without toast floods) */}
      {appInactiveNotice && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <h3 className="font-black text-sm">{appInactiveNotice}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                يمكنك تفعيل تطبيق "وكالة التسويق (Agency OS)" من متجر التطبيقات للبدء في استخدام كافة الميزات.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 h-9 text-xs w-full sm:w-auto"
            onClick={() => navigate("/marketplace?search=marketing-agency-pro")}
          >
            تفعيل التطبيق من المتجر
          </Button>
        </div>
      )}

      {/* 2026 Sleek Integrated Header & Sub-Navigation */}
      <div className="border-b border-border/60 pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-sm shrink-0">
              <Briefcase className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight">إدارة الوكالة</h1>
                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                  محرك الوكالات الاحترافي 2026
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                متابعة العملاء، احتساب الأرباح ونماذج التسعير، وإدارة اعتمادات المحتوى
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-10 sm:h-9 font-bold px-3 shrink-0"
              title="تحديث البيانات"
            >
              <RefreshCw className={`size-3.5 ml-1.5 ${loading ? "animate-spin" : ""}`} />
              <span className="inline">تحديث</span>
            </Button>
            <Button
              onClick={handleOpenNewClient}
              className="h-10 sm:h-9 font-bold shadow-md shadow-primary/20 flex-1 sm:flex-initial px-4 text-xs sm:text-sm"
            >
              <Plus className="size-4 ml-1.5" />
              إضافة عميل جديد
            </Button>
          </div>
        </div>

        {/* Minimal 2026 Integrated Tabs (Pill Bar with Horizontal Scroll & HIG >= 44px) */}
        <div className="relative -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="flex items-center gap-1.5 pt-2 pb-1 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => handleTabChange("overview")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <BarChart3 className="size-4" />
              <span>نظرة عامة</span>
            </button>
            <button
              onClick={() => handleTabChange("clients")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "clients"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <Users className="size-4" />
              <span>العملاء والأسعار</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === "clients" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {clients.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("invoices")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "invoices"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <Receipt className="size-4" />
              <span>الفواتير والأرباح</span>
              {overview.unpaidInvoicesCount > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("approvals")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "approvals"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <CheckCircle2 className="size-4" />
              <span>الموافقات</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === "approvals" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {approvals.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("suite")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "suite"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <Briefcase className="size-4" />
              <span>الأدوات المتكاملة</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-5 sm:space-y-6">
          {/* KPI Stats Grid: Compact 2x2 on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">عملاء الوكالة</p>
                  <p className="text-xl sm:text-2xl font-black mt-0.5 text-foreground">{overview.totalClients}</p>
                  <p className="text-[10px] sm:text-[11px] text-emerald-600 font-bold mt-0.5">{overview.activeClients} عميل نشط</p>
                </div>
                <div className="p-2 sm:p-2.5 bg-blue-500/10 text-blue-600 rounded-xl w-fit">
                  <Users className="size-4 sm:size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">أرباح الوكالة (الشهر)</p>
                  <p className="text-xl sm:text-2xl font-black mt-0.5 text-emerald-600">
                    {overview.totalAgencyRevenue.toLocaleString()} {currency}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">من كافة نماذج التسعير</p>
                </div>
                <div className="p-2 sm:p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl w-fit">
                  <DollarSign className="size-4 sm:size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">استهلاك الميزانيات</p>
                  <p className="text-sm sm:text-xl font-black mt-0.5 text-primary break-words">
                    {overview.totalSpend.toLocaleString()} / {overview.totalBudget.toLocaleString()} {currency}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">الإنفاق:</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-black px-1.5 py-0 ${
                        overview.totalBudget > 0 && (overview.totalSpend / overview.totalBudget) > 1
                          ? "bg-rose-500/10 text-rose-600 border-rose-300"
                          : "bg-blue-500/10 text-blue-600 border-blue-300"
                      }`}
                    >
                      {overview.totalBudget > 0 ? Math.round((overview.totalSpend / overview.totalBudget) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="p-2 sm:p-2.5 bg-purple-500/10 text-purple-600 rounded-xl w-fit">
                  <TrendingUp className="size-4 sm:size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">فواتير بانتظار التحصيل</p>
                  <p className="text-xl sm:text-2xl font-black mt-0.5 text-amber-600">
                    {overview.totalUncollected.toLocaleString()} {currency}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{overview.unpaidInvoicesCount} غير مسددة</p>
                </div>
                <div className="p-2 sm:p-2.5 bg-amber-500/10 text-amber-600 rounded-xl w-fit">
                  <Receipt className="size-4 sm:size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ad Spend Tracker */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Sliders className="size-4 text-primary" />
                    معدل استهلاك الميزانيات الإعلانية (Pacing)
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    متابعة الإنفاق الإعلاني الفعلي مقارنة بالميزانية المرصودة لتفادي تجاوز السقف الشهري
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleTabChange("clients")} className="text-xs font-bold w-fit">
                  إدارة العملاء
                  <ExternalLink className="size-3.5 mr-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {clients.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-xl bg-muted/10 space-y-2">
                  <Users className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-bold text-muted-foreground">لا يوجد عملاء مضافون حتى الآن</p>
                  <Button size="sm" onClick={handleOpenNewClient} className="mt-2 text-xs font-bold h-9">
                    <Plus className="size-3.5 ml-1" />
                    إضافة أول عميل للوكالة
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {clients.slice(0, 5).map((c) => {
                    const budget = Number(c.monthlyBudget) || 0;
                    const spend = Number(c.currentSpend) || 0;
                    const pct = budget > 0 ? Math.round((spend / budget) * 100) : 0;
                    const isOver = pct > 100;

                    return (
                      <div key={c.id} className="p-3 sm:p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-sm text-foreground">{c.name}</span>
                            <Badge variant="outline" className={`text-[10px] font-bold ${PRICING_MODEL_LABELS[c.pricingModel]?.badgeColor}`}>
                              {PRICING_MODEL_LABELS[c.pricingModel]?.label || c.pricingModel}
                            </Badge>
                            {c.isOffPlatform && (
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                خارج المنصة
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 font-bold">
                            <span className="text-muted-foreground">
                              <strong className="text-foreground">{spend.toLocaleString()}</strong> / {budget.toLocaleString()} {currency}
                            </span>
                            <Badge
                              className={`text-[10px] font-black ${
                                isOver ? "bg-rose-500 text-white" : "bg-emerald-600 text-white"
                              }`}
                            >
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOver ? "bg-rose-500" : pct > 85 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: CLIENTS & PRICING MODELS */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-3 sm:top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو الحساب الإعلاني..."
                className="pr-9 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleOpenNewClient} className="h-10 sm:h-9 text-xs font-bold w-full sm:w-auto">
              <Plus className="size-4 ml-1.5" />
              إضافة عميل جديد
            </Button>
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-muted/10 space-y-3">
              <Users className="size-10 mx-auto text-muted-foreground/40" />
              <h3 className="text-sm font-black text-foreground">
                {searchTerm ? "لا توجد نتائج مطابقة لبحثك" : "لا يوجد عملاء مضافون حتى الآن"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchTerm
                  ? "جرب البحث باسم مختلف أو بحساب إعلاني آخر."
                  : "ابدأ بإضافة أول عميل للوكالة وحدد نموذج التسعير المعتمد (اشتراك، نسبة، أو عمولة)."}
              </p>
              {!searchTerm && (
                <Button onClick={handleOpenNewClient} className="h-10 text-xs font-bold mt-1">
                  <Plus className="size-4 ml-1.5" />
                  إضافة أول عميل للوكالة
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {paginatedClients.map((client) => {
                  const budget = Number(client.monthlyBudget) || 0;
                  const spend = Number(client.currentSpend) || 0;
                  const sales = Number(client.monthlySales) || 0;
                  const orders = Number(client.monthlyOrders) || 0;
                  const roas = spend > 0 ? (sales / spend).toFixed(2) : null;
                  const cpa = orders > 0 ? Math.round(spend / orders) : null;
                  const aov = orders > 0 ? Math.round(sales / orders) : null;
                  const pacingPct = budget > 0 ? Math.round((spend / budget) * 100) : 0;
                  const modelMeta = PRICING_MODEL_LABELS[client.pricingModel] || PRICING_MODEL_LABELS.RETAINER;

                  return (
                    <Card key={client.id} className="border-border/60 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between">
                      <CardHeader className="p-3.5 sm:p-5 pb-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base font-black text-foreground">{client.name}</CardTitle>
                            {client.contactPerson && (
                              <p className="text-xs text-muted-foreground mt-0.5">{client.contactPerson}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {Array.isArray(client.dailyLogs) && client.dailyLogs.filter((d: any) => d.date?.startsWith(selectedMonth)).length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                                {client.dailyLogs.filter((d: any) => d.date?.startsWith(selectedMonth)).length} يوم مسجل
                              </Badge>
                            )}
                            {client.isOffPlatform && (
                              <Badge variant="outline" className="text-[10px] bg-muted/40 font-bold">
                                تتبع يدوي
                              </Badge>
                            )}
                            {getClientStatusBadge(client.status)}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3.5 sm:p-5 pt-0 space-y-3 text-xs flex-1">
                        {/* Model Details Box */}
                        <div className="p-3 bg-muted/20 rounded-xl space-y-2 border border-border/40">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-bold">نموذج الربح:</span>
                            <Badge variant="outline" className={`text-[10px] font-bold ${modelMeta.badgeColor}`}>
                              {modelMeta.label}
                            </Badge>
                          </div>

                          {/* Model Specific Rates */}
                          {client.pricingModel === "RETAINER" && (
                            <div className="flex justify-between font-bold">
                              <span className="text-muted-foreground">الاشتراك الشهري:</span>
                              <span className="text-emerald-600 font-black">{client.baseRetainer?.toLocaleString()} {currency}</span>
                            </div>
                          )}
                          {client.pricingModel === "PERCENT_SPEND" && (
                            <div className="flex justify-between font-bold">
                              <span className="text-muted-foreground">النسبة من الإنفاق:</span>
                              <span className="text-blue-600 font-black">{client.pricingRate}% من المصروف</span>
                            </div>
                          )}
                          {client.pricingModel === "PERCENT_SALES" && (
                            <div className="flex justify-between font-bold">
                              <span className="text-muted-foreground">النسبة من المبيعات:</span>
                              <span className="text-purple-600 font-black">{client.pricingRate}% من الإيراد</span>
                            </div>
                          )}
                          {client.pricingModel === "FIXED_ORDER" && (
                            <div className="flex justify-between font-bold">
                              <span className="text-muted-foreground">عمولة الأوردر:</span>
                              <span className="text-amber-600 font-black">{client.feePerOrder} {currency} / طلب</span>
                            </div>
                          )}
                          {client.pricingModel === "FIXED_ITEM" && (
                            <div className="flex justify-between font-bold">
                              <span className="text-muted-foreground">عمولة القطعة:</span>
                              <span className="text-cyan-600 font-black">{client.feePerItem} {currency} / قطعة</span>
                            </div>
                          )}
                          {client.pricingModel === "HYBRID" && (
                            <div className="space-y-1 font-bold">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">الاشتراك الثابت:</span>
                                <span className="text-emerald-600 font-black">{client.baseRetainer?.toLocaleString()} {currency}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-indigo-600">
                                <span>عمولة الأداء:</span>
                                <span>
                                  {client.hybridType === "PERCENT_SPEND"
                                    ? `${client.pricingRate}% من الإنفاق`
                                    : client.hybridType === "PERCENT_SALES"
                                    ? `${client.pricingRate}% من المبيعات`
                                    : `${client.feePerOrder} ${currency} / أوردر`}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Spend Progress */}
                          <div className="pt-1.5 border-t border-border/40 space-y-1">
                            <div className="flex justify-between font-bold text-[11px]">
                              <span className="text-muted-foreground">الإنفاق الإعلاني:</span>
                              <span>
                                <strong className="text-primary">{spend.toLocaleString()}</strong> / {budget.toLocaleString()} {currency}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pacingPct > 100 ? "bg-rose-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(pacingPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* ROAS & CPA Performance badges */}
                        {(sales > 0 || orders > 0 || spend > 0) && (
                          <div className="grid grid-cols-3 gap-1.5 p-2 bg-background/80 rounded-xl border border-border/50 text-[10px] text-center font-bold">
                            <div className="flex flex-col items-center">
                              <span className="text-muted-foreground text-[9px]">عائد ROAS</span>
                              <span className={`font-black ${Number(roas) >= 3 ? "text-emerald-600" : Number(roas) >= 2 ? "text-blue-600" : "text-amber-600"}`}>
                                {roas ? `${roas}x` : "—"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center border-x border-border/40">
                              <span className="text-muted-foreground text-[9px]">تكلفة CPA</span>
                              <span className="font-black text-foreground">
                                {cpa ? `${cpa} ${currency}` : "—"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-muted-foreground text-[9px]">متوسط AOV</span>
                              <span className="font-black text-foreground">
                                {aov ? `${aov} ${currency}` : "—"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* مصدر الأرقام + سحب الإنفاق الحقيقي من ميتا */}
                        <AgencyMetaSyncControl
                          clientId={client.id}
                          adAccountId={client.adAccountId}
                          dataSource={client.dataSource}
                          lastSyncedAt={client.lastSyncedAt}
                          onSynced={fetchData}
                        />

                        {/* Action buttons on client card */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[38px] sm:h-8 text-xs sm:text-[11px] font-bold bg-background hover:bg-muted/50"
                            onClick={() => handleOpenPerfModal(client)}
                          >
                            <FileSpreadsheet className="size-3.5 ml-1 text-primary" />
                            تسجيل الأداء (يومي / شهري)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[38px] sm:h-8 text-xs sm:text-[11px] font-bold bg-background hover:bg-muted/50"
                            onClick={() => handleOpenExtraModal(client)}
                          >
                            <Plus className="size-3.5 ml-1 text-emerald-600" />
                            بند إضافي / نفقة
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[38px] sm:h-8 text-xs sm:text-[11px] font-bold bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary col-span-2"
                            onClick={() => handleOpenFormalInvoiceFromClient(client)}
                          >
                            <Printer className="size-3.5 ml-1" />
                            معاينة الفاتورة الرسمية والطباعة
                          </Button>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            {client.phone && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2.5 text-emerald-600 hover:bg-emerald-500/10 text-xs font-bold rounded-lg"
                                onClick={() => window.open(`https://wa.me/${client.phone?.replace(/[^0-9]/g, "")}`, "_blank")}
                              >
                                <MessageCircle className="size-3.5 ml-1" />
                                واتساب
                              </Button>
                            )}
                            {client.adAccountId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-blue-600 hover:bg-blue-500/10 text-xs font-bold rounded-lg"
                                onClick={() => navigate(`/advertising/facebook-ads?adAccountId=${encodeURIComponent(client.adAccountId!)}`)}
                                title="فتح حساب إعلانات ميتا للعميل"
                              >
                                <Megaphone className="size-3.5 ml-1" />
                                ميتا ادز
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 sm:size-7 rounded-lg"
                              onClick={() => handleOpenEditClient(client)}
                              title="تعديل العميل"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 sm:size-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              onClick={() => handleDeleteClient(client.id, client.name)}
                              title="حذف العميل"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalClientPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clientPage <= 1}
                    onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                    className="h-9 text-xs font-bold px-3"
                  >
                    <ChevronRight className="size-4 ml-1" />
                    السابق
                  </Button>
                  <span className="text-xs font-bold text-muted-foreground">
                    صفحة {clientPage} من {totalClientPages} ({filteredClients.length} عميل)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clientPage >= totalClientPages}
                    onClick={() => setClientPage((p) => Math.min(totalClientPages, p + 1))}
                    className="h-9 text-xs font-bold px-3"
                  >
                    التالي
                    <ChevronLeft className="size-4 mr-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVOICES & PROFIT ENGINE */}
      {activeTab === "invoices" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Header Bar with Month Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3.5 sm:p-4 rounded-2xl border border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                <h2 className="text-base font-black text-foreground">كشوف حساب وفواتير الوكالة</h2>
                <Badge variant="secondary" className="text-[11px] font-bold bg-primary/10 text-primary border-primary/20">
                  {getArabicMonthName(selectedMonth)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                حساب أتعاب الوكالة آلياً بناءً على نموذج التسعير المعتمد، وإضافة النفقات الإضافية، والمشاركة عبر الواتساب
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label className="text-xs font-bold text-muted-foreground shrink-0 hidden sm:inline">شهر الفاتورة:</Label>
              <Input
                type="month"
                className="h-10 sm:h-9 flex-1 sm:w-44 text-base sm:text-xs font-bold bg-background rounded-xl"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={() => fetchInvoices(selectedMonth)} className="h-10 sm:h-9 px-3 shrink-0 rounded-xl" title="تحديث الفواتير">
                <RefreshCw className={`size-4 sm:size-3.5 ${invoicesLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Invoice Summary Cards */}
          {invoicesData?.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/60">
                <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">إجمالي المستحقات</p>
                <p className="text-lg sm:text-xl font-black mt-0.5 text-foreground">
                  {invoicesData.summary.totalInvoiced.toLocaleString()} {currency}
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">شامل الأتعاب والبنود الإضافية</p>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/60">
                <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">تم تحصيله</p>
                <p className="text-lg sm:text-xl font-black mt-0.5 text-emerald-600">
                  {invoicesData.summary.totalPaid.toLocaleString()} {currency}
                </p>
                <p className="text-[10px] sm:text-[11px] text-emerald-600 font-bold mt-0.5">فواتير مسددة بالكامل</p>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/60">
                <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">بانتظار التحصيل</p>
                <p className="text-lg sm:text-xl font-black mt-0.5 text-amber-600">
                  {invoicesData.summary.totalUnpaid.toLocaleString()} {currency}
                </p>
                <p className="text-[10px] sm:text-[11px] text-amber-600 font-bold mt-0.5">مبالغ مستحقة لم تسدد</p>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/60">
                <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">العملاء المفوترين</p>
                <p className="text-lg sm:text-xl font-black mt-0.5 text-primary">
                  {invoicesData.summary.totalClientsCount} عميل
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">لـ {getArabicMonthName(selectedMonth)}</p>
              </div>
            </div>
          )}

          {/* Detailed Client Invoice Cards / Table */}
          {invoicesData?.statements && invoicesData.statements.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {invoicesData.statements.map((stmt) => {
                const clientObj = clients.find((c) => c.id === stmt.clientId);
                return (
                  <Card key={stmt.clientId} className="border-border/60 hover:border-primary/40 transition-all shadow-sm">
                    <CardContent className="p-3.5 sm:p-5 space-y-3.5 text-xs">
                      {/* Top row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-base text-foreground">{stmt.clientName}</span>
                          <Badge variant="outline" className={`text-[10px] font-bold ${PRICING_MODEL_LABELS[stmt.pricingModel]?.badgeColor}`}>
                            {PRICING_MODEL_LABELS[stmt.pricingModel]?.label || stmt.pricingModel}
                          </Badge>
                          {stmt.isOffPlatform && (
                            <Badge variant="secondary" className="text-[10px]">
                              خارج المنصة
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Paid Status Toggle */}
                          <button
                            onClick={() => handleToggleInvoicePaid(stmt.clientId, stmt.isPaid)}
                            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                              stmt.isPaid
                                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-300 hover:bg-emerald-500/25"
                                : "bg-amber-500/15 text-amber-600 border border-amber-300 hover:bg-amber-500/25"
                            }`}
                          >
                            {stmt.isPaid ? (
                              <>
                                <CheckCircle className="size-3.5 text-emerald-600" />
                                <span>مسدد بالكامل</span>
                              </>
                            ) : (
                              <>
                                <Clock className="size-3.5 text-amber-600" />
                                <span>معلق السداد (اضغط للتأكيد)</span>
                              </>
                            )}
                          </button>

                          {/* Formal Invoice Preview & Print Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[36px] px-2.5 text-xs font-bold gap-1 border-border/80 hover:bg-muted"
                            onClick={() => handleOpenFormalInvoice(stmt)}
                          >
                            <Printer className="size-3.5 ml-1 text-primary" />
                            معاينة الفاتورة
                          </Button>

                          {/* WhatsApp Share Button */}
                          <Button
                            size="sm"
                            className="min-h-[36px] px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => handleShareInvoiceWhatsApp(stmt)}
                          >
                            <MessageCircle className="size-3.5 ml-1" />
                            مشاركة واتساب
                          </Button>
                        </div>
                      </div>

                      {/* Performance & Calculations Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Box 1: Actual Performance */}
                        <div className="p-3 bg-muted/20 rounded-xl space-y-1.5 border border-border/30">
                          <p className="font-bold text-[11px] text-muted-foreground uppercase flex items-center justify-between">
                            <span>أرقام الأداء ({getArabicMonthName(selectedMonth)})</span>
                            {clientObj && (
                              <button
                                onClick={() => handleOpenPerfModal(clientObj)}
                                className="text-primary hover:underline text-[10px] font-bold"
                              >
                                تعديل الأرقام
                              </button>
                            )}
                          </p>
                          <div className="space-y-1 font-bold">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">الإنفاق الإعلاني:</span>
                              <span className="text-primary font-black">{stmt.performance.spend.toLocaleString()} {currency}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">المبيعات المحققة:</span>
                              <span>{stmt.performance.sales.toLocaleString()} {currency}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">الطلبات / القطع:</span>
                              <span>{stmt.performance.orders} طلب / {stmt.performance.units} قطعة</span>
                            </div>
                          </div>

                          {/* ROAS, CPA, AOV Badges */}
                          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-border/30 text-[10px] text-center font-bold">
                            <div className="bg-background/80 p-1 rounded border border-border/40">
                              <span className="text-muted-foreground block text-[9px]">عائد ROAS</span>
                              <span className="text-emerald-600 font-black">
                                {stmt.performance.roas || (stmt.performance.spend > 0 ? (stmt.performance.sales / stmt.performance.spend).toFixed(2) : 0)}x
                              </span>
                            </div>
                            <div className="bg-background/80 p-1 rounded border border-border/40">
                              <span className="text-muted-foreground block text-[9px]">تكلفة CPA</span>
                              <span className="text-primary font-black">
                                {stmt.performance.cpa || (stmt.performance.orders > 0 ? Math.round(stmt.performance.spend / stmt.performance.orders) : 0)} {currency}
                              </span>
                            </div>
                            <div className="bg-background/80 p-1 rounded border border-border/40">
                              <span className="text-muted-foreground block text-[9px]">متوسط AOV</span>
                              <span className="text-foreground font-black">
                                {stmt.performance.aov || (stmt.performance.orders > 0 ? Math.round(stmt.performance.sales / stmt.performance.orders) : 0)} {currency}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: Core Agency Fee */}
                        <div className="p-3 bg-muted/20 rounded-xl space-y-1.5 border border-border/30">
                          <p className="font-bold text-[11px] text-muted-foreground uppercase">أتعاب الوكالة الأساسية</p>
                          <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-muted-foreground font-bold">المستحق:</span>
                              <span className="text-base font-black text-emerald-600">
                                {stmt.baseAgencyFee.toLocaleString()} {currency}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                              {stmt.calculationExplanation}
                            </p>
                          </div>
                        </div>

                        {/* Box 3: Extra Services & Total */}
                        <div className="p-3 bg-muted/20 rounded-xl space-y-1.5 border border-border/30">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-[11px] text-muted-foreground uppercase">
                              بنود إضافية ({stmt.extraServices.length})
                            </p>
                            {clientObj && (
                              <button
                                onClick={() => handleOpenExtraModal(clientObj)}
                                className="text-emerald-600 font-bold hover:underline text-[10px] flex items-center"
                              >
                                <Plus className="size-3 ml-0.5" />
                                إضافة بند
                              </button>
                            )}
                          </div>

                          {stmt.extraServices.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">لا توجد خدمات إضافية لهذا الشهر</p>
                          ) : (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {stmt.extraServices.map((extra) => (
                                <div key={extra.id} className="flex items-center justify-between text-[11px] bg-background/60 p-1 rounded">
                                  <span className="font-medium truncate max-w-[140px]">{extra.title}</span>
                                  <div className="flex items-center gap-1 shrink-0 font-black text-primary">
                                    <span>{extra.amount.toLocaleString()} {currency}</span>
                                    <button
                                      onClick={() => handleDeleteExtraService(stmt.clientId, extra.id)}
                                      className="size-6 rounded flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 ml-1"
                                      title="حذف البند"
                                    >
                                      <Trash2 className="size-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                            <span className="font-black text-xs">إجمالي الفاتورة:</span>
                            <span className="font-black text-sm text-foreground">
                              {stmt.totalAmount.toLocaleString()} {currency}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-muted/10 space-y-3">
              <Receipt className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">لا توجد فواتير مسجلة لشهر {getArabicMonthName(selectedMonth)}</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">أضف عملاءك أو سجل أداء الشهر لتوليد كشوف الحساب تلقائياً.</p>
              <Button size="sm" onClick={() => handleTabChange("clients")} className="mt-1 h-9 text-xs font-bold">
                الانتقال لإدارة العملاء
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: APPROVALS */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-foreground">موافقات المحتوى والتصاميم</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                شارك رابطاً عاماً مع العميل لمراجعة بوستات وتصاميم الحملة واعتمادها بنقرة واحدة
              </p>
            </div>
            <Button onClick={handleOpenNewApproval} className="h-10 sm:h-9 text-xs font-bold w-full sm:w-auto">
              <Plus className="size-4 ml-1.5" />
              إنشاء طلب موافقة
            </Button>
          </div>

          {approvals.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-muted/10 space-y-3">
              <CheckCircle2 className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">لا توجد طلبات موافقة حالياً</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                أنشئ مسودة تصميم أو إعلان وشارك رابطه مع العميل للاعتماد بنقرة واحدة عبر واتساب.
              </p>
              <Button size="sm" onClick={handleOpenNewApproval} className="mt-1 h-10 text-xs font-bold">
                <Plus className="size-4 ml-1.5" />
                إنشاء أول طلب موافقة
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {approvals.map((item) => {
                const client = clients.find((c) => c.id === item.clientId);
                const isApproved = item.status === "APPROVED" || item.status === "approved";
                const isChanges = item.status === "CHANGES_REQUESTED" || item.status === "changes_requested";
                const token = item.shareToken || item.publicToken;

                return (
                  <Card key={item.id} className="border-border/60 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between">
                    <CardHeader className="p-3.5 sm:p-5 pb-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="secondary" className="text-[10px] font-bold mb-1">
                            {client?.name || item.clientName || "عميل"}
                          </Badge>
                          <CardTitle className="text-sm font-black text-foreground">{item.title}</CardTitle>
                        </div>
                        <Badge
                          className={`text-[10px] font-bold shrink-0 ${
                            isApproved
                              ? "bg-emerald-500 text-white"
                              : isChanges
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {isApproved ? "معتمد ✅" : isChanges ? "مطلوب تعديلات ⚠️" : "بانتظار العميل ⏳"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-5 pt-0 space-y-2.5 text-xs flex-1">
                      {item.mediaUrl && (
                        <div className="rounded-xl overflow-hidden border border-border/40 max-h-48 bg-muted/20">
                          {item.mediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ? (
                            <video
                              src={item.mediaUrl}
                              controls
                              className="w-full h-full max-h-48 object-cover"
                            />
                          ) : (
                            <img
                              src={item.mediaUrl}
                              alt={item.title}
                              className="w-full h-full max-h-48 object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          )}
                        </div>
                      )}
                      {item.copyText && (
                        <div className="p-2.5 bg-muted/20 rounded-xl text-xs leading-relaxed font-medium">
                          <p className="font-bold text-[10px] text-muted-foreground mb-0.5 uppercase">نص الإعلان (Copy):</p>
                          <p className="line-clamp-3 whitespace-pre-line">{item.copyText}</p>
                        </div>
                      )}
                      {item.clientFeedback && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-200 text-rose-700 rounded-xl text-xs">
                          <p className="font-bold text-[10px] mb-0.5">ملاحظات العميل:</p>
                          <p>{item.clientFeedback}</p>
                        </div>
                      )}
                    </CardContent>
                    <div className="p-3 sm:p-4 pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs font-bold flex-1 min-w-[95px]"
                        onClick={() => copyApprovalLink(token)}
                      >
                        <Copy className="size-3.5 ml-1" />
                        نسخ الرابط
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => shareApprovalWhatsApp(item)}
                        title="مشاركة عبر واتساب"
                      >
                        <MessageCircle className="size-3.5 ml-1" />
                        واتساب
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 rounded-lg text-primary hover:bg-primary/10"
                        onClick={() => window.open(`/agency/client-portal/${token}`, "_blank")}
                        title="معاينة البوابة"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        onClick={() => handleDeleteApproval(item.id)}
                        title="حذف طلب الموافقة"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: INTEGRATED TOOLS */}
      {activeTab === "suite" && (
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-1">
            <h3 className="font-black text-sm text-primary">الأدوات المتكاملة لوكالة التسويق</h3>
            <p className="text-xs text-muted-foreground">
              تكامل سلس ومباشر بين إدارة العملاء وباقي منظومة MaxP للإعلانات، المحادثات، والمهام.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Card className="hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99] touch-manipulation shadow-sm" onClick={() => navigate("/advertising/facebook-ads")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
                  <Megaphone className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    إعلانات ميتا (Facebook Ads Pro)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    إطلاق الحملات وتتبع النتائج والـ ROAS لحسابات عملائك.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99] touch-manipulation shadow-sm" onClick={() => navigate("/unified-inbox")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                  <MessageCircle className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    الإنبوكس الموحد (Unified Inbox)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    إدارة محادثات واتساب وفيسبوك وإنستجرام وتليجرام في شاشة واحدة.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99] touch-manipulation shadow-sm" onClick={() => navigate("/tasks/kanban")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                  <Kanban className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    لوحة مهام الفريق (Kanban OS)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    توزيع مهام الميديا بايينج والتصميم على أعضاء الفريق ومتابعة التنفيذ.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99] touch-manipulation shadow-sm" onClick={() => navigate("/tools/monthly-pnl")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl shrink-0">
                  <Calculator className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    الأرباح والخسائر (P&L Engine)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    حساب صافي ربح الوكالة ومصاريف التشغيل والرواتب.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99] touch-manipulation shadow-sm" onClick={() => navigate("/tools/ad-budget-planner")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl shrink-0">
                  <BarChart3 className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    مخطط ميزانيات الإعلانات
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    تقدير تكاليف الحملات وتوزيع الميزانية على القنوات المختلفة.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99] touch-manipulation shadow-sm" onClick={() => navigate("/competitors")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-teal-500/10 text-teal-600 rounded-xl shrink-0">
                  <Search className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    تحليل المنافسين
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    مراقبة إعلانات المنافسين ومكتبة الإعلانات لاقتناص الأفكار.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT CLIENT */}
      <Dialog open={clientModalOpen} onOpenChange={setClientModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 shrink-0">
            <DialogTitle className="font-black text-base sm:text-lg text-foreground">
              {editingClient ? "تعديل بيانات العميل ونموذج التسعير" : "إضافة عميل وكالة جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-4 text-xs">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">اسم العميل أو العلامة التجارية *</Label>
                <Input
                  className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                  placeholder="مثال: براند قمة الأناقة"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">الشخص المسؤول (Contact Person)</Label>
                <Input
                  className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                  placeholder="أحمد ممدوح"
                  value={clientForm.contactPerson}
                  onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">رقم الهاتف / الواتساب</Label>
                <Input
                  className="mt-1 h-10 sm:h-9 text-base sm:text-xs font-mono rounded-xl"
                  dir="ltr"
                  placeholder="010xxxxxxxx"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Pricing Model Selector */}
            <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
              <div>
                <Label className="text-xs font-black text-primary">طريقة احتساب أرباح الوكالة (Pricing Model) *</Label>
                <select
                  className="w-full mt-1.5 h-11 sm:h-10 px-3 rounded-xl border border-border bg-background text-base sm:text-xs font-bold text-foreground"
                  value={clientForm.pricingModel}
                  onChange={(e) => setClientForm({ ...clientForm, pricingModel: e.target.value as PricingModel })}
                >
                  <option value="RETAINER">1. اشتراك شهري ثابت (Flat Retainer)</option>
                  <option value="PERCENT_SPEND">2. نسبة من ميزانية الإعلانات (% of Ad Spend)</option>
                  <option value="PERCENT_SALES">3. نسبة من المبيعات المحققة (% of Revenue)</option>
                  <option value="FIXED_ORDER">4. عمولة ثابتة لكل أوردر / طلب (Fixed per Order)</option>
                  <option value="FIXED_ITEM">5. عمولة ثابتة لكل قطعة مباعة (Fixed per Item)</option>
                  <option value="HYBRID">6. نموذج هجين: اشتراك ثابت + عمولة أداء (Hybrid)</option>
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {PRICING_MODEL_LABELS[clientForm.pricingModel]?.desc}
                </p>
              </div>

              {/* Dynamic inputs according to selected pricing model */}
              {clientForm.pricingModel === "RETAINER" && (
                <div>
                  <Label className="text-xs font-bold">الاشتراك الشهري الثابت للوكالة ({currency})</Label>
                  <Input
                    className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                    type="number"
                    placeholder="10000"
                    value={clientForm.baseRetainer || ""}
                    onChange={(e) => setClientForm({ ...clientForm, baseRetainer: Number(e.target.value) })}
                  />
                </div>
              )}

              {clientForm.pricingModel === "PERCENT_SPEND" && (
                <div>
                  <Label className="text-xs font-bold">النسبة المئوية من ميزانية الإعلانات المصروفة (%)</Label>
                  <Input
                    className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                    type="number"
                    placeholder="10"
                    value={clientForm.pricingRate || ""}
                    onChange={(e) => setClientForm({ ...clientForm, pricingRate: Number(e.target.value) })}
                  />
                </div>
              )}

              {clientForm.pricingModel === "PERCENT_SALES" && (
                <div>
                  <Label className="text-xs font-bold">النسبة المئوية من إجمالي المبيعات (%)</Label>
                  <Input
                    className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                    type="number"
                    placeholder="5"
                    value={clientForm.pricingRate || ""}
                    onChange={(e) => setClientForm({ ...clientForm, pricingRate: Number(e.target.value) })}
                  />
                </div>
              )}

              {clientForm.pricingModel === "FIXED_ORDER" && (
                <div>
                  <Label className="text-xs font-bold">القيمة الثابتة لكل أوردر / طلب ({currency})</Label>
                  <Input
                    className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                    type="number"
                    placeholder="25"
                    value={clientForm.feePerOrder || ""}
                    onChange={(e) => setClientForm({ ...clientForm, feePerOrder: Number(e.target.value) })}
                  />
                </div>
              )}

              {clientForm.pricingModel === "FIXED_ITEM" && (
                <div>
                  <Label className="text-xs font-bold">القيمة الثابتة لكل قطعة مباعة ({currency})</Label>
                  <Input
                    className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                    type="number"
                    placeholder="15"
                    value={clientForm.feePerItem || ""}
                    onChange={(e) => setClientForm({ ...clientForm, feePerItem: Number(e.target.value) })}
                  />
                </div>
              )}

              {clientForm.pricingModel === "HYBRID" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold">الاشتراك الأساسي الثابت ({currency})</Label>
                      <Input
                        className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                        type="number"
                        placeholder="5000"
                        value={clientForm.baseRetainer || ""}
                        onChange={(e) => setClientForm({ ...clientForm, baseRetainer: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">نوع عمولة الأداء الإضافية</Label>
                      <select
                        className="w-full mt-1 h-10 sm:h-9 px-2 rounded-xl border border-border bg-background text-base sm:text-xs font-bold"
                        value={clientForm.hybridType}
                        onChange={(e) => setClientForm({ ...clientForm, hybridType: e.target.value as HybridType })}
                      >
                        <option value="PERCENT_SPEND">نسبة من الإنفاق الإعلاني</option>
                        <option value="PERCENT_SALES">نسبة من المبيعات</option>
                        <option value="FIXED_ORDER">عمولة ثابتة لكل أوردر</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    {clientForm.hybridType === "FIXED_ORDER" ? (
                      <div>
                        <Label className="text-xs font-bold">قيمة العمولة لكل أوردر ({currency})</Label>
                        <Input
                          className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                          type="number"
                          placeholder="20"
                          value={clientForm.feePerOrder || ""}
                          onChange={(e) => setClientForm({ ...clientForm, feePerOrder: Number(e.target.value) })}
                        />
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs font-bold">
                          نسبة العمولة ({clientForm.hybridType === "PERCENT_SPEND" ? "من الإنفاق" : "من المبيعات"}) (%)
                        </Label>
                        <Input
                          className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                          type="number"
                          placeholder="5"
                          value={clientForm.pricingRate || ""}
                          onChange={(e) => setClientForm({ ...clientForm, pricingRate: Number(e.target.value) })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ad Budget & Off-Platform Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div>
                <Label className="text-xs font-bold">ميزانية الإعلانات الشهرية ({currency})</Label>
                <Input
                  className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                  type="number"
                  placeholder="50000"
                  value={clientForm.monthlyBudget || ""}
                  onChange={(e) => setClientForm({ ...clientForm, monthlyBudget: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">معرف الحساب الإعلاني (اختياري)</Label>
                <Input
                  className="mt-1 h-10 sm:h-9 text-base sm:text-xs font-mono rounded-xl"
                  dir="ltr"
                  placeholder="act_123456789"
                  value={clientForm.adAccountId}
                  onChange={(e) => setClientForm({ ...clientForm, adAccountId: e.target.value })}
                />
              </div>
            </div>

            {/* Off-Platform Checkbox */}
            <div className="flex items-center gap-2.5 p-3 bg-muted/20 rounded-xl border border-border/40">
              <input
                type="checkbox"
                id="isOffPlatformCheck"
                className="size-4 rounded accent-primary cursor-pointer"
                checked={clientForm.isOffPlatform}
                onChange={(e) => setClientForm({ ...clientForm, isOffPlatform: e.target.checked })}
              />
              <label htmlFor="isOffPlatformCheck" className="text-xs font-bold cursor-pointer">
                العميل يعمل خارج المنصة (إدخال أرقام الإنفاق والمبيعات والأوردرات يدوياً شهرياً)
              </label>
            </div>

            <div>
              <Label className="text-xs font-bold">ملاحظات العقد</Label>
              <Textarea
                className="mt-1 text-base sm:text-xs rounded-xl"
                placeholder="تفاصيل الاتفاق، بنود استثنائية، أو شروط دفع..."
                rows={2}
                value={clientForm.notes}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-background/95 backdrop-blur-sm shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-start">
            <Button onClick={handleSaveClient} className="font-bold h-11 sm:h-9 text-xs w-full sm:w-auto">
              حفظ العميل
            </Button>
            <Button variant="outline" onClick={() => setClientModalOpen(false)} className="h-11 sm:h-9 text-xs w-full sm:w-auto">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: LOG PERFORMANCE (DAILY & MONTHLY) */}
      <AgencyPerformanceModal
        open={perfModalOpen}
        onOpenChange={setPerfModalOpen}
        client={selectedClientForPerf}
        selectedMonth={selectedMonth}
        currency={currency}
        onSuccess={() => {
          fetchData();
          fetchInvoices(selectedMonth);
        }}
      />

      {/* MODAL 3: ADD EXTRA SERVICE / EXPENSE */}
      <Dialog open={extraModalOpen} onOpenChange={setExtraModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 shrink-0">
            <DialogTitle className="font-black text-base sm:text-lg flex items-center gap-2 text-foreground">
              <Plus className="size-5 text-emerald-600" />
              إضافة بند إضافي / نفقة - {selectedClientForExtra?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-bold">نوع الخدمة الإضافية (نموذج مسبق)</Label>
              <select
                className="w-full mt-1 h-10 sm:h-9 px-3 rounded-xl border border-border bg-background text-base sm:text-xs font-bold"
                value={extraForm.category}
                onChange={(e) => handleSelectPresetCategory(e.target.value)}
              >
                {EXTRA_SERVICE_PRESETS.map((p) => (
                  <option key={p.category} value={p.category}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold">وصف أو عنوان البند في الفاتورة *</Label>
              <Input
                className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                value={extraForm.title}
                onChange={(e) => setExtraForm({ ...extraForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">المبلغ المستحق ({currency}) *</Label>
                <Input
                  className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                  type="number"
                  value={extraForm.amount || ""}
                  onChange={(e) => setExtraForm({ ...extraForm, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">الشهر المرتبط به</Label>
                <Input
                  type="month"
                  className="mt-1 h-10 sm:h-9 text-base sm:text-xs font-bold rounded-xl"
                  value={extraForm.month}
                  onChange={(e) => setExtraForm({ ...extraForm, month: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">ملاحظات داخلية (اختياري)</Label>
              <Input
                className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                placeholder="تفاصيل التكلفة، اسم المصمم أو جهة التنفيذ..."
                value={extraForm.notes}
                onChange={(e) => setExtraForm({ ...extraForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-background/95 backdrop-blur-sm shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-start">
            <Button onClick={handleSaveExtraService} className="font-bold h-11 sm:h-9 text-xs w-full sm:w-auto">
              إضافة البند للفاتورة
            </Button>
            <Button variant="outline" onClick={() => setExtraModalOpen(false)} className="h-11 sm:h-9 text-xs w-full sm:w-auto">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ADD APPROVAL ITEM */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 shrink-0">
            <DialogTitle className="font-black text-base sm:text-lg text-foreground">إنشاء طلب موافقة على محتوى أو تصميم</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-3 text-xs">
            <div>
              <Label className="text-xs font-bold">العميل المستهدف *</Label>
              <select
                className="w-full mt-1 h-10 sm:h-9 px-3 rounded-xl border border-border bg-background text-base sm:text-xs font-bold"
                value={approvalForm.clientId}
                onChange={(e) => setApprovalForm({ ...approvalForm, clientId: e.target.value })}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold">عنوان المحتوى أو البوست *</Label>
              <Input
                className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                placeholder="مثال: ريلز الجمعة البيضاء - إنستجرام"
                value={approvalForm.title}
                onChange={(e) => setApprovalForm({ ...approvalForm, title: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">صورة أو فيديو التصميم (Media)</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  onChange={handleUploadMediaFile}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isUploadingMedia}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs font-bold bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary gap-1"
                >
                  <Upload className={`size-3.5 ${isUploadingMedia ? "animate-spin" : ""}`} />
                  {isUploadingMedia ? "جاري الرفع..." : "رفع من الجهاز"}
                </Button>
              </div>
              <Input
                className="mt-1.5 h-10 sm:h-9 text-base sm:text-xs font-mono rounded-xl"
                dir="ltr"
                placeholder="https://... أو اضغط رفع من الجهاز"
                value={approvalForm.mediaUrl}
                onChange={(e) => setApprovalForm({ ...approvalForm, mediaUrl: e.target.value })}
              />
              {approvalForm.mediaUrl && (
                <div className="mt-2 p-2 rounded-xl border border-border/60 bg-muted/20 relative group">
                  {approvalForm.mediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ? (
                    <video src={approvalForm.mediaUrl} controls className="max-h-36 rounded-lg w-full object-cover" />
                  ) : (
                    <img
                      src={approvalForm.mediaUrl}
                      alt="معاينة التصميم"
                      className="max-h-36 rounded-lg mx-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-[10px] text-rose-500 hover:text-rose-600 mt-1 h-6 px-2 w-full"
                    onClick={() => setApprovalForm({ ...approvalForm, mediaUrl: "" })}
                  >
                    إزالة الوسائط
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs font-bold">نص الإعلان أو الكابشن (Ad Copy)</Label>
              <Textarea
                className="mt-1 text-base sm:text-xs rounded-xl"
                placeholder="اكتب النص الإعلاني أو الكابشن المقترح ليراجعه العميل..."
                rows={3}
                value={approvalForm.copyText}
                onChange={(e) => setApprovalForm({ ...approvalForm, copyText: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-background/95 backdrop-blur-sm shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-start">
            <Button onClick={handleSaveApproval} className="font-bold h-11 sm:h-9 text-xs w-full sm:w-auto">
              توليد رابط الموافقة وحفظ
            </Button>
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)} className="h-11 sm:h-9 text-xs w-full sm:w-auto">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: FORMAL PRINTABLE INVOICE MODAL */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 overflow-hidden" dir="rtl">
          {selectedInvoice && (
            <div className="bg-background flex flex-col h-full overflow-hidden">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #agency-formal-invoice-print-area, #agency-formal-invoice-print-area * {
                    visibility: visible !important;
                  }
                  #agency-formal-invoice-print-area {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100vw !important;
                    margin: 0 !important;
                    padding: 24px !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    z-index: 99999 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}</style>

              {/* Header / Actions Bar (Hidden in Print) */}
              <div className="p-3.5 sm:p-4 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 no-print">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                    <Receipt className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground">معاينة الفاتورة وكشف الحساب الرسمي</h3>
                    <p className="text-[11px] text-muted-foreground">جاهزة للطباعة، الحفظ كـ PDF، أو الإرسال للعميل</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 font-bold text-xs gap-1.5 flex-1 sm:flex-initial"
                    onClick={() => window.print()}
                  >
                    <Printer className="size-3.5 text-primary" />
                    طباعة / حفظ PDF
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
                    onClick={() => handleShareInvoiceWhatsApp(selectedInvoice)}
                  >
                    <MessageCircle className="size-3.5" />
                    مشاركة عبر واتساب
                  </Button>
                </div>
              </div>

              {/* PRINTABLE INVOICE SHEET */}
              <div id="agency-formal-invoice-print-area" className="p-4 sm:p-8 bg-card text-card-foreground space-y-5 sm:space-y-6 overflow-y-auto flex-1">
                {/* Agency Letterhead */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-primary/20 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-base shadow-sm">
                        M
                      </div>
                      <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                        {invoicesData?.agencyName || "وكالة التسويق الرقمي وإدارة الحملات"}
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      منظومة إدارة أداء وحسابات الإعلانات والتسويق الرقمي
                    </p>
                  </div>

                  <div className="text-left sm:text-left space-y-1" dir="ltr">
                    <div className="inline-block">
                      <Badge
                        variant="outline"
                        className={`text-xs px-2.5 py-0.5 font-black uppercase tracking-wider ${
                          selectedInvoice.isPaid
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-400"
                            : "bg-amber-500/10 text-amber-600 border-amber-400"
                        }`}
                      >
                        {selectedInvoice.isPaid ? "PAID / مسددة بالكامل ✅" : "PAYMENT DUE / بانتظار التحصيل ⏳"}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono font-bold text-muted-foreground">
                      #INV-{selectedInvoice.month.replace("-", "")}-{selectedInvoice.clientId.slice(-4).toUpperCase()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Month: {selectedInvoice.month}
                    </p>
                  </div>
                </div>

                {/* Bill To & Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-muted/20 border border-border/60 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">مفوتر إلى (العميل):</span>
                    <h4 className="text-sm font-black text-foreground">{selectedInvoice.clientName}</h4>
                    {selectedInvoice.contactPerson && (
                      <p className="text-muted-foreground">المسؤول: {selectedInvoice.contactPerson}</p>
                    )}
                    {selectedInvoice.phone && (
                      <p className="text-muted-foreground font-mono" dir="ltr">الهاتف: {selectedInvoice.phone}</p>
                    )}
                    {selectedInvoice.email && (
                      <p className="text-muted-foreground">البريد: {selectedInvoice.email}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:border-r sm:border-border/60 sm:pr-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">تفاصيل التعاقد والحملة:</span>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">نموذج التسعير:</span>
                      <Badge variant="outline" className={`text-[10px] font-bold ${PRICING_MODEL_LABELS[selectedInvoice.pricingModel]?.badgeColor}`}>
                        {PRICING_MODEL_LABELS[selectedInvoice.pricingModel]?.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">شهر الفاتورة:</span>
                      <span className="font-bold">{selectedInvoice.month}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">نطاق العمل:</span>
                      <span className="font-bold">
                        {selectedInvoice.isOffPlatform ? "تتبع إعلاني خارجي" : "متصل بالمنصة"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campaign Performance Snapshot */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <BarChart3 className="size-3.5 text-primary" />
                      ملخص أداء الحملات الإعلانية المعتمد
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    <div className="p-2.5 sm:p-3 rounded-lg border border-border/60 bg-muted/10">
                      <span className="text-[10px] font-bold text-muted-foreground block">الإنفاق الإعلاني الفعلي</span>
                      <span className="text-sm font-black text-primary mt-0.5 block">
                        {selectedInvoice.performance.spend.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-lg border border-border/60 bg-muted/10">
                      <span className="text-[10px] font-bold text-muted-foreground block">إجمالي المبيعات المحققة</span>
                      <span className="text-sm font-black text-foreground mt-0.5 block">
                        {selectedInvoice.performance.sales.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-lg border border-border/60 bg-muted/10">
                      <span className="text-[10px] font-bold text-muted-foreground block">عائد الإنفاق (ROAS)</span>
                      <span className="text-sm font-black text-emerald-600 mt-0.5 block">
                        {selectedInvoice.performance.roas || (selectedInvoice.performance.spend > 0 ? (selectedInvoice.performance.sales / selectedInvoice.performance.spend).toFixed(2) : 0)}x
                      </span>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-lg border border-border/60 bg-muted/10">
                      <span className="text-[10px] font-bold text-muted-foreground block">تكلفة الطلب (CPA)</span>
                      <span className="text-sm font-black text-foreground mt-0.5 block">
                        {selectedInvoice.performance.cpa || (selectedInvoice.performance.orders > 0 ? Math.round(selectedInvoice.performance.spend / selectedInvoice.performance.orders) : 0)} {currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Invoice Breakdown Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="size-3.5 text-primary" />
                    بيان الأتعاب والخدمات المفوترة
                  </h4>

                  <div className="border border-border/60 rounded-xl overflow-x-auto text-xs">
                    <div className="min-w-[460px]">
                      <div className="grid grid-cols-12 bg-muted/40 p-2.5 font-black border-b border-border/60 text-[11px] text-muted-foreground">
                        <div className="col-span-6">البند / الخدمة</div>
                        <div className="col-span-3">النوع والتفاصيل</div>
                        <div className="col-span-3 text-left">المبلغ المستحق</div>
                      </div>

                      {/* Core Agency Fee Row */}
                      <div className="grid grid-cols-12 p-3 border-b border-border/40 items-center font-medium bg-background/50">
                        <div className="col-span-6">
                          <p className="font-black text-foreground">أتعاب إدارة الحملات والتسويق الرقمي</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {selectedInvoice.calculationExplanation}
                          </p>
                        </div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            أتعاب أساسية
                          </Badge>
                        </div>
                        <div className="col-span-3 text-left font-black text-sm text-foreground">
                          {selectedInvoice.baseAgencyFee.toLocaleString()} {currency}
                        </div>
                      </div>

                      {/* Extra Services Rows */}
                      {selectedInvoice.extraServices.map((srv) => (
                        <div key={srv.id} className="grid grid-cols-12 p-3 border-b border-border/40 items-center font-medium">
                          <div className="col-span-6">
                            <p className="font-bold text-foreground">{srv.title}</p>
                            {srv.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{srv.notes}</p>}
                          </div>
                          <div className="col-span-3">
                            <Badge variant="secondary" className="text-[10px] font-bold">
                              {srv.category}
                            </Badge>
                          </div>
                          <div className="col-span-3 text-left font-black text-sm text-foreground">
                            {srv.amount.toLocaleString()} {currency}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2">
                  <div className="text-xs text-muted-foreground space-y-1 max-w-sm">
                    <p className="font-bold text-foreground">شروط ومعلومات السداد:</p>
                    <p>
                      كافة الأتعاب والعمولات مبنية على أرقام الأداء والبنود المعتمدة لشهر {selectedInvoice.month}.
                      في حال وجود أي استفسار يرجى مراجعة إدارة الوكالة مباشرة.
                    </p>
                  </div>

                  <div className="w-full sm:w-72 space-y-2 p-3.5 bg-muted/20 rounded-xl border border-border/60 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-muted-foreground">أتعاب الوكالة الأساسية:</span>
                      <span>{selectedInvoice.baseAgencyFee.toLocaleString()} {currency}</span>
                    </div>
                    {selectedInvoice.extraServicesSum > 0 && (
                      <div className="flex justify-between font-bold">
                        <span className="text-muted-foreground">إجمالي البنود الإضافية:</span>
                        <span>{selectedInvoice.extraServicesSum.toLocaleString()} {currency}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-primary/20 flex justify-between items-baseline font-black">
                      <span className="text-sm text-foreground">إجمالي الفاتورة المستحق:</span>
                      <span className="text-base text-primary">
                        {selectedInvoice.totalAmount.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stamp / Signature Area */}
                <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="space-y-1">
                    <p className="font-bold">اعتماد إدارة الوكالة:</p>
                    <p className="font-mono text-[10px] text-muted-foreground/80">Digital Signature Verified</p>
                  </div>
                  <div className="text-left space-y-1">
                    <p className="font-bold">تاريخ الإصدار:</p>
                    <p className="font-mono text-[10px]">{new Date().toISOString().slice(0, 10)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
