import React, { useState } from "react";
import { Loader2, Send, Bot, User } from "lucide-react";

interface Props {
  lessonId: string;
}

export const LessonCoachChat: React.FC<Props> = ({ lessonId }) => {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "coach"; text: string }>>([
    {
      sender: "coach",
      text: "أهلاً بك! أنا الكوتش الذكي المساعد لهذا الدرس. يمكنك سؤالي عن أي نقطة مذكورة في سكريبت الدرس وسأجيبك منها مباشرة.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !lessonId) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");

    try {
      setLoading(true);
      const studentToken = localStorage.getItem("studentToken") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;

      const res = await fetch(`/api/v1/academy/lessons/${lessonId}/coach-chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages((prev) => [...prev, { sender: "coach", text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "coach", text: data.error || "عذراً، أجبني من فضلك بسؤال متعلق بمحتوى هذا الدرس." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "coach", text: "تعذر الاتصال بالكوتش حالياً. يرجى المحاولة مرة أخرى." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3.5 text-right" dir="rtl">
      <div className="h-64 sm:h-72 overflow-y-auto space-y-3 p-3.5 bg-muted/20 rounded-2xl border border-border/60 text-xs">
        {messages.map((msg, i) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={i}
              className={`flex flex-col ${isUser ? "items-start" : "items-end"}`}
            >
              <span className="text-[10px] text-muted-foreground mb-1 inline-flex items-center gap-1">
                {isUser ? (
                  <>
                    <User className="w-3 h-3 text-muted-foreground/80" />
                    <span>أنت</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-primary" />
                    <span>الكوتش الذكي</span>
                  </>
                )}
              </span>
              <div
                className={`p-3 rounded-2xl max-w-sm leading-relaxed transition-all shadow-2xs ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-xs"
                    : "bg-card border border-border/70 text-foreground rounded-tl-xs"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-primary text-xs py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>الكوتش يراجع سكريبت الدرس ليجيبك...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اسأل الكوتش عن أي خطوة في هذا الدرس..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          aria-label="إرسال السؤال"
        >
          <Send className="w-4 h-4 rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  );
};
