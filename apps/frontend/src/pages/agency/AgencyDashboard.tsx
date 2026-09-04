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
  Filter,
  Trash2,
  Edit2,
  BarChart3,
  Send,
  Eye,
  Check,
  RefreshCw,
  Sliders
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

interface AgencyClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  monthlyRetainer: number;
  monthlyAdBudget: number;
  currentAdSpend: number;
  adAccountId?: string;
  status: "active" | "lead" | "paused" | "completed";
  notes?: string;
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
  status: "pending" | "approved" | "changes_requested";
  feedback?: string;
  scheduledDate?: string;
  publicToken: string;
  createdAt: string;
}

interface AgencyOverview {
  totalClients: number;
  activeRetainersSum: number;
  totalMonthlyAdBudget: number;
  totalCurrentAdSpend: number;
  adSpendPacingPct: number;
  pendingApprovalsCount: number;
  currency: string;
}

export default function AgencyDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "overview";

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AgencyOverview>({
    totalClients: 0,
    activeRetainersSum: 0,
    totalMonthlyAdBudget: 0,
    totalCurrentAdSpend: 0,
    adSpendPacingPct: 0,
    pendingApprovalsCount: 0,
    currency: "EGP"
  });

  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [approvals, setApprovals] = useState<AgencyApproval[]>([]);
  const [currency, setCurrency] = useState("EGP");

  // Client modal state
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<AgencyClient | null>(null);
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    monthlyRetainer: 0,
    monthlyAdBudget: 0,
    currentAdSpend: 0,
    adAccountId: "",
    status: "active" as const,
    notes: ""
  });

  // Approval modal state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    clientId: "",
    title: "",
    description: "",
    mediaUrl: "",
    copyText: "",
    channel: "facebook",
    scheduledDate: ""
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
        setOverview(ovRes.data.data);
        if (ovRes.data.data.currency) setCurrency(ovRes.data.data.currency);
      }
      if (clRes.data?.success) setClients(clRes.data.data);
      if (apRes.data?.success) setApprovals(apRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "تعذر تحميل بيانات الوكالة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  // Client Handlers
  const handleOpenNewClient = () => {
    setEditingClient(null);
    setClientForm({
      name: "",
      email: "",
      phone: "",
      monthlyRetainer: 0,
      monthlyAdBudget: 0,
      currentAdSpend: 0,
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
      email: c.email || "",
      phone: c.phone || "",
      monthlyRetainer: c.monthlyRetainer || 0,
      monthlyAdBudget: c.monthlyAdBudget || 0,
      currentAdSpend: c.currentAdSpend || 0,
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
        }
      } else {
        const res = await apiClient.post("/agency/clients", clientForm);
        if (res.data?.success) {
          toast.success("تم إضافة العميل بنجاح");
          setClientModalOpen(false);
          fetchData();
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
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في حذف العميل");
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
      description: "",
      mediaUrl: "",
      copyText: "",
      channel: "facebook",
      scheduledDate: ""
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

  const copyApprovalLink = (publicToken: string) => {
    const fullUrl = `${window.location.origin}/agency/client-portal/${publicToken}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("تم نسخ رابط بوابة العميل للموافقة!");
  };

  const openWhatsApp = (phone?: string, clientName?: string) => {
    if (!phone) {
      toast.error("لا يوجد رقم هاتف مسجل لهذا العميل");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formatted = cleanPhone.startsWith("0") ? `2${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`مرحباً ${clientName || ""}، نتواصل معك من فريق وكالة التسويق.`);
    window.open(`https://wa.me/${formatted}?text=${msg}`, "_blank");
  };

  // Filtered lists
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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Briefcase className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">وكالة التسويق (Agency OS)</h1>
              <p className="text-sm text-muted-foreground font-medium">
                إدارة شاملة لعملاء الوكالة، متابعة استهلاك ميزانيات الإعلانات، وبوابة موافقات العملاء للمحتوى والتصاميم.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`size-4 ml-1.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <Button onClick={handleOpenNewClient} className="font-bold shadow-md shadow-primary/20">
            <Plus className="size-4 ml-1.5" />
            إضافة عميل جديد
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="overview" className="font-bold text-xs md:text-sm">نظرة عامة</TabsTrigger>
          <TabsTrigger value="clients" className="font-bold text-xs md:text-sm">العملاء والميزانيات ({clients.length})</TabsTrigger>
          <TabsTrigger value="approvals" className="font-bold text-xs md:text-sm">موافقات المحتوى ({approvals.length})</TabsTrigger>
          <TabsTrigger value="suite" className="font-bold text-xs md:text-sm">المنظومة المترابطة</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">إجمالي عملاء الوكالة</p>
                  <p className="text-2xl font-black mt-1 text-foreground">{overview.totalClients}</p>
                  <p className="text-xs text-muted-foreground mt-1">العملاء المسجلون حالياً</p>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                  <Users className="size-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">الاشتراكات الشهرية (Retainers)</p>
                  <p className="text-2xl font-black mt-1 text-emerald-600">
                    {overview.activeRetainersSum.toLocaleString()} {currency}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">إيراد الوكالة الشهري الثابت</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                  <DollarSign className="size-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">ميزانيات الإعلانات المدارة</p>
                  <p className="text-2xl font-black mt-1 text-primary">
                    {overview.totalCurrentAdSpend.toLocaleString()} / {overview.totalMonthlyAdBudget.toLocaleString()} {currency}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-bold text-muted-foreground">معدل الاستهلاك:</span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-black ${
                        overview.adSpendPacingPct > 100
                          ? "bg-rose-500/10 text-rose-600 border-rose-300"
                          : overview.adSpendPacingPct > 80
                          ? "bg-amber-500/10 text-amber-600 border-amber-300"
                          : "bg-blue-500/10 text-blue-600 border-blue-300"
                      }`}
                    >
                      {overview.adSpendPacingPct}%
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                  <TrendingUp className="size-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">موافقات بانتظار العميل</p>
                  <p className="text-2xl font-black mt-1 text-amber-600">{overview.pendingApprovalsCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">تصاميم ومحتوى معلق للتدقيق</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                  <Clock className="size-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Ad Spend Pacing Tracker */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Sliders className="size-5 text-primary" />
                    مؤشر سرعة استهلاك ميزانيات الإعلانات (Ad Spend Pacing)
                  </CardTitle>
                  <CardDescription>
                    متابعة حية للإنفاق الإعلاني الفعلي لكل عميل مقارنة بالميزانية الشهرية المرصودة لتفادي الاستهلاك الزائد
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleTabChange("clients")}>
                  عرض كل العملاء
                  <ExternalLink className="size-3.5 mr-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-xl bg-muted/10">
                  <Users className="size-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-bold text-muted-foreground">لا يوجد عملاء مضافون حتى الآن</p>
                  <Button size="sm" onClick={handleOpenNewClient} className="mt-3 font-bold">
                    إضافة أول عميل للوكالة
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clients.slice(0, 5).map((c) => {
                    const budget = Number(c.monthlyAdBudget) || 0;
                    const spend = Number(c.currentAdSpend) || 0;
                    const pct = budget > 0 ? Math.round((spend / budget) * 100) : 0;
                    const isOver = pct > 100;
                    const isWarning = pct > 85 && !isOver;

                    return (
                      <div key={c.id} className="p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm">{c.name}</span>
                            {c.adAccountId && (
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {c.adAccountId}
                              </Badge>
                            )}
                          </div>
                          <div className="text-left text-xs font-bold">
                            <span className="text-foreground">{spend.toLocaleString()}</span> /{" "}
                            <span className="text-muted-foreground">{budget.toLocaleString()} {currency}</span>
                            <Badge
                              className={`mr-2 font-black text-[10px] ${
                                isOver
                                  ? "bg-rose-500 text-white"
                                  : isWarning
                                  ? "bg-amber-500 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
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
        </TabsContent>

        {/* TAB 2: CLIENTS & PACING */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو الحساب الإعلاني..."
                className="pr-9 h-10 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleOpenNewClient} className="font-bold shadow-md shadow-primary/20">
              <Plus className="size-4 ml-1.5" />
              إضافة عميل جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => {
              const budget = Number(client.monthlyAdBudget) || 0;
              const spend = Number(client.currentAdSpend) || 0;
              const pacingPct = budget > 0 ? Math.round((spend / budget) * 100) : 0;

              return (
                <Card key={client.id} className="border-border/60 hover:border-primary/40 transition-all shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-black">{client.name}</CardTitle>
                        {client.adAccountId && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            ID: {client.adAccountId}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          client.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                            : "bg-zinc-500/10 text-zinc-600 border-zinc-300"
                        }
                      >
                        {client.status === "active" ? "نشط" : client.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3.5 text-xs">
                    <div className="p-3 bg-muted/20 rounded-xl space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-bold">الاشتراك الشهري (Retainer):</span>
                        <span className="font-black text-emerald-600">{Number(client.monthlyRetainer).toLocaleString()} {currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-bold">ميزانية الإعلانات:</span>
                        <span className="font-black">{budget.toLocaleString()} {currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-bold">المنفق حالياً:</span>
                        <span className="font-black text-primary">{spend.toLocaleString()} {currency}</span>
                      </div>

                      <div className="pt-1.5">
                        <div className="flex justify-between text-[11px] mb-1 font-bold">
                          <span>نسبة الاستهلاك (Pacing):</span>
                          <span className={pacingPct > 100 ? "text-rose-500" : pacingPct > 85 ? "text-amber-500" : "text-emerald-500"}>
                            {pacingPct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pacingPct > 100 ? "bg-rose-500" : pacingPct > 85 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(pacingPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {client.notes && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                        {client.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1.5">
                        {client.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => openWhatsApp(client.phone, client.name)}
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
                          className="size-8"
                          onClick={() => handleOpenEditClient(client)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-rose-500 hover:text-rose-600"
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
        </TabsContent>

        {/* TAB 3: APPROVALS */}
        <TabsContent value="approvals" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">بوابة تدقيق وموافقات المحتوى والتصاميم</h2>
              <p className="text-xs text-muted-foreground">
                شارك رابطاً عاماً مع العميل لمراجعة بوستات السوشيال ميديا والتصاميم قبل النشر والموافقة بضغطة زر
              </p>
            </div>
            <Button onClick={handleOpenNewApproval} className="font-bold shadow-md shadow-primary/20">
              <Plus className="size-4 ml-1.5" />
              إنشاء طلب موافقة جديد
            </Button>
          </div>

          {approvals.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-2xl bg-muted/10">
              <CheckCircle2 className="size-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-base font-bold text-foreground">لا توجد طلبات موافقة حالياً</p>
              <p className="text-xs text-muted-foreground mt-1">
                أنشئ مسودة تصميم أو إعلان وشارك رابطه مع العميل للتدقيق والموافقة
              </p>
              <Button size="sm" onClick={handleOpenNewApproval} className="mt-4 font-bold">
                إنشاء طلب موافقة
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvals.map((item) => {
                const client = clients.find((c) => c.id === item.clientId);
                return (
                  <Card key={item.id} className="border-border/60 hover:border-primary/40 transition-all flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="secondary" className="text-[10px] font-bold mb-1">
                            {client?.name || item.clientName || "عميل"}
                          </Badge>
                          <CardTitle className="text-base font-black">{item.title}</CardTitle>
                        </div>
                        <Badge
                          className={`text-[10px] font-black ${
                            item.status === "approved"
                              ? "bg-emerald-500 text-white"
                              : item.status === "changes_requested"
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {item.status === "approved"
                            ? "تمت الموافقة"
                            : item.status === "changes_requested"
                            ? "مطلوب تعديلات"
                            : "بانتظار العميل"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs flex-1">
                      {item.mediaUrl && (
                        <div className="rounded-lg overflow-hidden border border-border/40 max-h-40 bg-muted/20">
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
                        <div className="p-2.5 bg-muted/20 rounded-lg text-xs leading-relaxed font-medium">
                          <p className="font-bold text-[10px] text-muted-foreground mb-1 uppercase">نص الإعلان (Copy):</p>
                          <p className="line-clamp-3 whitespace-pre-line">{item.copyText}</p>
                        </div>
                      )}
                      {item.feedback && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-200 text-rose-700 rounded-lg text-xs">
                          <p className="font-bold text-[10px] mb-0.5">ملاحظات العميل للتعديل:</p>
                          <p>{item.feedback}</p>
                        </div>
                      )}
                    </CardContent>
                    <div className="p-4 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-bold flex-1"
                        onClick={() => copyApprovalLink(item.publicToken)}
                      >
                        <Copy className="size-3.5 ml-1" />
                        نسخ رابط العميل
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-primary"
                        onClick={() => window.open(`/agency/client-portal/${item.publicToken}`, "_blank")}
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
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: INTERCONNECTED ECOSYSTEM */}
        <TabsContent value="suite" className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-1">
            <h3 className="font-black text-base text-primary">منظومة أدوات الوكالة المتكاملة داخل MaxP</h3>
            <p className="text-xs text-muted-foreground">
              تطبيق وكالة التسويق يتكامل تلقائياً مع كافة أدوات المنصة لتوفير تجربة تشغيل موحدة لإدارة الإعلانات، المحادثات، المهام والمالية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/advertising/facebook-ads")}>
              <CardContent className="p-5 flex items-start gap-3.5">
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                  <Megaphone className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                    إدارة إعلانات ميتا (Facebook Ads Pro)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    إطلاق الحملات، إدارة المجموعات الإعلانية، وتتبع النتائج والـ ROAS لحسابات عملائك مباشرة.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/unified-inbox")}>
              <CardContent className="p-5 flex items-start gap-3.5">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                  <MessageCircle className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                    الإنبوكس الموحد (Unified Inbox)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    إدارة جميع رسائل عملائك من واتساب وفيسبوك وإنستجرام وتليجرام في صندوق وارد واحد متطور.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/tasks/kanban")}>
              <CardContent className="p-5 flex items-start gap-3.5">
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                  <Kanban className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                    لوحة مهام فريق الوكالة (Kanban OS)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    توزيع مهام الميديا بايينج، كتابة المحتوى، والتصاميم وتتبع إنجاز الفريق لكل عميل.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/tools/monthly-pnl")}>
              <CardContent className="p-5 flex items-start gap-3.5">
                <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                  <Calculator className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                    الأرباح والخسائر الشهرية (P&L Engine)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    حساب صافي أرباح الوكالة ومصاريف الفريق والاشتراكات لتقييم العائد لكل عميل.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/tools/ad-budget-planner")}>
              <CardContent className="p-5 flex items-start gap-3.5">
                <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                  <BarChart3 className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                    مخطط ميزانيات الإعلانات (Budget Planner)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    حساب التكاليف المتوقعة والمبيعات المستهدفة وتوزيع الميزانية على المنصات.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/competitors")}>
              <CardContent className="p-5 flex items-start gap-3.5">
                <div className="p-3 bg-teal-500/10 text-teal-600 rounded-2xl">
                  <Search className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                    تحليل المنافسين (Competitor Analysis)
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    مراقبة إعلانات المنافسين وثغرات السوق لتقديم أفكار إبداعية لعملائك.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: ADD / EDIT CLIENT */}
      <Dialog open={clientModalOpen} onOpenChange={setClientModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-black text-xl">
              {editingClient ? "تعديل بيانات عميل الوكالة" : "إضافة عميل وكالة جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold">اسم العميل أو العلامة التجارية *</Label>
              <Input
                className="mt-1"
                placeholder="مثال: شركة النور للتجارة"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">البريد الإلكتروني</Label>
                <Input
                  className="mt-1"
                  type="email"
                  dir="ltr"
                  placeholder="client@brand.com"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">رقم الواتساب / الهاتف</Label>
                <Input
                  className="mt-1"
                  dir="ltr"
                  placeholder="010xxxxxxxx"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">الاشتراك الشهري للوكالة ({currency})</Label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="15000"
                  value={clientForm.monthlyRetainer || ""}
                  onChange={(e) => setClientForm({ ...clientForm, monthlyRetainer: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">ميزانية الإعلانات الشهرية ({currency})</Label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="50000"
                  value={clientForm.monthlyAdBudget || ""}
                  onChange={(e) => setClientForm({ ...clientForm, monthlyAdBudget: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">المنفق فعلياً حتى الآن ({currency})</Label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="12000"
                  value={clientForm.currentAdSpend || ""}
                  onChange={(e) => setClientForm({ ...clientForm, currentAdSpend: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">معرف الحساب الإعلاني (Ad Account ID)</Label>
                <Input
                  className="mt-1 font-mono"
                  dir="ltr"
                  placeholder="act_123456789"
                  value={clientForm.adAccountId}
                  onChange={(e) => setClientForm({ ...clientForm, adAccountId: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">ملاحظات داخلية</Label>
              <Textarea
                className="mt-1"
                placeholder="أهداف الحملة، مؤشرات الأداء، أو تفاصيل خاصة بالعقد..."
                rows={2}
                value={clientForm.notes}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={handleSaveClient} className="font-bold">
              حفظ العميل
            </Button>
            <Button variant="outline" onClick={() => setClientModalOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADD APPROVAL ITEM */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-black text-xl">إنشاء طلب موافقة على محتوى أو تصميم</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold">العميل المستهدف *</Label>
              <select
                className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm font-bold"
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
              <Label className="text-xs font-bold">عنوان المحتوى أو الحملة *</Label>
              <Input
                className="mt-1"
                placeholder="مثال: بوست حملة الجمعة البيضاء - إنستجرام"
                value={approvalForm.title}
                onChange={(e) => setApprovalForm({ ...approvalForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">رابط صورة أو فيديو التصميم (Media URL)</Label>
              <Input
                className="mt-1"
                dir="ltr"
                placeholder="https://example.com/creative-v1.jpg"
                value={approvalForm.mediaUrl}
                onChange={(e) => setApprovalForm({ ...approvalForm, mediaUrl: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">نص الإعلان أو الكابشن (Ad Copy)</Label>
              <Textarea
                className="mt-1"
                placeholder="اكتب النص الإعلاني أو الكابشن المقترح هنا ليراجعه العميل..."
                rows={3}
                value={approvalForm.copyText}
                onChange={(e) => setApprovalForm({ ...approvalForm, copyText: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">المنصة المستهدفة</Label>
                <select
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm font-bold"
                  value={approvalForm.channel}
                  onChange={(e) => setApprovalForm({ ...approvalForm, channel: e.target.value })}
                >
                  <option value="facebook">فيسبوك</option>
                  <option value="instagram">إنستجرام</option>
                  <option value="tiktok">تيك توك</option>
                  <option value="snapchat">سناب شات</option>
                  <option value="google">إعلانات جوجل</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold">تاريخ النشر المقترح</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={approvalForm.scheduledDate}
                  onChange={(e) => setApprovalForm({ ...approvalForm, scheduledDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={handleSaveApproval} className="font-bold">
              توليد رابط الموافقة وحفظ
            </Button>
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
