import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowRight, 
  Plus, 
  Trash2, 
  Search, 
  Image as ImageIcon, 
  Sparkles, 
  Package, 
  CheckCircle2,
  Layers
} from "lucide-react";
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
      tToast.error("OverlayCampaignDetails.failed_load_5709");
      navigate("/advertising/facebook-ads/overlay-campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, [id]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { 
      setSearchResults([]); 
      return; 
    }
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
      tToast.success("OverlayCampaignDetails.msg_2e2c");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إضافة المنتج للحملة");
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      await apiClient.delete(`/overlay-campaigns/${id}/products/${productId}`);
      tToast.success("OverlayCampaignDetails.msg_7a62");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إزالة المنتج من الحملة");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل تفاصيل حملة الإطارات الترويجية...</span>
      </div>
    );
  }

  if (!campaign) return null;

  const existingIds = new Set(campaign.products.map((p) => p.productId));

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/advertising/facebook-ads/overlay-campaigns"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">{campaign.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                تطبيق إطارات العروض والخصومات التلقائية على صور منتجات الكتالوج
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>حملة إطارات نشطة</span>
          </span>
        </div>
      </div>

      {/* Campaign Details & Search Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>إطار الحملة والبحث عن المنتجات</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            إجمالي المنتجات المشمولة: {campaign.products.length}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="h-28 w-28 rounded-xl overflow-hidden border border-border/70 bg-muted/20 shrink-0 flex items-center justify-center p-1">
            {campaign.overlayImage ? (
              <img src={campaign.overlayImage} alt="Overlay Frame" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-bold text-foreground block">
              بحث وإضافة منتج إلى حملة الإطار
            </label>
            <div className="relative">
              <input 
                value={searchQuery} 
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="ابحث باسم المنتج أو كود SKU..."
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary pl-8" 
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            {searching && <p className="text-[11px] text-muted-foreground">جارِ البحث عن المنتجات المطابقة...</p>}

            {searchResults.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-card divide-y divide-border/40 max-h-56 overflow-y-auto shadow-md">
                {searchResults.filter((p) => !existingIds.has(p.id)).map((p) => (
                  <button 
                    key={p.id} 
                    type="button"
                    onClick={() => handleAddProduct(p.id)}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs hover:bg-muted/30 transition-colors text-right"
                  >
                    <span className="font-semibold text-foreground">{p.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground font-mono">{p.sku}</span>
                      <Plus className="w-4 h-4 text-primary" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Associated Products List */}
      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Layers className="w-4 h-4 text-primary" />
            <span>منتجات الحملة المصممة ({campaign.products.length})</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            المنتجات التي تم تركيب الإطار عليها جاهزة للإعلانات
          </span>
        </div>

        {campaign.products.length === 0 ? (
          <div className="text-center py-10 space-y-2 border border-dashed border-border/70 rounded-xl">
            <Package className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">
              لا توجد منتجات مضافة بعد. ابحث في الحقل أعلاه وأضف المنتجات لتطبيق الإطار عليها.
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {campaign.products.map((cp) => (
              <div 
                key={cp.id} 
                className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/10 p-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-background border border-border/40 shrink-0">
                    <img 
                      src={cp.framedImage || (() => {
                        try { return JSON.parse(cp.product.images || '[]')[0]; } catch { return ''; }
                      })()} 
                      alt="" 
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }} 
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate">{cp.product.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{cp.product.sku}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {cp.framedImage && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      مكتمل
                    </span>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleRemoveProduct(cp.productId)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="إزالة المنتج من الحملة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
