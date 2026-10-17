import React from "react";
import { Link } from "react-router-dom";
import {
  User,
  MessageSquare,
  Globe,
  Users,
  Sparkles,
  Clock,
  ArrowLeftRight,
  Share2,
  ShoppingBag,
  Bot,
  Link2,
  Package,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { useDateFormat } from "../../../hooks/useDateFormat";

interface OrderSourceCardProps {
  order: {
    conversationId?: string;
    conversation?: {
      id: string;
      channel: string;
    };
    orderSource?: string;
    sourceType?: string;
    extractionMethod?: string;
    affiliateId?: string;
    affiliate?: {
      id: string;
      affiliateCode?: string;
      status?: string;
      user?: {
        firstName: string;
        lastName: string;
        email: string;
      };
    };
    createdBy?: string;
    createdByName?: string;
    createdByUser?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    createdAt: string;
    metadata?: { requestType?: string; source?: string; isGuestOrder?: boolean; [key: string]: unknown };
  };
}

const OrderSourceCard: React.FC<OrderSourceCardProps> = ({ order }) => {
  const { formatDateTime } = useDateFormat();

  const getChannelInfo = () => {
    if (!order.conversation && !order.conversationId) return null;

    let channel = order.conversation?.channel || "";
    if (!channel) {
      const src = String(order.sourceType || order.extractionMethod || "").toLowerCase();
      if (src.includes("whatsapp")) channel = "WHATSAPP";
      else if (src.includes("instagram")) channel = "INSTAGRAM";
      else if (src.includes("telegram")) channel = "TELEGRAM";
      else channel = "FACEBOOK";
    }

    const channelMap: Record<
      string,
      { name: string; color: string }
    > = {
      WHATSAPP: {
        name: "واتساب",
        color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      FACEBOOK: {
        name: "فيسبوك",
        color: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      },
      INSTAGRAM: {
        name: "انستجرام",
        color: "border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400",
      },
      TELEGRAM: {
        name: "تيليجرام",
        color: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
      },
      WEBCHAT: {
        name: "الدردشة المباشرة",
        color: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
      },
    };

    return (
      channelMap[channel] || {
        name: channel,
        color: "border-border/60 bg-muted/40 text-muted-foreground",
      }
    );
  };

  const getSourceTypeInfo = () => {
    let sourceType = order.sourceType || "";

    if (
      order.sourceType === "storefront" ||
      order.extractionMethod === "storefront" ||
      order.orderSource === "STOREFRONT" ||
      order.orderSource === "GUEST_CART" ||
      order.metadata?.source === "storefront" ||
      order.metadata?.isGuestOrder
    ) {
      sourceType = "storefront";
    } else if (
      order.extractionMethod === "manual" ||
      order.extractionMethod === "manual_order_modal" ||
      order.extractionMethod === "manual_admin" ||
      order.sourceType === "manual"
    ) {
      sourceType = "manual";
    } else if (
      !sourceType ||
      sourceType === "unknown" ||
      (sourceType === "ai_conversation" && !order.conversationId)
    ) {
      if (order.conversationId) {
        sourceType = "ai_conversation";
      } else if (order.createdBy || order.createdByName) {
        sourceType = "manual";
      } else {
        sourceType = "unknown";
      }
    }

    const sourceMap: Record<string, { name: string; icon: React.ReactNode }> = {
      ai_conversation: { name: "محادثة تلقائية", icon: <Bot className="h-3.5 w-3.5" /> },
      manual: { name: "طلب يدوي", icon: <User className="h-3.5 w-3.5" /> },
      manual_order_modal: { name: "طلب يدوي", icon: <User className="h-3.5 w-3.5" /> },
      storefront: { name: "المتجر الإلكتروني", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
      woocommerce: { name: "WooCommerce", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
      api: { name: "API", icon: <Link2 className="h-3.5 w-3.5" /> },
      import: { name: "استيراد", icon: <Share2 className="h-3.5 w-3.5" /> },
      unknown: { name: "غير محدد", icon: <Globe className="h-3.5 w-3.5" /> },
    };

    return sourceMap[sourceType] || { name: "غير محدد", icon: <Globe className="h-3.5 w-3.5" /> };
  };

  const channelInfo = getChannelInfo();
  const sourceTypeInfo = getSourceTypeInfo();

  const parsedMetadata = React.useMemo(() => {
    if (!order.metadata) return {};
    if (typeof order.metadata === 'string') {
      try {
        return JSON.parse(order.metadata);
      } catch {
        return {};
      }
    }
    return order.metadata;
  }, [order.metadata]);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-card-foreground shadow-none space-y-4">
      <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
        <div className="h-8 w-8 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          مصدر الطلب
        </h3>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Created By User */}
        {(order.createdBy || order.createdByName || order.createdByUser) && (
          <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/60">
            <User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground mb-0.5">
                أنشئ بواسطة
              </div>
              <div className="font-medium text-foreground">
                {order.createdByUser
                  ? `${order.createdByUser.firstName} ${order.createdByUser.lastName}`
                  : order.createdByName || "موظف"}
              </div>
              {order.createdByUser?.email && (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {order.createdByUser.email}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Channel Info */}
        {channelInfo && (
          <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/60">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground mb-0.5">
                القناة
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums ${channelInfo.color}`}
                >
                  <span>{channelInfo.name}</span>
                </span>
                {order.conversationId && (
                  <Link
                    to={
                      order.conversation?.channel === "WHATSAPP" || (order.sourceType || "").includes("whatsapp")
                        ? `/whatsapp?conversationId=${order.conversationId}`
                        : `/facebook-inbox?conversation=${order.conversationId}`
                    }
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>عرض المحادثة</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Source Type */}
        <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/60">
          <Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground mb-0.5">
              نوع المصدر
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                {sourceTypeInfo.icon}
                <span>{sourceTypeInfo.name}</span>
              </span>
              {order.extractionMethod &&
                order.extractionMethod !== "manual" &&
                order.extractionMethod !== "storefront" &&
                (order.sourceType === "ai_conversation" || !!order.conversationId) && (
                  <span className="text-[11px] text-muted-foreground">
                    (
                    {order.extractionMethod === "ai_enhanced"
                      ? "استخراج محسّن"
                      : order.extractionMethod === "ai_basic"
                        ? "استخراج أساسي"
                        : order.extractionMethod}
                    )
                  </span>
                )}
            </div>
          </div>
        </div>

        {/* Affiliate Info */}
        {order.affiliateId && order.affiliate && (
          <div className="flex items-start gap-3 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground mb-0.5">
                مسوق بالعمولة
              </div>
              <div className="font-medium text-foreground">
                {order.affiliate.user
                  ? `${order.affiliate.user.firstName} ${order.affiliate.user.lastName}`
                  : "مسوق"}
              </div>
              {order.affiliate.affiliateCode && (
                <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  كود: {order.affiliate.affiliateCode}
                </div>
              )}
              {order.affiliate.user?.email && (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {order.affiliate.user.email}
                </div>
              )}
              <Link
                to={`/affiliates/management/${order.affiliateId}`}
                className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline mt-1 inline-block"
              >
                عرض التفاصيل
              </Link>
            </div>
          </div>
        )}

        {/* Order Source Badge */}
        {order.orderSource && order.orderSource !== "REGULAR" && (
          <div className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground mb-0.5">
                تصنيف الطلب
              </div>
              <div className="text-xs font-medium text-foreground">
                {order.orderSource === "AFFILIATE_REFERRAL" && "إحالة مسوق"}
                {order.orderSource === "AFFILIATE_DIRECT" && "طلب مباشر من مسوق"}
              </div>
            </div>
          </div>
        )}

        {/* Request Type Badge */}
        {parsedMetadata?.requestType && (
          <div className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground mb-0.5">
                نوع الطلب
              </div>
              <div className="text-xs font-medium text-foreground">
                {parsedMetadata.requestType === "delivery" && "طلب تسليم (عادي)"}
                {parsedMetadata.requestType === "partial_delivery" && "طلب تسليم جزئي"}
                {parsedMetadata.requestType === "return" && "طلب مرتجع"}
                {parsedMetadata.requestType === "exchange" && "طلب استبدال"}
              </div>
            </div>
          </div>
        )}

        {/* Previous Order Link (for Exchange / Return) */}
        {(parsedMetadata?.originalOrderNumber || parsedMetadata?.originalOrderId) && (
          <div className="flex items-start gap-3 p-3 bg-teal-500/5 rounded-lg border border-teal-500/20">
            <ArrowLeftRight className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground mb-0.5">
                الطلب السابق المرتبط بالاستبدال / المرتجع
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/orders?search=${encodeURIComponent(parsedMetadata.originalOrderNumber || parsedMetadata.originalOrderId)}`}
                  className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline"
                >
                  #{parsedMetadata.originalOrderNumber || parsedMetadata.originalOrderId}
                </Link>
                <span className="text-[11px] text-muted-foreground">
                  (فتح الطلب السابق)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Creation Time */}
        <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/60">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground mb-0.5">
              تاريخ الإنشاء
            </div>
            <div className="font-mono text-xs font-medium tabular-nums text-foreground">
              {formatDateTime(order.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSourceCard;
