// Outputs library: completed generations grid (videos + image sheets)
import React, { useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { OutputVideoCard } from "./components/OutputVideoCard";
import { useVideoJobs } from "./useVideoStudioQueries";
import { typeLabel } from "./presets";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "video", label: "فيديو" },
  { id: "image", label: "صور" },
];

export const LibraryTab: React.FC = () => {
  const { data: jobs = [] } = useVideoJobs();
  const [filter, setFilter] = useState<"all" | "video" | "image">("all");

  const completed = useMemo(
    () =>
      jobs.filter((j) => {
        if (j.status !== "COMPLETED") return false;
        const isImage = j.type === "CHARACTER_SHEET" || j.type === "TEXT_TO_IMAGE";
        return filter === "all" ? true : filter === "image" ? isImage : !isImage;
      }),
    [jobs, filter],
  );

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-3 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as typeof filter)}
              aria-pressed={filter === f.id}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                filter === f.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="ms-auto text-xs tabular-nums text-muted-foreground">{completed.length} عنصر</span>
        </div>

        {completed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-10 text-center">
            <FolderOpen className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">المكتبة فاضية</p>
            <p className="text-xs text-muted-foreground">كل توليد مكتمل هيظهر هنا للتحميل وإعادة الاستخدام</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {completed.map((j) => (
              <OutputVideoCard key={j.id} job={j} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            أنواع متاحة: {typeLabel("TEXT_TO_VIDEO")} · {typeLabel("IMAGE_TO_VIDEO")} · {typeLabel("MOTION_TRANSFER")} · {typeLabel("CHARACTER_SHEET")}
          </p>
        )}
      </div>
    </div>
  );
};
