import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

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
        const [plRes] = await Promise.all([
          apiClient.get("/wholesale/price-lists"),
        ]);
        setPriceLists(plRes?.data?.data || []);
        if (!isNew) {
          const res = await apiClient.get(`/wholesale/customers/${id}`);
          const data = res?.data?.data;
          if (data) setForm({
            customerId: data.customerId,
            customerName: data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : '',
            customerPhone: data.customer?.phone || '',
            customerEmail: data.customer?.email || '',
            creditLimit: Number(data.creditLimit),
            currentBalance: Number(data.currentBalance),
            paymentTermsDays: data.paymentTermsDays || 30,
            priceListId: data.priceListId || '',
            isActive: data.isActive,
          });
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "فشل التحميل");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew]);

  const searchCustomers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await apiClient.get(`/customers?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(res?.data?.data || []);
    } catch { /* ignore */ }
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
      setError(err?.response?.data?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">
        {isNew ? "إضافة عميل جملة" : "بيانات عميل الجملة"}
      </h1>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">بحث عن عميل</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => searchCustomers(e.target.value)}
                placeholder="ابحث باسم العميل..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {searchResults.length > 0 && (
                <div className="mt-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectCustomer(r)}
                      className="block w-full px-3 py-2 text-right text-sm hover:bg-gray-50"
                    >
                      {r.firstName} {r.lastName} {r.phone ? `(${r.phone})` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الاسم</label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الهاتف</label>
              <input
                type="text"
                value={form.customerPhone || ""}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.customerEmail || ""}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">قائمة الأسعار</label>
              <select
                value={form.priceListId || ""}
                onChange={(e) => setForm({ ...form, priceListId: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">بدون قائمة</option>
                {priceLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الحد الائتماني</label>
              <input
                type="number"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                step="0.01"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">أيام السداد</label>
              <input
                type="number"
                value={form.paymentTermsDays}
                onChange={(e) => setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {!isNew && (
              <div>
                <label className="mb-1 block text-sm font-medium">الرصيد المستحق</label>
                <input
                  type="text"
                  value={`${Number(form.currentBalance).toFixed(2)} EGP`}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                  disabled
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium">نشط</label>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/wholesale/customers")}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
