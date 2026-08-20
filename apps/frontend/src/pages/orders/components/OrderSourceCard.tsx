import React from "react";
import { Link } from "react-router-dom";
import {
  UserIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  UserGroupIcon,
  SparklesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
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

    const channel = order.conversation?.channel || "UNKNOWN";
    const channelMap: Record<
      string,
      { name: string; color: string; icon: string }
    > = {
      WHATSAPP: {
        name: "┘ê╪º╪¬╪│╪º╪¿",
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        icon: "≡ƒÆ¼",
      },
      FACEBOOK: {
        name: "┘ü┘è╪│╪¿┘ê┘â",
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
        icon: "≡ƒôÿ",
      },
      INSTAGRAM: {
        name: "╪º┘å╪│╪¬╪¼╪▒╪º┘à",
        color:
          "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400",
        icon: "≡ƒô╖",
      },
      TELEGRAM: {
        name: "╪¬┘è┘ä┘è╪¼╪▒╪º┘à",
        color: "bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400",
        icon: "Γ£ê∩╕Å",
      },
      WEBCHAT: {
        name: "╪º┘ä╪»╪▒╪»╪┤╪⌐ ╪º┘ä┘à╪¿╪º╪┤╪▒╪⌐",
        color:
          "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
        icon: "≡ƒÆ╗",
      },
    };

    return (
      channelMap[channel] || {
        name: channel,
        color:
          "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
        icon: "≡ƒô▒",
      }
    );
  };

  const getSourceTypeInfo = () => {
    // ┘à╪¡╪º┘ê┘ä╪⌐ ╪¬╪¡╪»┘è╪» ╪º┘ä┘à╪╡╪»╪▒ ┘à┘å ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐
    let sourceType = order.sourceType;

    // ╪º┘ä╪¬╪¡┘é┘é ┘à┘å extractionMethod ╪ú┘ê┘ä╪º┘ï
    if (
      order.extractionMethod === "manual" ||
      order.extractionMethod === "manual_order_modal"
    ) {
      sourceType = "manual";
    }
    // ╪Ñ╪░╪º ┘ä┘à ┘è┘â┘å ┘ç┘å╪º┘â sourceType ╪ú┘ê ┘â╪º┘å unknown╪î ┘å╪¡╪º┘ê┘ä ╪º┘ä╪¬╪«┘à┘è┘å
    else if (
      !sourceType ||
      sourceType === "unknown" ||
      (sourceType === "ai_conversation" && !order.conversationId)
    ) {
      if (order.conversationId) {
        sourceType = "ai_conversation";
      } else if (order.createdBy || order.createdByName) {
        sourceType = "manual";
      } else if (
        order.metadata?.source === "storefront" ||
        order.metadata?.isGuestOrder
      ) {
        sourceType = "storefront";
      } else {
        sourceType = "unknown";
      }
    }

    const sourceMap: Record<string, { name: string; icon: string }> = {
      ai_conversation: { name: "┘à╪¡╪º╪»╪½╪⌐ ╪¬┘ä┘é╪º╪ª┘è╪⌐", icon: "≡ƒÆ¼" },
      manual: { name: "╪╖┘ä╪¿ ┘è╪»┘ê┘è", icon: "Γ£ì∩╕Å" },
      manual_order_modal: { name: "╪╖┘ä╪¿ ┘è╪»┘ê┘è", icon: "Γ£ì∩╕Å" },
      storefront: { name: "╪º┘ä┘à╪¬╪¼╪▒ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è", icon: "≡ƒ¢Æ" },
      woocommerce: { name: "WooCommerce", icon: "≡ƒ¢ì∩╕Å" },
      api: { name: "API", icon: "≡ƒöî" },
      import: { name: "╪º╪│╪¬┘è╪▒╪º╪»", icon: "≡ƒôÑ" },
      unknown: { name: "╪║┘è╪▒ ┘à╪¡╪»╪»", icon: "Γ¥ô" },
    };

    return sourceMap[sourceType] || { name: "╪║┘è╪▒ ┘à╪¡╪»╪»", icon: "≡ƒôï" };
  };

  const channelInfo = getChannelInfo();
  const sourceTypeInfo = getSourceTypeInfo();

  // Safely parse metadata since it could be a JSON string from backend
  const parsedMetadata = React.useMemo(() => {
    if (!order.metadata) return {};
    if (typeof order.metadata === 'string') {
      try {
        return JSON.parse(order.metadata);
      } catch (e) {
        return {};
      }
    }
    return order.metadata;
  }, [order.metadata]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
          <SparklesIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          ┘à╪╡╪»╪▒ ╪º┘ä╪╖┘ä╪¿
        </h3>
      </div>

      <div className="space-y-4">
        {/* Created By User */}
        {(order.createdBy || order.createdByName || order.createdByUser) && (
          <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <UserIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                ╪ú┘å╪┤╪ª ╪¿┘ê╪º╪│╪╖╪⌐
              </div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {order.createdByUser
                  ? `${order.createdByUser.firstName} ${order.createdByUser.lastName}`
                  : order.createdByName || "┘à┘ê╪╕┘ü"}
              </div>
              {order.createdByUser?.email && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {order.createdByUser.email}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Channel Info */}
        {channelInfo && (
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200 dark:border-gray-700">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                ╪º┘ä┘é┘å╪º╪⌐
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${channelInfo.color}`}
                >
                  <span>{channelInfo.icon}</span>
                  <span>{channelInfo.name}</span>
                </span>
                {order.conversationId && (
                  <Link
                    to={`/whatsapp?conversationId=${order.conversationId}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    ╪╣╪▒╪╢ ╪º┘ä┘à╪¡╪º╪»╪½╪⌐
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Source Type */}
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200 dark:border-gray-700">
          <GlobeAltIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              ┘å┘ê╪╣ ╪º┘ä┘à╪╡╪»╪▒
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {sourceTypeInfo.icon} {sourceTypeInfo.name}
              </span>
              {order.extractionMethod &&
                order.extractionMethod !== "manual" && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (
                    {order.extractionMethod === "ai_enhanced"
                      ? "╪º╪│╪¬╪«╪▒╪º╪¼ ┘à╪¡╪│┘æ┘å"
                      : order.extractionMethod === "ai_basic"
                        ? "╪º╪│╪¬╪«╪▒╪º╪¼ ╪ú╪│╪º╪│┘è"
                        : order.extractionMethod}
                    )
                  </span>
                )}
            </div>
          </div>
        </div>

        {/* Affiliate Info */}
        {order.affiliateId && order.affiliate && (
          <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
            <UserGroupIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                ┘à╪│┘ê┘é ╪¿╪º┘ä╪╣┘à┘ê┘ä╪⌐
              </div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {order.affiliate.user
                  ? `${order.affiliate.user.firstName} ${order.affiliate.user.lastName}`
                  : "┘à╪│┘ê┘é"}
              </div>
              {order.affiliate.affiliateCode && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ┘â┘ê╪»: {order.affiliate.affiliateCode}
                </div>
              )}
              {order.affiliate.user?.email && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {order.affiliate.user.email}
                </div>
              )}
              <Link
                to={`/affiliates/management/${order.affiliateId}`}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1 inline-block"
              >
                ╪╣╪▒╪╢ ╪º┘ä╪¬┘ü╪º╪╡┘è┘ä
              </Link>
            </div>
          </div>
        )}

        {/* Order Source Badge */}
        {order.orderSource && order.orderSource !== "REGULAR" && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
            <SparklesIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                ╪¬╪╡┘å┘è┘ü ╪º┘ä╪╖┘ä╪¿
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {order.orderSource === "AFFILIATE_REFERRAL" && "≡ƒöù ╪Ñ╪¡╪º┘ä╪⌐ ┘à╪│┘ê┘é"}
                {order.orderSource === "AFFILIATE_DIRECT" &&
                  "≡ƒæñ ╪╖┘ä╪¿ ┘à╪¿╪º╪┤╪▒ ┘à┘å ┘à╪│┘ê┘é"}
              </div>
            </div>
          </div>
        )}

        {/* Request Type Badge */}
        {parsedMetadata?.requestType && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
            <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                ┘å┘ê╪╣ ╪º┘ä╪╖┘ä╪¿
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {parsedMetadata.requestType === "delivery" && "≡ƒôª ╪╖┘ä╪¿ ╪¬╪│┘ä┘è┘à (╪╣╪º╪»┘è)"}
                {parsedMetadata.requestType === "partial_delivery" && "≡ƒôª ╪╖┘ä╪¿ ╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è"}
                {parsedMetadata.requestType === "return" && "≡ƒöä ╪╖┘ä╪¿ ┘à╪▒╪¬╪¼╪╣"}
                {parsedMetadata.requestType === "exchange" && "≡ƒöÇ ╪╖┘ä╪¿ ╪º╪│╪¬╪¿╪»╪º┘ä"}
              </div>
            </div>
          </div>
        )}

        {/* Creation Time */}
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200 dark:border-gray-700">
          <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              ╪¬╪º╪▒┘è╪« ╪º┘ä╪Ñ┘å╪┤╪º╪í
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatDateTime(order.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSourceCard;
