import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Store,
  Users,
  ShoppingBag,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import tokenManager from "../../utils/tokenManager";
import { useAuth } from "../../hooks/useAuthSimple";

interface Partner {
  id: string;
  name: string;
  logo: string;
  email: string;
}

interface CompanyAffiliate {
  connectionId: string;
  partner: Partner;
  role: "consumer" | "provider";
  totalOrders: number;
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  lastOrderAt: string | null;
}

interface AffiliatesData {
  asConsumer: CompanyAffiliate[];
  asProvider: CompanyAffiliate[];
}

export default function CompanyAffiliateDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AffiliatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/v1/company-connections/affiliates", {
        headers: tokenManager.createAuthHeaders(),
      });
      const result = await resp.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message || "فشل جلب بيانات الشركاء");
      }
    } catch {
      setError("حدث خطأ أثناء تحميل بيانات الشركاء المرتبطين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const totalOrders =
    (data?.asConsumer?.reduce((s, i) => s + (i.totalOrders || 0), 0) || 0) +
    (data?.asProvider?.reduce((s, i) => s + (i.totalOrders || 0), 0) || 0);

  const totalCommissions =
    (data?.asConsumer?.reduce((s, i) => s + (i.totalCommissions || 0), 0) || 0) +
    (data?.asProvider?.reduce((s, i) => s + (i.totalCommissions || 0), 0) || 0);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل شبكة الشركات التابعة والشراكات...</span>
      </div>
    );
  }

  const PartnerCard = ({ item }: { item: CompanyAffiliate }) => (
    <div className="p-3.5 border border-border/70 rounded-lg bg-card/60 hover:border-border/90 transition-all flex flex-col justify-between space-y-3">
      <div className="flex items-center gap-3">
        <img
          src={
            item.partner.logo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.partner.name)}&background=random`
          }
          alt={item.partner.name}
          className="size-10 rounded-md object-cover bg-muted border border-border/70"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-xs text-foreground truncate">{item.partner.name}</h4>
          <p className="text-[11px] text-muted-foreground font-mono truncate">{item.partner.email}</p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-border/70 bg-muted/30">
          {item.role === "consumer" ? "مورّد" : "مسوق"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono">
        <div className="p-2 bg-muted/20 border border-border/50 rounded-md">
          <span className="text-[10px] text-muted-foreground block">الطلبات المنفذة</span>
          <span className="text-sm font-bold tabular-nums text-foreground mt-0.5 block">
            {item.totalOrders}
          </span>
        </div>
        <div className="p-2 bg-muted/20 border border-border/50 rounded-md">
          <span className="text-[10px] text-muted-foreground block">إجمالي العمولات</span>
          <span className="text-sm font-bold tabular-nums text-emerald-500 mt-0.5 block">
            {Number(item.totalCommissions).toLocaleString("en-US", { minimumFractionDigits: 0 })} ج.م
          </span>
        </div>
        <div className="p-2 bg-muted/20 border border-border/50 rounded-md">
          <span className="text-[10px] text-muted-foreground block">مدفوع</span>
          <span className="text-xs font-semibold tabular-nums text-foreground mt-0.5 block">
            {Number(item.paidCommissions).toLocaleString("en-US", { minimumFractionDigits: 0 })} ج.م
          </span>
        </div>
        <div className="p-2 bg-muted/20 border border-border/50 rounded-md">
          <span className="text-[10px] text-muted-foreground block">معلق</span>
          <span className="text-xs font-semibold tabular-nums text-amber-500 mt-0.5 block">
            {Number(item.pendingCommissions).toLocaleString("en-US", { minimumFractionDigits: 0 })} ج.م
          </span>
        </div>
      </div>

      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] font-mono">
        <span className="text-muted-foreground">
          آخر طلب: {item.lastOrderAt ? new Date(item.lastOrderAt).toLocaleDateString("ar-EG") : "—"}
        </span>
        <Link
          to={
            item.role === "consumer"
              ? `/company-affiliates/consumer/${item.connectionId}`
              : `/company-affiliates/provider/${item.connectionId}`
          }
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <span>{item.role === "consumer" ? "تفاصيل السحب" : "عرض الملف"}</span>
          <ArrowUpRight className="size-3 rtl:rotate-90" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Building2 className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              شبكة الشركات التابعة والشراكات
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              B2B Partner Network
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة علاقات الأفليت والربط الداخلي بين الشركات الموردة والمسوقة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
          <Link to="/affiliates/management">
            <Button size="sm" className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]">
              <Users className="size-3.5" />
              <span>إدارة المسوقين</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-mono">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">الشركات المورّدة</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {data?.asConsumer?.length || 0}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">موردين متصلين</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <Store className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-500">الشركات المسوّقة</p>
            <p className="text-xl font-bold tracking-tight text-emerald-500 font-mono tabular-nums mt-0.5">
              {data?.asProvider?.length || 0}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">مسوقين وموزعين</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <Users className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-500">إجمالي الطلبات</p>
            <p className="text-xl font-bold tracking-tight text-purple-500 font-mono tabular-nums mt-0.5">
              {totalOrders}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">طلب شبكة B2B</p>
          </div>
          <div className="size-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
            <ShoppingBag className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-500">إجمالي العمولات</p>
            <p className="text-lg font-bold tracking-tight text-amber-500 font-mono tabular-nums mt-0.5">
              {totalCommissions.toLocaleString("en-US", { minimumFractionDigits: 0 })} ج.م
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">عوائد مستحقة ومدفوعة</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <DollarSign className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Provider Section */}
      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground font-mono">
              المورّدون (الشركات التي أشتري منها)
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono border-border/60">
              {data?.asConsumer?.length || 0}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            شركات يتم سحب وتوريد المنتجات منها
          </span>
        </div>

        {(data?.asConsumer?.length || 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.asConsumer.map((item) => (
              <PartnerCard key={item.connectionId} item={item} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-1.5 text-muted-foreground">
            <Store className="size-7 mx-auto opacity-40" />
            <p className="text-xs font-mono text-foreground font-medium">لا توجد شركات مورّدة مرتبطة</p>
            <p className="text-[11px] text-muted-foreground">
              اربط متجرك بمورّدين من تكامل المنصة أو الربط الداخلي بين الشركات
            </p>
          </div>
        )}
      </div>

      {/* Consumer Section */}
      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-foreground font-mono">
              المسوقون (الشركات التي تسوّق منتجاتي)
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono border-border/60">
              {data?.asProvider?.length || 0}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            شركاء تسويق مرتبطين يسحبون منتجاتك
          </span>
        </div>

        {(data?.asProvider?.length || 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.asProvider.map((item) => (
              <PartnerCard key={item.connectionId} item={item} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-1.5 text-muted-foreground">
            <Users className="size-7 mx-auto opacity-40" />
            <p className="text-xs font-mono text-foreground font-medium">لا توجد شركات مسوّقة مرتبطة</p>
            <p className="text-[11px] text-muted-foreground">
              المسوقون يظهرون هنا بعد ربطهم بمتجرك وتفعيل مبيعات العمولات
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
