import React, { useState, useEffect, useCallback } from "react";
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  BuildingOffice2Icon,
  TagIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface CarrierMessage {
  id: string;
  ticketId: string;
  direction: "INBOUND" | "OUTBOUND";
  externalId: string;
  body: string;
  authorName?: string;
  sentAt?: string;
  createdAt: string;
}

interface CarrierTicketThread {
  id: string;
  companyId: string;
  providerKey: string;
  externalId: string;
  orderId?: string | null;
  shipmentId?: string | null;
  code?: string | null;
  subject?: string | null;
  status: string;
  lastMessageAt?: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  messages?: CarrierMessage[];
}

export const CarrierInboxPage: React.FC = () => {
  const [threads, setThreads] = useState<CarrierTicketThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<CarrierTicketThread | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>("");
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = statusFilter === "all"
        ? "/api/v1/shipping-agent/threads"
        : `/api/v1/shipping-agent/threads?status=${encodeURIComponent(statusFilter)}`;

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success && Array.isArray(data.threads)) {
        setThreads(data.threads);
        if (data.threads.length > 0 && !selectedThread) {
          fetchThreadDetail(data.threads[0].id);
        }
      } else {
        setThreads([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "فشل تحميل محادثات شركات الشحن");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchThreadDetail = async (threadId: string) => {
    try {
      const res = await fetch(`/api/v1/shipping-agent/threads/${threadId}`, { credentials: "include" });
      const data = await res.json();
      if (data.success && data.thread) {
        setSelectedThread(data.thread);
        // Refresh unread count in thread list
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
        );
      }
    } catch (err: any) {
      console.error("Failed to load thread detail:", err);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/v1/shipping-agent/threads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ providerKey: "DEMO", code: "QA-SHIP-001" }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchThreads();
        if (data.threadId) {
          await fetchThreadDetail(data.threadId);
        }
      }
    } catch (err: any) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/v1/shipping-agent/threads/${selectedThread.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        await fetchThreadDetail(selectedThread.id);
        await fetchThreads();
      } else {
        alert(data.error || "فشل إرسال الرد");
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء الإرسال");
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseThread = async () => {
    if (!selectedThread) return;
    if (!window.confirm("هل أنت متأكد من إغلاق هذه المحادثة؟")) return;

    try {
      const res = await fetch(`/api/v1/shipping-agent/threads/${selectedThread.id}/close`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        await fetchThreadDetail(selectedThread.id);
        await fetchThreads();
      }
    } catch (err: any) {
      alert(err.message || "فشل إغلاق المحادثة");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">مفتوحة</span>;
      case "PENDING_MERCHANT":
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">في انتظار الرد</span>;
      case "RESOLVED":
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">تم الرد</span>;
      case "CLOSED":
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">مغلقة</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ChatBubbleLeftRightIcon className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                محادثات شركات الشحن
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                T26 AI Agent
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              متابعة تذاكر ورسائل شركات الشحن والردود الآلية والموافقات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="text-sm border border-border rounded-lg bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="OPEN">مفتوحة</option>
            <option value="PENDING_MERCHANT">في انتظار الرد</option>
            <option value="RESOLVED">تم الرد</option>
            <option value="CLOSED">مغلقة</option>
          </select>

          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <ArrowPathIcon className={`size-4 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "جاري المزامنة..." : "مزامنة الرسائل"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Main Inbox Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[720px] bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Threads List Sidebar */}
        <div className="md:col-span-5 lg:col-span-4 border-l border-border flex flex-col h-full bg-muted/10">
          <div className="p-3 border-b border-border bg-muted/20 font-medium text-sm flex items-center justify-between">
            <span>المحادثات ({threads.length})</span>
            {threads.some((t) => t.unreadCount > 0) && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0)} جديد
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <ArrowPathIcon className="size-4 animate-spin" />
                <span>جاري تحميل المحادثات...</span>
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                لا توجد محادثات مطابقة. اضغط &quot;مزامنة الرسائل&quot; للتحديث.
              </div>
            ) : (
              threads.map((thread) => {
                const isSelected = selectedThread?.id === thread.id;
                const isDemo = thread.providerKey === "DEMO";
                return (
                  <div
                    key={thread.id}
                    onClick={() => fetchThreadDetail(thread.id)}
                    className={`p-3.5 cursor-pointer transition-colors hover:bg-muted/30 ${
                      isSelected ? "bg-primary/10 border-r-4 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground">
                          {thread.code || thread.externalId}
                        </span>
                        {isDemo ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            DEMO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
                            {thread.providerKey}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(thread.status)}
                    </div>

                    <p className="text-xs text-foreground/80 line-clamp-1 mb-1">
                      {thread.subject || "استفسار ومتابعة الشحنة"}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="size-3" />
                        {thread.lastMessageAt
                          ? new Date(thread.lastMessageAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
                          : "الآن"}
                      </span>
                      {thread.unreadCount > 0 && (
                        <span className="bg-red-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message Thread Details */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-background">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-foreground">
                      تذكرة شحن: {selectedThread.code || selectedThread.externalId}
                    </h2>
                    {selectedThread.providerKey === "DEMO" && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                        وضع الاختبار DEMO
                      </span>
                    )}
                    {getStatusBadge(selectedThread.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedThread.subject || "متابعة الشحنة وتأكيد بيانات العميل"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedThread.status !== "CLOSED" && (
                    <button
                      onClick={handleCloseThread}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                      إغلاق المحادثة
                    </button>
                  )}
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
                {selectedThread.messages && selectedThread.messages.length > 0 ? (
                  selectedThread.messages.map((msg) => {
                    const isInbound = msg.direction === "INBOUND";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isInbound
                              ? "bg-card border border-border text-foreground rounded-br-none"
                              : "bg-primary text-primary-foreground rounded-bl-none"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[11px] mb-1 opacity-80">
                            <span className="font-semibold">
                              {msg.authorName || (isInbound ? "شركة الشحن" : "المتجر")}
                            </span>
                            <span>
                              {msg.sentAt
                                ? new Date(msg.sentAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
                                : ""}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    لا توجد رسائل سابقة في هذه المحادثة
                  </div>
                )}
              </div>

              {/* Reply Box */}
              {selectedThread.status !== "CLOSED" ? (
                <form
                  onSubmit={handleSendReply}
                  className="p-3 border-t border-border bg-card flex items-center gap-2"
                >
                  <textarea
                    rows={1}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك لشركة الشحن أو المندوب..."
                    className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="size-4 rotate-180" />
                    <span>{sendingReply ? "جاري الإرسال..." : "إرسال"}</span>
                  </button>
                </form>
              ) : (
                <div className="p-3 border-t border-border bg-muted/20 text-center text-xs text-muted-foreground">
                  تم إغلاق هذه المحادثة. افتح تذكرة جديدة إذا كان لديك استفسار آخر.
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <ChatBubbleLeftRightIcon className="size-10 stroke-1" />
              <span>اختر محادثة من القائمة لعرض تفاصيلها والرد عليها</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarrierInboxPage;
