import React from "react";
import { Link2 } from "lucide-react";
import type { OrderSessionDetailsData } from "../../types";

export interface SessionPagesVisitedTimelineProps {
  pagesVisited: NonNullable<OrderSessionDetailsData["pagesVisited"]>;
}

export const SessionPagesVisitedTimeline: React.FC<SessionPagesVisitedTimelineProps> = ({
  pagesVisited,
}) => {
  if (pagesVisited.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Link2 className="h-3.5 w-3.5 text-purple-500" />
          <span>رحلة التصفح ({pagesVisited.length} صفحات)</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">مرتبة زمنياً</span>
      </div>

      <ol className="relative mr-2 space-y-2 mt-2 border-r border-border/60">
        {pagesVisited.map((page, idx) => {
          const timeStr = page.timestamp
            ? new Date(page.timestamp).toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "";

          return (
            <li key={idx} className="mr-3">
              <span className="absolute -right-1 mt-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"></span>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">
                  {page.title || page.path}
                </span>
                {timeStr && (
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
                    {timeStr}
                  </span>
                )}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground truncate dir-ltr text-right">
                {page.path}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default SessionPagesVisitedTimeline;
