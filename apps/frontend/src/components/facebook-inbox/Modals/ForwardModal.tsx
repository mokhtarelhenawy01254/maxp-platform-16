import React, { useState } from "react";
import { X, Search, Send, User, Share2, Loader2, Check } from "lucide-react";
import { getInboxCustomerAvatarUrl } from "../../../utils/imageUrl";

export interface ForwardConversation {
  id: string;
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
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
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
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/70 rounded-xl shadow-xl max-w-md w-full overflow-hidden text-foreground flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                إعادة توجيه الرسالة
              </h3>
              <p className="text-xs text-muted-foreground">
                اختر المحادثة المستهدفة لإعادة توجيه المحتوى إليها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors active:scale-95"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-border/60 bg-muted/10">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="بحث عن اسم العميل أو الصفحة..."
              className="w-full bg-background border border-border/70 rounded-lg pr-9 pl-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              لا توجد محادثات مطابقة لنتائج البحث
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConversationId === conv.id;
              const avatarUrl = getInboxCustomerAvatarUrl(getId(conv), getAvatar(conv));
              return (
                <button
                  type="button"
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border text-start transition-all active:scale-[0.99] ${
                    isSelected
                      ? "bg-primary/10 border-primary/40 text-foreground"
                      : "bg-muted/10 border-border/40 hover:bg-muted/40 hover:border-border/60 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={getName(conv)}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-border/60"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0 text-muted-foreground">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {getName(conv)}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">
                        {conv.pageName || "مستخدم فيسبوك"}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="p-1 rounded-full bg-primary text-primary-foreground shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 border-t border-border/60 bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all active:scale-[0.98]"
            disabled={sending}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleForward}
            disabled={!selectedConversationId || sending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>إعادة توجيه</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
