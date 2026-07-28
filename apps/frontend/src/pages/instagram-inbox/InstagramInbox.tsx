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

const INSTAGRAM_INBOX_PROFILE_COLUMN_STORAGE_KEY =
  "instagramInboxProfileColumnVisible";

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

const InstagramInbox: React.FC = () => {
  const { t } = useTranslation();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const isMobile = useIsMobile(1024);

  // Active tab
  const [activeTab, setActiveTab] = useState<InboxTab>("all");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Profile panel
  const [showProfilePanel, setShowProfilePanel] = useState(() => {
    const stored = localStorage.getItem(INSTAGRAM_INBOX_PROFILE_COLUMN_STORAGE_KEY);
    return stored !== null ? stored === "true" : true;
  });

  // Notes panel
  const [showNotes, setShowNotes] = useState(false);

  // Mobile sidebar
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Inbox hook — filter to INSTAGRAM channel
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
    selectAll,
    clearSelection,
    apiCounts,
    addConversationToList,
    markMessagesAsRead,
  } = useInboxConversations();

  // Send message hook
  const { sendMessage, isSending } = useSendMessage({
    selectedConversation,
    addMessage,
    updateSelectedConversation,
  });

  // Conversation actions
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

  // Load conversations filtered to INSTAGRAM channel
  const loadConversationsIG = useCallback(
    (pageNum = 1, append = false, tab: string = activeTab, search?: string) => {
      loadConversations(pageNum, append, tab, search, "INSTAGRAM");
    },
    [loadConversations, activeTab]
  );

  // Tag management
  const { addTags, updating: updatingTags } = useTagManagement();

  const handleTagsChange = useCallback(
    async (tags: string[]) => {
      if (!selectedConversation || !companyId) return;
      try {
        await addTags(selectedConversation.id, tags, companyId);
        loadConversationsIG(1, false, activeTab);
      } catch (error) {
        console.error("Failed to update tags:", error);
      }
    },
    [selectedConversation, companyId, addTags, activeTab, loadConversationsIG]
  );

  // Tab counts
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

  // Initial load
  useEffect(() => {
    loadConversationsIG(1, false, activeTab, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, activeTab, debouncedSearch]);

  // Socket — listen for new Instagram messages
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      if (data?.channel !== "INSTAGRAM" && data?.platform !== "instagram") return;
      if (data?.companyId !== companyId) return;

      if (
        selectedConversation &&
        data.conversationId === selectedConversation.id
      ) {
        addMessage(data);
      }

      loadConversationsIG(1, false, activeTab);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("new_conversation", () => loadConversationsIG(1, false, activeTab));

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("new_conversation");
    };
  }, [socket, selectedConversation, companyId, addMessage, activeTab, loadConversationsIG]);

  const handleTabChange = (tab: InboxTab) => {
    setActiveTab(tab);
    clearSelection();
  };

  const handleProfilePanelToggle = () => {
    setShowProfilePanel((prev) => {
      localStorage.setItem(INSTAGRAM_INBOX_PROFILE_COLUMN_STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid #f3f4f6",
          background: "linear-gradient(135deg, #fdf2f8 0%, white 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
              {t("instagramInbox.title")}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {apiCounts.total > 0 ? t("instagramInbox.conversationCount", { count: apiCounts.total }) : t("instagramInbox.directMessages")}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder={t("instagramInbox.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb",
              borderRadius: 8, fontSize: 13, outline: "none",
              background: "#f9fafb", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <InboxTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={tabCounts}
        onSearch={setSearchQuery}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Conversations list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            <div
              style={{
                width: 28, height: 28, border: "2px solid #fce7f3",
                borderTop: "2px solid #db2777", borderRadius: "50%",
                animation: "spin 1s linear infinite", margin: "0 auto 10px",
              }}
            />
            {t("instagramInbox.loading")}
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13 }}>{t("instagramInbox.noMessages")}</div>
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
                  border: "none", color: "#db2777", fontSize: 13,
                  cursor: "pointer", borderTop: "1px solid #f3f4f6",
                }}
              >
                {t("instagramInbox.loadMore")}
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
      {/* ─── Mobile: Sheet Drawer ── */}
      {isMobile && (
        <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
          <SheetContent side="right" className="w-[320px] p-0" style={{ direction: "rtl" }}>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* ─── Desktop: Fixed Sidebar ── */}
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

      {/* ─── Mobile hamburger ── */}
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
              {t("instagramInbox.title")}
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
                background: "linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, opacity: 0.3,
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              {t("instagramInbox.selectConversation")}
            </div>
            <div style={{ fontSize: 13 }}>
              {t("instagramInbox.selectConversationHint")}
            </div>
          </div>
        </div>
      )}

      {/* ─── Center: Chat Area ── */}
      {(selectedConversation || !isMobile) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#f8fafc" }}>
          {selectedConversation ? (
            <>
              {/* Chat header */}
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
                      padding: "4px 8px", color: "#db2777", fontSize: 13,
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
                        loadConversationsIG(1, false, activeTab);
                      } catch (err) {
                        console.error("Failed to update AI reply status:", err);
                      }
                    }}
                    title={selectedConversation.aiEnabled !== false ? t("instagramInbox.aiOff") : t("instagramInbox.aiOn")}
                    style={{
                      background: selectedConversation.aiEnabled !== false ? "rgba(59,130,246,0.1)" : "none",
                      border: "none", cursor: "pointer",
                      color: selectedConversation.aiEnabled !== false ? "#3b82f6" : "#6b7280",
                      padding: 4, borderRadius: 6,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🤖</span>
                  </button>
                  {!isMobile && (
                    <button
                      onClick={handleProfilePanelToggle}
                      title={showProfilePanel ? t("instagramInbox.hideProfile") : t("instagramInbox.showProfile")}
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

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                {loadingMessages ? (
                  <div style={{ textAlign: "center", color: "#9ca3af", padding: 30 }}>
                    {t("instagramInbox.loadingMessages")}
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
                        {t("instagramInbox.loadOlder")}
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

              {/* Notes panel */}
              {showNotes && (
                <NotesPanel
                  conversationId={selectedConversation.id}
                  customerId={selectedConversation.customerId}
                />
              )}

              {/* Message input */}
              <MessageInput
                conversation={selectedConversation}
                onSend={sendMessage}
                isSending={isSending}
                platform="instagram"
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
                  background: "linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16, opacity: 0.3,
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {t("instagramInbox.selectConversation")}
              </div>
              <div style={{ fontSize: 13 }}>
                {t("instagramInbox.selectConversationHint")}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ─── Right Panel: Customer Profile (Desktop only) ── */}
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

export default InstagramInbox;
