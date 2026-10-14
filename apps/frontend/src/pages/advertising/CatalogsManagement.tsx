import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Eye,
  RotateCcw,
  ShoppingBag,
  Layers,
  Copy,
  ExternalLink,
  CheckCircle2,
  FolderSync,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { facebookAdsService, FacebookProductCatalog } from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import { useAuth } from "../../hooks/useAuthSimple";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

const CatalogsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<FacebookProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [includeHidden, setIncludeHidden] = useState(false);

  const loadCatalogs = async () => {
    try {
      setLoading(true);
      setErrors({});
      if (!businessId) {
        setErrors({ businessId: "أدخل معرف الأعمال Business ID لجلب الكتالوجات" });
        setLoading(false);
        return;
      }
      const data = await facebookAdsService.getCatalogs(businessId);
      setCatalogs(data || []);
    } catch (error: any) {
      console.error("Error loading catalogs:", error);
      const errorMsg = error?.response?.data?.error || "فشل في تحميل الكتالوجات";
      toast.error(errorMsg);
      if (errorMsg.includes("Business ID")) setErrors({ businessId: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) loadCatalogs();
    else setLoading(false);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCatalogs();
    setRefreshing(false);
    tToast.success("CatalogsManagement.success_update_522e");
  };

  const handleDeleteCatalog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذا الكتالوج؟ سيتم إلغاء ربط جميع المنتجات.")) return;
    try {
      await facebookAdsService.deleteCatalog(id);
      tToast.success("CatalogsManagement.success_delete_47bf");
      await loadCatalogs();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في حذف الكتالوج");
    }
  };

  const stats = useMemo(() => {
    const total = catalogs.length;
    const totalProducts = catalogs.reduce((acc, c) => acc + (c.product_count || 0), 0);
    const totalFeeds = catalogs.reduce((acc, c) => acc + (c.feed_count || 0), 0);
    return { total, totalProducts, totalFeeds };
  }, [catalogs]);

  const feedUrl = user?.company?.slug
    ? `https://${user.company.slug}.maxp.online/api/v1/public/products/feed/${includeHidden ? "?includeHidden=true" : ""}`
    : "";

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      <FacebookAdsModuleNav />

      {/* Top Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              إدارة كتالوجات المنتجات (Product Catalogs)
            </h1>
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono tabular-nums bg-muted/40 border-border/70 text-muted-foreground">
              {catalogs.length} كتالوج
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مزامنة وإدارة كتالوجات فيسبوك لاستخدامها في إعلانات Dynamic Ads وحملات Advantage+
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || !businessId} className="h-8 gap-1.5 text-xs border-border/70">
            <RotateCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button size="sm" onClick={() => navigate("/advertising/facebook-ads/catalogs/create")} className="h-8 gap-1.5 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> كتالوج جديد
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي الكتالوجات</span>
            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">{stats.total}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>المنتجات المتزامنة</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">{stats.totalProducts.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>موجزات التغذية (Feeds)</span>
            <FolderSync className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-blue-500">{stats.totalFeeds}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>حالة المزامنة التلقائية</span>
            <FileCode2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-sm font-bold text-foreground mt-1">مفعلة عبر الـ Feed</div>
        </div>
      </div>

      {/* Product Feed URL Box */}
      {feedUrl && (
        <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileCode2 className="h-4 w-4 text-primary" />
              <span>رابط تغذية المنتجات التلقائي (Product Feed XML/JSON)</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              <span>تضمين المنتجات المخفية</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={feedUrl}
              className="h-8 text-xs font-mono border-border/70 bg-muted/20 text-left ltr"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 border-border/70 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(feedUrl);
                tToast.success("CatalogsManagement.msg_eddf");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> نسخ
            </Button>
          </div>
        </div>
      )}

      {/* Business ID Sync Bar */}
      <div className="p-3.5 rounded-lg border border-border/70 bg-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <label className="text-xs font-medium text-foreground">
            استيراد من حساب أعمال فيسبوك (Business ID)
          </label>
          <p className="text-[11px] text-muted-foreground">أدخل معرف حساب الأعمال في ميتا لجلب الكتالوجات الرسمية</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={businessId}
            onChange={(e) => {
              setBusinessId(e.target.value);
              if (errors.businessId) setErrors({ ...errors, businessId: "" });
            }}
            placeholder="مثال: 1234567890"
            className="h-8 text-xs font-mono border-border/70 w-full sm:w-48"
          />
          <Button size="sm" onClick={loadCatalogs} className="h-8 text-xs font-medium shrink-0">
            استيراد
          </Button>
        </div>
      </div>
      {errors.businessId && <p className="text-xs text-rose-500 font-mono -mt-2">{errors.businessId}</p>}

      {/* Catalogs Single Surface Table */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        <div className="p-3 px-4 bg-muted/20 border-b border-border/70 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">قائمة الكتالوجات المربوطة</span>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">{catalogs.length} كتالوج</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل الكتالوجات...</div>
        ) : catalogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="font-semibold text-foreground">لا توجد كتالوجات مستوردة</p>
            <p className="text-muted-foreground">أدخل Business ID أو استخدم رابط Feed أعلاه للربط المباشر مع ميتا</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {catalogs.map((cat) => (
              <div
                key={cat.id}
                onClick={() => navigate(`/advertising/facebook-ads/catalogs/${cat.id}`)}
                className="p-3.5 px-4 hover:bg-muted/30 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg border border-border/70 bg-muted/20 p-1 flex items-center justify-center overflow-hidden shrink-0">
                    {cat.default_image_url ? (
                      <img src={cat.default_image_url} alt="" className="h-full w-full object-cover rounded" />
                    ) : (
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-muted text-muted-foreground border-border/60">
                        {cat.vertical || "تجارة إلكترونية"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">{cat.product_count || 0} منتج</span>
                      <span>•</span>
                      <span className="font-mono">{cat.feed_count || 0} تغذية نشطة</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 border-border/70"
                    onClick={() => navigate(`/advertising/facebook-ads/catalogs/${cat.id}`)}
                  >
                    <ExternalLink className="h-3 w-3" /> التفاصيل
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                    onClick={(e) => handleDeleteCatalog(cat.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogsManagement;
