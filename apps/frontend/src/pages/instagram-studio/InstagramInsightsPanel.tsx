import React from "react";
import { Bookmark, Eye, Loader2, TrendingUp } from "lucide-react";
import type { InstagramInsightMetrics } from "./instagramStudioService";
import { formatIgNumber } from "./instagramStudioUtils";

const METRIC_ROWS = [
  { key: "impressions", label: "مرات الظهور", icon: Eye },
  { key: "reach", label: "الوصول", icon: Eye },
  { key: "engagement", label: "التفاعل", icon: TrendingUp },
  { key: "saved", label: "الحفظ", icon: Bookmark },
];

interface InstagramInsightsPanelProps {
  insights: InstagramInsightMetrics | null;
  loading: boolean;
}

const InstagramInsightsPanel: React.FC<InstagramInsightsPanelProps> = ({ insights, loading }) => (
  <div className="border-t border-border/60 pt-2.5 space-y-2">
    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
      <TrendingUp className="h-3.5 w-3.5 text-primary" /> الإحصاءات
    </div>
    {loading ? (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الجلب
      </div>
    ) : insights && Object.keys(insights).length > 0 ? (
      <div className="grid grid-cols-2 gap-2">
        {METRIC_ROWS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{label}</span>
              <Icon className="h-3 w-3" />
            </div>
            <div className="text-sm font-bold text-foreground tabular-nums">
              {formatIgNumber(insights[key])}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-[11px] text-muted-foreground">
        لا تتوفر إحصاءات لهذا المنشور من Instagram.
      </div>
    )}
  </div>
);

export default InstagramInsightsPanel;
