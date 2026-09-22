import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { TurboTicketListPanel, TurboCategoryTab } from "./TurboTicketListPanel";
import { TurboTicketChatPanel } from "./TurboTicketChatPanel";
import { TurboNewTicketModal } from "./TurboNewTicketModal";
import { TurboTicketLogsModal } from "./TurboTicketLogsModal";
import { TurboTicketItem, TurboAccountItem } from "./types";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { playTicketNotificationChime } from "./ticketSoundUtils";
import {
  showBrowserNotification,
  requestBrowserNotificationPermission,
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
} from "../../../utils/browserNotifications";

interface TicketSnapshot {
  unreadCount: number;
  messagesCount: number;
  lastMsgId?: string | number;
  lastMsgCreatedAt?: string;
}

export const TurboTicketsCockpit: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlSearch =
    searchParams.get("search") ||
    searchParams.get("code") ||
    searchParams.get("q") ||
    "";
  const urlShouldOpenNew =
    searchParams.get("new") === "1" ||
    searchParams.get("new") === "true" ||
    searchParams.get("create") === "1";
  const urlShipmentCode =
    searchParams.get("code") || searchParams.get("shipmentCode") || "";

  // Settings & Status
  const [turboEnabled, setTurboEnabled] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Multi-account Turbo state
  const [accounts, setAccounts] = useState<TurboAccountItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  // Notification Permission State
  const [notificationPerm, setNotificationPerm] = useState<
    NotificationPermission | "unsupported"
  >(() => getBrowserNotificationPermission());

  // Tickets state
  const [tickets, setTickets] = useState<TurboTicketItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<TurboCategoryTab>("all");
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  // Active Ticket state & Fast Cache
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [activeTicket, setActiveTicket] = useState<TurboTicketItem | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const ticketDetailsCacheRef = useRef<Map<number, TurboTicketItem>>(new Map());
  const activeTicketRef = useRef<TurboTicketItem | null>(null);
  activeTicketRef.current = activeTicket;
  const selectedTicketIdRef = useRef<number | null>(null);
  selectedTicketIdRef.current = selectedTicketId;

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(urlShouldOpenNew);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Responsive state for mobile: 'list' | 'chat'
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Notification tracker refs
  const prevSnapshotRef = useRef<Map<number, TicketSnapshot>>(new Map());
  const isInitialLoadRef = useRef(true);


  // 1. Check if Turbo is enabled
  const checkTurboStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/store-settings/turbo");
      if (res.data?.success) {
        const enabled = Boolean(res.data.data?.turboEnabled);
        setTurboEnabled(enabled);
        return enabled;
      }
    } catch {
      // ignore
    }
    setTurboEnabled(false);
    return false;
  }, []);

  // 2. Fetch Connected Turbo Accounts
  const loadAccounts = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/turbo/accounts");
      if (res.data?.success) {
        const accs = res.data?.accounts || res.data?.data?.accounts || [];
        setAccounts(accs);
      }
    } catch {
      // ignore
    }
  }, []);

  // 3. Fetch Unread Count
  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/turbo/tickets/unread-count");
      if (res.data?.success) {
        const counts = res.data.data?.counts || res.data.counts || {};
        setUnreadCount(Number(counts.tickets || 0));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    if (!isBrowserNotificationSupported()) {
      toast.error("متصفحك لا يدعم إشعارات سطح المكتب");
      return;
    }
    if (notificationPerm === "granted") {
      playTicketNotificationChime();
      toast.info("الإشعارات الصوتية وسطح المكتب مفعلة بالفعل 🔔");
      return;
    }
    const perm = await requestBrowserNotificationPermission();
    if (perm === "granted") {
      setNotificationPerm("granted");
      playTicketNotificationChime();
      toast.success("تم تفعيل الإشعارات بنجاح");
    } else if (perm === "denied") {
      setNotificationPerm("denied");
      toast.error("تم حظر الإشعارات من إعدادات المتصفح");
    }
  };

  // 4. Fetch Tickets List
  const loadTickets = useCallback(
    async (
      currentPage = 1,
      currentFilter = statusFilter,
      currentSearch = searchQuery,
      currentAccount = selectedAccount,
      isSilent = false
    ) => {
      try {
        if (!isSilent) setLoadingList(true);
        let url = `/turbo/tickets?page=${currentPage}&per_page=15`;
        if (currentFilter && currentFilter !== "all") {
          url += `&status=${encodeURIComponent(currentFilter)}`;
        }
        if (currentSearch.trim()) {
          url += `&search=${encodeURIComponent(currentSearch.trim())}`;
        }
        if (currentAccount && currentAccount !== "all") {
          url += `&account=${encodeURIComponent(currentAccount)}`;
        }

        const res = await apiClient.get<any>(url);
        if (res.data?.success) {
          const list =
            res.data.data?.tickets ||
            res.data.tickets ||
            res.data.data?.feed?.data ||
            [];
          const pagination =
            res.data.data?.pagination || res.data.pagination || {};

          const rawTickets: TurboTicketItem[] = Array.isArray(list) ? list : [];
          const seenTicketIds = new Set<string>();
          const fetchedTickets = rawTickets.filter((t) => {
            const key = String(t.id);
            if (seenTicketIds.has(key)) return false;
            seenTicketIds.add(key);
            return true;
          });
          setTickets(fetchedTickets);
          setTotal(pagination.total || fetchedTickets.length);

          // Check for new incoming messages from Turbo operations
          fetchedTickets.forEach((t) => {
            const currentUnread = Number(
              t.un_read_messages_count ??
                t.unread_messages_count ??
                (t.unread ? 1 : 0) ??
                (t.is_seen === false ? 1 : 0) ??
                0
            );
            const currentMsgCount = (t.messages || t.replies || []).length;
            const prev = prevSnapshotRef.current.get(t.id);

            if (!isInitialLoadRef.current && prev) {
              const hasNewUnread = currentUnread > prev.unreadCount;
              const hasNewMsg = currentMsgCount > prev.messagesCount;

              if (hasNewUnread || hasNewMsg) {
                const lastMsg =
                  t.last_message ||
                  (t.messages && t.messages[t.messages.length - 1]);
                const isFromSupport = lastMsg
                  ? lastMsg.is_client_message === 0 ||
                    lastMsg.is_client_message === false
                  : true;

                if (isFromSupport) {
                  playTicketNotificationChime();
                  const snippet =
                    lastMsg?.content ||
                    lastMsg?.message ||
                    t.subject ||
                    "رسالة جديدة من خدمة عملاء تربو";
                  toast.info(
                    `رسالة جديدة بخصوص تذكرة #${t.id}${
                      t.code ? ` (${t.code})` : ""
                    }: ${snippet.slice(0, 60)}...`,
                    {
                      duration: 7000,
                      action: {
                        label: "عرض التذكرة",
                        onClick: () => handleSelectTicket(t),
                      },
                    }
                  );
                  showBrowserNotification({
                    title: `تذكرة تربو #${t.id}${t.code ? ` - ${t.code}` : ""}`,
                    body: snippet.slice(0, 90),
                    tag: `turbo-ticket-${t.id}-${Date.now()}`,
                    onClick: () => {
                      window.focus();
                      handleSelectTicket(t);
                    },
                  });
                }
              }
            }

            prevSnapshotRef.current.set(t.id, {
              unreadCount: currentUnread,
              messagesCount: currentMsgCount,
              lastMsgId: t.last_message?.id,
              lastMsgCreatedAt: t.last_message?.created_at,
            });
          });

          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
          }

          // If no ticket selected yet and tickets exist, select first on desktop
          if (!selectedTicketIdRef.current && fetchedTickets.length > 0 && window.innerWidth >= 768) {
            const firstTicket = fetchedTickets[0];
            if (firstTicket) {
              setSelectedTicketId(firstTicket.id);
            }
          }
        } else {
          setTickets([]);
          setTotal(0);
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "تعذر جلب التذاكر من تربو";
        if (!isSilent) toast.error(errMsg);
        setTickets([]);
        setTotal(0);
      } finally {
        if (!isSilent) setLoadingList(false);
      }
    },
    [statusFilter, searchQuery, selectedAccount]
  );

  // 5. Fetch Active Ticket Details with Fast SWR Cache (stable ref, zero infinite loop)
  const loadActiveTicketDetails = useCallback(
    async (ticketId: number, isSilent = false) => {
      try {
        const hasCache = ticketDetailsCacheRef.current.has(ticketId);
        if (!isSilent && !hasCache) setLoadingTicket(true);

        const res = await apiClient.get<any>(`/turbo/tickets/${ticketId}`);
        if (res.data?.success) {
          const ticketData =
            res.data.data?.ticket || res.data.ticket || res.data.data;
          if (ticketData) {
            // Save in in-memory cache for instant switching
            ticketDetailsCacheRef.current.set(ticketId, ticketData);

            const currentActive = activeTicketRef.current;
            if (isSilent && currentActive && currentActive.id === ticketId) {
              const prevLen = (currentActive.messages || currentActive.replies || []).length;
              const newLen = (ticketData.messages || ticketData.replies || []).length;
              if (newLen > prevLen) {
                const latest = (ticketData.messages || ticketData.replies || [])[newLen - 1];
                if (
                  latest &&
                  (latest.is_client_message === 0 || latest.is_client_message === false)
                ) {
                  playTicketNotificationChime();
                }
              }
            }
            setActiveTicket(ticketData);
          }
        }
      } catch {
        // If error, active ticket remains or shows fallback
      } finally {
        setLoadingTicket(false);
      }
    },
    []
  );


  // Initial Load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const enabled = await checkTurboStatus();
      if (isMounted && enabled) {
        loadAccounts();
        loadUnreadCount();
        loadTickets(1, statusFilter, urlSearch, "all");
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // When selectedTicketId changes, load details
  useEffect(() => {
    if (selectedTicketId) {
      loadActiveTicketDetails(selectedTicketId);
    } else {
      setActiveTicket(null);
    }
  }, [selectedTicketId, loadActiveTicketDetails]);

  // Periodic Background Polling (every 20s) for live updates and notifications
  useEffect(() => {
    if (!turboEnabled) return;

    const poll = () => {
      if (document.hidden) return;
      loadUnreadCount();
      loadTickets(page, statusFilter, searchQuery, selectedAccount, true);
      const curId = selectedTicketIdRef.current;
      if (curId) {
        loadActiveTicketDetails(curId, true);
      }
    };

    const interval = setInterval(poll, 20000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    turboEnabled,
    page,
    statusFilter,
    searchQuery,
    selectedAccount,
    loadUnreadCount,
    loadTickets,
    loadActiveTicketDetails,
  ]);

  const handleSelectTicket = (t: TurboTicketItem) => {
    setSelectedTicketId(t.id);

    // Instant 0ms SWR render: use full cached ticket if available, or item from list
    if (ticketDetailsCacheRef.current.has(t.id)) {
      setActiveTicket(ticketDetailsCacheRef.current.get(t.id)!);
    } else {
      setActiveTicket(t);
    }

    setMobileView("chat");

    // Optimistically clear unread badge in local list
    setTickets((prev) =>
      prev.map((item) =>
        item.id === t.id
          ? {
              ...item,
              un_read_messages_count: 0,
              unread_messages_count: 0,
              unread: false,
              is_seen: true,
            }
          : item
      )
    );

    // Update snapshot
    const snap = prevSnapshotRef.current.get(t.id);
    if (snap) {
      prevSnapshotRef.current.set(t.id, { ...snap, unreadCount: 0 });
    }

    // Refresh unread count in background to keep sidebar and header in sync
    setTimeout(() => {
      loadUnreadCount();
    }, 1200);
  };

  const handleAccountChange = (account: string) => {
    setSelectedAccount(account);
    setPage(1);
    loadTickets(1, statusFilter, searchQuery, account);
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setPage(1);
    loadTickets(1, filter, searchQuery, selectedAccount);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    loadTickets(1, statusFilter, query, selectedAccount);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadTickets(newPage, statusFilter, searchQuery, selectedAccount);
  };

  // On mobile, when viewing chat, mark body as chat-active so bottom nav is suppressed
  useEffect(() => {
    if (mobileView === "chat") {
      document.body.classList.add("app-shell-chat-active");
    } else {
      document.body.classList.remove("app-shell-chat-active");
    }
    return () => {
      document.body.classList.remove("app-shell-chat-active");
    };
  }, [mobileView]);

  // If Turbo is disabled, show prompt to enable it
  if (turboEnabled === false) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-right">
        <div className="max-w-md w-full p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <ExclamationCircleIcon className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            خدمة تذاكر وشات تربو غير مفعلة
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            لربط ومزامنة التذاكر والمحادثات الحية مع عمليات تربو، يرجى تفعيل
            الخدمة وإدخال الـ API Key وكود العميل في صفحة إعدادات Turbo.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate("/settings/turbo")}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition active:scale-97 shadow-xs"
            >
              الانتقال لإعدادات Turbo
            </button>
            <button
              type="button"
              onClick={() => navigate("/support/tickets")}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition active:scale-97"
            >
              تذاكر الدعم الفني للمنصة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 turbo-tickets-root relative"
      data-chat-active={mobileView === "chat" ? "true" : "false"}
    >
      {/* Cockpit Chassis */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full h-full">
        {/* Left/Sidebar Panel (Hidden on mobile when chat is active) */}
        <div
          className={`h-full min-h-0 flex-col overflow-hidden shrink-0 ${
            mobileView === "chat"
              ? "hidden md:flex md:w-80 lg:w-96"
              : "flex w-full md:w-80 lg:w-96"
          }`}
        >
          <TurboTicketListPanel
            tickets={tickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={handleSelectTicket}
            onOpenNewTicket={() => setIsNewModalOpen(true)}
            unreadCount={unreadCount}
            loading={loadingList}
            onRefresh={() => {
              loadTickets(page, statusFilter, searchQuery, selectedAccount);
              loadUnreadCount();
            }}
            page={page}
            total={total}
            perPage={15}
            onPageChange={handlePageChange}
            statusFilter={statusFilter}
            onChangeStatusFilter={handleFilterChange}
            categoryFilter={categoryFilter}
            onChangeCategoryFilter={setCategoryFilter}
            searchQuery={searchQuery}
            onChangeSearchQuery={handleSearchChange}
            accounts={accounts}
            selectedAccount={selectedAccount}
            onChangeAccount={handleAccountChange}
            desktopNotificationPermission={notificationPerm}
            onRequestNotificationPermission={handleRequestNotificationPermission}
          />
        </div>


        {/* Right/Chat Panel (Hidden on mobile when list is active) */}
        <div
          className={`flex-1 h-full min-h-0 min-w-0 flex flex-col overflow-hidden ${
            mobileView === "list" ? "hidden md:flex" : "flex w-full"
          }`}
        >
          <TurboTicketChatPanel
            ticket={activeTicket}
            loading={loadingTicket}
            onRefreshTicket={() => {
              if (selectedTicketId) loadActiveTicketDetails(selectedTicketId);
            }}
            onBackToList={() => setMobileView("list")}
            onOpenLogs={() => setIsLogsModalOpen(true)}
          />
        </div>
      </div>

      {/* New Ticket Modal */}
      <TurboNewTicketModal
        isOpen={isNewModalOpen}
        initialShipmentCode={urlShipmentCode}
        accounts={accounts}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(newId) => {
          loadTickets(1, statusFilter, searchQuery, selectedAccount);
          loadUnreadCount();
          if (newId) setSelectedTicketId(Number(newId));
        }}
      />

      {/* Ticket Logs Modal */}
      <TurboTicketLogsModal
        isOpen={isLogsModalOpen}
        ticketId={selectedTicketId}
        onClose={() => setIsLogsModalOpen(false)}
      />
    </div>
  );
};
