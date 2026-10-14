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
    void load();
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
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل ملف التاجر...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
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
            ضبط الحدود الائتمانية، فترات السداد، وقائمة الأسعار المخصصة لهذا العميل
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/wholesale/customers")}
            className="h-8 px-2.5 text-xs font-mono border-border/70 active:scale-[0.98]"
          >
            إلغاء
          </Button>

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

      <form id="wholesale-customer-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info Chassis */}
        <div className="bg-card border border-border/70 rounded-lg p-4 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
            <Building2 className="size-4 text-primary" />
            <h2 className="text-xs font-semibold text-foreground font-mono">البيانات الأساسية للتاجر</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {isNew && (
              <div className="md:col-span-2 space-y-1 relative">
                <label className="text-[11px] font-mono font-medium text-foreground">ربط بحساب عميل مسجل *</label>
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
    </div>
  );
}
