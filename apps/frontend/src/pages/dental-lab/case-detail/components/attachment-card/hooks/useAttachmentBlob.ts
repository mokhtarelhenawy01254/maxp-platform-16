import { useEffect, useState } from "react";
import { fetchCaseFileBlob } from "../../../../shared";

interface UseAttachmentBlobOptions {
  storedName?: string;
  fileName?: string;
  mimeType?: string;
}

export function useAttachmentBlob({ storedName, fileName, mimeType }: UseAttachmentBlobOptions) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const fileExt = (fileName || "").split(".").pop()?.toLowerCase() || "";
  const is3D = ["stl", "ply", "obj", "dcm"].includes(fileExt);
  const isPdf = fileExt === "pdf";
  const isHtml = fileExt === "html" || fileExt === "htm";
  const isImage =
    (mimeType?.startsWith("image/") || (!mimeType && !failed)) &&
    !is3D &&
    !isPdf &&
    !isHtml;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    if (storedName) {
      fetchCaseFileBlob(storedName)
        .then((blob) => {
          if (cancelled) return;
          const finalBlob =
            isHtml && blob.type !== "text/html"
              ? new Blob([blob], { type: "text/html;charset=utf-8" })
              : blob;
          objectUrl = URL.createObjectURL(finalBlob);
          setUrl(objectUrl);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    } else {
      setFailed(true);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storedName, isHtml]);

  return {
    url,
    failed,
    fileExt,
    is3D,
    isPdf,
    isHtml,
    isImage,
  };
}
