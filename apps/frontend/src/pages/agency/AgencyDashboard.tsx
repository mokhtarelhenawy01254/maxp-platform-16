import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  ShoppingCart
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
  status: "active" | "lead" | "paused" | "completed";
  notes?: string;
  extraServices?: ExtraServiceItem[];
  monthlyLogs?: MonthlyLog[];
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
  const activeTab = searchParams.get("tab") || "overview";

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
  const [perfForm, setPerfForm] = useState({
    month: currentMonthString,
    adSpend: 0,
    salesRevenue: 0,
    ordersCount: 0,
    unitsSold: 0,
    isPaid: false,
    notes: ""
  });

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ovRes, clRes, apRes] = await Promise.all([
        apiClient.get("/agency/overview"),
        apiClient.get("/agency/clients"),
        apiClient.get("/agency/approvals")
      ]);

      if (ovRes.data?.success) {
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
      toast.error(err.response?.data?.message || "تعذر تحميل بيانات الوكالة");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async (monthToFetch = selectedMonth) => {
    try {
      setInvoicesLoading(true);
      const res = await apiClient.get(`/agency/invoices?month=${monthToFetch}`);
      if (res.data?.success) {
        setInvoicesData(res.data.data);
      }
    } catch (err: any) {
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
    setSearchParams({ tab: val });
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
    const existingLog = client.monthlyLogs?.find((l) => l.month === selectedMonth);
    setPerfForm({
      month: selectedMonth,
      adSpend: existingLog ? existingLog.adSpend : client.currentSpend || 0,
      salesRevenue: existingLog ? existingLog.salesRevenue : client.monthlySales || 0,
      ordersCount: existingLog ? existingLog.ordersCount : client.monthlyOrders || 0,
      unitsSold: existingLog ? existingLog.unitsSold : client.monthlyUnits || 0,
      isPaid: existingLog ? Boolean(existingLog.isPaid) : false,
      notes: existingLog?.notes || ""
    });
    setPerfModalOpen(true);
  };

  const handleSavePerformance = async () => {
    if (!selectedClientForPerf) return;
    try {
      const res = await apiClient.post(`/agency/clients/${selectedClientForPerf.id}/performance`, perfForm);
      if (res.data?.success) {
        toast.success("تم تسجيل أداء العميل لهذا الشهر");
        setPerfModalOpen(false);
        fetchData();
        fetchInvoices(selectedMonth);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تسجيل الأداء");
    }
  };

  // Calculate live preview of fee inside modal
  const previewCalculatedFee = useMemo(() => {
    if (!selectedClientForPerf) return 0;
    const model = selectedClientForPerf.pricingModel || "RETAINER";
    const spend = Number(perfForm.adSpend) || 0;
    const sales = Number(perfForm.salesRevenue) || 0;
    const orders = Number(perfForm.ordersCount) || 0;
    const units = Number(perfForm.unitsSold) || 0;
    const rate = Number(selectedClientForPerf.pricingRate) || 0;
    const base = Number(selectedClientForPerf.baseRetainer) || 0;
    const perOrder = Number(selectedClientForPerf.feePerOrder) || 0;
    const perItem = Number(selectedClientForPerf.feePerItem) || 0;

    switch (model) {
      case "PERCENT_SPEND":
        return Math.round(spend * (rate / 100));
      case "PERCENT_SALES":
        return Math.round(sales * (rate / 100));
      case "FIXED_ORDER":
        return Math.round(orders * perOrder);
      case "FIXED_ITEM":
        return Math.round(units * perItem);
      case "HYBRID": {
        let comm = 0;
        if (selectedClientForPerf.hybridType === "PERCENT_SPEND") comm = Math.round(spend * (rate / 100));
        else if (selectedClientForPerf.hybridType === "PERCENT_SALES") comm = Math.round(sales * (rate / 100));
        else if (selectedClientForPerf.hybridType === "FIXED_ORDER") comm = Math.round(orders * perOrder);
        return base + comm;
      }
      case "RETAINER":
      default:
        return base;
    }
  }, [selectedClientForPerf, perfForm]);

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

  // Approvals Handlers
  const handleOpenNewApproval = () => {
    if (clients.length === 0) {
      toast.error("يرجى إضافة عميل أولاً قبل إنشاء طلب موافقة");
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
    if (!searchTerm.trim()) return clients;
    const q = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.adAccountId && c.adAccountId.toLowerCase().includes(q))
    );
  }, [clients, searchTerm]);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6" dir="rtl">
      {/* 2026 Sleek Integrated Header & Sub-Navigation */}
      <div className="border-b border-border/60 pb-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-sm">
              <Briefcase className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight">إدارة الوكالة</h1>
                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5">
                  Pro Engine 2026
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                متابعة العملاء، احتساب الأرباح ونماذج التسعير، وإدارة الموافقات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9 font-bold">
              <RefreshCw className={`size-3.5 ml-1.5 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Button onClick={handleOpenNewClient} className="h-9 font-bold shadow-md shadow-primary/20">
              <Plus className="size-4 ml-1.5" />
              إضافة عميل
            </Button>
          </div>
        </div>

        {/* Minimal 2026 Integrated Tabs (No floating bar) */}
        <div className="flex items-center gap-1 border-t border-border/40 pt-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange("overview")}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => handleTabChange("clients")}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "clients"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <span>العملاء والأسعار</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === "clients" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {clients.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("invoices")}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "invoices"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Receipt className="size-3.5" />
            <span>الفواتير والأرباح</span>
            {overview.unpaidInvoicesCount > 0 && (
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => handleTabChange("approvals")}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "approvals"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <span>الموافقات</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === "approvals" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {approvals.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("suite")}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "suite"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <span>الأدوات المتكاملة</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">عملاء الوكالة</p>
                  <p className="text-2xl font-black mt-1 text-foreground">{overview.totalClients}</p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{overview.activeClients} عميل نشط</p>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                  <Users className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">أرباح الوكالة المقدرة (الشهر)</p>
                  <p className="text-2xl font-black mt-1 text-emerald-600">
                    {overview.totalAgencyRevenue.toLocaleString()} {currency}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">من كافة نماذج التسعير والخدمات</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <DollarSign className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">استهلاك ميزانيات الإعلانات</p>
                  <p className="text-xl font-black mt-1 text-primary">
                    {overview.totalSpend.toLocaleString()} / {overview.totalBudget.toLocaleString()} {currency}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[11px] text-muted-foreground font-bold">الإنفاق:</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        overview.totalBudget > 0 && (overview.totalSpend / overview.totalBudget) > 1
                          ? "bg-rose-500/10 text-rose-600 border-rose-300"
                          : "bg-blue-500/10 text-blue-600 border-blue-300"
                      }`}
                    >
                      {overview.totalBudget > 0 ? Math.round((overview.totalSpend / overview.totalBudget) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
                  <TrendingUp className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">فواتير معلقة للتحصيل</p>
                  <p className="text-2xl font-black mt-1 text-amber-600">
                    {overview.totalUncollected.toLocaleString()} {currency}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{overview.unpaidInvoicesCount} فواتير غير مسددة</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Receipt className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ad Spend Tracker */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Sliders className="size-4 text-primary" />
                    معدل استهلاك الميزانيات
                  </CardTitle>
                  <CardDescription className="text-xs">
                    متابعة الإنفاق الإعلاني الفعلي مقارنة بالميزانية المرصودة لتفادي تجاوز السقف الشهري
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleTabChange("clients")} className="text-xs font-bold">
                  إدارة العملاء
                  <ExternalLink className="size-3.5 mr-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl bg-muted/10">
                  <Users className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-bold text-muted-foreground">لا يوجد عملاء مضافون بعد</p>
                  <Button size="sm" onClick={handleOpenNewClient} className="mt-2 text-xs font-bold">
                    إضافة عميل
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
                      <div key={c.id} className="p-3 rounded-xl border border-border/50 bg-background/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm">{c.name}</span>
                            <Badge variant="outline" className={`text-[10px] ${PRICING_MODEL_LABELS[c.pricingModel]?.badgeColor}`}>
                              {PRICING_MODEL_LABELS[c.pricingModel]?.label || c.pricingModel}
                            </Badge>
                            {c.isOffPlatform && (
                              <Badge variant="secondary" className="text-[10px]">
                                خارج المنصة
                              </Badge>
                            )}
                          </div>
                          <div className="font-bold">
                            <span className="text-foreground">{spend.toLocaleString()}</span> /{" "}
                            <span className="text-muted-foreground">{budget.toLocaleString()} {currency}</span>
                            <Badge
                              className={`mr-2 text-[10px] font-black ${
                                isOver ? "bg-rose-500 text-white" : "bg-emerald-600 text-white"
                              }`}
                            >
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
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
              <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو الحساب الإعلاني..."
                className="pr-9 h-9 text-xs rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleOpenNewClient} className="h-9 text-xs font-bold">
              <Plus className="size-3.5 ml-1.5" />
              إضافة عميل جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => {
              const budget = Number(client.monthlyBudget) || 0;
              const spend = Number(client.currentSpend) || 0;
              const pacingPct = budget > 0 ? Math.round((spend / budget) * 100) : 0;
              const modelMeta = PRICING_MODEL_LABELS[client.pricingModel] || PRICING_MODEL_LABELS.RETAINER;

              return (
                <Card key={client.id} className="border-border/60 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-black">{client.name}</CardTitle>
                        {client.contactPerson && (
                          <p className="text-xs text-muted-foreground mt-0.5">{client.contactPerson}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {client.isOffPlatform && (
                          <Badge variant="outline" className="text-[10px] bg-muted/40 font-bold">
                            تتبع يدوي
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            client.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 text-[10px] font-bold"
                              : "bg-zinc-500/10 text-zinc-600 text-[10px] font-bold"
                          }
                        >
                          {client.status === "active" ? "نشط" : client.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs flex-1">
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

                      {/* Budget & Spend */}
                      <div className="pt-1.5 border-t border-border/40 space-y-1">
                        <div className="flex justify-between font-bold text-[11px]">
                          <span className="text-muted-foreground">الإنفاق الإعلاني:</span>
                          <span>
                            <strong className="text-primary">{spend.toLocaleString()}</strong> / {budget.toLocaleString()} {currency}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pacingPct > 100 ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(pacingPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on client card */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] font-bold bg-background hover:bg-muted/50"
                        onClick={() => handleOpenPerfModal(client)}
                      >
                        <FileSpreadsheet className="size-3.5 ml-1 text-primary" />
                        تسجيل أداء الشهر
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] font-bold bg-background hover:bg-muted/50"
                        onClick={() => handleOpenExtraModal(client)}
                      >
                        <Plus className="size-3.5 ml-1 text-emerald-600" />
                        بند إضافي / نفقة
                      </Button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1.5">
                        {client.phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 text-xs font-bold"
                            onClick={() => window.open(`https://wa.me/${client.phone?.replace(/[^0-9]/g, "")}`, "_blank")}
                          >
                            <MessageCircle className="size-3.5 ml-1" />
                            واتساب
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => handleOpenEditClient(client)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-rose-500 hover:text-rose-600"
                          onClick={() => handleDeleteClient(client.id, client.name)}
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
        </div>
      )}

      {/* TAB 3: INVOICES & PROFIT ENGINE */}
      {activeTab === "invoices" && (
        <div className="space-y-5">
          {/* Header Bar with Month Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                كشوف حساب وفواتير الوكالة
              </h2>
              <p className="text-xs text-muted-foreground">
                حساب أتعاب الوكالة آلياً بناءً على نموذج التسعير المعتمد، وإضافة النفقات الإضافية، والمشاركة عبر الواتساب
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Label className="text-xs font-bold text-muted-foreground shrink-0">شهر الفاتورة:</Label>
              <Input
                type="month"
                className="h-9 w-40 text-xs font-bold bg-background"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={() => fetchInvoices(selectedMonth)} className="h-9">
                <RefreshCw className={`size-3.5 ${invoicesLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Invoice Summary Cards */}
          {invoicesData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-border/60 bg-card/60">
                <p className="text-xs font-bold text-muted-foreground">إجمالي مستحقات الوكالة</p>
                <p className="text-xl font-black mt-1 text-foreground">
                  {invoicesData.summary.totalInvoiced.toLocaleString()} {currency}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">شامل الأتعاب والبنود الإضافية</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/60 bg-card/60">
                <p className="text-xs font-bold text-muted-foreground">تم تحصيله</p>
                <p className="text-xl font-black mt-1 text-emerald-600">
                  {invoicesData.summary.totalPaid.toLocaleString()} {currency}
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">فواتير مسددة بالكامل</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/60 bg-card/60">
                <p className="text-xs font-bold text-muted-foreground">بانتظار التحصيل</p>
                <p className="text-xl font-black mt-1 text-amber-600">
                  {invoicesData.summary.totalUnpaid.toLocaleString()} {currency}
                </p>
                <p className="text-[11px] text-amber-600 font-bold mt-0.5">مبالغ مستحقة لم تسدد بعد</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/60 bg-card/60">
                <p className="text-xs font-bold text-muted-foreground">عدد العملاء المفوترين</p>
                <p className="text-xl font-black mt-1 text-primary">
                  {invoicesData.summary.totalClientsCount} عميل
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">لشهر {selectedMonth}</p>
              </div>
            </div>
          )}

          {/* Detailed Client Invoice Cards / Table */}
          {invoicesData?.statements && invoicesData.statements.length > 0 ? (
            <div className="space-y-3">
              {invoicesData.statements.map((stmt) => {
                const clientObj = clients.find((c) => c.id === stmt.clientId);
                return (
                  <Card key={stmt.clientId} className="border-border/60 hover:border-primary/40 transition-all">
                    <CardContent className="p-4 space-y-3 text-xs">
                      {/* Top row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                        <div className="flex items-center gap-2">
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

                        <div className="flex items-center gap-2">
                          {/* Paid Status Toggle */}
                          <button
                            onClick={() => handleToggleInvoicePaid(stmt.clientId, stmt.isPaid)}
                            className={`px-3 py-1 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
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

                          {/* WhatsApp Share Button */}
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => handleShareInvoiceWhatsApp(stmt)}
                          >
                            <MessageCircle className="size-3.5 ml-1" />
                            مشاركة الفاتورة عبر واتساب
                          </Button>
                        </div>
                      </div>

                      {/* Performance & Calculations Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Box 1: Actual Performance */}
                        <div className="p-3 bg-muted/20 rounded-xl space-y-1.5 border border-border/30">
                          <p className="font-bold text-[11px] text-muted-foreground uppercase flex items-center justify-between">
                            <span>أرقام الأداء لشهر {selectedMonth}</span>
                            {clientObj && (
                              <button
                                onClick={() => handleOpenPerfModal(clientObj)}
                                className="text-primary hover:underline text-[10px]"
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
                              <span className="text-muted-foreground">عدد الطلبات / القطع:</span>
                              <span>{stmt.performance.orders} طلب / {stmt.performance.units} قطعة</span>
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
                                      className="text-rose-500 hover:text-rose-600 ml-1"
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
            <div className="text-center py-10 border border-dashed rounded-2xl bg-muted/10">
              <Receipt className="size-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-bold text-foreground">لا توجد فواتير مسجلة لشهر {selectedMonth}</p>
              <p className="text-xs text-muted-foreground mt-1">أضف عملاءك لتوليد كشوف الحساب تلقائياً</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: APPROVALS */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black">موافقات المحتوى والتصاميم</h2>
              <p className="text-xs text-muted-foreground">
                شارك رابطاً عاماً مع العميل لمراجعة بوستات وتصاميم الحملة قبل إطلاقها
              </p>
            </div>
            <Button onClick={handleOpenNewApproval} className="h-9 text-xs font-bold">
              <Plus className="size-3.5 ml-1.5" />
              إنشاء طلب موافقة
            </Button>
          </div>

          {approvals.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-2xl bg-muted/10">
              <CheckCircle2 className="size-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-bold text-foreground">لا توجد طلبات موافقة حالياً</p>
              <p className="text-xs text-muted-foreground mt-1">
                أنشئ مسودة تصميم أو إعلان وشارك رابطه مع العميل للاعتماد
              </p>
              <Button size="sm" onClick={handleOpenNewApproval} className="mt-3 text-xs font-bold">
                إنشاء طلب موافقة
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvals.map((item) => {
                const client = clients.find((c) => c.id === item.clientId);
                const isApproved = item.status === "APPROVED" || item.status === "approved";
                const isChanges = item.status === "CHANGES_REQUESTED" || item.status === "changes_requested";
                const token = item.shareToken || item.publicToken;

                return (
                  <Card key={item.id} className="border-border/60 hover:border-primary/40 transition-all flex flex-col justify-between">
                    <CardHeader className="pb-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="secondary" className="text-[10px] font-bold mb-1">
                            {client?.name || item.clientName || "عميل"}
                          </Badge>
                          <CardTitle className="text-sm font-black">{item.title}</CardTitle>
                        </div>
                        <Badge
                          className={`text-[10px] font-bold ${
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
                    <CardContent className="space-y-2.5 text-xs flex-1">
                      {item.mediaUrl && (
                        <div className="rounded-lg overflow-hidden border border-border/40 max-h-36 bg-muted/20">
                          <img
                            src={item.mediaUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      {item.copyText && (
                        <div className="p-2 bg-muted/20 rounded-lg text-xs leading-relaxed font-medium">
                          <p className="font-bold text-[10px] text-muted-foreground mb-0.5 uppercase">نص الإعلان (Copy):</p>
                          <p className="line-clamp-3 whitespace-pre-line">{item.copyText}</p>
                        </div>
                      )}
                      {item.clientFeedback && (
                        <div className="p-2 bg-rose-500/10 border border-rose-200 text-rose-700 rounded-lg text-xs">
                          <p className="font-bold text-[10px] mb-0.5">ملاحظات العميل:</p>
                          <p>{item.clientFeedback}</p>
                        </div>
                      )}
                    </CardContent>
                    <div className="p-3 pt-2 border-t border-border/40 flex items-center justify-between gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-bold flex-1"
                        onClick={() => copyApprovalLink(token)}
                      >
                        <Copy className="size-3 ml-1" />
                        نسخ الرابط
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-primary"
                        onClick={() => window.open(`/agency/client-portal/${token}`, "_blank")}
                        title="معاينة البوابة"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-rose-500 hover:text-rose-600"
                        onClick={() => handleDeleteApproval(item.id)}
                        title="حذف"
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
          <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/20 space-y-0.5">
            <h3 className="font-black text-sm text-primary">الأدوات المتكاملة لوكالة التسويق</h3>
            <p className="text-xs text-muted-foreground">
              تكامل سلس ومباشر بين إدارة العملاء وباقي منظومة MaxP للإعلانات، المحادثات، والمهام.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/advertising/facebook-ads")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                  <Megaphone className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    إعلانات ميتا (Facebook Ads Pro)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    إطلاق الحملات وتتبع النتائج والـ ROAS لحسابات عملائك.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/unified-inbox")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <MessageCircle className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    الإنبوكس الموحد (Unified Inbox)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    إدارة محادثات واتساب وفيسبوك وإنستجرام وتليجرام في شاشة واحدة.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/tasks/kanban")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Kanban className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    لوحة مهام الفريق (Kanban OS)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    توزيع مهام الميديا بايينج والتصميم على أعضاء الفريق ومتابعة التنفيذ.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/tools/monthly-pnl")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
                  <Calculator className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    الأرباح والخسائر (P&L Engine)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    حساب صافي ربح الوكالة ومصاريف التشغيل والرواتب.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/tools/ad-budget-planner")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
                  <BarChart3 className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    مخطط ميزانيات الإعلانات
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    تقدير تكاليف الحملات وتوزيع الميزانية على القنوات المختلفة.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/competitors")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2.5 bg-teal-500/10 text-teal-600 rounded-xl">
                  <Search className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs text-foreground flex items-center gap-1">
                    تحليل المنافسين
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              {editingClient ? "تعديل بيانات العميل ونموذج التسعير" : "إضافة عميل وكالة جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">اسم العميل أو العلامة التجارية *</Label>
                <Input
                  className="mt-1 h-9"
                  placeholder="مثال: براند قمة الأناقة"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">الشخص المسؤول (Contact Person)</Label>
                <Input
                  className="mt-1 h-9"
                  placeholder="أحمد ممدوح"
                  value={clientForm.contactPerson}
                  onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">رقم الهاتف / الواتساب</Label>
                <Input
                  className="mt-1 h-9 font-mono"
                  dir="ltr"
                  placeholder="010xxxxxxxx"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Pricing Model Selector */}
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
              <div>
                <Label className="text-xs font-black text-primary">طريقة احتساب أرباح الوكالة (Pricing Model) *</Label>
                <select
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-xs font-bold text-foreground"
                  value={clientForm.pricingModel}
                  onChange={(e) => setClientForm({ ...clientForm, pricingModel: e.target.value as PricingModel })}
                >
                  <option value="RETAINER">1. اشتراك شهري ثابت (Flat Retainer)</option>
                  <option value="PERCENT_SPEND">2. نسبة مئوية من ميزانية الإعلانات المصروفة (% of Ad Spend)</option>
                  <option value="PERCENT_SALES">3. نسبة مئوية من المبيعات المحققة (% of Revenue)</option>
                  <option value="FIXED_ORDER">4. عمولة ثابتة لكل طلب / أوردر (Fixed per Order)</option>
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
                    className="mt-1 h-9"
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
                    className="mt-1 h-9"
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
                    className="mt-1 h-9"
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
                    className="mt-1 h-9"
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
                    className="mt-1 h-9"
                    type="number"
                    placeholder="15"
                    value={clientForm.feePerItem || ""}
                    onChange={(e) => setClientForm({ ...clientForm, feePerItem: Number(e.target.value) })}
                  />
                </div>
              )}

              {clientForm.pricingModel === "HYBRID" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold">الاشتراك الأساسي الثابت ({currency})</Label>
                      <Input
                        className="mt-1 h-9"
                        type="number"
                        placeholder="5000"
                        value={clientForm.baseRetainer || ""}
                        onChange={(e) => setClientForm({ ...clientForm, baseRetainer: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">نوع عمولة الأداء الإضافية</Label>
                      <select
                        className="w-full mt-1 h-9 px-2 rounded-lg border border-border bg-background text-xs font-bold"
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
                          className="mt-1 h-9"
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
                          className="mt-1 h-9"
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">ميزانية الإعلانات الشهرية ({currency})</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  placeholder="50000"
                  value={clientForm.monthlyBudget || ""}
                  onChange={(e) => setClientForm({ ...clientForm, monthlyBudget: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">معرف الحساب الإعلاني (اختياري)</Label>
                <Input
                  className="mt-1 h-9 font-mono"
                  dir="ltr"
                  placeholder="act_123456789"
                  value={clientForm.adAccountId}
                  onChange={(e) => setClientForm({ ...clientForm, adAccountId: e.target.value })}
                />
              </div>
            </div>

            {/* Off-Platform Checkbox */}
            <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 rounded-xl border border-border/40">
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
                className="mt-1 text-xs"
                placeholder="تفاصيل الاتفاق، بنود استثنائية، أو شروط دفع..."
                rows={2}
                value={clientForm.notes}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={handleSaveClient} className="font-bold h-9 text-xs">
              حفظ العميل
            </Button>
            <Button variant="outline" onClick={() => setClientModalOpen(false)} className="h-9 text-xs">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: LOG MONTHLY PERFORMANCE */}
      <Dialog open={perfModalOpen} onOpenChange={setPerfModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              تسجيل أداء الشهر - {selectedClientForPerf?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">الشهر المستهدف</Label>
              <Input
                type="month"
                className="mt-1 h-9 text-xs font-bold"
                value={perfForm.month}
                onChange={(e) => setPerfForm({ ...perfForm, month: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">الإنفاق الإعلاني الفعلي ({currency})</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  value={perfForm.adSpend || ""}
                  onChange={(e) => setPerfForm({ ...perfForm, adSpend: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">إجمالي المبيعات المحققة ({currency})</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  value={perfForm.salesRevenue || ""}
                  onChange={(e) => setPerfForm({ ...perfForm, salesRevenue: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">عدد الأوردرات / الطلبات</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  value={perfForm.ordersCount || ""}
                  onChange={(e) => setPerfForm({ ...perfForm, ordersCount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">عدد القطع المباعة (Units)</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  value={perfForm.unitsSold || ""}
                  onChange={(e) => setPerfForm({ ...perfForm, unitsSold: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Instant Calculated Fee Preview */}
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800">أتعاب الوكالة المحتسبة آلياً:</span>
                <span className="font-black text-base text-emerald-700">
                  {previewCalculatedFee.toLocaleString()} {currency}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700">
                بناءً على نموذج ({PRICING_MODEL_LABELS[selectedClientForPerf?.pricingModel || "RETAINER"]?.label})
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPaidCheck"
                className="size-4 rounded accent-primary cursor-pointer"
                checked={perfForm.isPaid}
                onChange={(e) => setPerfForm({ ...perfForm, isPaid: e.target.checked })}
              />
              <label htmlFor="isPaidCheck" className="text-xs font-bold cursor-pointer">
                تم تحصيل وسداد الفاتورة لهذا الشهر
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={handleSavePerformance} className="font-bold h-9 text-xs">
              حفظ الأداء وحساب الفاتورة
            </Button>
            <Button variant="outline" onClick={() => setPerfModalOpen(false)} className="h-9 text-xs">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ADD EXTRA SERVICE / EXPENSE */}
      <Dialog open={extraModalOpen} onOpenChange={setExtraModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <Plus className="size-5 text-emerald-600" />
              إضافة بند إضافي / نفقة - {selectedClientForExtra?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">نوع الخدمة الإضافية (نموذج مسبق)</Label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold"
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
                className="mt-1 h-9"
                value={extraForm.title}
                onChange={(e) => setExtraForm({ ...extraForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">المبلغ المستحق ({currency}) *</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  value={extraForm.amount || ""}
                  onChange={(e) => setExtraForm({ ...extraForm, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">الشهر المرتبط به</Label>
                <Input
                  type="month"
                  className="mt-1 h-9 text-xs font-bold"
                  value={extraForm.month}
                  onChange={(e) => setExtraForm({ ...extraForm, month: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">ملاحظات داخلية (اختياري)</Label>
              <Input
                className="mt-1 h-9"
                placeholder="تفاصيل التكلفة، اسم المصمم أو جهة التنفيذ..."
                value={extraForm.notes}
                onChange={(e) => setExtraForm({ ...extraForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={handleSaveExtraService} className="font-bold h-9 text-xs">
              إضافة البند للفاتورة
            </Button>
            <Button variant="outline" onClick={() => setExtraModalOpen(false)} className="h-9 text-xs">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ADD APPROVAL ITEM */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">إنشاء طلب موافقة على محتوى أو تصميم</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">العميل المستهدف *</Label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold"
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
                className="mt-1 h-9"
                placeholder="مثال: ريلز الجمعة البيضاء - إنستجرام"
                value={approvalForm.title}
                onChange={(e) => setApprovalForm({ ...approvalForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">رابط صورة أو فيديو المعاينة (Media URL)</Label>
              <Input
                className="mt-1 h-9"
                dir="ltr"
                placeholder="https://images.unsplash.com/photo-..."
                value={approvalForm.mediaUrl}
                onChange={(e) => setApprovalForm({ ...approvalForm, mediaUrl: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">نص الإعلان أو الكابشن (Ad Copy)</Label>
              <Textarea
                className="mt-1 text-xs"
                placeholder="اكتب النص الإعلاني أو الكابشن المقترح ليراجعه العميل..."
                rows={3}
                value={approvalForm.copyText}
                onChange={(e) => setApprovalForm({ ...approvalForm, copyText: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={handleSaveApproval} className="font-bold h-9 text-xs">
              توليد رابط الموافقة وحفظ
            </Button>
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)} className="h-9 text-xs">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
