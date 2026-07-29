import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface Product {
  id: string;
  name: string;
  sku: string;
  images: string;
  price: number;
}

interface CampaignProduct {
  id: string;
  productId: string;
  framedImage: string | null;
  product: Product;
}

interface Campaign {
  id: string;
  name: string;
  overlayImage: string;
  status: string;
  products: CampaignProduct[];
}

const OverlayCampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    try {
      const { data } = await apiClient.get(`/overlay-campaigns/${id}`);
      setCampaign(data.data);
    } catch {
      tToast.error("advertising_OverlayCampaignDetails.failed_load_5709");
      navigate("/advertising/facebook-ads/overlay-campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await apiClient.get(`/overlay-campaigns/products/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data.data || []);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const handleAddProduct = async (productId: string) => {
    try {
      await apiClient.post(`/overlay-campaigns/${id}/products`, { productIds: [productId] });
      tToast.success("advertising_OverlayCampaignDetails.msg_2e2c");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل");
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      await apiClient.delete(`/overlay-campaigns/${id}/products/${productId}`);
      tToast.success("advertising_OverlayCampaignDetails.msg_7a62");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;
  if (!campaign) return null;

  const existingIds = new Set(campaign.products.map((p) => p.productId));

  return (
    <div className="min-h-screen space-y-6 bg-[#f8fafc] px-4 py-8 dark:bg-[#030712] sm:px-6 lg:px-8">
      <button onClick={() => navigate("/advertising/facebook-ads/overlay-campaigns")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeftIcon className="h-4 w-4" /> العودة
      </button>

      <div className="rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{campaign.name}</h1>
        <div className="mt-4 flex gap-4">
          <div className="h-24 w-24 rounded-xl overflow-hidden border border-slate-200">
            <img src={campaign.overlayImage} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">بحث وإضافة منتجات</label>
              <div className="relative">
                <input value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="ابحث باسم المنتج أو SKU..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white dark:bg-slate-800 dark:border-slate-700" />
              </div>
              {searching && <p className="text-xs text-slate-400 mt-1">جاري البحث...</p>}
              {searchResults.length > 0 && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 max-h-60 overflow-y-auto">
                  {searchResults.filter((p) => !existingIds.has(p.id)).map((p) => (
                    <button key={p.id} onClick={() => handleAddProduct(p.id)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{p.sku}</span>
                        <PlusIcon className="h-4 w-4 text-indigo-500" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          المنتجات ({campaign.products.length})
        </h2>
        {campaign.products.length === 0 ? (
          <p className="text-slate-400 text-sm">لا توجد منتجات مضافة. ابحث وأضف منتجات من الأعلى.</p>
        ) : (
          <div className="grid gap-3">
            {campaign.products.map((cp) => (
              <div key={cp.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100">
                    <img src={cp.framedImage || (() => {
                      try { return JSON.parse(cp.product.images || '[]')[0]; } catch { return ''; }
                    })()} alt="" className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{cp.product.name}</p>
                    <p className="text-xs text-slate-400">{cp.product.sku}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cp.framedImage && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">تم</span>
                  )}
                  <button onClick={() => handleRemoveProduct(cp.productId)}
                    className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-900/30">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OverlayCampaignDetails;
