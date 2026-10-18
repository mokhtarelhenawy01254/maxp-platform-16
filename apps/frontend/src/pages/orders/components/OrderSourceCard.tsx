import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  Sparkles,
  Clock,
  ArrowLeftRight,
  Package,
} from "lucide-react";
import { useDateFormat } from "../../../hooks/useDateFormat";
import {
  getChannelInfo,
  getSourceTypeInfo,
  parseOrderMetadata,
} from "./source-card/orderSourceHelpers";
import { OrderSourceCreatorRow } from "./source-card/OrderSourceCreatorRow";
import { OrderSourceChannelRow } from "./source-card/OrderSourceChannelRow";
import { OrderSourceAffiliateRow } from "./source-card/OrderSourceAffiliateRow";

export interface OrderSourceCardProps {
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

export const OrderSourceCard: React.FC<OrderSourceCardProps> = ({ order }) => {
  const { formatDateTime } = useDateFormat();

  const channelInfo = useMemo(() => getChannelInfo(order), [order]);
  const sourceTypeInfo = useMemo(() => getSourceTypeInfo(order), [order]);
  const parsedMetadata = useMemo(() => parseOrderMetadata(order.metadata), [order.metadata]);

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
        <OrderSourceCreatorRow
          createdBy={order.createdBy}
          createdByName={order.createdByName}
          createdByUser={order.createdByUser}
        />

        {/* Channel Info */}
        <OrderSourceChannelRow
          channelInfo={channelInfo}
          conversationId={order.conversationId}
          channel={order.conversation?.channel}
          sourceType={order.sourceType}
        />

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
        <OrderSourceAffiliateRow
          affiliateId={order.affiliateId}
          affiliate={order.affiliate}
        />

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
