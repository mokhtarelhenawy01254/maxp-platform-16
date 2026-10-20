import React from "react";
import type { EventRow } from "../types";

export interface GroupHeaderProps {
  members: EventRow[];
  isNoTemplate: boolean;
  onExpand: () => void;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  members,
  isNoTemplate,
  onExpand,
}) => {
  return (
    <div
      data-testid="group-header"
      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isNoTemplate
              ? `${members.length} حالة بدون قالب`
              : `${members.length} حالة بنفس القالب العام`}
          </span>
          <button
            onClick={onExpand}
            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400 font-semibold"
          >
            عرض التفاصيل
          </button>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-400 font-mono">
          {members.map((m) => m.code).slice(0, 5).join("، ")}
          {members.length > 5 ? "…" : ""}
        </span>
      </div>
      {!isNoTemplate && (members[0]?.template?.content || members[0]?.metaTemplate?.content) && (
        <p className="mt-2 line-clamp-1 text-xs italic text-slate-500 dark:text-slate-500">
          "{(members[0].template?.content || members[0].metaTemplate?.content || "").substring(0, 80)}…"
        </p>
      )}
    </div>
  );
};

export default GroupHeader;
