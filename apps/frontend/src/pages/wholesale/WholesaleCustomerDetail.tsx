import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Users,
  ArrowRight,
  ShieldCheck,
  Search,
  Building2,
  Save,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Receipt,
  FileText,
  ShoppingBag,
  DollarSign,
  Calendar,
  Printer,
  X,
  CheckCircle2,
  CreditCard,
  TrendingDown,
  ExternalLink,
  Tag,
  Pencil,
  ShieldAlert,
  Clock,
  Ban,
  Check,
  History,
  Eye,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface WholesaleCustomerData {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  creditLimit: number;
  currentBalance: number;
  paymentTermsDays: number;
  priceListId?: string;
  isActive: boolean;
  notes?: string;
}

interface PriceListOption {
  id: string;
  name: string;
}

interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface WholesaleOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  total: number;
  items?: Array<{
    id: string;
    productName?: string;
    name?: string;
    quantity: number;
    price: number;
  }>;
}

interface WholesaleTx {
  id: string;
  type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "DEBIT_NOTE";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdAt: string;
}

interface StatementData {
  customerName: string;
  customerPhone?: string;
  openingBalance: number;
  closingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  netChange: number;
  lines: Array<{
    date: string;
    type: string;
    reference: string;
    amount: number;
    balanceAfter: number;
    notes?: string;
  }>;
}

interface CustomerPriceItem {
  productId: string;
  productName: string;
  sku?: string;
  mainImage?: string;
  variantId?: string | null;
  variantName?: string | null;
  regularPrice: number;
  wholesalePrice: number;
  priceListId?: string;
  priceListName?: string;
  source: string;
  minQuantity?: number;
}

interface ChangeRequestItem {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  field: string;
  oldValue?: string | null;
  newValue: string;
  reason: string;
  requestedBy: string;
  approvedBy?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt?: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  performedBy: string;
  createdAt: string;
}

