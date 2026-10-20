import { useRef, useState } from "react";
import { toast } from "sonner";
import { inferAttachmentKind } from "../../shared";

export function useQuickOrderAttachments() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [upProgress, setUpProgress] = useState<Record<string, number>>({});
  const [upStatus, setUpStatus] = useState<Record<string, "uploading" | "done" | "error">>({});
  const [upTotalPct, setUpTotalPct] = useState(0);
  const [upDoneCount, setUpDoneCount] = useState(0);

  const uploadFilesForCase = async (caseId: string) => {
    if (files.length === 0) return { done: 0, errors: 0 };
    try {
      const { apiClient } = await import("@/services/api");
      const totalBytes = files.reduce((s, f) => s + f.size, 0);
      let doneBytes = 0;
      let done = 0;
      let errors = 0;
      for (const f of files) {
        const fd = new FormData();
        fd.append("files", f);
        fd.append("kinds", inferAttachmentKind(f.name));
        setUpStatus((p) => ({ ...p, [f.name]: "uploading" }));
        try {
          await apiClient.post(`/dental-lab/cases/${caseId}/attachments`, fd, {
            timeout: 600000,
            onUploadProgress: (ev) => {
              const pct = ev.total ? Math.round((ev.loaded * 100) / ev.total) : 0;
              setUpProgress((p) => ({ ...p, [f.name]: pct }));
            },
          });
          setUpStatus((p) => ({ ...p, [f.name]: "done" }));
          setUpProgress((p) => ({ ...p, [f.name]: 100 }));
          doneBytes += f.size;
          done += 1;
        } catch {
          setUpStatus((p) => ({ ...p, [f.name]: "error" }));
          errors += 1;
        }
        setUpTotalPct(Math.round((doneBytes * 100) / (totalBytes || 1)));
        setUpDoneCount(done);
      }
      if (errors === 0) {
        toast.success(`تم إنشاء الحالة ورفع ${files.length} ملفات بنجاح`);
      } else {
        toast.warning(`تم إنشاء الحالة، ورُفع ${done} ملف (تعذر رفع ${errors})`);
      }
      return { done, errors };
    } catch (err) {
      toast.error(
        `تم إنشاء الحالة لكن تعذر رفع بعض المرفقات: ${
          err instanceof Error ? err.message : ""
        }`
      );
      return { done: 0, errors: files.length };
    }
  };

  return {
    files,
    setFiles,
    dragOver,
    setDragOver,
    fileInputRef,
    upProgress,
    upStatus,
    upTotalPct,
    upDoneCount,
    uploadFilesForCase,
  };
}

export default useQuickOrderAttachments;
