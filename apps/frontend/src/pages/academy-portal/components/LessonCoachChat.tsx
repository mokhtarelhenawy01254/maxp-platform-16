import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, Bot, User, LogIn, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  lessonId: string;
}

const PREVIEW_QUESTION_LIMIT = 5;

export const LessonCoachChat: React.FC<Props> = ({ lessonId }) => {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "coach"; text: string; isError?: boolean }>>([
    {
      sender: "coach",
      text: "أهلاً بك! أنا الكوتش الذكي المساعد لهذا الدرس. يمكنك سؤالي عن أي خطوة أو مفهوم مذكور في سكريبت الدرس وسأجيبك منها مباشرة.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem(`coach_preview_count_${lessonId}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const studentToken = typeof window !== "undefined" ? localStorage.getItem("studentToken") || "" : "";
  const isAuthenticated = Boolean(studentToken);

  const isPreviewLimitReached = !isAuthenticated && previewCount >= PREVIEW_QUESTION_LIMIT;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !lessonId) return;

    if (isPreviewLimitReached) {
      toast.error("انتهت الأسئلة المجانية في وضع المعاينة. يرجى تسجيل الدخول للمتابعة بلا حدود.");
      return;
    }

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");

    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;

      const res = await fetch(`/api/v1/academy/lessons/${lessonId}/coach-chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.reply) {
        setMessages((prev) => [...prev, { sender: "coach", text: data.reply }]);
        if (!isAuthenticated) {
          const nextCount = previewCount + 1;
          setPreviewCount(nextCount);
          try {
            sessionStorage.setItem(`coach_preview_count_${lessonId}`, nextCount.toString());
          } catch {}
        }
      } else {
        const errorMsg =
          data?.error ||
          data?.message ||
          (res.status === 401
            ? "يجب تسجيل الدخول أولاً للتحدث مع الكوتش في هذا الدرس."
            : res.status === 403
            ? "هذا الدرس مخصص للمشتركين في الكورس."
            : "حدث خطأ أثناء الرد من الكوتش.");

        toast.error(errorMsg);
        setMessages((prev) => [
          ...prev,
          {
            sender: "coach",
            text: errorMsg,
            isError: true,
          },
        ]);
      }
    } catch (err: any) {
      const networkError = "تعذر الاتصال بخادم الكوتش. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى.";
      toast.error(networkError);
      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text: networkError,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 text-right" dir="rtl">
      {/* Status banner for preview vs authenticated */}
      {!isAuthenticated && (
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 font-sans">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">
              معاينة مجانية للكوتش ({Math.max(0, PREVIEW_QUESTION_LIMIT - previewCount)} أسئلة متبقية)
            </span>
          </div>
          <Link
            to="/portal/login"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition-colors shrink-0 shadow-2xs"
          >
            <LogIn className="w-3 h-3" />
            <span>سجّل دخول</span>
          </Link>
        </div>
      )}

      {/* Messages container */}
      <div className="h-64 sm:h-72 overflow-y-auto space-y-3 p-3.5 bg-slate-50/60 rounded-2xl border border-slate-200/80 text-xs">
        {messages.map((msg, i) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={i}
              className={`flex flex-col ${isUser ? "items-start" : "items-end"}`}
            >
              <span className="text-[10px] text-slate-500 mb-1 inline-flex items-center gap-1">
                {isUser ? (
                  <>
                    <User className="w-3 h-3 text-slate-400" />
                    <span>أنت</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-indigo-600" />
                    <span>الكوتش الذكي</span>
                  </>
                )}
              </span>
              <div
                className={`p-3 rounded-2xl max-w-md leading-relaxed whitespace-pre-wrap transition-all shadow-2xs ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-xs"
                    : msg.isError
                    ? "bg-rose-50 border border-rose-200 text-rose-800 rounded-tl-xs"
                    : "bg-white border border-slate-200 text-slate-900 rounded-tl-xs"
                }`}
              >
                {msg.text}
                {msg.isError && !isAuthenticated && (
                  <div className="mt-2.5 pt-2 border-t border-rose-200/80 flex items-center justify-between">
                    <span className="text-[10px] text-rose-700">لديك حساب أو مشترك بالفعل؟</span>
                    <Link
                      to="/portal/login"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-900 underline"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>تسجيل الدخول</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-indigo-600 text-xs py-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>الكوتش يراجع سكريبت ومعايير الدرس ليجيبك...</span>
          </div>
        )}

        {isPreviewLimitReached && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-center text-xs">
            <p className="font-bold">استهلكت أسئلة المعاينة المجانية لهذا الدرس ({PREVIEW_QUESTION_LIMIT} أسئلة).</p>
            <p className="text-[11px] text-amber-800">سجّل دخولك للاستمرار في المحادثة وحفظ استفساراتك وتصحيح التمارين.</p>
            <Link
              to="/portal/login"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>سجّل دخولك الآن</span>
            </Link>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input row */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isPreviewLimitReached
              ? "سجّل الدخول للمتابعة مع الكوتش..."
              : "اسأل الكوتش عن أي خطوة أو مفهوم في هذا الدرس..."
          }
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
          disabled={loading || isPreviewLimitReached}
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || isPreviewLimitReached}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          aria-label="إرسال السؤال"
          title="إرسال السؤال"
        >
          <Send className="w-4 h-4 rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  );
};
