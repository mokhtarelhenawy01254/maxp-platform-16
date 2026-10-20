import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { toast } from "sonner";
import type { UploadItem } from "../types/dentalCaseDetailTypes";
import { inferAttachmentKind } from "../../shared";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const WEBP_THRESHOLD = 200 * 1024;
const WEBP_QUALITY = 0.85;

const compressToWebP = async (file: File): Promise<File> => {
  if (file.size < WEBP_THRESHOLD) return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/webp") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/webp",
        WEBP_QUALITY
      )
    );
    if (blob.size >= file.size) return file;
    const newName = file.name.replace(/\.(jpe?g|png|bmp|tiff?|webp)$/i, ".webp");
    return new File([blob], newName, { type: "image/webp" });
  } catch (e) {
    console.warn("WebP compression failed for", file.name, e);
    return file;
  }
};

export function useDentalCaseUploads(id: string | undefined, onUploaded: () => Promise<void>) {
  const [uploading, setUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const designReviewInputRef = useRef<HTMLInputElement | null>(null);

  const startUpload = useCallback(
    async (filesToUpload: File[], perFileKinds?: string[]) => {
      if (!id || filesToUpload.length === 0) return;

      const processed: File[] = [];
      for (const f of filesToUpload) {
        if (f.type.startsWith("image/") && f.size >= WEBP_THRESHOLD && f.type !== "image/webp") {
          toast.promise(compressToWebP(f), {
            loading: `جاري ضغط ${f.name}...`,
            success: (out) => {
              const saved = f.size - out.size;
              const savedPct = Math.round((saved / f.size) * 100);
              if (saved > 0) {
                return `تم ضغط ${f.name}: وفّرنا ${(saved / 1024).toFixed(0)}KB (${savedPct}%)`;
              }
              return `لم يوفّر شيء بضغط ${f.name}`;
            },
            error: () => `فشل ضغط ${f.name}، هيترفع أصلي`,
          });
        }
        processed.push(f);
      }

      const compressed = await Promise.all(
        processed.map((f) =>
          f.type.startsWith("image/") && f.size >= WEBP_THRESHOLD && f.type !== "image/webp"
            ? compressToWebP(f)
            : f
        )
      );

      const valid: { file: File; kind: string }[] = [];
      for (let i = 0; i < compressed.length; i++) {
        const f = compressed[i];
        if (!f) continue;
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`${f.name}: أكبر من 50MB (الحجم: ${(f.size / 1024 / 1024).toFixed(1)}MB)`);
          continue;
        }
        if (f.size === 0) {
          toast.error(`${f.name}: ملف فاضي`);
          continue;
        }
        const kind = perFileKinds?.[i] || inferAttachmentKind(f.name);
        valid.push({ file: f, kind });
      }
      if (valid.length === 0) return;

      const items: UploadItem[] = valid.map((v) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: v.file,
        kind: v.kind,
        status: "queued",
        progress: 0,
      }));
      setUploadItems((prev) => [...prev, ...items]);
      setUploading(true);

      const CONCURRENCY = 3;
      const updateItem = (itemId: string, patch: Partial<UploadItem>) => {
        setUploadItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it))
        );
      };

      let cursor = 0;
      const nextUpload = async (): Promise<void> => {
        while (cursor < items.length) {
          const item = items[cursor++];
          if (!item) break;
          updateItem(item.id, { status: "uploading" });
          try {
            const fd = new FormData();
            fd.append("files", item.file);
            fd.append("kinds", item.kind);
            const { apiClient } = await import("@/services/api");
            const res = await apiClient.post(`/dental-lab/cases/${id}/attachments`, fd, {
              timeout: 600000,
              onUploadProgress: (ev) => {
                if (ev.total) {
                  const pct = Math.round((ev.loaded * 100) / ev.total);
                  updateItem(item.id, { progress: pct });
                }
              },
            });
            const body = (
              res as {
                data?: { success?: boolean; data?: { id?: string } | { id?: string }[] };
              }
            ).data;
            const att = Array.isArray(body?.data) ? body?.data?.[0] : body?.data;
            updateItem(item.id, {
              status: "done",
              progress: 100,
              attachmentId: att?.id,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "فشل الرفع";
            updateItem(item.id, { status: "error", error: msg });
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => nextUpload())
      );

      setUploading(false);
      await onUploaded();
      const successCount = items.filter((i) => i.status === "done").length;
      const failCount = items.filter((i) => i.status === "error").length;
      if (successCount > 0 && failCount === 0) {
        toast.success(`تم رفع ${successCount} ملف بنجاح`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`تم رفع ${successCount}، فشل ${failCount}`);
      } else if (failCount > 0) {
        toast.error(`فشل رفع ${failCount} ملف`);
      }
    },
    [id, onUploaded]
  );

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0 || !id) return;
    await startUpload(files);
  };

  const handleDesignReviewUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    startUpload(
      files,
      files.map(() => "DESIGN_REVIEW")
    );
    e.target.value = "";
  };

  const handleUploadDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragOver(true);
  };

  const handleUploadDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragOver(false);
  };

  const handleUploadDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragOver(false);
    const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length === 0 || !id) return;
    await startUpload(files);
  };

  const retryUpload = async (itemId: string) => {
    const item = uploadItems.find((i) => i.id === itemId);
    if (!item) return;
    await startUpload([item.file], [item.kind]);
  };

  const clearFinishedUploads = () => {
    setUploadItems((prev) =>
      prev.filter((i) => i.status === "uploading" || i.status === "queued")
    );
  };

  return {
    uploading,
    uploadItems,
    uploadDragOver,
    fileInputRef,
    designReviewInputRef,
    handleUpload,
    handleDesignReviewUpload,
    handleUploadDragOver,
    handleUploadDragLeave,
    handleUploadDrop,
    retryUpload,
    clearFinishedUploads,
    startUpload,
  };
}
