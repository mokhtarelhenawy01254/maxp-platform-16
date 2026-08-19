import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Facebook, HelpCircle, Info, Loader2, MessageCircle, MessageSquare, Navigation, RefreshCw, Send } from 'lucide-react';
import aiKnowledgeQuestionService, {
  KnowledgeQuestion,
} from "../../services/aiKnowledgeQuestionService";

type Tab = "pending" | "answered";

const channelIcons: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
};

function channelLabel(channel: string | null) {
  if (!channel) return "";
  const map: Record<string, string> = {
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    chat: "Chat",
    instagram: "Instagram",
    telegram: "Telegram",
  };
  return map[channel.toLowerCase()] || channel;
}

export default function AIKnowledgeQuestionsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("pending");
  const [questions, setQuestions] = useState<KnowledgeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiKnowledgeQuestionService.list({ status: tab });
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (err: any) {
      console.error("Failed to load knowledge questions:", err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleAnswer = async (questionId: string) => {
    const answer = answers[questionId]?.trim();
    if (!answer) {
      toast.error(t("aiKnowledgeQuestions.answerRequired") || "Please write an answer");
      return;
    }

    setAnswering((prev) => ({ ...prev, [questionId]: true }));
    try {
      const data = await aiKnowledgeQuestionService.answer(questionId, answer);
      if (data.success) {
        toast.success(t("aiKnowledgeQuestions.answerSubmitted") || "Answer submitted successfully");
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to submit answer");
    } finally {
      setAnswering((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const pendingCount = tab === "pending" ? questions.length : 0;

  return (
    <div dir="rtl" className="min-h-full bg-[#f7f8fb] p-4 md:p-6 dark:bg-background">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">
              {t("aiKnowledgeQuestions.title") || "AI Knowledge Questions"}
            </h1>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="rounded-full px-2.5 py-0.5 text-sm">
                {pendingCount}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadQuestions} disabled={loading}>
            <RefreshCw className={`ml-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh") || "Refresh"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          <button
            onClick={() => setTab("pending")}
            className={`flex items-center gap-1.5 rounded-t px-4 py-2 text-sm font-medium transition-colors ${
              tab === "pending"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <Clock className="h-4 w-4" />
            {t("aiKnowledgeQuestions.pending") || "Pending"}
          </button>
          <button
            onClick={() => setTab("answered")}
            className={`flex items-center gap-1.5 rounded-t px-4 py-2 text-sm font-medium transition-colors ${
              tab === "answered"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t("aiKnowledgeQuestions.answered") || "Answered"}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-lg bg-white py-20 text-center shadow-sm dark:bg-gray-800">
            <HelpCircle className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-lg text-gray-500 dark:text-gray-400">
              {tab === "pending"
                ? (t("aiKnowledgeQuestions.noPending") || "No pending questions")
                : (t("aiKnowledgeQuestions.noAnswered") || "No answered questions")}
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              {tab === "pending"
                ? (t("aiKnowledgeQuestions.noPendingHint") || "When the AI needs help, questions will appear here")
                : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {q.channel && channelIcons[q.channel.toLowerCase()]}
                      <span>{channelLabel(q.channel)}</span>
                      {q.created_at && (
                        <>
                          <span>•</span>
                          <span>{new Date(q.created_at).toLocaleDateString("ar-SA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}</span>
                        </>
                      )}
                    </div>
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {q.customer_question}
                    </p>
                  </div>
                  <Badge
                    variant={q.status === "pending" ? "outline" : "secondary"}
                    className="mr-3 shrink-0"
                  >
                    {q.status === "pending"
                      ? (t("aiKnowledgeQuestions.pending") || "Pending")
                      : (t("aiKnowledgeQuestions.answered") || "Answered")}
                  </Badge>
                </div>

                {q.context && Object.keys(q.context).length > 0 && (
                  <details className="mb-3">
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {t("aiKnowledgeQuestions.showContext") || "Show context"}
                    </summary>
                    <pre className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                      {JSON.stringify(q.context, null, 2)}
                    </pre>
                  </details>
                )}

                {q.status === "answered" && q.merchant_answer && (
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <div className="mb-1 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {t("aiKnowledgeQuestions.answeredBy") || "Answered by"}: {q.answered_by || "Merchant"}
                        {q.answered_at && ` • ${new Date(q.answered_at).toLocaleDateString("ar-SA")}`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{q.merchant_answer}</p>
                  </div>
                )}

                {q.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder={t("aiKnowledgeQuestions.answerPlaceholder") || "Write your answer here..."}
                      value={answers[q.id] || ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      className="min-h-[80px] resize-y text-sm"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleAnswer(q.id)}
                        disabled={answering[q.id] || !answers[q.id]?.trim()}
                      >
                        {answering[q.id] ? (
                          <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="ml-1.5 h-4 w-4" />
                        )}
                        {t("aiKnowledgeQuestions.submitAnswer") || "Submit Answer"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
