import { apiClient } from "./apiClient";

export interface GalleryImage {
  id: string;
  url: string;
  filename: string;
  uploadedAt?: string;
}

const normalizeGalleryImage = (value: any): GalleryImage | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (typeof value.url !== "string" || !value.url.trim()) {
    return null;
  }

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id
        : value.url.trim(),
    url: value.url.trim(),
    filename:
      typeof value.filename === "string" && value.filename.trim()
        ? value.filename.trim()
        : "image",
    uploadedAt:
      typeof value.uploadedAt === "string" ? value.uploadedAt : undefined,
  };
};

export const imageGalleryService = {
  async listImages(): Promise<GalleryImage[]> {
    const response = await apiClient.get("/user/image-gallery");
    const images = Array.isArray(response.data?.images) ? response.data.images : [];

    return images
      .map((image: any) => normalizeGalleryImage(image))
      .filter((image: GalleryImage | null): image is GalleryImage => Boolean(image));
  },

  async uploadImage(file: File): Promise<GalleryImage> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await apiClient.post("/user/image-gallery/upload", formData, {
      headers: {
        /* boundary set by browser */,
      },
      timeout: 30000,
    });

    const image = normalizeGalleryImage(response.data?.image);
    if (!image) {
      throw new Error("Failed to parse uploaded image response");
    }

    return image;
  },
};

export default imageGalleryService;
