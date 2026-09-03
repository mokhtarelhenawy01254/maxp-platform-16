import React, { useState, useRef } from "react";
import { uploadService } from "../../services/uploadService";
import { toast } from "sonner";
import {
  Music,
  Video,
  FileText,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  Loader2,
  Play,
  Pause,
  ExternalLink
} from "lucide-react";

export interface ServiceMediaFile {
  url: string;
  originalName: string;
  type: "audio" | "video" | "image" | "file";
  size?: number;
}

interface MediaUploadZoneProps {
  files: ServiceMediaFile[];
  onChange: (files: ServiceMediaFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  label?: string;
  helperText?: string;
}

export const MediaUploadZone: React.FC<MediaUploadZoneProps> = ({
  files = [],
  onChange,
  disabled = false,
  maxFiles = 10,
  label = "المرفقات والوسائط (موسيقى، فيديوهات، صور، ملفات)",
  helperText = "يمكنك رفع ملفات صوتية وموسيقية، مقاطع فيديو، تصاميم، ومستندات (بحد أقصى 100 ميجابايت للملف)."
}) => {
  const [uploading, setUploading] = useState(false);
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "audio" | "video" | "image">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAcceptType = () => {
    switch (activeTypeFilter) {
      case "audio":
        return "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac";
      case "video":
        return "video/*,.mp4,.mov,.avi,.webm,.mkv";
      case "image":
        return "image/*,.png,.jpg,.jpeg,.gif,.svg,.webp";
      default:
        return "audio/*,video/*,image/*,.pdf,.zip,.rar,.psd,.ai,.docx,.xlsx";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    if (files.length + selected.length > maxFiles) {
      toast.error(`الحد الأقصى لعدد الملفات هو ${maxFiles} ملفات.`);
      return;
    }

    setUploading(true);
    const newUploaded: ServiceMediaFile[] = [...files];

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      try {
        const res = await uploadService.uploadServiceFile(file);
        if (res.success && res.data) {
          newUploaded.push({
            url: res.data.url,
            originalName: res.data.originalName || file.name,
            type: res.data.type || "file",
            size: res.data.size || file.size
          });
        } else {
          toast.error(`فشل رفع الملف: ${file.name}`);
        }
      } catch (err: any) {
        toast.error(`خطأ أثناء رفع: ${file.name}`);
      }
    }

    onChange(newUploaded);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    const removed = files[index];
    if (currentlyPlayingAudio === removed?.url) {
      setCurrentlyPlayingAudio(null);
    }
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  };

  const toggleAudio = (url: string) => {
    const audio = audioRefs.current[url];
    if (!audio) return;

    if (currentlyPlayingAudio === url) {
      audio.pause();
      setCurrentlyPlayingAudio(null);
    } else {
      // Pause any existing playing audio
      Object.values(audioRefs.current).forEach((a) => a?.pause());
      audio.play();
      setCurrentlyPlayingAudio(url);
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      {label && (
        <div className="flex flex-wrap items-center justify-between gap-1">
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</label>
          <span className="text-xs text-gray-400">
            {files.length} من {maxFiles} مرفقات
          </span>
        </div>
      )}

      {/* Type Selector Buttons & Upload Trigger */}
      <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">نوع المرفق:</span>
            <button
              type="button"
              onClick={() => setActiveTypeFilter("all")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                activeTypeFilter === "all"
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter("audio")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                activeTypeFilter === "audio"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 border border-gray-200 dark:border-gray-600 hover:bg-purple-50"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              موسيقى / صوت
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter("video")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                activeTypeFilter === "video"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white dark:bg-gray-700 text-rose-700 dark:text-rose-300 border border-gray-200 dark:border-gray-600 hover:bg-rose-50"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              فيديو
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter("image")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                activeTypeFilter === "image"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-600 hover:bg-blue-50"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              صور
            </button>
          </div>

          <button
            type="button"
            disabled={disabled || uploading || files.length >= maxFiles}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الرفع...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>اختيار ورفع ملفات</span>
              </>
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptType()}
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading || files.length >= maxFiles}
        />

        {helperText && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>

      {/* Uploaded Files Previews */}
      {files.length > 0 && (
        <div className="space-y-2 pt-1">
          {files.map((file, index) => {
            const isAudio = file.type === "audio" || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.url);
            const isVideo = file.type === "video" || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.url);
            const isImage = file.type === "image" || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.url);

            return (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Icon / Thumbnail */}
                  <div className="shrink-0">
                    {isAudio && (
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                        <Music className="w-5 h-5" />
                      </div>
                    )}
                    {isVideo && (
                      <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                        <Video className="w-5 h-5" />
                      </div>
                    )}
                    {isImage && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100">
                        <img src={file.url} alt={file.originalName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {!isAudio && !isVideo && !isImage && (
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate" title={file.originalName}>
                      {file.originalName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                      <span className="capitalize">
                        {isAudio ? "ملف صوتي / موسيقى" : isVideo ? "فيديو" : isImage ? "صورة" : "مستند"}
                      </span>
                      {file.size && <span>• {formatFileSize(file.size)}</span>}
                    </div>
                  </div>
                </div>

                {/* Inline Player or Preview & Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isAudio && (
                    <div className="flex items-center gap-1.5">
                      <audio
                        ref={(el) => (audioRefs.current[file.url] = el)}
                        src={file.url}
                        onEnded={() => setCurrentlyPlayingAudio(null)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => toggleAudio(file.url)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300"
                        title={currentlyPlayingAudio === file.url ? "إيقاف مؤقت" : "تشغيل الصوت"}
                      >
                        {currentlyPlayingAudio === file.url ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-purple-600" />
                            <span>إيقاف</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-purple-600" />
                            <span>تشغيل</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {isVideo && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>مشاهدة</span>
                    </a>
                  )}

                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="فتح الرابط"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="حذف الملف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MediaUploadZone;
