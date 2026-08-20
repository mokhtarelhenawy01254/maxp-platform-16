import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import InboxTabs from "../../components/facebook-inbox/InboxTabs/InboxTabs";
import ConversationItem from "../../components/facebook-inbox/ConversationList/ConversationItem";
import MessageBubble from "../../components/facebook-inbox/MessageBubble/MessageBubble";
import MessageInput from "../../components/facebook-inbox/MessageInput/MessageInput";
import ConversationActionsBar from "../../components/facebook-inbox/ConversationActionsBar/ConversationActionsBar";
import { NotesPanel } from "../../components/facebook-inbox/NotesPanel/NotesPanel";
import CustomerProfile from "../../components/facebook-inbox/CustomerProfile/CustomerProfile";
import {
  InboxTab,
  InboxConversation,
} from "../../types/inbox.types";
import { useInboxConversations } from "../../hooks/inbox/useInboxConversations";
import { useSendMessage } from "../../hooks/inbox/useSendMessage";
import { useConversationActions } from "../../hooks/inbox/useConversationActions";
import { useTagManagement } from "../../hooks/inbox/useTagManagement";
import useSocket from "../../hooks/useSocket";
import { useCompany } from "../../contexts/CompanyContext";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  Menu,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useDebounce } from "../../hooks/useDebounce";
import { socketService } from "../../services/socketService";
import { parseInboxConversationMetadata } from "../../utils/inboxConversationMetadata";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const TIKTOK_INBOX_PROFILE_COLUMN_STORAGE_KEY =
  "tiktokInboxProfileColumnVisible";

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

