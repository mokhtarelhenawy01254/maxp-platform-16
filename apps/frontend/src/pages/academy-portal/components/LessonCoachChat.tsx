import React, { useState } from "react";
import { Loader2, Send } from "lucide-react";

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
      const studentPhone = localStorage.getItem("studentPhone") || "";
      const studentToken = localStorage.getItem("studentToken") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;
      if (studentPhone) headers["x-student-phone"] = studentPhone;

      const res = await fetch(`/api/v1/academy/lessons/${lessonId}/coach-chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: userText, phone: studentPhone }),
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
    <div className="space-y-4">
      <div className="h-64 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.sender === "user" ? "items-start" : "items-end"}`}
          >
            <span className="text-[10px] text-slate-400 mb-0.5">
              {msg.sender === "user" ? "أنت" : "الكوتش الذكي"}
            </span>
            <div
              className={`p-3 rounded-2xl max-w-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-800 shadow-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-indigo-600 text-xs py-2">
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
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
