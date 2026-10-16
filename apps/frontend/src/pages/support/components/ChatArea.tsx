import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  X,
  Download,
  User,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  LifeBuoy,
} from "lucide-react";
import { Ticket } from "../../../services/supportService";
import LinkifiedText from "../../../components/common/LinkifiedText";

interface ChatAreaProps {
  ticket: Ticket | null;
  onSendMessage: (content: string, attachments: File[]) => Promise<void>;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  loading: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  ticket,
  onSendMessage,
  onStatusChange,
  onPriorityChange,
  loading,
}) => {
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!messageContent.trim() && attachments.length === 0) return;

    setSending(true);
    try {
      await onSendMessage(messageContent, attachments);
      setMessageContent("");
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case "in_progress":
        return <AlertCircle className="w-3.5 h-3.5 text-blue-500" />;
      case "closed":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "high":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "medium":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "low":
        return "bg-muted text-muted-foreground border-border/60";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center bg-card/40 p-6 text-center select-none">
        <div className="flex flex-col items-center max-w-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground">
            <LifeBuoy className="w-6 h-6 stroke-[1.6]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">عرض محادثة التذكرة</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              اختر تذكرة من القائمة الجانبية لقراءة الرسائل ومتابعة الحل مع فريق الدعم الفني.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Bar */}
      <div className="flex-shrink-0 border-b border-border/60 bg-card p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary tabular-nums">
              #{ticket.ticketId}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
              {new Date(ticket.createdAt).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <h2 className="text-sm font-semibold text-foreground truncate mt-0.5">
            {ticket.subject}
          </h2>
        </div>

        {/* Quick Actions (Status and Priority Dropdowns) */}
        <div className="flex items-center gap-2">
          {/* Status Selector */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/80 bg-background">
            {getStatusIcon(ticket.status)}
            <select
              value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="text-xs font-medium bg-transparent text-foreground focus:outline-hidden cursor-pointer"
            >
              <option value="open">مفتوحة</option>
              <option value="in_progress">قيد المتابعة</option>
              <option value="closed">مغلقة</option>
            </select>
          </div>

          {/* Priority Selector */}
          <select
            value={ticket.priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer focus:outline-hidden ${getPriorityBadge(
              ticket.priority
            )}`}
          >
            <option value="low">أولوية منخفضة</option>
            <option value="medium">أولوية متوسطة</option>
            <option value="high">أولوية عالية</option>
            <option value="critical">أولوية عاجلة</option>
          </select>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-xs">جارٍ تحديث المحادثة...</span>
          </div>
        ) : ticket.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <LifeBuoy className="w-8 h-8 opacity-40 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-foreground">لا توجد رسائل مسجلة في هذه التذكرة</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">اكتب استفسارك أدناه للبدء بالتواصل مع المهندس المختص</p>
          </div>
        ) : (
          ticket.messages.map((message, index) => {
            const isCurrentUser = message.senderType === "user";
            const isInternal = message.isInternal;

            return (
              <div
                key={message.id || index}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] sm:max-w-[65%] rounded-xl p-3 shadow-2xs space-y-1.5 ${
                    isInternal
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200"
                      : isCurrentUser
                      ? "bg-primary text-primary-foreground rounded-br-xs"
                      : "bg-card border border-border/70 text-foreground rounded-bl-xs"
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between gap-3 text-[11px] border-b border-border/40 pb-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      {isCurrentUser ? (
                        <User className="w-3 h-3 opacity-80" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>
                        {isCurrentUser
                          ? "أنت"
                          : message.sender?.name || "فريق الدعم الفني"}
                      </span>
                      {isInternal && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-mono">
                          ملاحظة داخلية
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-mono text-[10px] tabular-nums ${
                        isCurrentUser ? "opacity-80" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Message Body */}
                  <LinkifiedText
                    text={message.content}
                    className={`block text-xs leading-relaxed whitespace-pre-wrap break-words ${
                      isCurrentUser ? "text-primary-foreground" : "text-foreground"
                    }`}
                  />

                  {/* Attachments List */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="pt-1.5 space-y-1 border-t border-border/40">
                      {message.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${
                            isCurrentUser
                              ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
                              : "bg-muted/40 border-border/60 text-foreground hover:bg-muted"
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[180px] font-mono text-[11px]">
                            {att.originalName}
                          </span>
                          <Download className="w-3 h-3 opacity-70 ml-1" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Footer */}
      <div className="flex-shrink-0 border-t border-border/60 p-3 bg-card space-y-2">
        {/* Attachments Pending Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 bg-muted/60 border border-border/70 px-2 py-1 rounded-md text-xs text-foreground"
              >
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="truncate max-w-[140px] font-mono text-[11px]">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-border/60 transition-colors"
            title="إرفاق ملف أو سكرين شوت"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="اكتب ردك هنا... (اضغط Enter للإرسال، و Shift+Enter لسطر جديد)"
            rows={1}
            className="flex-1 min-h-[38px] max-h-32 px-3 py-2 text-xs rounded-lg border border-border/80 bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-transparent resize-y leading-relaxed"
          />

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={
              sending || (!messageContent.trim() && attachments.length === 0)
            }
            className="inline-flex items-center justify-center p-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-[0.98]"
            title="إرسال الرد"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
