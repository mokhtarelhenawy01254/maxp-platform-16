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

export default function WholesaleCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [activeTab, setActiveTab] = useState<"info" | "orders" | "transactions" | "statement" | "prices">("info");

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

  const [priceLists, setPriceLists] = useState<PriceListOption[]>([]);
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
          setForm({
            customerId: data.customerId,
            customerName: data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : (data.name || data.customerName || ""),
            customerPhone: data.customer?.phone || data.customerPhone || "",
            customerEmail: data.customer?.email || data.customerEmail || "",
            creditLimit: Number(data.creditLimit || 0),
            currentBalance: Number(data.currentBalance || 0),
            paymentTermsDays: data.paymentTermsDays || 30,
            priceListId: data.priceListId || "",
            isActive: data.isActive,
          });
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

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === "orders") void loadOrders();
    if (activeTab === "transactions") void loadTransactions();
    if (activeTab === "statement") void loadStatement();
    if (activeTab === "prices") void loadPrices();
  }, [activeTab, id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerName.trim()) {
      setError("يرجى إدخال اسم التاجر / الاسم التجاري");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload = {
        customerId: form.customerId || undefined,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone?.trim() || undefined,
        customerEmail: form.customerEmail?.trim() || undefined,
        creditLimit: Number(form.creditLimit) || 0,
        paymentTermsDays: Number(form.paymentTermsDays) || 30,
        priceListId: form.priceListId || undefined,
        isActive: form.isActive,
      };
      if (isNew) {
        await apiClient.post("/wholesale/customers", payload);
      } else {
        await apiClient.put(`/wholesale/customers/${id}`, payload);
      }
      navigate("/wholesale/customers");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "فشل حفظ بيانات التاجر");
    } finally {
      setSaving(false);
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

      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentNotes("");
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
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Users className="size-4" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {isNew ? "تسجيل تاجر جملة جديد" : `ملف التاجر: ${form.customerName || "—"}`}
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
                {isNew ? "حساب جديد" : `ID: ${id?.slice(0, 8)}`}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة الحدود الائتمانية، الطلبيات، الفواتير، كشف الحساب والأسعار المخصصة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs flex-wrap">
          {!isNew && (
            <>
              {/* Top Action: New Wholesale Order */}
              <Link
                to={`/orders/manual?wholesaleCustomerId=${id}${form.customerPhone ? `&phone=${encodeURIComponent(form.customerPhone)}` : ""}`}
              >
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs font-mono gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <PlusCircle className="size-3.5" />
                  <span>أوردر جديد للموزع</span>
                </Button>
              </Link>

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
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-mono">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
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
        </div>
      )}

      {/* Tab 1: Info & Credit Limit Form */}
      {(activeTab === "info" || isNew) && (
        <form id="wholesale-customer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Building2 className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">البيانات الأساسية للتاجر</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {isNew && (
                <div className="md:col-span-2 space-y-1 relative">
                  <label className="text-[11px] font-mono font-medium text-foreground">ربط بحساب عميل مسجل مسبقاً (اختياري)</label>
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
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground">قائمة الأسعار المخصصة</label>
                <select
                  value={form.priceListId || ""}
                  onChange={(e) => setForm({ ...form, priceListId: e.target.value || undefined })}
                  className="w-full h-8 px-2 border border-border/70 rounded-md bg-background text-foreground text-xs font-mono"
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
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <ShieldCheck className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">الشروط الائتمانية وفترة السداد</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground">الحد الائتماني الأقصى (ج.م)</label>
                <Input
                  type="number"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs font-mono tabular-nums bg-background border-border/70"
                  step="0.01"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-medium text-foreground">فترة السداد المسموحة (يوم)</label>
                <Input
                  type="number"
                  value={form.paymentTermsDays}
                  onChange={(e) => setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 0 })}
                  className="h-8 text-xs font-mono tabular-nums bg-background border-border/70"
                />
              </div>

              {!isNew && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-medium text-foreground">الرصيد المستحق الحالي</label>
                  <div className="h-8 px-3 flex items-center bg-muted/40 border border-border/60 rounded-md text-foreground font-mono font-bold text-xs tabular-nums">
                    {Number(form.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1.5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-mono">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary size-4"
                />
                <span className="font-medium text-foreground">حساب التاجر مفعل ومتاح لإصدار طلبيات وتوريدات الجملة</span>
              </label>
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
            <Link
              to={`/orders/manual?wholesaleCustomerId=${id}${form.customerPhone ? `&phone=${encodeURIComponent(form.customerPhone)}` : ""}`}
            >
              <Button size="sm" variant="outline" className="h-7 text-xs font-mono gap-1">
                <PlusCircle className="size-3.5 text-emerald-600" />
                <span>أوردر جديد للموزع</span>
              </Button>
            </Link>
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
              <Link
                to={`/orders/manual?wholesaleCustomerId=${id}${form.customerPhone ? `&phone=${encodeURIComponent(form.customerPhone)}` : ""}`}
              >
                <Button size="sm" className="h-8 font-mono text-xs gap-1.5">
                  <PlusCircle className="size-3.5" />
                  <span>إنشاء أول أوردر جملة</span>
                </Button>
              </Link>
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
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-2.5 font-bold text-foreground">#{o.orderNumber || o.id.slice(0, 8)}</td>
                      <td className="p-2.5 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ar-EG")}</td>
                      <td className="p-2.5">{o.items?.length || 1} منتج</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {o.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-left font-bold tabular-nums text-foreground">
                        {Number(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="p-2.5 text-center">
                        <Link to={`/orders?search=${encodeURIComponent(o.orderNumber || o.id)}`}>
                          <Button size="icon" variant="ghost" className="size-7" title="عرض تفاصيل الطلب">
                            <ExternalLink className="size-3.5" />
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

      {/* Tab 3: Invoices & Transactions Tab */}
      {activeTab === "transactions" && !isNew && (
        <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">سجل الفواتير والدفعات المالية</h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {transactions.length} حركة
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="h-7 text-xs font-mono gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <DollarSign className="size-3.5" />
                <span>تسجيل دفعة سداد</span>
              </Button>
            </div>
          </div>

          {/* Quick Balance Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg border border-border/50 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">الرصيد المستحق الحالي:</span>
              <span className="font-bold text-foreground text-sm tabular-nums">
                {Number(form.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">الحد الائتماني:</span>
              <span className="font-bold text-foreground text-sm tabular-nums">
                {Number(form.creditLimit).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
              </span>
            </div>
          </div>

          {loadingTransactions ? (
            <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
              <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
              <span>جاري تحميل الحركات المالية...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Receipt className="size-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs text-muted-foreground font-mono">لا توجد حركات مالية أو فواتير مسجلة بعد.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5">نوع الحركة</th>
                    <th className="p-2.5">التاريخ والوقت</th>
                    <th className="p-2.5">المرجع</th>
                    <th className="p-2.5 text-left">المبلغ</th>
                    <th className="p-2.5 text-left">الرصيد قبل</th>
                    <th className="p-2.5 text-left">الرصيد بعد</th>
                    <th className="p-2.5">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {transactions.map((tx) => {
                    const isDebit = tx.type === "INVOICE" || tx.type === "DEBIT_NOTE";
                    return (
                      <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-2.5">
                          {tx.type === "INVOICE" && (
                            <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px]">
                              فاتورة مبيعات
                            </Badge>
                          )}
                          {tx.type === "PAYMENT" && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                              سداد دفعة
                            </Badge>
                          )}
                          {tx.type === "CREDIT_NOTE" && (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px]">
                              إشعار دائن (مرتجع)
                            </Badge>
                          )}
                          {tx.type === "DEBIT_NOTE" && (
                            <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px]">
                              إشعار مدين
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="p-2.5 font-bold">
                          {tx.referenceType === "ORDER" ? `طلب #${tx.referenceId?.slice(0, 8)}` : tx.referenceId || "—"}
                        </td>
                        <td className={`p-2.5 text-left font-bold tabular-nums ${isDebit ? "text-rose-600" : "text-emerald-600"}`}>
                          {isDebit ? "+" : "-"}{Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-2.5 text-left tabular-nums text-muted-foreground">
                          {Number(tx.balanceBefore).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-left font-bold tabular-nums text-foreground">
                          {Number(tx.balanceAfter).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-muted-foreground max-w-[200px] truncate" title={tx.notes || ""}>
                          {tx.notes || "—"}
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

      {/* Tab 4: Statement Tab */}
      {activeTab === "statement" && !isNew && (
        <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">كشف حساب العميل المعتمد</h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">من:</span>
                <Input
                  type="date"
                  value={statementStart}
                  onChange={(e) => setStatementStart(e.target.value)}
                  className="h-7 text-xs font-mono w-32 bg-background border-border/70"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">إلى:</span>
                <Input
                  type="date"
                  value={statementEnd}
                  onChange={(e) => setStatementEnd(e.target.value)}
                  className="h-7 text-xs font-mono w-32 bg-background border-border/70"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadStatement()} className="h-7 text-xs font-mono">
                تحديث
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="h-7 text-xs font-mono gap-1"
              >
                <Printer className="size-3.5" />
                <span>طباعة</span>
              </Button>
            </div>
          </div>

          {loadingStatement ? (
            <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
              <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
              <span>جاري إعداد كشف الحساب...</span>
            </div>
          ) : !statement ? (
            <div className="text-center py-8 text-xs font-mono text-muted-foreground">
              لا توجد بيانات كشف حساب للفترة المحددة.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 bg-muted/20 border border-border/60 rounded-lg">
                  <span className="text-muted-foreground block text-[11px]">الرصيد الافتتاحي</span>
                  <span className="font-bold text-sm text-foreground tabular-nums">
                    {Number(statement.openingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <span className="text-blue-700 dark:text-blue-300 block text-[11px]">إجمالي الفواتير</span>
                  <span className="font-bold text-sm text-blue-700 dark:text-blue-300 tabular-nums">
                    {Number(statement.totalInvoiced || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">إجمالي المسدد</span>
                  <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {Number(statement.totalPaid || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="text-primary block text-[11px]">الرصيد الختامي</span>
                  <span className="font-bold text-sm text-primary tabular-nums">
                    {Number(statement.closingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
              </div>

              {/* Statement Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-right">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">البيان / المرجع</th>
                      <th className="p-2.5 text-left">مدين (فواتير)</th>
                      <th className="p-2.5 text-left">دائن (سداد)</th>
                      <th className="p-2.5 text-left">الرصيد التراكمي</th>
                      <th className="p-2.5">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {statement.lines?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          لا توجد حركات في هذه الفترة.
                        </td>
                      </tr>
                    ) : (
                      statement.lines?.map((line, idx) => {
                        const isDebit = line.type === "INVOICE" || line.type === "DEBIT_NOTE";
                        return (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="p-2.5 text-muted-foreground">{new Date(line.date).toLocaleDateString("ar-EG")}</td>
                            <td className="p-2.5 font-bold text-foreground">{line.reference || line.type}</td>
                            <td className="p-2.5 text-left font-bold tabular-nums text-rose-600">
                              {isDebit ? Number(line.amount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
                            </td>
                            <td className="p-2.5 text-left font-bold tabular-nums text-emerald-600">
                              {!isDebit ? Number(line.amount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
                            </td>
                            <td className="p-2.5 text-left font-bold tabular-nums text-foreground">
                              {Number(line.balanceAfter).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className="p-2.5 text-muted-foreground">{line.notes || "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Prices Tab */}
      {activeTab === "prices" && !isNew && (
        <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">كتالوج أسعار الموزع المعتمدة</h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {prices.length} منتج
              </Badge>
            </div>
            <div className="w-full sm:w-64">
              <Input
                type="text"
                value={priceSearch}
                onChange={(e) => setPriceSearch(e.target.value)}
                placeholder="ابحث باسم المنتج أو الكود..."
                className="h-7 text-xs font-mono bg-background border-border/70"
              />
            </div>
          </div>

          {loadingPrices ? (
            <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
              <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
              <span>جاري تحميل قائمة الأسعار...</span>
            </div>
          ) : filteredPrices.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-muted-foreground">
              لا توجد منتجات مسجلة في قائمة أسعار هذا العميل.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5">المنتج</th>
                    <th className="p-2.5">الكود / المتغير</th>
                    <th className="p-2.5 text-left">السعر العادي</th>
                    <th className="p-2.5 text-left">سعر جملة الموزع</th>
                    <th className="p-2.5 text-left">نسبة التوفير</th>
                    <th className="p-2.5">مصدر السعر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPrices.map((item, idx) => {
                    const diff = Math.max(0, item.regularPrice - item.wholesalePrice);
                    const pct = item.regularPrice > 0 ? Math.round((diff / item.regularPrice) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="p-2.5 font-bold text-foreground">
                          {item.productName}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {item.variantName || item.sku || "المنتج الأساسي"}
                        </td>
                        <td className="p-2.5 text-left tabular-nums text-muted-foreground line-through">
                          {Number(item.regularPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-2.5 text-left font-bold tabular-nums text-primary">
                          {Number(item.wholesalePrice).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-2.5 text-left">
                          {pct > 0 ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                              خصم {pct}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">سعر قياسي</span>
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

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-600" />
                <h3 className="font-semibold text-foreground text-sm">تسجيل دفعة سداد جديدة</h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setIsPaymentModalOpen(false)}
              >
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