export default function WholesaleCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  // Mode: View (read-only) by default for existing records; Edit when isEditing or isNew
  const [isEditing, setIsEditing] = useState(isNew);

  const [activeTab, setActiveTab] = useState<
    "info" | "orders" | "transactions" | "statement" | "prices" | "audits"
  >("info");

  const [form, setForm] = useState<WholesaleCustomerData>({
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    creditLimit: 0,
    currentBalance: 0,
    paymentTermsDays: 30,
    isActive: true,
  });

  const [initialForm, setInitialForm] = useState<WholesaleCustomerData | null>(null);

  const [priceLists, setPriceLists] = useState<PriceListOption[]>([]);
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab 2: Orders state
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Tab 3: Transactions state
  const [transactions, setTransactions] = useState<WholesaleTx[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Tab 4: Statement state
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [statementStart, setStatementStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [statementEnd, setStatementEnd] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Tab 5: Prices state
  const [prices, setPrices] = useState<CustomerPriceItem[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceSearch, setPriceSearch] = useState("");

  // Tab 6: Audits & Change Requests state
  const [changeRequests, setChangeRequests] = useState<ChangeRequestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Suspend Customer Modal state
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  // Resume Customer Modal state
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumeReason, setResumeReason] = useState("");
  const [resuming, setResuming] = useState(false);

  // Change Request Modal (e.g. creditLimit)
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [requestField, setRequestField] = useState<"creditLimit">("creditLimit");
  const [requestNewValue, setRequestNewValue] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Load basic customer info
  const loadCustomer = async () => {
    try {
      setLoading(true);
      const [plRes] = await Promise.all([apiClient.get("/wholesale/price-lists")]);
      setPriceLists(plRes?.data?.data || []);
      if (!isNew && id) {
        const res = await apiClient.get(`/wholesale/customers/${id}`);
        const data = res?.data?.data;
        if (data) {
          const loaded: WholesaleCustomerData = {
            id: data.id,
            customerId: data.customerId,
            customerName: data.customer
              ? `${data.customer.firstName} ${data.customer.lastName}`
              : (data.name || data.customerName || ""),
            customerPhone: data.customer?.phone || data.customerPhone || "",
            customerEmail: data.customer?.email || data.customerEmail || "",
            creditLimit: Number(data.creditLimit || 0),
            currentBalance: Number(data.currentBalance || 0),
            paymentTermsDays: data.paymentTermsDays || 30,
            priceListId: data.priceListId || "",
            isActive: data.isActive ?? true,
            notes: data.notes || "",
          };
          setForm(loaded);
          setInitialForm(loaded);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تحميل بيانات التاجر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomer();
  }, [id, isNew]);

  // Load Orders
  const loadOrders = async () => {
    if (isNew || !id) return;
    try {
      setLoadingOrders(true);
      const res = await apiClient.get(`/wholesale/customers/${id}/orders`);
      setOrders(res?.data?.data || []);
    } catch (err) {
      console.error("Failed to load wholesale orders", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load Transactions
  const loadTransactions = async () => {
    if (isNew || !id) return;
    try {
      setLoadingTransactions(true);
      const res = await apiClient.get(`/wholesale/customers/${id}/transactions`);
      setTransactions(res?.data?.data || []);
    } catch (err) {
      console.error("Failed to load wholesale transactions", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Load Statement
  const loadStatement = async () => {
    if (isNew || !id) return;
    try {
      setLoadingStatement(true);
      const res = await apiClient.get(
        `/wholesale/customers/${id}/statement?periodStart=${statementStart}&periodEnd=${statementEnd}`
      );
      setStatement(res?.data?.data || null);
    } catch (err) {
      console.error("Failed to load wholesale statement", err);
    } finally {
      setLoadingStatement(false);
    }
  };

  // Load Prices
  const loadPrices = async () => {
    if (isNew || !id) return;
    try {
      setLoadingPrices(true);
      const res = await apiClient.get(`/wholesale/customers/${id}/prices`);
      const raw = res?.data?.data;
      setPrices(Array.isArray(raw) ? raw : (raw?.items || []));
    } catch (err) {
      console.error("Failed to load wholesale customer prices", err);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Load Change Requests & Audit Logs
  const loadAuditsAndRequests = async () => {
    if (isNew || !id) return;
    try {
      setLoadingAudits(true);
      const [crRes, auditRes] = await Promise.all([
        apiClient.get(`/wholesale/change-requests?entityType=CUSTOMER&entityId=${id}&limit=50`),
        apiClient.get(
          `/wholesale/audit-logs?entityType=CUSTOMER&entityId=${id}${
            auditActionFilter !== "ALL" ? `&action=${auditActionFilter}` : ""
          }&limit=50`
        ),
      ]);
      setChangeRequests(crRes?.data?.data || []);
      setAuditLogs(auditRes?.data?.data || []);
    } catch (err) {
      console.error("Failed to load change requests or audit logs", err);
    } finally {
      setLoadingAudits(false);
    }
  };

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === "orders") void loadOrders();
    if (activeTab === "transactions") void loadTransactions();
    if (activeTab === "statement") void loadStatement();
    if (activeTab === "prices") void loadPrices();
    if (activeTab === "audits") void loadAuditsAndRequests();
  }, [activeTab, id, auditActionFilter]);

  const searchCustomers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await apiClient.get(`/customers?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(res?.data?.data || []);
    } catch {
      /* ignore */
    }
  };

  const selectCustomer = (cust: CustomerSearchResult) => {
    setForm({
      ...form,
      customerId: cust.id,
      customerName: `${cust.firstName} ${cust.lastName}`,
      customerPhone: cust.phone || form.customerPhone,
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleCancelEdit = () => {
    if (initialForm) {
      setForm(initialForm);
    }
    setIsEditing(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerName.trim()) {
      setError("يرجى إدخال اسم التاجر / الاسم التجاري");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload: any = {
        customerId: form.customerId || undefined,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone?.trim() || undefined,
        customerEmail: form.customerEmail?.trim() || undefined,
        paymentTermsDays: Number(form.paymentTermsDays) || 30,
        priceListId: form.priceListId || undefined,
        isActive: form.isActive,
      };
      if (isNew) {
        payload.creditLimit = Number(form.creditLimit) || 0;
        await apiClient.post("/wholesale/customers", payload);
        navigate("/wholesale/customers");
      } else {
        // Sensitive field: creditLimit updates for existing customers require change requests
        await apiClient.put(`/wholesale/customers/${id}`, payload);
        setInitialForm({ ...form });
        setIsEditing(false);
        setSuccessMessage("تم حفظ بيانات التاجر بنجاح");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "فشل حفظ بيانات التاجر");
    } finally {
      setSaving(false);
    }
  };

  // Suspend Customer Action
  const handleSuspendCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = suspendReason.trim();
    if (!cleanReason) {
      setSuspendError("سبب إيقاف التاجر إلزامي");
      return;
    }
    try {
      setSuspending(true);
      setSuspendError(null);
      await apiClient.post(`/wholesale/customers/${id}/suspend`, {
        reason: cleanReason,
      });
      setForm((prev) => ({ ...prev, isActive: false }));
      if (initialForm) setInitialForm((prev) => (prev ? { ...prev, isActive: false } : null));
      setIsSuspendModalOpen(false);
      setSuspendReason("");
      setSuccessMessage("تم إيقاف حساب التاجر بنجاح وتسجيل السبب في سجل التدقيق");
      void loadAuditsAndRequests();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setSuspendError(err?.response?.data?.message || err?.response?.data?.error || "فشل إيقاف التاجر");
    } finally {
      setSuspending(false);
    }
  };

  // Resume Customer Action
  const handleResumeCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setResuming(true);
      await apiClient.post(`/wholesale/customers/${id}/resume`, {
        reason: resumeReason.trim() || undefined,
      });
      setForm((prev) => ({ ...prev, isActive: true }));
      if (initialForm) setInitialForm((prev) => (prev ? { ...prev, isActive: true } : null));
      setIsResumeModalOpen(false);
      setResumeReason("");
      setSuccessMessage("تم إعادة تفعيل حساب التاجر بنجاح");
      void loadAuditsAndRequests();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "فشل إعادة تفعيل التاجر");
    } finally {
      setResuming(false);
    }
  };

  // Submit Sensitive Change Request (e.g. creditLimit)
  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = requestReason.trim();
    if (!cleanReason) {
      setRequestError("سبب طلب التعديل إلزامي");
      return;
    }
    if (!requestNewValue || isNaN(Number(requestNewValue))) {
      setRequestError("يرجى إدخال قيمة صحيحة للحد الائتماني");
      return;
    }
    try {
      setSubmittingRequest(true);
      setRequestError(null);
      await apiClient.post("/wholesale/change-requests", {
        entityType: "CUSTOMER",
        entityId: id,
        field: requestField,
        newValue: requestNewValue,
        reason: cleanReason,
      });
      setIsChangeRequestModalOpen(false);
      setRequestReason("");
      setRequestNewValue("");
      setSuccessMessage("تم تقديم طلب تعديل حد الائتمان بنجاح وهو بانتظار موافقة الإدارة (wholesale.approve)");
      void loadAuditsAndRequests();
      setActiveTab("audits");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setRequestError(err?.response?.data?.message || err?.response?.data?.error || "فشل إرسال طلب التعديل");
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Approve Change Request
  const handleApproveRequest = async (crId: string) => {
    try {
      setActionProcessingId(crId);
      await apiClient.post(`/wholesale/change-requests/${crId}/approve`);
      setSuccessMessage("تمت الموافقة على طلب التغيير وتطبيق القيمة فوراً في سجل التاجر");
      void loadCustomer();
      void loadAuditsAndRequests();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "فشل اعتماد طلب التعديل");
    } finally {
      setActionProcessingId(null);
    }
  };

  // Open Reject Modal
  const openRejectModal = (crId: string) => {
    setRejectTargetId(crId);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  // Confirm Reject Change Request
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetId) return;
    try {
      setActionProcessingId(rejectTargetId);
      await apiClient.post(`/wholesale/change-requests/${rejectTargetId}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      setIsRejectModalOpen(false);
      setRejectTargetId(null);
      setRejectReason("");
      setSuccessMessage("تم رفض طلب التعديل وتسجيل القرار في سجل التدقيق");
      void loadAuditsAndRequests();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "فشل رفض طلب التعديل");
    } finally {
      setActionProcessingId(null);
    }
  };

  // Submit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      setPaymentError("يرجى إدخال مبلغ صحيح أكبر من صفر");
      return;
    }

    try {
      setRecordingPayment(true);
      setPaymentError(null);
      const methodLabels: Record<string, string> = {
        CASH: "نقدي",
        BANK_TRANSFER: "تحويل بنكي",
        CHEQUE: "شيك بنكي",
        WALLET: "محفظة إلكترونية",
        OTHER: "أخرى",
      };
      const label = methodLabels[paymentMethod] || paymentMethod;

      await apiClient.post("/wholesale/transactions", {
        wholesaleCustomerId: id,
        type: "PAYMENT",
        amount: amountNum,
        referenceType: "PAYMENT",
        referenceId: paymentMethod,
        notes: paymentNotes ? `${paymentNotes} (${label})` : label,
      });

      // Update current balance locally
      setForm((prev) => ({
        ...prev,
        currentBalance: Math.max(0, prev.currentBalance - amountNum),
      }));

      // Reload related views
      void loadTransactions();
      void loadStatement();
      void loadAuditsAndRequests();

      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentNotes("");
      setSuccessMessage("تم تسجيل الدفعة وتحديث رصيد الموزع بنجاح");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setPaymentError(err?.response?.data?.message || err?.response?.data?.error || "فشل تسجيل الدفعة");
    } finally {
      setRecordingPayment(false);
    }
  };

  const filteredPrices = prices.filter((p) => {
    if (!priceSearch) return true;
    const term = priceSearch.toLowerCase();
    return (
      p.productName?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.variantName?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل ملف التاجر...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/wholesale/customers")}
              className="size-8 rounded-lg border-border/70 active:scale-[0.98]"
              title="العودة للتجار"
            >
              <ArrowRight className="size-4 rtl:rotate-0 rotate-180" />
            </Button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Users className="size-4" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {isNew ? "تسجيل تاجر جملة جديد" : `ملف التاجر: ${form.customerName || "—"}`}
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
                {isNew ? "حساب جديد" : `ID: ${id?.slice(0, 8)}`}
              </Badge>
              {/* Active / Suspended Ribbon */}
              {!isNew && (
                <Badge
                  variant="outline"
                  className={`text-[11px] font-mono ${
                    form.isActive
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-red-500/10 text-red-600 border-red-500/30 font-bold"
                  }`}
                >
                  {form.isActive ? "مفعل ونشط" : "موقوف مؤقتاً"}
                </Badge>
              )}
              {/* Mode indicator badge */}
              {!isNew && (
                <Badge
                  variant="secondary"
                  className={`text-[10px] font-mono ${
                    isEditing ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isEditing ? "وضع التعديل" : "وضع العرض (قراءة فقط)"}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة الحدود الائتمانية، الطلبيات، الفواتير، كشف الحساب والأسعار المخصصة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs flex-wrap">
          {!isNew && (
            <>
              {/* View/Edit Toggle */}
              {!isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-3 text-xs font-mono gap-1.5 border-primary/40 text-primary hover:bg-primary/5 active:scale-[0.98]"
                >
                  <Pencil className="size-3.5" />
                  <span>تعديل البيانات</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8 px-3 text-xs font-mono gap-1.5 border-border/70 text-muted-foreground active:scale-[0.98]"
                >
                  <X className="size-3.5" />
                  <span>إلغاء التعديل</span>
                </Button>
              )}

              {/* Suspend / Resume Button */}
              {form.isActive ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSuspendModalOpen(true)}
                  className="h-8 px-2.5 text-xs font-mono gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-500/30 active:scale-[0.98]"
                  title="إيقاف حساب التاجر مع سبب إلزامي"
                >
                  <Ban className="size-3.5" />
                  <span>إيقاف التاجر</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResumeModalOpen(true)}
                  className="h-8 px-2.5 text-xs font-mono gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30 active:scale-[0.98]"
                  title="إعادة تفعيل حساب التاجر"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>إعادة التفعيل</span>
                </Button>
              )}

              {/* Top Action: New Wholesale Order */}
              {form.isActive && (
                <Link
                  to={`/orders/manual?wholesaleCustomerId=${id}${
                    form.customerPhone ? `&phone=${encodeURIComponent(form.customerPhone)}` : ""
                  }`}
                >
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs font-mono gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <PlusCircle className="size-3.5" />
                    <span>أوردر جديد للموزع</span>
                  </Button>
                </Link>
              )}

              {/* Record Payment Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="h-8 px-3 text-xs font-mono gap-1.5 border-border/70 active:scale-[0.98]"
              >
                <DollarSign className="size-3.5 text-emerald-600" />
                <span>تسجيل دفعة</span>
              </Button>
            </>
          )}

          {(isEditing || isNew) && (
            <Button
              type="submit"
              form="wholesale-customer-form"
              disabled={saving}
              size="sm"
              className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]"
            >
              <Save className="size-3.5" />
              <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Prominent Alert Banner when Account is Suspended */}
      {!form.isActive && !isNew && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 flex items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 shrink-0 text-red-600" />
            <div>
              <span className="font-bold">تنبيه: حساب هذا التاجر موقوف حالياً (Suspended).</span>
              <p className="text-[11px] opacity-90 mt-0.5">
                لا يمكن لهذا الموزع إصدار طلبيات جديدة أو استخدام رصيده الائتماني. لإعادة الفتح اضغط "إعادة التفعيل".
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsResumeModalOpen(true)}
            className="shrink-0 h-7 text-xs border-red-500/40 bg-card hover:bg-red-50 text-red-700"
          >
            إعادة تفعيل الحساب
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-mono">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 flex items-center gap-2 font-mono">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs Bar (Only shown for existing customer) */}
      {!isNew && (
        <div className="flex items-center gap-1 border-b border-border/60 pb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "info"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="size-3.5" />
            <span>البيانات والائتمان</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "orders"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="size-3.5" />
            <span>الطلبات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "transactions"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Receipt className="size-3.5" />
            <span>الفواتير والحركات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("statement")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "statement"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-3.5" />
            <span>كشف الحساب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("prices")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "prices"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="size-3.5" />
            <span>أسعاره</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audits")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "audits"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            <span>الموافقات وسجل التدقيق</span>
            {changeRequests.filter((cr) => cr.status === "PENDING").length > 0 && (
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                {changeRequests.filter((cr) => cr.status === "PENDING").length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Tab 1: Info & Credit Limit Form */}
      {(activeTab === "info" || isNew) && (
        <form id="wholesale-customer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground font-mono">البيانات الأساسية للتاجر</h2>
              </div>
              {!isNew && (
                <div className="text-[11px] font-mono text-muted-foreground">
                  {isEditing ? (
                    <span className="text-amber-600 font-medium">وضع التعديل مفعل — احفظ لتثبيت التغييرات</span>
                  ) : (
                    <span>وضع العرض — اضغط "تعديل البيانات" للتعديل</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {isNew && (
                <div className="md:col-span-2 space-y-1 relative">
                  <label className="text-[11px] font-mono font-medium text-foreground">
                    ربط بحساب عميل مسجل مسبقاً (اختياري)
                  </label>
                  <div className="relative">
                    <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => void searchCustomers(e.target.value)}
                      placeholder="ابحث باسم العميل أو رقم الهاتف للربط..."
                      className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border/70 bg-card shadow-lg overflow-hidden divide-y divide-border/60">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => selectCustomer(r)}
                          className="block w-full px-3 py-2 text-right text-xs text-foreground hover:bg-muted/40 transition-colors"
                        >
                          <span className="font-semibold">{r.firstName} {r.lastName}</span>
                          {r.phone && <span className="text-muted-foreground mr-2 font-mono">({r.phone})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground">الاسم التجاري / اسم التاجر *</label>
                <Input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="h-8 text-xs font-mono bg-background border-border/70"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground">رقم الهاتف</label>
                <Input
                  type="text"
                  value={form.customerPhone || ""}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="h-8 text-xs font-mono bg-background border-border/70"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground">البريد الإلكتروني</label>
                <Input
                  type="email"
                  value={form.customerEmail || ""}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  className="h-8 text-xs font-mono bg-background border-border/70"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground">قائمة الأسعار المخصصة</label>
                <select
                  value={form.priceListId || ""}
                  onChange={(e) => setForm({ ...form, priceListId: e.target.value || undefined })}
                  disabled={!isEditing}
                  className="w-full h-8 px-2 border border-border/70 rounded-md bg-background text-foreground text-xs font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  <option value="">بدون قائمة خاصة (الأسعار العامة)</option>
                  {priceLists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Credit & Terms Box */}
          <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground font-mono">الشروط الائتمانية وفترة السداد</h2>
              </div>
              {!isNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRequestField("creditLimit");
                    setRequestNewValue(String(form.creditLimit || ""));
                    setRequestReason("");
                    setRequestError(null);
                    setIsChangeRequestModalOpen(true);
                  }}
                  className="h-7 text-[11px] font-mono gap-1 text-primary border-primary/30 hover:bg-primary/5"
                >
                  <Clock className="size-3" />
                  <span>طلب تعديل حد الائتمان (موافقة)</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground flex items-center justify-between">
                  <span>الحد الائتماني الأقصى (ج.م)</span>
                  {!isNew && !isEditing && (
                    <span className="text-[10px] text-muted-foreground font-normal">يتطلب موافقة للتعديل</span>
                  )}
                </label>
                <Input
                  type="number"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs font-mono tabular-nums bg-background border-border/70"
                  step="0.01"
                  readOnly={!isNew || !isEditing}
                  disabled={!isNew || !isEditing}
                />
                {!isNew && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    * تعديل الحد الائتماني لتاجر قائم يتطلب تقديم طلب موافقة عبر الزر أعلاه
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground">فترة السداد المسموحة (يوم)</label>
                <Input
                  type="number"
                  value={form.paymentTermsDays}
                  onChange={(e) => setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 0 })}
                  className="h-8 text-xs font-mono tabular-nums bg-background border-border/70"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>

              {!isNew && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-medium text-foreground">الرصيد المستحق الحالي</label>
                  <div className="h-8 px-3 flex items-center bg-muted/40 border border-border/60 rounded-md text-foreground font-mono font-bold text-xs tabular-nums">
                    {Number(form.currentBalance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ج.م
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1.5 flex items-center justify-between flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-mono cursor-pointer">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  disabled={!isEditing}
                  onChange={(e) => {
                    if (!e.target.checked && !isNew) {
                      // Trigger suspend modal instead of plain unchecking without reason!
                      setIsSuspendModalOpen(true);
                    } else {
                      setForm({ ...form, isActive: e.target.checked });
                    }
                  }}
                  className="rounded border-input text-primary focus:ring-primary size-4 disabled:opacity-60"
                />
                <span className="font-medium text-foreground">
                  حساب التاجر مفعل ومتاح لإصدار طلبيات وتوريدات الجملة
                </span>
              </label>

              {!isNew && !form.isActive && (
                <span className="text-[11px] text-red-600 font-mono font-semibold">
                  (موقوف — يتطلب سبب إلزامي وسجل تدقيق)
                </span>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Orders Tab */}
      {activeTab === "orders" && !isNew && (
        <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">طلبيات وتوريدات الموزع</h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {orders.length} طلب
              </Badge>
            </div>
            {form.isActive && (
              <Link
                to={`/orders/manual?wholesaleCustomerId=${id}${
                  form.customerPhone ? `&phone=${encodeURIComponent(form.customerPhone)}` : ""
                }`}
              >
                <Button size="sm" variant="outline" className="h-7 text-xs font-mono gap-1">
                  <PlusCircle className="size-3.5 text-emerald-600" />
                  <span>أوردر جديد للموزع</span>
                </Button>
              </Link>
            )}
          </div>

          {loadingOrders ? (
            <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
              <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
              <span>جاري تحميل الطلبيات...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <ShoppingBag className="size-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs text-muted-foreground font-mono">لا توجد طلبيات مسجلة لهذا الموزع بعد.</p>
              {form.isActive && (
                <Link
                  to={`/orders/manual?wholesaleCustomerId=${id}${
                    form.customerPhone ? `&phone=${encodeURIComponent(form.customerPhone)}` : ""
                  }`}
                >
                  <Button size="sm" className="h-8 font-mono text-xs gap-1.5">
                    <PlusCircle className="size-3.5" />
                    <span>إنشاء أول أوردر جملة</span>
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5">رقم الطلب</th>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">عدد المنتجات</th>
                    <th className="p-2.5">الحالة</th>
                    <th className="p-2.5 text-left">إجمالي القيمة</th>
                    <th className="p-2.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20">
                      <td className="p-2.5 font-bold text-foreground">#{order.orderNumber}</td>
                      <td className="p-2.5 text-muted-foreground">{order.createdAt?.slice(0, 10)}</td>
                      <td className="p-2.5 text-muted-foreground">{order.items?.length || 1} منتج</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-left font-bold text-foreground">
                        {Number(order.total).toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 text-center">
                        <Link to={`/orders?search=${encodeURIComponent(order.orderNumber)}`}>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1">
                            <ExternalLink className="size-3" />
                            <span>عرض</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Transactions Tab */}
      {activeTab === "transactions" && !isNew && (
        <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">حركات الحساب والفواتير</h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {transactions.length} حركة
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPaymentModalOpen(true)}
              className="h-7 text-xs font-mono gap-1 text-emerald-600 border-emerald-500/30"
            >
              <DollarSign className="size-3.5" />
              <span>تسجيل دفعة</span>
            </Button>
          </div>

          {loadingTransactions ? (
            <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
              <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
              <span>جاري تحميل الحركات المالية...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Receipt className="size-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs text-muted-foreground font-mono">لا توجد حركات مالية مسجلة بعد.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5">التاريخ والوقت</th>
                    <th className="p-2.5">نوع الحركة</th>
                    <th className="p-2.5">المرجع / الملاحظات</th>
                    <th className="p-2.5 text-left">المبلغ</th>
                    <th className="p-2.5 text-left">الرصيد بعد الحركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="p-2.5 text-muted-foreground">{new Date(tx.createdAt).toLocaleString("ar-EG")}</td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            tx.type === "INVOICE"
                              ? "bg-red-500/10 text-red-600 border-red-500/30"
                              : tx.type === "PAYMENT"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          }`}
                        >
                          {tx.type === "INVOICE" ? "فاتورة طلب" : tx.type === "PAYMENT" ? "سداد دفعة" : tx.type}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-foreground">{tx.notes || tx.referenceId || "—"}</td>
                      <td
                        className={`p-2.5 text-left font-bold ${
                          tx.type === "INVOICE" ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {tx.type === "INVOICE" ? "+" : "-"} {Number(tx.amount).toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 text-left font-bold text-foreground">
                        {Number(tx.balanceAfter).toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Statement Tab */}
      {activeTab === "statement" && !isNew && (
        <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">كشف حساب تفصيلي للتاجر</h2>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground">من:</span>
                <input
                  type="date"
                  value={statementStart}
                  onChange={(e) => setStatementStart(e.target.value)}
                  className="h-7 px-2 border border-border/70 rounded text-[11px] bg-background text-foreground"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground">إلى:</span>
                <input
                  type="date"
                  value={statementEnd}
                  onChange={(e) => setStatementEnd(e.target.value)}
                  className="h-7 px-2 border border-border/70 rounded text-[11px] bg-background text-foreground"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadStatement()} className="h-7 px-2.5 text-xs">
                تحديث الكشف
              </Button>
            </div>
          </div>

          {loadingStatement ? (
            <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
              <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
              <span>جاري استخراج كشف الحساب...</span>
            </div>
          ) : !statement ? (
            <p className="text-xs font-mono text-muted-foreground text-center py-8">
              لا توجد بيانات كشف حساب للفترة المحددة.
            </p>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 bg-muted/30 border border-border/60 rounded-lg">
                  <span className="text-[10px] text-muted-foreground block">رصيد أول المدة</span>
                  <strong className="text-sm text-foreground">
                    {Number(statement.openingBalance).toLocaleString()} ج.م
                  </strong>
                </div>
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <span className="text-[10px] text-red-600 block">إجمالي المسحوبات (فواتير)</span>
                  <strong className="text-sm text-red-600">
                    {Number(statement.totalInvoiced).toLocaleString()} ج.م
                  </strong>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <span className="text-[10px] text-emerald-600 block">إجمالي السدادات (دفعات)</span>
                  <strong className="text-sm text-emerald-600">
                    {Number(statement.totalPaid).toLocaleString()} ج.م
                  </strong>
                </div>
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <span className="text-[10px] text-primary block">الرصيد الختامي الحالي</span>
                  <strong className="text-sm text-primary">
                    {Number(statement.closingBalance).toLocaleString()} ج.م
                  </strong>
                </div>
              </div>

              {statement.lines && statement.lines.length > 0 && (
                <div className="overflow-x-auto border border-border/60 rounded-lg">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="p-2.5">التاريخ</th>
                        <th className="p-2.5">النوع</th>
                        <th className="p-2.5">البيان</th>
                        <th className="p-2.5 text-left">المبلغ</th>
                        <th className="p-2.5 text-left">الرصيد بعد الحركة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {statement.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-2.5 text-muted-foreground">{line.date?.slice(0, 10)}</td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px]">
                              {line.type}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-foreground">{line.notes || line.reference || "—"}</td>
                          <td className="p-2.5 text-left font-bold text-foreground">
                            {Number(line.amount).toLocaleString()} ج.م
                          </td>
                          <td className="p-2.5 text-left font-bold text-primary">
                            {Number(line.balanceAfter).toLocaleString()} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Prices Tab */}
      {activeTab === "prices" && !isNew && (
        <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">الأسعار المخصصة المعتمدة للتاجر</h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {prices.length} صنف
              </Badge>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="ابحث بالاسم أو كود SKU..."
                value={priceSearch}
                onChange={(e) => setPriceSearch(e.target.value)}
                className="h-7 pr-8 text-xs font-mono"
              />
            </div>
          </div>

          {loadingPrices ? (
            <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
              <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
              <span>جاري تحميل قائمة أسعار التاجر...</span>
            </div>
          ) : filteredPrices.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Tag className="size-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs text-muted-foreground font-mono">لا توجد أسعار خاصة محددة لهذا التاجر.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5">الصنف / المنتج</th>
                    <th className="p-2.5">كود SKU</th>
                    <th className="p-2.5 text-left">السعر العادي</th>
                    <th className="p-2.5 text-left">سعر الجملة للتاجر</th>
                    <th className="p-2.5 text-center">نسبة الخصم</th>
                    <th className="p-2.5">القائمة المرجعية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPrices.map((item, idx) => {
                    const discount =
                      item.regularPrice > item.wholesalePrice
                        ? Math.round(((item.regularPrice - item.wholesalePrice) / item.regularPrice) * 100)
                        : 0;
                    return (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2.5 font-bold text-foreground">{item.productName}</td>
                        <td className="p-2.5 text-muted-foreground">{item.sku || "—"}</td>
                        <td className="p-2.5 text-left text-muted-foreground line-through">
                          {Number(item.regularPrice).toLocaleString()} ج.م
                        </td>
                        <td className="p-2.5 text-left font-bold text-emerald-600">
                          {Number(item.wholesalePrice).toLocaleString()} ج.م
                        </td>
                        <td className="p-2.5 text-center">
                          {discount > 0 ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                              -{discount}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-muted-foreground text-[11px]">
                          {item.priceListName || "القائمة الافتراضية"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Audits & Change Requests Tab */}
      {activeTab === "audits" && !isNew && (
        <div className="space-y-4">
          {/* Section 1: Change Requests & Approvals */}
          <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground font-mono">طلبات التعديل الحساسة ونظام الموافقات</h2>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {changeRequests.length} طلب
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRequestField("creditLimit");
                  setRequestNewValue(String(form.creditLimit || ""));
                  setRequestReason("");
                  setRequestError(null);
                  setIsChangeRequestModalOpen(true);
                }}
                className="h-7 text-xs font-mono gap-1 text-primary border-primary/30"
              >
                <PlusCircle className="size-3.5" />
                <span>طلب تعديل حد الائتمان</span>
              </Button>
            </div>

            {loadingAudits ? (
              <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
                <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
                <span>جاري تحميل طلبات التعديل...</span>
              </div>
            ) : changeRequests.length === 0 ? (
              <div className="text-center py-6 space-y-1.5 font-mono text-xs text-muted-foreground">
                <Clock className="size-6 mx-auto opacity-40 text-muted-foreground" />
                <p>لا توجد طلبات تغيير حساسة معلقة أو سابقة لهذا التاجر.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-right">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="p-2.5">تاريخ الطلب</th>
                      <th className="p-2.5">الحقل المطلوب</th>
                      <th className="p-2.5">القيمة السابقة</th>
                      <th className="p-2.5">القيمة المطلوبة</th>
                      <th className="p-2.5">السبب الإلزامي</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5 text-center">إجراءات الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {changeRequests.map((cr) => (
                      <tr key={cr.id} className="hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground">
                          {new Date(cr.createdAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="p-2.5 font-bold text-foreground">
                          {cr.field === "creditLimit"
                            ? "حد الائتمان"
                            : cr.field === "isActive"
                            ? "حالة الحساب"
                            : cr.field}
                        </td>
                        <td className="p-2.5 text-muted-foreground">{cr.oldValue || "—"}</td>
                        <td className="p-2.5 font-bold text-primary">{cr.newValue}</td>
                        <td className="p-2.5 text-foreground max-w-xs break-words">{cr.reason}</td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              cr.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : cr.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-red-500/10 text-red-600 border-red-500/30"
                            }`}
                          >
                            {cr.status === "PENDING" ? "معلق" : cr.status === "APPROVED" ? "معتمد" : "مرفوض"}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          {cr.status === "PENDING" ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                disabled={actionProcessingId === cr.id}
                                onClick={() => handleApproveRequest(cr.id)}
                                className="h-6 px-2.5 text-[11px] font-mono bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                title="موافقة وتطبيق القيمة فوراً داخل معاملة مؤمنة"
                              >
                                <Check className="size-3" />
                                <span>موافقة</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionProcessingId === cr.id}
                                onClick={() => openRejectModal(cr.id)}
                                className="h-6 px-2.5 text-[11px] font-mono text-red-600 hover:bg-red-500/10 border-red-500/30 gap-1"
                              >
                                <X className="size-3" />
                                <span>رفض</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Historical Audit Trail */}
          <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground font-mono">سجل التدقيق التاريخي للتاجر</h2>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {auditLogs.length} سجل
                </Badge>
              </div>

              {/* Action Filter */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[11px] text-muted-foreground">نوع العملية:</span>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="h-7 px-2 border border-border/70 rounded text-[11px] bg-background text-foreground"
                >
                  <option value="ALL">جميع العمليات</option>
                  <option value="APPROVE">اعتماد وموافقة (APPROVE)</option>
                  <option value="REJECT">رفض طلب (REJECT)</option>
                  <option value="SUSPEND">إيقاف التاجر (SUSPEND)</option>
                  <option value="ACTIVATE">إعادة تفعيل (ACTIVATE)</option>
                  <option value="UPDATE">تحديث مباشر (UPDATE)</option>
                  <option value="REQUEST_CHANGE">تقديم طلب (REQUEST)</option>
                </select>
              </div>
            </div>

            {loadingAudits ? (
              <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
                <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
                <span>جاري تحميل سجل التدقيق...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-muted-foreground">
                لا توجد سجلات تدقيق مطابقة للفلاتر.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-right">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="p-2.5">التاريخ والوقت</th>
                      <th className="p-2.5">نوع العملية</th>
                      <th className="p-2.5">الحقل</th>
                      <th className="p-2.5">القيمة السابقة</th>
                      <th className="p-2.5">القيمة الجديدة</th>
                      <th className="p-2.5">السبب / الملاحظات</th>
                      <th className="p-2.5">المستخدم المنفذ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              log.action === "APPROVE" || log.action === "ACTIVATE"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : log.action === "SUSPEND" || log.action === "REJECT"
                                ? "bg-red-500/10 text-red-600 border-red-500/30"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            }`}
                          >
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-bold text-foreground">
                          {log.field === "creditLimit"
                            ? "حد الائتمان"
                            : log.field === "isActive"
                            ? "حالة الحساب"
                            : log.field || "—"}
                        </td>
                        <td className="p-2.5 text-muted-foreground">{log.oldValue || "—"}</td>
                        <td className="p-2.5 font-bold text-foreground">{log.newValue || "—"}</td>
                        <td className="p-2.5 text-foreground max-w-xs break-words">{log.reason || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{log.performedBy || "SYSTEM"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suspend Customer Modal */}
      {isSuspendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-red-500/40 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <Ban className="size-4" />
                <h3 className="font-semibold text-foreground text-sm">إيقاف حساب التاجر (Suspend)</h3>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setIsSuspendModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 rounded-lg text-[11px] space-y-1">
              <p className="font-bold">⚠️ تنبيه هام:</p>
              <p>
                إيقاف حساب التاجر سيمنعه من إصدار أي طلبيات جديدة أو استخدام رصيده الائتماني. سبب الإيقاف إلزامي وسيتم
                تسجيله في سجل التدقيق الأمني.
              </p>
            </div>

            {suspendError && (
              <div className="p-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                {suspendError}
              </div>
            )}

            <form onSubmit={handleSuspendCustomer} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">سبب الإيقاف (إلزامي) *</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="اكتب سبب إيقاف الحساب (مثال: تأخر في السداد لمدة 45 يوماً، شيك مرتد...)"
                  className="w-full h-24 p-2.5 border border-border/80 rounded-md bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSuspendModalOpen(false)}
                  className="h-8 text-xs font-mono"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={suspending || !suspendReason.trim()}
                  size="sm"
                  className="h-8 text-xs font-mono bg-red-600 hover:bg-red-700 text-white gap-1"
                >
                  <Ban className="size-3.5" />
                  <span>{suspending ? "جاري الإيقاف..." : "تأكيد إيقاف الحساب"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resume Customer Modal */}
      {isResumeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-emerald-500/40 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-4" />
                <h3 className="font-semibold text-foreground text-sm">إعادة تفعيل حساب التاجر</h3>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setIsResumeModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleResumeCustomer} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">سبب أو ملاحظات إعادة التفعيل</label>
                <textarea
                  value={resumeReason}
                  onChange={(e) => setResumeReason(e.target.value)}
                  placeholder="مثال: تم تسوية الديون المعلقة وتحديث الضمانات..."
                  className="w-full h-20 p-2.5 border border-border/80 rounded-md bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResumeModalOpen(false)}
                  className="h-8 text-xs font-mono"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={resuming}
                  size="sm"
                  className="h-8 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>{resuming ? "جاري التفعيل..." : "تأكيد إعادة التفعيل"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensitive Change Request Modal */}
      {isChangeRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">طلب تعديل حد الائتمان (موافقة)</h3>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setIsChangeRequestModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-3 bg-muted/40 border border-border/60 rounded-lg text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحد الائتماني الحالي:</span>
                <span className="font-bold text-foreground">{Number(form.creditLimit).toLocaleString()} ج.م</span>
              </div>
              <p className="text-muted-foreground text-[10px] mt-1">
                تعديل الحد الائتماني إجراء حساس يتم إرساله كطلب معلق ولا يتم تطبيقه إلا بعد موافقة الإدارة
                (wholesale.approve).
              </p>
            </div>

            {requestError && (
              <div className="p-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                {requestError}
              </div>
            )}

            <form onSubmit={handleSubmitChangeRequest} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">الحد الائتماني المقترح الجديد (ج.م) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={requestNewValue}
                  onChange={(e) => setRequestNewValue(e.target.value)}
                  placeholder="مثال: 75000"
                  className="h-8 font-mono text-xs tabular-nums"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">سبب طلب التعديل (إلزامي) *</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="اكتب سبب طلب زيادة أو خفض الحد الائتماني..."
                  className="w-full h-20 p-2.5 border border-border/80 rounded-md bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangeRequestModalOpen(false)}
                  className="h-8 text-xs font-mono"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submittingRequest || !requestReason.trim()}
                  size="sm"
                  className="h-8 text-xs font-mono bg-primary text-primary-foreground gap-1"
                >
                  <Save className="size-3.5" />
                  <span>{submittingRequest ? "جاري الإرسال..." : "إرسال الطلب للاعتماد"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <Ban className="size-4" />
                <h3 className="font-semibold text-foreground text-sm">رفض طلب التعديل</h3>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setIsRejectModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">سبب الرفض (اختياري)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="اكتب سبب رفض الطلب..."
                  className="w-full h-20 p-2.5 border border-border/80 rounded-md bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="h-8 text-xs font-mono"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={actionProcessingId !== null}
                  size="sm"
                  className="h-8 text-xs font-mono bg-red-600 hover:bg-red-700 text-white gap-1"
                >
                  <X className="size-3.5" />
                  <span>تأكيد الرفض</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-600" />
                <h3 className="font-semibold text-foreground text-sm">تسجيل دفعة سداد جديدة</h3>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setIsPaymentModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            {paymentError && (
              <div className="p-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">المبلغ المسدد (ج.م) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="h-8 font-mono tabular-nums text-xs"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">طريقة السداد</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-8 px-2 border border-border/70 rounded-md bg-background text-foreground text-xs font-mono"
                >
                  <option value="CASH">نقدي (كاش في الخزينة)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="CHEQUE">شيك بنكي</option>
                  <option value="WALLET">محفظة إلكترونية (فودافون كاش / إنستاباي)</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">رقم الإيصال / ملاحظات السداد</label>
                <Input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="رقم التحويل البنكي أو رقم الإيصال..."
                  className="h-8 font-mono text-xs"
                />
              </div>

              <div className="p-2.5 bg-muted/30 border border-border/50 rounded-lg flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">الرصيد الحالي قبل السداد:</span>
                <span className="font-bold text-foreground tabular-nums">
                  {Number(form.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="h-8 text-xs font-mono"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={recordingPayment}
                  size="sm"
                  className="h-8 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>{recordingPayment ? "جاري التسجيل..." : "تأكيد واستلام الدفعة"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
