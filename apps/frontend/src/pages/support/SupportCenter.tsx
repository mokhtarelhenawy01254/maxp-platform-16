import React, { useState, useEffect, useRef } from "react";
import supportService, { type Ticket } from "../../services/supportService";
import {
  MessageSquare,
  Plus,
  Search,
  Send,
  X,
  Paperclip,
  Loader2,
  LifeBuoy,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";
import { NewTicketModal } from "./NewTicketModal";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return { label: "مفتوحة", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    case "in_progress":
      return { label: "قيد المتابعة", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
    case "closed":
      return { label: "مكتملة ومغلقة", style: "bg-muted text-muted-foreground border-border/60" };
    default:
      return { label: status, style: "bg-muted text-muted-foreground border-border/60" };
  }
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "أمس";
  return d.toLocaleDateString("ar-EG");
};

export default function SupportCenter() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      const res = await supportService.getUserTickets(params);
      setTickets(res?.tickets || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTickets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    try {
      const details = await supportService.getTicketDetails(ticket.ticketId);
      setMessages((details as any)?.ticket?.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("content", newMessage);
      await supportService.addMessage(selectedTicket.ticketId, fd);
      setNewMessage("");
      const details = await supportService.getTicketDetails(selectedTicket.ticketId);
      setMessages((details as any)?.ticket?.messages || []);
      void fetchTickets();
    } catch {
      // handled
    } finally {
      setSending(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = !searchTerm || t.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="mr-2 text-xs font-medium">جاري فتح مركز الدعم والمحادثات...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="h-[calc(100vh-5.5rem)] flex flex-col space-y-3">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-3.5 shadow-sm shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              الدعم والمساعدة
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">المحادثات المباشرة</span>
          </div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-primary" />
            مركز الدعم والمحادثات المباشرة (Support Cockpit)
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowNewTicket(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تذكرة جديدة</span>
          </button>
        </div>
      </div>

      {/* Main Split Cockpit Surface */}
      <div className="flex-1 min-h-0 bg-card border border-border/70 rounded-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Ticket Thread Selector */}
        <div
          className={`w-full md:w-80 lg:w-88 shrink-0 border-l border-border/70 bg-card flex flex-col ${
            selectedTicket ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search & Status Filters */}
          <div className="p-3 border-b border-border/60 space-y-2.5 bg-muted/15">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في التذاكر والمواضيع..."
                className="w-full h-8 pr-8 pl-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-1 text-[11px]">
              {[
                { key: "all", label: "الكل" },
                { key: "open", label: "مفتوحة" },
                { key: "in_progress", label: "قيد المتابعة" },
                { key: "closed", label: "مغلقة" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    statusFilter === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-muted-foreground">
                <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs">لا توجد محادثات تطابق الفلتر</p>
                <button
                  type="button"
                  onClick={() => setShowNewTicket(true)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  بدء محادثة جديدة
                </button>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const badge = getStatusBadge(ticket.status);
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => selectTicket(ticket)}
                    className={`w-full text-right p-3 transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-foreground font-medium"
                        : "hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold truncate flex-1">{ticket.subject}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
                        {formatDate(ticket.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${badge.style}`}>
                        {badge.label}
                      </span>
                      {ticket.messages?.length > 0 && (
                        <span className="text-[11px] text-muted-foreground truncate flex-1">
                          {ticket.messages[ticket.messages.length - 1]?.content?.slice(0, 50)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation Workspace */}
        <div className={`flex-1 min-w-0 flex flex-col bg-background ${!selectedTicket ? "hidden md:flex" : "flex"}`}>
          {selectedTicket ? (
            <>
              {/* Conversation Topbar */}
              <div className="px-4 py-2.5 border-b border-border/70 flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="md:hidden p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-foreground truncate">{selectedTicket.subject}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${getStatusBadge(selectedTicket.status).style}`}>
                        {getStatusBadge(selectedTicket.status).label}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                        ID: {selectedTicket.ticketId}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">لا توجد رسائل مسجلة بعد</p>
                ) : (
                  messages.map((msg, idx) => {
                    const isAdmin = msg.senderType === "admin";
                    return (
                      <div key={msg._id || idx} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] rounded-xl px-3.5 py-2 space-y-1 text-xs ${
                            isAdmin
                              ? "bg-card border border-border/70 text-foreground shadow-2xs"
                              : "bg-primary text-primary-foreground shadow-xs"
                          }`}
                        >
                          {isAdmin && (
                            <p className="text-[11px] font-bold text-primary mb-0.5">
                              {msg.sender?.name || "فريق الدعم الفني"}
                            </p>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          {msg.attachments?.length > 0 && (
                            <div className="pt-1 space-y-1">
                              {msg.attachments.map((att: any) => (
                                <a
                                  key={att.filename}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 text-[11px] underline ${
                                    isAdmin ? "text-primary" : "text-primary-foreground"
                                  }`}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span>{att.originalName}</span>
                                </a>
                              ))}
                            </div>
                          )}
                          <p
                            className={`text-[10px] font-mono text-right tabular-nums ${
                              isAdmin ? "text-muted-foreground" : "text-primary-foreground/75"
                            }`}
                          >
                            {formatDate(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-border/70 bg-card shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder={selectedTicket.status === "closed" ? "هذه التذكرة مغلقة" : "اكتب ردك هنا..."}
                    disabled={selectedTicket.status === "closed"}
                    className="flex-1 h-9 px-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending || selectedTicket.status === "closed"}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-xs font-semibold text-foreground">حدد محادثة من القائمة لعرض الرسائل</p>
              <p className="text-[11px] text-muted-foreground">أو انقر على تذكرة جديدة للتواصل مع الدعم</p>
            </div>
          )}
        </div>
      </div>

      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onCreated={fetchTickets}
        />
      )}
    </div>
  );
}
