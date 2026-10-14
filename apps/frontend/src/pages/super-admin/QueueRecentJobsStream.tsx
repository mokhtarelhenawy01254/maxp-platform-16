import React from "react";
import {
  MessageSquare,
  CheckCheck,
  MessageCircle,
  Activity,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AnimatePresence } from "framer-motion";
import type { RecentJob } from "./QueueJobDetailModal";

export type QueueJobFilter = "all" | "message" | "read" | "comment" | "failed";

interface QueueRecentJobsStreamProps {
  recentJobs: RecentJob[];
  filter: QueueJobFilter;
  setFilter: (f: QueueJobFilter) => void;
  onSelectJob: (job: RecentJob) => void;
}

export function QueueRecentJobsStream({
  recentJobs,
  filter,
  setFilter,
  onSelectJob,
}: QueueRecentJobsStreamProps) {
  return (
    <Card className="lg:col-span-4 rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col shadow-xs">
      <CardHeader className="border-b border-border/60 bg-muted/20 px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-foreground">
            تدفق العمليات اللحظي
          </CardTitle>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex gap-1 mt-2 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: "all", label: "الكل" },
            { id: "message", label: "رسائل" },
            { id: "read", label: "قراءة" },
            { id: "comment", label: "تعليقات" },
            { id: "failed", label: "فاشلة" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as QueueJobFilter)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                filter === item.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-2.5 flex-1 overflow-auto max-h-[380px]">
        <AnimatePresence mode="popLayout">
          {recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-muted-foreground">
              <Info className="size-5 mb-1.5 opacity-30" />
              <p className="text-xs font-mono">لا توجد عمليات مسجلة في هذا التصنيف</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className="group flex items-center justify-between p-2 rounded-md border border-border/50 hover:border-border/80 hover:bg-muted/30 transition-all cursor-pointer bg-card/60"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="shrink-0 p-1.5 rounded bg-muted/60 border border-border/40 text-muted-foreground group-hover:text-foreground transition-colors">
                      {job.name === "facebook-message" && (
                        <MessageSquare className="size-3.5 text-blue-500" />
                      )}
                      {job.name === "facebook-read-receipt" && (
                        <CheckCheck className="size-3.5 text-emerald-500" />
                      )}
                      {job.name === "facebook-comment" && (
                        <MessageCircle className="size-3.5 text-purple-500" />
                      )}
                      {![
                        "facebook-message",
                        "facebook-read-receipt",
                        "facebook-comment",
                      ].includes(job.name) && (
                        <Activity className="size-3.5 text-primary" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-foreground leading-tight truncate">
                        {job.name.replace("facebook-", "")}
                      </span>
                      <span
                        className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]"
                        title={job.data}
                      >
                        {job.data}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex flex-col items-end">
                      {job.finishedOn && (
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                          {new Date(job.finishedOn).toLocaleTimeString(
                            "ar-EG",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      )}
                      <div
                        className={`mt-0.5 size-1.5 rounded-full ${
                          job.status === "completed"
                            ? "bg-emerald-500"
                            : job.status === "active"
                              ? "bg-blue-500 animate-pulse"
                              : job.status === "waiting"
                                ? "bg-amber-500 animate-bounce"
                                : "bg-destructive"
                        }`}
                      />
                    </div>
                    <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
