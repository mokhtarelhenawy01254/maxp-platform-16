import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

interface PriceList {
  id: string;
  name: string;
  nameEn?: string;
  currency: string;
  isActive: boolean;
  customerCount: number;
  createdAt: string;
}

export default function WholesalePriceLists() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/wholesale/price-lists");
        setLists(res?.data?.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || "تعذر تحميل قوائم الأسعار");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف قائمة الأسعار؟")) return;
    try {
      await apiClient.delete(`/wholesale/price-lists/${id}`);
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل الحذف");
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">قوائم الأسعار</h1>
        <Link
          to="/wholesale/price-lists/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          إضافة قائمة أسعار
        </Link>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      {lists.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          لا توجد قوائم أسعار. أضف أول قائمة أسعار للبدء.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">العملة</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">العملاء</th>
                <th className="px-4 py-3 font-medium">تاريخ الإنشاء</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lists.map((list) => (
                <tr key={list.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/wholesale/price-lists/${list.id}`} className="font-medium text-primary hover:underline">
                      {list.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{list.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${list.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {list.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{list.customerCount}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(list.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(list.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
