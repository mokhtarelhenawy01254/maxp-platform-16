import React from "react";
import { useTranslation } from "react-i18next";
import { Smartphone, Layout, Image as ImageIcon, Video, CheckCircle2, Sparkles, UploadCloud } from "lucide-react";
import uploadService from "../../../../services/uploadService";

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
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            {isEn
              ? "Customize Media for Stories & Reels (9:16)"
              : "تخصيص وسائط مستقلة للقصص والريلز (Stories & Reels 9:16)"}
          </h4>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={customStoriesMedia}
            onChange={(e) => onToggleCustomStories(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400">
        {isEn
          ? "Instead of relying on automatic cropping, you can upload dedicated full-screen vertical video or image (9:16) tailored exclusively for Instagram and Facebook Reels."
          : "بدلاً من الاعتماد فقط على القص التلقائي، يمكنك رفع فيديو أو صورة عمودية مخصصة بأبعاد كاملة (9:16) لتظهر حصرياً في إنستجرام وفيسبوك ريلز."}
      </p>

      {customStoriesMedia && (
        <div className="space-y-3 pt-2 bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-800/60">
          {creativeType === "SINGLE_VIDEO" ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {isEn ? "Vertical video for Reels (9:16)" : "فيديو عمودي للريلز (9:16)"}
                </label>
                <label className="text-[11px] text-purple-600 hover:text-purple-700 dark:text-purple-400 cursor-pointer font-bold inline-flex items-center gap-1">
                  <UploadCloud className="w-3 h-3" />
                  <span>{isEn ? "Upload video from device" : "رفع فيديو من الجهاز"}</span>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const res = await uploadService.uploadMedia(file);
                        if (res.success && res.data) {
                          const url = res.data.fullUrl || `${window.location.origin}${res.data.url}`;
                          onStoryVideoUrlChange(url);
                        }
                      } catch (err) {
                        console.error("Story video upload failed:", err);
                      }
                    }}
                  />
                </label>
              </div>
              <input
                type="url"
                value={storyVideoUrl}
                onChange={(e) => onStoryVideoUrlChange(e.target.value)}
                placeholder={isEn ? "https://... (Vertical video 1080x1920)" : "https://... أو ارفع من الجهاز"}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-xs font-mono text-left focus:ring-2 focus:ring-purple-500"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {isEn ? "Vertical image for Reels & Stories (9:16)" : "صورة طولية للريلز والقصص (9:16)"}
                </label>
                <label className="text-[11px] text-purple-600 hover:text-purple-700 dark:text-purple-400 cursor-pointer font-bold inline-flex items-center gap-1">
                  <UploadCloud className="w-3 h-3" />
                  <span>{isEn ? "Upload image from device" : "رفع صورة من الجهاز"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const res = await uploadService.uploadMedia(file);
                        if (res.success && res.data) {
                          const url = res.data.fullUrl || `${window.location.origin}${res.data.url}`;
                          onStoryImageUrlChange(url);
                        }
                      } catch (err) {
                        console.error("Story image upload failed:", err);
                      }
                    }}
                  />
                </label>
              </div>
              <input
                type="url"
                value={storyImageUrl}
                onChange={(e) => onStoryImageUrlChange(e.target.value)}
                placeholder={isEn ? "https://... (Vertical image 1080x1920)" : "https://... أو ارفع من الجهاز"}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-xs font-mono text-left focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 p-2 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isEn
                ? "Square/horizontal media will be delivered in Feeds, while this vertical media is delivered to Reels & Stories automatically."
                : "سيتم عرض الوسائط المربعة/الأفقية في Feeds، واستخدام هذا الوسيط الطولي في Reels & Stories تلقائياً."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
