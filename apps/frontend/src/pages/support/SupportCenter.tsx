import { MessageSquare as ChatBubbleLeftRightIcon, Plus as PlusIcon, Search as MagnifyingGlassIcon, Circle as PaperAirplaneIcon, X as XMarkIcon, Circle as PaperClipIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import supportService from "../../services/supportService";
;
import type { Ticket } from "../../services/supportService";

const getStatusText = (status: string) => {
  switch (status) {
    case "open": return "مفتوحة";
    case "in_progress": return "قيد المعالجة";
    case "closed": return "مغلقة";
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "open": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "closed": return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
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

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("subject", subject);
      fd.append("category", category);
      fd.append("priority", priority);
      fd.append("content", message);
      if (file) fd.append("attachments", file);
      await supportService.createTicket(fd);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "حدث خطأ أثناء إنشاء التذكرة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">تذكرة جديدة</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        {error && <p className="text-red-600 dark:text-red-400 mb-3 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الموضوع</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="عنوان التذكرة"
              required
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القسم</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="technical">تقني</option>
                <option value="billing">فواتير</option>
                <option value="inquiry">استفسار</option>
                <option value="suggestion">اقتراح</option>
                <option value="complaint">شكوى</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="critical">عاجلة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرسالة</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="اكتب رسالتك..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مرفقات (اختياري)</label>
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {submitting ? "جاري الإرسال..." : "إرسال التذكرة"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SupportCenter() {
  const navigate = useNavigate();
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
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
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
      // refresh messages
      const details = await supportService.getTicketDetails(selectedTicket.ticketId);
      setMessages((details as any)?.ticket?.messages || []);
      // also refresh ticket list to update preview
      fetchTickets();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = !searchTerm || t.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 flex flex-col">
      {/* Mobile: if no ticket selected, show list; if selected, show chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversations List */}
        <div className={`w-full md:w-80 lg:w-80 shrink-0 border-s border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex flex-col ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">مركز الدعم</h1>
              <button
                onClick={() => setShowNewTicket(true)}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                title="تذكرة جديدة"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="بحث في المحادثات..."
                className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Filter Tabs */}
            <div className="flex gap-1 text-xs">
              {[
                { key: "all", label: "الكل" },
                { key: "open", label: "مفتوحة" },
                { key: "in_progress", label: "قيد المعالجة" },
                { key: "closed", label: "مغلقة" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-full transition-colors ${
                    statusFilter === tab.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">لا توجد محادثات</p>
                <button
                  onClick={() => setShowNewTicket(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  بدء محادثة جديدة
                </button>
              </div>
            ) : (
              filteredTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`w-full text-right p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span dir="auto" className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate flex-1 ml-2">
                      {ticket.subject}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(ticket.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                      {getStatusText(ticket.status)}
                    </span>
                    {ticket.messages?.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {ticket.messages[ticket.messages.length - 1]?.content?.slice(0, 60)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className={`flex-1 min-w-0 flex flex-col ${!selectedTicket ? 'hidden md:flex' : 'flex'}`}>
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="md:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{selectedTicket.subject}</h2>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusText(selectedTicket.status)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{selectedTicket.ticketId}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-8">لا توجد رسائل بعد</p>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={msg._id || idx} className={`flex ${msg.senderType === 'admin' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.senderType === 'admin' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-br-2xl' : 'bg-blue-600 text-white rounded-bl-2xl'}`}>
                        {msg.senderType === 'admin' && (
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">{msg.sender?.name || 'الدعم الفني'}</p>
                        )}
                        <p dir="auto" className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.attachments?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att: any) => (
                              <a
                                key={att.filename}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1 text-xs ${msg.senderType === 'admin' ? 'text-blue-600' : 'text-blue-200'} hover:underline`}
                              >
                                <PaperClipIcon className="w-3 h-3" />
                                {att.originalName}
                              </a>
                            ))}
                          </div>
                        )}
                        <p className={`text-xs mt-1 ${msg.senderType === 'admin' ? 'text-gray-400' : 'text-blue-200'}`}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={selectedTicket.status === 'closed' ? 'التذكرة مغلقة' : 'اكتب رسالتك...'}
                    disabled={selectedTicket.status === 'closed'}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending || selectedTicket.status === 'closed'}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">اختر محادثة من القائمة</p>
              </div>
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
