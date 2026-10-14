import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import supportService, { Ticket } from "../../services/supportService";
import TicketsSidebar from "./components/TicketsSidebar";
import ChatArea from "./components/ChatArea";
import DetailsPanel from "./components/DetailsPanel";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  LifeBuoy,
  Plus,
  Layers,
  CheckCircle2,
  Clock,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

export const MyTickets: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);

  const ticketIdFromUrl = searchParams.get("ticket");

  useEffect(() => {
    void fetchTickets();
  }, []);

  useEffect(() => {
    if (ticketIdFromUrl && tickets.length > 0) {
      const ticket = tickets.find((t) => t.ticketId === ticketIdFromUrl);
      if (ticket) {
        void handleTicketSelect(ticketIdFromUrl);
      }
    } else if (tickets.length > 0 && !activeTicket) {
      void handleTicketSelect(tickets[0].ticketId);
    }
  }, [ticketIdFromUrl, tickets]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "100" });
      const data = await supportService.getUserTickets(params);
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSelect = async (ticketId: string) => {
    try {
      setTicketLoading(true);
      setSearchParams({ ticket: ticketId });
      const data = await supportService.getTicketDetails(ticketId);
      if (data.success) {
        setActiveTicket(data.ticket);
        if (user?.role === "SUPER_ADMIN" && data.ticket.userId) {
          void fetchUserHistory(data.ticket.userId.id, ticketId);
        }
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
    } finally {
      setTicketLoading(false);
    }
  };

  const fetchUserHistory = async (userId: string, currentTicketId: string) => {
    try {
      const data = await supportService.getUserTicketHistory(userId, currentTicketId);
      if (data.success) {
        setUserHistory(data.tickets || []);
      }
    } catch (error) {
      console.error("Error fetching user history:", error);
    }
  };

  const handleSendMessage = async (content: string, attachments: File[]) => {
    if (!activeTicket) return;
    try {
      const formData = new FormData();
      formData.append("content", content);
      attachments.forEach((file) => formData.append("attachments", file));
      const data = await supportService.addMessage(activeTicket.ticketId, formData);
      if (data.success) {
        const updatedData = await supportService.getTicketDetails(activeTicket.ticketId);
        if (updatedData.success) {
          setActiveTicket(updatedData.ticket);
          setTickets((prev) =>
            prev.map((t) =>
              t.ticketId === activeTicket.ticketId ? updatedData.ticket : t
            )
          );
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!activeTicket) return;
    try {
      const data = await supportService.updateTicketStatus(activeTicket.ticketId, status);
      if (data.success) {
        setActiveTicket((prev) => (prev ? { ...prev, status } : null));
        setTickets((prev) =>
          prev.map((t) => (t.ticketId === activeTicket.ticketId ? { ...t, status } : t))
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!activeTicket) return;
    try {
      const data = await supportService.updateTicketPriority(activeTicket.ticketId, priority);
      if (data.success) {
        setActiveTicket((prev) => (prev ? { ...prev, priority } : null));
        setTickets((prev) =>
          prev.map((t) => (t.ticketId === activeTicket.ticketId ? { ...t, priority } : t))
        );
      }
    } catch (error) {
      console.error("Error updating priority:", error);
    }
  };

  const handleNewTicket = () => {
    navigate("/support/tickets/new");
  };

  const openTicketsCount = tickets.filter((t) => t.status !== "closed").length;
  const closedTicketsCount = tickets.filter((t) => t.status === "closed").length;

  return (
    <div dir="rtl" className="h-[calc(100vh-5rem)] flex flex-col space-y-3">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-3.5 shadow-sm shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              الدعم الفني
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">تذاكر الدعم</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-primary" />
            منصة تذاكر الدعم الفني والمتابعة (Ticket Console)
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1 bg-muted/40 rounded-lg border border-border/60 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-muted-foreground">مفتوحة:</span>
              <span className="font-mono font-bold text-foreground tabular-nums">{openTicketsCount}</span>
            </div>
            <div className="h-3 w-px bg-border/80" />
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-muted-foreground">مغلقة:</span>
              <span className="font-mono font-bold text-foreground tabular-nums">{closedTicketsCount}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDetailsPanel((prev) => !prev)}
            className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="تبديل عرض اللوحة الجانبية"
          >
            {showDetailsPanel ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleNewTicket}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تذكرة جديدة</span>
          </button>
        </div>
      </div>

      {/* 3-Column Single Surface Chassis */}
      <div className="flex-1 min-h-0 bg-card border border-border/70 rounded-xl overflow-hidden flex flex-col lg:flex-row">
        {/* Column 1: Tickets Sidebar */}
        <div className="w-80 shrink-0 hidden lg:block border-l border-border/70">
          <TicketsSidebar
            tickets={tickets}
            activeTicketId={activeTicket?.ticketId || null}
            onTicketSelect={handleTicketSelect}
            onNewTicket={handleNewTicket}
            loading={loading}
          />
        </div>

        {/* Column 2: Chat Area */}
        <div className="flex-1 min-w-0 bg-background flex flex-col">
          <ChatArea
            ticket={activeTicket}
            onSendMessage={handleSendMessage}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            loading={ticketLoading}
          />
        </div>

        {/* Column 3: Details Panel */}
        {showDetailsPanel && (
          <div className="w-80 shrink-0 hidden xl:block border-r border-border/70 bg-card">
            <DetailsPanel ticket={activeTicket} userHistory={userHistory} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