const TikTokInbox: React.FC = () => {
  const { t } = useTranslation();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const isMobile = useIsMobile(1024);

  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [showProfilePanel, setShowProfilePanel] = useState(() => {
    const stored = localStorage.getItem(TIKTOK_INBOX_PROFILE_COLUMN_STORAGE_KEY);
    return stored !== null ? stored === "true" : true;
  });

  const [showNotes, setShowNotes] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const {
    conversations,
    selectedConversation,
    messages,
    loading,
    loadingMessages,
    selectConversation,
    loadConversations,
    loadMessages,
    loadMoreMessages,
    addMessage,
    hasMore,
    hasMoreConversations,
    loadMoreConversations,
    updateSelectedConversation,
    selectedIds,
    toggleSelection,
    clearSelection,
    apiCounts,
    addConversationToList,
    markMessagesAsRead,
  } = useInboxConversations();

  const { sendMessage, isSending } = useSendMessage({
    selectedConversation,
    addMessage,
    updateSelectedConversation,
  });

  const {
    handleResolve,
    handleReopen,
    handleAssign,
    handleTogglePriority,
    handleToggleMute,
  } = useConversationActions({
    selectedConversation,
    updateSelectedConversation,
    conversations,
  });

  const [showFilters, setShowFilters] = useState(false);

  const loadConversationsTT = useCallback(
    (pageNum = 1, append = false, tab: string = activeTab, search?: string) => {
      loadConversations(pageNum, append, tab, search, "TIKTOK");
    },
    [loadConversations, activeTab]
  );

  const { addTags, updating: updatingTags } = useTagManagement();

  const handleTagsChange = useCallback(
    async (tags: string[]) => {
      if (!selectedConversation || !companyId) return;
      try {
        await addTags(selectedConversation.id, tags, companyId);
        loadConversationsTT(1, false, activeTab);
      } catch (error) {
        console.error("Failed to update tags:", error);
      }
    },
    [selectedConversation, companyId, addTags, activeTab, loadConversationsTT]
  );

  const tabCounts = useMemo(() => {
    const counts = {
      all: apiCounts.total || 0,
      unreplied: apiCounts.unreplied || 0,
      done: 0,
      main: 0,
      general: 0,
      requests: 0,
      spam: 0,
    };

    if (conversations.length > 0) {
      for (const conv of conversations) {
        switch (conv.tab) {
          case "done":
            counts.done++;
            break;
          case "main":
            counts.main++;
            break;
          case "general":
            counts.general++;
            break;
          case "requests":
            counts.requests++;
            break;
          case "spam":
            counts.spam++;
            break;
        }
      }
    }

    if (!apiCounts.total && conversations.length > 0) {
      counts.all = conversations.length;
    }

    return counts;
  }, [conversations, apiCounts]);

  useEffect(() => {
    loadConversationsTT(1, false, activeTab, debouncedSearch);
  }, [companyId, activeTab, debouncedSearch]);

  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      if (data?.channel !== "TIKTOK" && data?.platform !== "tiktok") return;
      if (data?.companyId !== companyId) return;

      if (
        selectedConversation &&
        data.conversationId === selectedConversation.id
      ) {
        addMessage(data);
      }

      loadConversationsTT(1, false, activeTab);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("new_conversation", () => loadConversationsTT(1, false, activeTab));

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("new_conversation");
    };
  }, [socket, selectedConversation, companyId, addMessage, activeTab, loadConversationsTT]);

  const handleTabChange = (tab: InboxTab) => {
    setActiveTab(tab);
    clearSelection();
  };

  const handleProfilePanelToggle = () => {
    setShowProfilePanel((prev) => {
      localStorage.setItem(TIKTOK_INBOX_PROFILE_COLUMN_STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const sidebarContent = (
    <>
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid #f3f4f6",
          background: "linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: "rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.18V12a4.85 4.85 0 01-5.58-2.44V6.69h5.58z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "white" }}>
              {t("tiktokInbox.title")}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
              {apiCounts.total > 0 ? t("tiktokInbox.conversationCount", { count: apiCounts.total }) : t("tiktokInbox.directMessages")}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder={t("tiktokInbox.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8, fontSize: 13, outline: "none",
              background: "rgba(255,255,255,0.2)", color: "white",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <InboxTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={tabCounts}
        onSearch={setSearchQuery}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            <div
              style={{
                width: 28, height: 28, border: "2px solid #e0f2fe",
                borderTop: "2px solid #00f2ea", borderRadius: "50%",
                animation: "spin 1s linear infinite", margin: "0 auto 10px",
              }}
            />
            {t("tiktokInbox.loading")}
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
            <div style={{ fontSize: 13 }}>{t("tiktokInbox.noMessages")}</div>
          </div>
        ) : (
          <>
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedConversation?.id === conv.id}
                isChecked={selectedIds.has(conv.id)}
                onSelect={() => {
                  selectConversation(conv);
                  if (isMobile) setShowMobileSidebar(false);
                }}
                onCheck={() => toggleSelection(conv.id)}
              />
            ))}
            {hasMoreConversations && (
              <button
                onClick={loadMoreConversations}
                style={{
                  width: "100%", padding: "10px", background: "none",
                  border: "none", color: "#00f2ea", fontSize: 13,
                  cursor: "pointer", borderTop: "1px solid #f3f4f6",
                }}
              >
                {t("tiktokInbox.loadMore")}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100dvh - 64px)",
        overflow: "hidden",
        background: "#f8fafc",
        direction: "rtl",
      }}
    >
      {isMobile && (
        <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
          <SheetContent side="right" className="w-[320px] p-0" style={{ direction: "rtl" }}>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {!isMobile && (
        <div
          style={{
            width: 340, minWidth: 280, maxWidth: 380,
            display: "flex", flexDirection: "column",
            borderLeft: "1px solid #e5e7eb", background: "white",
            flexShrink: 0,
          }}
        >
          {sidebarContent}
        </div>
      )}

      {isMobile && !selectedConversation && (
        <div
          style={{
            width: "100%", display: "flex", flexDirection: "column",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              padding: "12px 16px", display: "flex", alignItems: "center",
              justifyContent: "space-between", borderBottom: "1px solid #e5e7eb",
              background: "white",
            }}
          >
            <button
              onClick={() => setShowMobileSidebar(true)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 4, color: "#374151",
              }}
            >
              <Menu size={22} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
              {t("tiktokInbox.title")}
            </span>
            <div style={{ width: 30 }} />
          </div>
          <div
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "#9ca3af", padding: 30, textAlign: "center",
            }}
          >
            <div
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, opacity: 0.3,
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.18V12a4.85 4.85 0 01-5.58-2.44V6.69h5.58z" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              {t("tiktokInbox.selectConversation")}
            </div>
            <div style={{ fontSize: 13 }}>
              {t("tiktokInbox.selectConversationHint")}
            </div>
          </div>
        </div>
      )}

      {(selectedConversation || !isMobile) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#f8fafc" }}>
          {selectedConversation ? (
            <>
              <div
                style={{
                  padding: "12px 16px", background: "white",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {isMobile && (
                  <button
                    onClick={() => {
                      selectConversation(null);
                      setShowMobileSidebar(true);
                    }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "4px 8px", color: "#00f2ea", fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
                <ConversationActionsBar
                  conversation={selectedConversation}
                  onResolve={handleResolve}
                  onReopen={handleReopen}
                  onAssign={handleAssign}
                  onTogglePriority={handleTogglePriority}
                  onToggleMute={handleToggleMute}
                  onToggleNotes={() => setShowNotes((p) => !p)}
                  showNotes={showNotes}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={async () => {
                      if (!selectedConversation || !companyId) return;
                      const newStatus = selectedConversation.aiEnabled === false;
                      try {
                        await apiClient.put(`/conversations/${selectedConversation.id}`, {
                          aiEnabled: newStatus,
                          companyId,
                        });
                        updateSelectedConversation({
                          ...selectedConversation,
                          aiEnabled: newStatus,
                        });
                        loadConversationsTT(1, false, activeTab);
                      } catch (err) {
                        console.error("Failed to update AI reply status:", err);
                      }
                    }}
                    title={selectedConversation.aiEnabled !== false ? t("tiktokInbox.aiOff") : t("tiktokInbox.aiOn")}
                    style={{
                      background: selectedConversation.aiEnabled !== false ? "rgba(0,242,234,0.1)" : "none",
                      border: "none", cursor: "pointer",
                      color: selectedConversation.aiEnabled !== false ? "#00f2ea" : "#6b7280",
                      padding: 4, borderRadius: 6,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🤖</span>
                  </button>
                  {!isMobile && (
                    <button
                      onClick={handleProfilePanelToggle}
                      title={showProfilePanel ? t("tiktokInbox.hideProfile") : t("tiktokInbox.showProfile")}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#6b7280", padding: 4,
                      }}
                    >
                      {showProfilePanel ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                {loadingMessages ? (
                  <div style={{ textAlign: "center", color: "#9ca3af", padding: 30 }}>
                    {t("tiktokInbox.loadingMessages")}
                  </div>
                ) : (
                  <>
                    {hasMore && (
                      <button
                        onClick={loadMoreMessages}
                        style={{
                          display: "block", margin: "0 auto 12px",
                          background: "none", border: "1px solid #e5e7eb",
                          borderRadius: 8, padding: "6px 16px", fontSize: 12,
                          color: "#6b7280", cursor: "pointer",
                        }}
                      >
                        {t("tiktokInbox.loadOlder")}
                      </button>
                    )}
                    {messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        conversation={selectedConversation}
                        onCorrect={() => selectedConversation && loadMessages(selectedConversation.id)}
                      />
                    ))}
                  </>
                )}
              </div>

              {showNotes && (
                <NotesPanel
                  conversationId={selectedConversation.id}
                  customerId={selectedConversation.customerId}
                />
              )}

              <MessageInput
                conversation={selectedConversation}
                onSend={sendMessage}
                isSending={isSending}
                platform="tiktok"
              />
            </>
          ) : !isMobile ? (
            <div
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                color: "#9ca3af",
              }}
            >
              <div
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16, opacity: 0.3,
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.18V12a4.85 4.85 0 01-5.58-2.44V6.69h5.58z" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {t("tiktokInbox.selectConversation")}
              </div>
              <div style={{ fontSize: 13 }}>
                {t("tiktokInbox.selectConversationHint")}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!isMobile && showProfilePanel && selectedConversation && (
        <div
          style={{
            width: 300, minWidth: 260,
            borderRight: "1px solid #e5e7eb", background: "white",
            overflowY: "auto", flexShrink: 0,
          }}
        >
          <CustomerProfile
            conversation={selectedConversation}
            onTagsChange={handleTagsChange}
            updatingTags={updatingTags}
          />
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default TikTokInbox;
