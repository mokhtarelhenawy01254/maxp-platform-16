import axios from "axios";
import { toast } from "sonner";
import { buildApiUrl } from "../../../../utils/urlHelper";
import { getAuthHeaders } from "../types/marketplaceAdminTypes";

export const uploadSingleImage = async (file: File): Promise<string | null> => {
  if (!file.type.startsWith("image/")) {
    toast.error("الملف يجب أن يكون صورة");
    return null;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error("حجم الصورة يجب أن يكون أقل من 10MB");
    return null;
  }
  const fd = new FormData();
  fd.append("image", file);
  try {
    const res = await axios.post(buildApiUrl("upload/single"), fd, {
      headers: getAuthHeaders({ "Content-Type": "multipart/form-data" }),
      timeout: 30000,
    });
    if (res.data?.success && res.data?.data?.url) {
      return res.data.data.url as string;
    }
    toast.error(res.data?.error || "فشل رفع الصورة");
    return null;
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    toast.error(e?.response?.data?.error || "فشل رفع الصورة");
    return null;
  }
};

export const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
  const valid = files.filter(
    (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024,
  );
  if (valid.length === 0) {
    toast.error("اختر صورًا صالحة (صور فقط وأقل من 10MB لكل صورة)");
    return [];
  }
  const fd = new FormData();
  valid.forEach((f) => fd.append("images", f));
  try {
    const res = await axios.post(buildApiUrl("upload/multiple"), fd, {
      headers: getAuthHeaders({ "Content-Type": "multipart/form-data" }),
      timeout: 60000,
    });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      const urls = (res.data.data as Array<{ url?: string }>)
        .map((d) => d?.url)
        .filter((url): url is string => Boolean(url));
      if (urls.length === 0) {
        toast.error(res.data?.error || "فشل رفع الصور");
      }
      return urls;
    }
    toast.error(res.data?.error || "فشل رفع الصور");
    return [];
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    toast.error(e?.response?.data?.error || "فشل رفع الصور");
    return [];
  }
};
