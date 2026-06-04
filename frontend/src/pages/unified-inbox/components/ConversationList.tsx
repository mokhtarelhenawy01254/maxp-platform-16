import React from "react";
import { useTranslation } from "react-i18next";
import { InboxConversation } from "../../../types/inbox.types";
import ConversationItem from "./ConversationItem";
import { Search } from "lucide-react";

interface ConversationListProps {
  conversations: InboxConversation[];
  selectedConversation: InboxConversation | null;
  onSelectConversation: (conversation: InboxConversation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  loading,
  hasMore,
  onLoadMore,
  selectedIds,
  onToggleSelection,
}) => {
  const { t } = useTranslation();

  // Scroll handler for infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100 && !loading && hasMore) {
      onLoadMore();
    }
  };

  return (
    <div className="business-inbox-column w-80 flex-shrink-0 lg:w-96">
      <div
        className="business-inbox-header p-4"
        style={{ borderLeft: "1px solid var(--business-muted-line)" }}
      >
        <div className="relative">
          <input
            type="text"
            placeholder={t("common.search") || "بحث..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="business-chat-input w-full py-2 pr-4 pl-10"
          />
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-muted-foreground)" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {conversations.length === 0 && !loading ? (
          <div className="business-inbox-empty h-full p-4 text-center">
            <p className="mb-2">📭</p>
            <p>لا توجد محادثات</p>
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                isMultiSelected={selectedIds.has(conversation.id)}
                onToggleSelection={(e) => {
                  e?.stopPropagation();
                  onToggleSelection(conversation.id);
                }}
                onClick={() => onSelectConversation(conversation)}
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center p-4">
            <div
              className="h-6 w-6 animate-spin rounded-full border-b-2"
              style={{ borderColor: "var(--color-primary)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
