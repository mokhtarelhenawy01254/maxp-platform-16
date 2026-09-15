import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { TurboTicketListPanel } from "./TurboTicketListPanel";
import { TurboTicketChatPanel } from "./TurboTicketChatPanel";
import { TurboNewTicketModal } from "./TurboNewTicketModal";
import { TurboTicketLogsModal } from "./TurboTicketLogsModal";
import { TurboTicketItem } from "./types";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

export const TurboTicketsCockpit: React.FC = () => {
  const navigate = useNavigate();

  // Settings & Status
  const [turboEnabled, setTurboEnabled] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Tickets state
  const [tickets, setTickets] = useState<TurboTicketItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Active Ticket state
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [activeTicket, setActiveTicket] = useState<TurboTicketItem | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Responsive state for mobile: 'list' | 'chat'
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

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

  // 2. Fetch Unread Count
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

  // 3. Fetch Tickets List
  const loadTickets = useCallback(
    async (currentPage = 1, currentFilter = statusFilter, currentSearch = searchQuery) => {
      try {
        setLoadingList(true);
        let url = `/turbo/tickets?page=${currentPage}&per_page=15`;
        if (currentFilter && currentFilter !== "all") {
          url += `&status=${encodeURIComponent(currentFilter)}`;
        }
        if (currentSearch.trim()) {
          url += `&search=${encodeURIComponent(currentSearch.trim())}`;
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

          const fetchedTickets: TurboTicketItem[] = Array.isArray(list)
            ? list
            : [];
          setTickets(fetchedTickets);
          setTotal(pagination.total || fetchedTickets.length);

          // If no ticket selected yet and tickets exist, select first on desktop
          if (!selectedTicketId && fetchedTickets.length > 0 && window.innerWidth >= 768) {
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
        toast.error("تعذر جلب التذاكر من تربو");
        setTickets([]);
        setTotal(0);
      } finally {
        setLoadingList(false);
      }
    },
    [selectedTicketId, statusFilter, searchQuery]
  );

  // 4. Fetch Active Ticket Details
  const loadActiveTicketDetails = useCallback(async (ticketId: number) => {
    try {
      setLoadingTicket(true);
      const res = await apiClient.get<any>(`/turbo/tickets/${ticketId}`);
      if (res.data?.success) {
        const ticketData = res.data.data?.ticket || res.data.ticket || res.data.data;
        if (ticketData) {
          setActiveTicket(ticketData);
        }
      }
    } catch {
      // If error, active ticket remains or shows fallback
    } finally {
      setLoadingTicket(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const enabled = await checkTurboStatus();
      if (isMounted && enabled) {
        loadUnreadCount();
        loadTickets(1);
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

  // Periodic Polling (every 45s) for background updates
  useEffect(() => {
    if (!turboEnabled) return;
    const interval = setInterval(() => {
      loadUnreadCount();
      if (selectedTicketId) {
        loadActiveTicketDetails(selectedTicketId);
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [turboEnabled, selectedTicketId, loadUnreadCount, loadActiveTicketDetails]);

  const handleSelectTicket = (t: TurboTicketItem) => {
    setSelectedTicketId(t.id);
    setActiveTicket(t);
    setMobileView("chat");
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setPage(1);
    loadTickets(1, filter, searchQuery);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    loadTickets(1, statusFilter, query);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadTickets(newPage, statusFilter, searchQuery);
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
          <button
            type="button"
            onClick={() => navigate("/store-settings/turbo")}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition active:scale-97 shadow-xs"
          >
            الانتقال لإعدادات Turbo
          </button>
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
              loadTickets(page);
              loadUnreadCount();
            }}
            page={page}
            total={total}
            perPage={15}
            onPageChange={handlePageChange}
            statusFilter={statusFilter}
            onChangeStatusFilter={handleFilterChange}
            searchQuery={searchQuery}
            onChangeSearchQuery={handleSearchChange}
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
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(newId) => {
          loadTickets(1);
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
