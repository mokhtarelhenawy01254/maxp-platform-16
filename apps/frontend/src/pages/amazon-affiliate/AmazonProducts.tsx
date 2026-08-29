import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteAmazonProduct,
  listAmazonProducts,
  syncAmazonProducts,
  type AmazonAffiliateProductRow,
} from "../../services/amazonAffiliateService";

const AmazonProductsPage: React.FC = () => {
  const [rows, setRows] = useState<AmazonAffiliateProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listAmazonProducts();
      setRows(data);
    } catch {
      toast.error("تعذر تحميل المنتجات المستوردة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncAmazonProducts();
      toast.success(`تمت المزامنة: نجح ${result.succeeded} / فشل ${result.failed}`);
      await load();
    } catch {
      toast.error("فشلت المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (row: AmazonAffiliateProductRow) => {
    if (!window.confirm(`حذف "${row.product?.name || row.asin}" من المنتجات المستوردة؟`)) return;
    try {
      await deleteAmazonProduct(row.id);
      toast.success("تم الحذف");
      await load();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">المنتجات المستوردة من أمازون</h1>
        <button
          onClick={handleSync}
          disabled={syncing || rows.length === 0}
          className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {syncing ? "جارِ المزامنة..." : "مزامنة الأسعار والمخزون"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">جارِ التحميل...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          لا توجد منتجات مستوردة بعد — اذهب إلى «استيراد المنتجات» وابدأ بإضافة منتجات أمازون لمتجرك.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-right font-medium">المنتج</th>
                <th className="px-4 py-3 text-right font-medium">ASIN</th>
                <th className="px-4 py-3 text-right font-medium">السعر</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">آخر مزامنة</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.product?.mainImage ? (
                        <img src={row.product.mainImage} alt={row.product.name} className="h-10 w-10 rounded-lg object-contain" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{row.product?.name || row.asin}</p>
                        <a
                          href={row.amazonUrl || `https://${row.marketplace}/dp/${row.asin}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 underline"
                          dir="ltr"
                        >
                          {row.marketplace}/dp/{row.asin}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600" dir="ltr">{row.asin}</td>
                  <td className="px-4 py-3 text-gray-800">
                    {row.lastPrice != null ? `${row.lastPrice} ${row.lastPriceCurrency}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${row.inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {row.inStock ? "متوفر" : "غير متوفر"}
                    </span>
                    {row.status === "ERROR" && (
                      <span className="mt-1 block text-[10px] text-red-500">{row.syncError || "خطأ في المزامنة"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString("ar-EG") : "—"}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleDelete(row)}
                      className="text-xs font-medium text-red-500 hover:underline"
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
};

export default AmazonProductsPage;