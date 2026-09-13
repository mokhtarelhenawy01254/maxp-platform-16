import React from "react";
import { Smartphone, Layout, Image as ImageIcon, Video, CheckCircle2, Sparkles } from "lucide-react";

interface PlacementMediaCustomizerProps {
  customStoriesMedia: boolean;
  onToggleCustomStories: (val: boolean) => void;
  storyImageUrl: string;
  onStoryImageUrlChange: (val: string) => void;
  storyVideoUrl: string;
  onStoryVideoUrlChange: (val: string) => void;
  creativeType: string;
}

export const PlacementMediaCustomizer: React.FC<
  PlacementMediaCustomizerProps
> = ({
  customStoriesMedia,
  onToggleCustomStories,
  storyImageUrl,
  onStoryImageUrlChange,
  storyVideoUrl,
  onStoryVideoUrlChange,
  creativeType,
}) => {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-purple-600" />
          <h4 className="text-sm font-bold text-gray-900">
            تخصيص وسائط مستقلة للقصص والريلز (Stories & Reels 9:16)
          </h4>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={customStoriesMedia}
            onChange={(e) => onToggleCustomStories(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <p className="text-xs text-gray-600">
        بدلاً من الاعتماد فقط على القص التلقائي، يمكنك رفع فيديو أو صورة عمودية مخصصة بأبعاد كاملة (9:16) لتظهر حصرياً في إنستجرام وفيسبوك ريلز.
      </p>

      {customStoriesMedia && (
        <div className="space-y-3 pt-2 bg-white p-3 rounded-lg border border-purple-200">
          {creativeType === "SINGLE_VIDEO" ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                رابط فيديو عمودي للريلز (9:16)
              </label>
              <input
                type="url"
                value={storyVideoUrl}
                onChange={(e) => onStoryVideoUrlChange(e.target.value)}
                placeholder="https://... (فيديو طولي 1080x1920)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                رابط صورة طولية للريلز والقصص (9:16)
              </label>
              <input
                type="url"
                value={storyImageUrl}
                onChange={(e) => onStoryImageUrlChange(e.target.value)}
                placeholder="https://... (صورة طولية 1080x1920)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-purple-700 bg-purple-50 p-2 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              سيتم عرض الوسائط المربعة/الأفقية في Feeds، واستخدام هذا الوسيط الطولي في Reels & Stories تلقائياً.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
