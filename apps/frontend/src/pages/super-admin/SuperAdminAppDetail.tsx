import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { Alert } from "../../components/ui/alert";
import {
  ArrowRight,
  Pencil,
  ExternalLink,
  Loader2,
  Boxes,
  DollarSign,
  Star,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import axios from "axios";
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";

type MarketplaceApp = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays?: number;
  isActive?: boolean;
  isPublic?: boolean;
  isFeatured?: boolean;
  logo?: string;
  icon?: string;
  coverImage?: string;
  mainRoute?: string;
  adminRoute?: string;
  pricingModel?: string;
  installCount?: number;
  rating?: number;
  reviewCount?: number;
  features?: string[] | Record<string, unknown>;
};

const isLikelyImageUrl = (value?: string): boolean => {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return (
    /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)(\?.*)?$/.test(v) ||
    v.startsWith("/uploads/") ||
    v.startsWith("data:image/")
  );
};

const SuperAdminAppDetail: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<MarketplaceApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApp = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    setError(null);
    try {
      const headers = tokenManager.createAuthHeaders();
      const res = await axios.get(
        buildApiUrl(`super-admin/marketplace-management/apps/${appId}`),
        { headers },
      );
      if (res.data?.success) {
        setApp((res.data.data ?? null) as MarketplaceApp | null);
      } else {
        setError("تعذر جلب بيانات التطبيق");
      }
    } catch (err) {
      console.error("App detail load error:", err);
      setError("تعذر جلب بيانات التطبيق");
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    void loadApp();
  }, [loadApp]);

  const handleQuickToggle = useCallback(
    async (field: "isActive" | "isPublic" | "isFeatured", value: boolean) => {
      if (!app?.id) return;
      const prev = app;
      setApp((a) => (a ? { ...a, [field]: value } : a));
      try {
        const headers = tokenManager.createAuthHeaders();
        await axios.put(
          buildApiUrl(`super-admin/marketplace-management/apps/${app.id}`),
          { [field]: value },
          { headers },
        );
        toast.success("تم الحفظ");
      } catch (err) {
        console.error("Toggle error:", err);
        setApp(prev);
        toast.error("فشل في الحفظ");
      }
    },
    [app],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/super-admin/apps")}>
          <ArrowRight className="size-4" /> العودة للماركت بليس
        </Button>
        <Alert variant="destructive">{error ?? "التطبيق غير موجود"}</Alert>
      </div>
    );
  }

  const featuresList = Array.isArray(app.features)
    ? (app.features as string[])
    : [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/super-admin/apps")}>
        <ArrowRight className="size-4" /> العودة للماركت بليس
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted text-3xl">
          {isLikelyImageUrl(app.logo ?? app.icon ?? app.coverImage) ? (
            <img
              src={app.logo ?? app.icon ?? app.coverImage}
              alt={app.name}
              className="size-full object-cover"
            />
          ) : (
            <span>{(app.icon ?? app.name?.[0] ?? "📦")}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
            {app.isFeatured && (
              <Badge className="bg-amber-500/15 text-amber-600">
                <Star className="size-3" /> مميز
              </Badge>
            )}
            {app.isActive ? (
              <Badge className="bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="size-3" /> نشط
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="size-3" /> غير نشط
              </Badge>
            )}
            {app.isPublic && (
              <Badge variant="outline">
                <Globe className="size-3" /> عام
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{app.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {app.category && <span>الفئة: {app.category}</span>}
            {typeof app.installCount === "number" && (
              <span>
                <Boxes className="inline size-3" /> {app.installCount} تثبيت
              </span>
            )}
            {typeof app.rating === "number" && (
              <span>
                <Star className="inline size-3" /> {app.rating} ({app.reviewCount ?? 0})
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => navigate("/super-admin/apps")}>
            <Pencil className="size-4" /> تعديل
          </Button>
          {app.adminRoute && (
            <a href={app.adminRoute} target="_blank" rel="noreferrer">
              <Button>
                <ExternalLink className="size-4" /> فتح أداة التطبيق
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">التسعير</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
              {app.monthlyPrice != null ? `${app.monthlyPrice} ج.م/شهر` : "مجاني"}
            </div>
            {app.yearlyPrice != null && (
              <div className="text-muted-foreground">{app.yearlyPrice} ج.م/سنة</div>
            )}
            {app.trialDays != null && (
              <div className="text-muted-foreground">تجربة: {app.trialDays} يوم</div>
            )}
            {app.pricingModel && (
              <div className="text-muted-foreground">النموذج: {app.pricingModel}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الحالة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>نشط</span>
              <Switch
                checked={!!app.isActive}
                onCheckedChange={(v) => handleQuickToggle("isActive", v === true)}
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>عام</span>
              <Switch
                checked={!!app.isPublic}
                onCheckedChange={(v) => handleQuickToggle("isPublic", v === true)}
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>مميز</span>
              <Switch
                checked={!!app.isFeatured}
                onCheckedChange={(v) => handleQuickToggle("isFeatured", v === true)}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المسارات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {app.mainRoute && (
              <div className="text-muted-foreground" dir="ltr">
                <span className="text-foreground">المسار:</span> {app.mainRoute}
              </div>
            )}
            {app.adminRoute && (
              <div className="text-muted-foreground" dir="ltr">
                <span className="text-foreground">مسار الأدمن:</span> {app.adminRoute}
              </div>
            )}
            {app.slug && (
              <div className="text-muted-foreground" dir="ltr">
                <span className="text-foreground">slug:</span> {app.slug}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {featuresList.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المميزات</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {featuresList.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SuperAdminAppDetail;
