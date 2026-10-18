import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ExternalLink } from "lucide-react";
import type { ChannelInfo } from "./orderSourceHelpers";

export interface OrderSourceChannelRowProps {
  channelInfo: ChannelInfo | null;
  conversationId?: string;
  channel?: string;
  sourceType?: string;
}

export const OrderSourceChannelRow: React.FC<OrderSourceChannelRowProps> = ({
  channelInfo,
  conversationId,
  channel,
  sourceType,
}) => {
  if (!channelInfo) return null;

  return (
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
          {conversationId && (
            <Link
              to={
                channel === "WHATSAPP" || (sourceType || "").includes("whatsapp")
                  ? `/whatsapp?conversationId=${conversationId}`
                  : `/facebook-inbox?conversation=${conversationId}`
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
  );
};

export default OrderSourceChannelRow;
