import type { ChangeEvent, DragEvent, RefObject } from "react";
import { CheckCircle2, Loader2, Trash2, Upload } from "lucide-react";
import { fileIcon, fmtBytes } from "../../../types/quickOrderTypes";

interface QuickOrderFilesDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  onDragOverChange: (drag: boolean) => void;
  upStatus: Record<string, "uploading" | "done" | "error">;
}

export function QuickOrderFilesDropzone({
  files,
  onFilesChange,
  fileInputRef,
  dragOver,
  onDragOverChange,
  upStatus,
}: QuickOrderFilesDropzoneProps) {
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  const addFiles = (picked: FileList | File[]) => {
    const arr = Array.from(picked);
    if (arr.length === 0) return;
    onFilesChange([...files, ...arr]);
  };

  const removeFile = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDragOverChange(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={labelCls + " mb-0"}>
          رفع ملفات المسح ثلاثي الأبعاد والصور (STL, PLY, PDF)
        </label>
        <span className="text-[11px] text-gray-400">سحب وإفلات الملفات هنا</span>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          onDragOverChange(true);
        }}
        onDragLeave={() => onDragOverChange(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={[
          "rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition",
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800",
        ].join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="w-6 h-6 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
          انقر لاختيار ملفات الـ STL، صور الكاميرا الفموية، أو الـ PDF
        </p>
      </div>

      {files.length > 0 && (
        <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto">
          {files.map((f, idx) => {
            const st = upStatus[f.name];
            return (
              <li
                key={`${f.name}-${idx}`}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {fileIcon(f.name)}
                  <span className="truncate">{f.name}</span>
                  <span
                    className="text-gray-400 shrink-0 font-mono tabular-nums"
                    dir="ltr"
                  >
                    {fmtBytes(f.size)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {st === "done" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  )}
                  {st === "uploading" && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    aria-label="حذف الملف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
