import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Users,
  ArrowRight,
  ShieldCheck,
  Tag,
  Wallet,
  Clock,
  Mail,
  Phone,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Save,
  X,
} from "lucide-react";

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

export default function WholesaleCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
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

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [plRes] = await Promise.all([apiClient.get("/wholesale/price-lists")]);
        setPriceLists(plRes?.data?.data || []);
        if (!isNew) {
          const res = await apiClient.get(`/wholesale/customers/${id}`);
          const data = res?.data?.data;
          if (data)
            setForm({
              customerId: data.customerId,
              customerName: data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : "",
              customerPhone: data.customer?.phone || "",
              customerEmail: data.customer?.email || "",
              creditLimit: Number(data.creditLimit),
              currentBalance: Number(data.currentBalance),
              paymentTermsDays: data.paymentTermsDays || 30,
              priceListId: data.priceListId || "",
              isActive: data.isActive,
            });
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "فشل تحميل بيانات التاجر");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew]);

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
    try {
      setSaving(true);
      setError(null);
      if (isNew) {
        await apiClient.post("/wholesale/customers", form);
      } else {
        await apiClient.put(`/wholesale/customers/${id}`, form);
      }
      navigate("/wholesale/customers");
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل حفظ بيانات التاجر");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل ملف التاجر...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Top Header */}
      <div>
        <Link
          to="/wholesale/customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          العودة إلى قائمة عملاء الجملة
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Users className="w-3.5 h-3.5" />
                ملف تاجر الجملة
              </span>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {isNew ? "حساب جديد" : `ID: ${id}`}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isNew ? "تسجيل تاجر جملة جديد" : `بيانات التاجر: ${form.customerName || "—"}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              ضبط الحدود الائتمانية، فترات السداد، وقائمة الأسعار المخصصة لهذا العميل
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">البيانات الأساسية للتاجر</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {isNew && (
              <div className="md:col-span-2 space-y-1.5 relative">
                <label className="font-medium text-foreground">ربط بحساب عميل مسجل *</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => searchCustomers(e.target.value)}
                    placeholder="ابحث باسم العميل أو رقم الهاتف للربط..."
                    className="w-full bg-background border border-input rounded-lg pr-9 pl-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-xl overflow-hidden divide-y divide-border/60">
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

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">الاسم التجاري / اسم التاجر *</label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">رقم الهاتف</label>
              <input
                type="text"
                value={form.customerPhone || ""}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.customerEmail || ""}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">قائمة الأسعار المخصصة</label>
              <select
                value={form.priceListId || ""}
                onChange={(e) => setForm({ ...form, priceListId: e.target.value || undefined })}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">الشروط الائتمانية والسداد</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">الحد الائتماني الأقصى (ج.م)</label>
              <input
                type="number"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                step="0.01"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">أيام فترة السداد المسموحة (يوم)</label>
              <input
                type="number"
                value={form.paymentTermsDays}
                onChange={(e) => setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 0 })}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {!isNew && (
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">الرصيد المستحق الحالي</label>
                <div className="w-full bg-muted/40 border border-border/60 rounded-lg px-3 py-2 text-foreground font-mono font-bold">
                  {Number(form.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span className="font-medium text-foreground">حساب التاجر مفعل ومتاح لإصدار طلبيات الجملة</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/wholesale/customers")}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
