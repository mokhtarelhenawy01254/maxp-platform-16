import { Sparkles, FileText, Send, Loader2, X } from "lucide-react";

interface AcademyLessonAiCoachDrawerProps {
  isOpen: boolean;
  currentLessonTitle?: string;
  coachMessages: Array<{ role: "user" | "coach"; text: string }>;
  inputMsg: string;
  askingCoach: boolean;
  onClose: () => void;
  onSetInputMsg: (v: string) => void;
  onAskCoach: (prompt?: string) => void;
}

export function AcademyLessonAiCoachDrawer({
  isOpen,
  currentLessonTitle,
  coachMessages,
  inputMsg,
  askingCoach,
  onClose,
  onSetInputMsg,
  onAskCoach,
}: AcademyLessonAiCoachDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-50 w-full sm:w-96 rounded-2xl sm:rounded-3xl bg-card/95 backdrop-blur-xl border border-primary/30 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300"
      style={{ maxHeight: "560px" }}
      dir="rtl"
    >
      {/* Coach Header */}
      <div className="p-3.5 bg-gradient-to-r from-primary/15 via-card to-card border-b border-border/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-foreground">كوتش ماكس بي الذكي</h3>
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              مرتبط بسكريبت: {currentLessonTitle || "الدرس الحالي"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-xs p-1.5 rounded-lg hover:bg-muted transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts - Zero Emojis, Clean Action Buttons */}
      <div className="p-2 bg-muted/40 border-b border-border/70 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => onAskCoach("لخص لي محتوى هذا الدرس في 3 نقاط أساسية.")}
          className="px-2.5 py-1 rounded-full bg-card hover:bg-muted text-foreground border border-border/70 whitespace-nowrap shadow-xs flex items-center gap-1 transition"
        >
          <FileText className="w-3 h-3 text-primary" />
          <span>تلخيص الدرس</span>
        </button>
        <button
          onClick={() => onAskCoach("كيف أطبق هذا الدرس عملياً على متجري اليوم؟")}
          className="px-2.5 py-1 rounded-full bg-card hover:bg-muted text-foreground border border-border/70 whitespace-nowrap shadow-xs flex items-center gap-1 transition"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>التطبيق العملي</span>
        </button>
      </div>

      {/* Messages */}
      <div className="p-3 flex-1 overflow-y-auto space-y-2.5 text-xs max-h-72">
        {coachMessages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-2xl leading-relaxed ${
              m.role === "coach"
                ? "bg-muted/70 text-foreground border border-border/50"
                : "bg-primary text-primary-foreground self-end ml-4 shadow-xs"
            }`}
          >
            {m.text}
          </div>
        ))}
        {askingCoach && (
          <div className="p-3 rounded-2xl bg-muted/40 text-muted-foreground text-[11px] animate-pulse flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span>كوتش ماكس بي يراجع سكريبت الدرس ويكتب الرد...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2.5 bg-card border-t border-border/70 flex items-center gap-2">
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => onSetInputMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAskCoach()}
          placeholder="اسأل الكوتش عن أي نقطة في هذا الدرس..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground"
        />
        <button
          onClick={() => onAskCoach()}
          disabled={askingCoach || !inputMsg.trim()}
          className="p-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
