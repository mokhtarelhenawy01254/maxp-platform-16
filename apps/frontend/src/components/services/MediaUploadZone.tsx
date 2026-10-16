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
          <label className="text-xs sm:text-sm font-semibold text-foreground">{label}</label>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {files.length} من {maxFiles} مرفقات
          </span>
        </div>
      )}

      {/* Type Selector Buttons & Upload Trigger */}
      <div className="p-3.5 bg-muted/20 rounded-2xl border border-dashed border-border/80">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground ml-1">نوع المرفق:</span>
            <button
              type="button"
              onClick={() => setActiveTypeFilter("all")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-97 cursor-pointer ${
                activeTypeFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border/70 hover:bg-muted"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter("audio")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-97 cursor-pointer ${
                activeTypeFilter === "audio"
                  ? "bg-purple-600 text-white shadow-2xs font-semibold"
                  : "bg-card text-purple-600 dark:text-purple-400 border border-border/70 hover:bg-purple-500/10"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>موسيقى / صوت</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter("video")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-97 cursor-pointer ${
                activeTypeFilter === "video"
                  ? "bg-rose-600 text-white shadow-2xs font-semibold"
                  : "bg-card text-rose-600 dark:text-rose-400 border border-border/70 hover:bg-rose-500/10"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>فيديو</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter("image")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-97 cursor-pointer ${
                activeTypeFilter === "image"
                  ? "bg-blue-600 text-white shadow-2xs font-semibold"
                  : "bg-card text-blue-600 dark:text-blue-400 border border-border/70 hover:bg-blue-500/10"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>صور</span>
            </button>
          </div>

          <button
            type="button"
            disabled={disabled || uploading || files.length >= maxFiles}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-97 cursor-pointer"
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
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
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
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-card rounded-xl border border-border/70 shadow-2xs text-foreground"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Icon / Thumbnail */}
                  <div className="shrink-0">
                    {isAudio && (
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                        <Music className="w-5 h-5" />
                      </div>
                    )}
                    {isVideo && (
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
                        <Video className="w-5 h-5" />
                      </div>
                    )}
                    {isImage && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-border/70 bg-muted">
                        <img src={file.url} alt={file.originalName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {!isAudio && !isVideo && !isImage && (
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate" title={file.originalName}>
                      {file.originalName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
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
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 active:scale-95 transition-all cursor-pointer"
                        title={currentlyPlayingAudio === file.url ? "إيقاف مؤقت" : "تشغيل الصوت"}
                      >
                        {currentlyPlayingAudio === file.url ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>إيقاف</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
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
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>مشاهدة</span>
                    </a>
                  )}

                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-border/70 transition-colors active:scale-95"
                    title="فتح الرابط"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg border border-border/70 transition-colors active:scale-95 cursor-pointer"
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
