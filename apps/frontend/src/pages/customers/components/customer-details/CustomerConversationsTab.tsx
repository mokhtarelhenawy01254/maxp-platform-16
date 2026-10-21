import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/hooks/useDateFormat";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { CustomerDetailsData } from "./types";

interface CustomerConversationsTabProps {
  conversations: CustomerDetailsData["recentConversations"];
}

export const CustomerConversationsTab: React.FC<CustomerConversationsTabProps> = ({
  conversations,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  if (conversations.length === 0) {
    return (
      <p className="text-center text-xs sm:text-sm text-zinc-500 py-8">
        {t("customers.noConversations")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50"
        >
          <div className="flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white">
                {conv.channel}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{conv.status}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400 font-mono tabular-nums">
            {formatDate(conv.lastMessageAt || conv.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
};
