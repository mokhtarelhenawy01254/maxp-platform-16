import { useState, useEffect } from "react";
import { uploadFiles } from "../../../utils/apiHelpers";
import { normalizeImagePath } from "../../../utils/imageUrl";
import { arrayMove } from "@dnd-kit/sortable";
import { DragEndEvent } from "@dnd-kit/core";

export const useProductMedia = (
  initialImages: string[] = []
) => {
  const [uploadedImages, setUploadedImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);

  // Sync state if initialImages prop changes from DB
  useEffect(() => {
    if (initialImages.length > 0 && uploadedImages.length === 0) {
      setUploadedImages(initialImages);
    }
  }, [initialImages, uploadedImages.length]);


  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const selectedFiles = Array.from(e.target.files);

      const fileUrls = await uploadFiles(
        selectedFiles,
        "upload/multiple"
      );

      // Assuming API returns array of strings or objects with fullUrl
      const urls = Array.isArray(fileUrls) ? fileUrls : (fileUrls.data || []);
      const urlList = urls
        .map((u: any) => {
          if (typeof u === "string") return u;
          if (u && typeof u === "object") return u.fullUrl || u.url || u.path;
          return null;
        })
        .filter((u: any): u is string => typeof u === "string" && u.length > 0)
        .map((u: string) => normalizeImagePath(u) || u)
        .filter(Boolean) as string[];

      if (urlList.length > 0) {
        setUploadedImages((prev) => [...prev, ...urlList]);
      }
    } catch (err) {
      console.error("تعذر رفع الصور:", err);
    } finally {
      setUploading(false);
      if (e.target) {
        e.target.value = ""; // Reset input
      }
    }
  };

  const removeUploadedImage = async (urlToRemove: string) => {
    // Keep file deletion out of the editor flow. Duplicated products can
    // legitimately reference the same uploaded asset, so we only remove the
    // image from the current draft and let save persist that detached state.
    setUploadedImages((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setUploadedImages((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return {
    uploadedImages,
    setUploadedImages,
    uploading,
    handleImageChange,
    removeUploadedImage,
    handleDragEnd,
  };
};
