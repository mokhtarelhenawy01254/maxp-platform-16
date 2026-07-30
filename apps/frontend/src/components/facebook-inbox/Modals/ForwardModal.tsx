import React, { useState } from "react";
import { X, Search, Navigation, User } from 'lucide-react';
import { getInboxCustomerAvatarUrl } from "../../../utils/imageUrl";

export interface ForwardConversation {
  id: string;
  // Unified inbox uses contactName/contactId/contactAvatar
  // Facebook inbox uses customerName/customerId/customerAvatar
  contactName?: string;
  contactId?: string;
  contactAvatar?: string | null;
  customerName?: string;
  customerId?: string;
  customerAvatar?: string;
  pageName?: string;
}

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForward: (targetConversationId: string) => Promise<void>;
  conversations: ForwardConversation[];
}

const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  onForward,
  conversations,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const getName = (c: ForwardConversation) => c.contactName || c.customerName || "";
  const getId = (c: ForwardConversation) => c.contactId || c.customerId || "";
  const getAvatar = (c: ForwardConversation) =>
    c.contactAvatar !== undefined ? c.contactAvatar : c.customerAvatar;

  const filteredConversations = conversations.filter(
    (c) =>
      getName(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.pageName &&
        c.pageName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleForward = async () => {
    if (!selectedConversationId) return;
    setSending(true);
    try {
      await onForward(selectedConversationId);
      onClose();
    } catch (error) {
      console.error("Forward failed", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="business-modal-surface flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden">
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--business-muted-line)" }}
        >
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--color-foreground)" }}
          >
            إعادة توجيه الرسالة
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="business-icon-button business-icon-button--sm"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="p-4"
          style={{ borderBottom: "1px solid var(--business-muted-line)" }}
        >
          <div className="relative">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-muted-foreground)" }}
              size={18}
            />
            <input
              type="text"
              placeholder="بحث عن محادثة..."
              className="business-chat-input w-full py-2 pl-4 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredConversations.length === 0 ? (
            <p
              className="py-4 text-center"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              لا توجد محادثات
            </p>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <button
                  type="button"
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className="business-dropdown-option rounded-2xl border"
                  style={
                    selectedConversationId === conv.id
                      ? {
                          background:
                            "color-mix(in srgb, var(--color-primary) 10%, white)",
                          borderColor:
                            "color-mix(in srgb, var(--color-primary) 18%, transparent)",
                        }
                      : { borderColor: "transparent" }
                  }
                >
                  {getInboxCustomerAvatarUrl(getId(conv), getAvatar(conv)) ? (
                    <img
                      src={getInboxCustomerAvatarUrl(
                        getId(conv),
                        getAvatar(conv),
                      )}
                      alt={getName(conv)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-border) 24%, white)",
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      <User size={20} />
                    </div>
                  )}
                  <div className="text-right flex-1">
                    <p
                      className="font-medium"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {getName(conv)}
                    </p>
                    <p
                      className="truncate text-xs"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {conv.pageName || "Facebook User"}
                    </p>
                  </div>
                  {selectedConversationId === conv.id && (
                    <div style={{ color: "var(--color-primary)" }}>
                      <Send size={18} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex justify-end gap-2 p-4"
          style={{ borderTop: "1px solid var(--business-muted-line)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="business-chip-button px-4 py-2"
            disabled={sending}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleForward}
            disabled={!selectedConversationId || sending}
            className={`business-chip-button flex items-center gap-2 px-6 py-2 ${
              !selectedConversationId || sending
                ? "cursor-not-allowed opacity-60"
                : ""
            }`}
            data-active={selectedConversationId && !sending}
          >
            {sending ? "جاري الإرسال..." : "إرسال"}
            {!sending && <Send size={16} className="rotate-180" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
