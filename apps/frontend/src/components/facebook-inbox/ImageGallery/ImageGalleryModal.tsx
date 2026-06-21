import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";

const overlayStyle: React.CSSProperties = {
  background: "rgba(7, 17, 32, 0.58)",
  backdropFilter: "blur(12px)",
};

const headingStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

const primaryStyle: React.CSSProperties = {
  color: "var(--color-primary)",
};

const dangerStyle: React.CSSProperties = {
  color: "color-mix(in srgb, var(--business-danger) 74%, black)",
};

interface SavedImage {
  id: string;
  url: string;
  filename: string;
  uploadedAt: Date;
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, filename: string) => void;
  onSelectMultipleImages: (
    images: Array<{ url: string; filename: string }>,
  ) => void;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  onSelectMultipleImages,
}) => {
  // States
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [sendingMultiple, setSendingMultiple] = useState(false);

  // Load images
  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🖼️ [IMAGE-GALLERY] Loading images...");
      const response = await apiClient.get("/user/image-gallery");
      console.log("🖼️ [IMAGE-GALLERY] Response:", response.data);
      if (response.data?.images) {
        console.log(
          "🖼️ [IMAGE-GALLERY] Found",
          response.data.images.length,
          "images",
        );
        setSavedImages(response.data.images);
      } else {
        console.log("🖼️ [IMAGE-GALLERY] No images in response");
        setSavedImages([]);
      }
    } catch (error) {
      console.error("🖼️ [IMAGE-GALLERY] Error loading:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadImages();
      setSelectedImages(new Set()); // Reset selection when opening
    }
  }, [isOpen, loadImages]);

  // Upload images to gallery
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file || !file.type.startsWith("image/")) continue;

        const formData = new FormData();
        formData.append("image", file);

        const response = await apiClient.post(
          "/user/image-gallery/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        if (response.data?.image) {
          successCount++;
        }
      }

      if (successCount > 0) {
        alert(`✅ تم حفظ ${successCount} صورة في الحافظة!`);
        await loadImages();
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("حدث خطأ أثناء رفع الصور");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Delete image
  const deleteImage = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذه الصورة من الحافظة؟")) return;

    try {
      setDeleting(imageId);
      await apiClient.delete(`/user/image-gallery/${imageId}`);
      setSavedImages((prev) => prev.filter((img) => img.id !== imageId));
      setSelectedImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("فشل حذف الصورة. حاول مرة أخرى.");
    } finally {
      setDeleting(null);
    }
  };

  // Toggle image selection
  const toggleSelection = (imageId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  // Send selected images
  const sendSelectedImages = async () => {
    if (selectedImages.size === 0) return;

    setSendingMultiple(true);
    const imagesToSend = savedImages
      .filter((img) => selectedImages.has(img.id))
      .map((img) => ({ url: img.url, filename: img.filename }));

    onSelectMultipleImages(imagesToSend);
    setSelectedImages(new Set());
    setSendingMultiple(false);
    onClose();
  };

  // Select all / Deselect all
  const toggleSelectAll = () => {
    if (selectedImages.size === savedImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(savedImages.map((img) => img.id)));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={overlayStyle}
    >
      <div className="business-modal-surface flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden">
        {/* Header */}
        <div className="business-gallery-toolbar flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="h-6 w-6"
              style={primaryStyle}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-xl font-bold" style={headingStyle}>
              حافظة الصور المحفوظة
            </h3>
            <span className="text-sm" style={mutedStyle}>
              ({savedImages.length} صورة)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="business-icon-button"
            style={mutedStyle}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Actions Bar */}
        <div className="business-gallery-toolbar flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
              id="gallery-upload-input"
              disabled={uploading}
            />
            <label
              htmlFor="gallery-upload-input"
              className={`business-chip-button flex items-center gap-2 px-4 py-2 ${
                uploading ? "cursor-not-allowed opacity-50" : ""
              }`}
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                borderColor: "transparent",
                color: "white",
              }}
            >
              {uploading ? (
                <>
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-b-2"
                    style={{ borderColor: "currentColor" }}
                  />
                  <span>جاري الرفع...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>رفع صور جديدة</span>
                </>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {/* Select All Button */}
              {savedImages.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="business-chip-button px-3 py-2 text-sm"
                >
                  {selectedImages.size === savedImages.length
                    ? "إلغاء الكل"
                    : "تحديد الكل"}
                </button>
              )}
            </div>
          </div>

          {/* Send Selected Button */}
          {selectedImages.size > 0 && (
            <button
              type="button"
              onClick={sendSelectedImages}
              disabled={sendingMultiple}
              className="business-chip-button flex items-center gap-2 px-4 py-2 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--business-success) 0%, color-mix(in srgb, var(--color-secondary) 82%, white) 100%)",
                borderColor: "transparent",
                color: "white",
              }}
            >
              {sendingMultiple ? (
                <>
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-b-2"
                    style={{ borderColor: "currentColor" }}
                  />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span>إرسال {selectedImages.size} صورة</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div
                  className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"
                  style={{ borderColor: "var(--color-primary)" }}
                />
                <p style={mutedStyle}>جاري تحميل الصور...</p>
              </div>
            </div>
          ) : savedImages.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-center">
              <div>
                <svg
                  className="mx-auto mb-4 h-24 w-24"
                  style={mutedStyle}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mb-2 text-lg" style={headingStyle}>
                  لا توجد صور محفوظة
                </p>
                <p className="text-sm" style={mutedStyle}>
                  ارفع صور هنا للإرسال السريع لاحقاً
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {savedImages.map((image) => (
                <div
                  key={image.id}
                  className="business-gallery-card relative group cursor-pointer overflow-hidden border-2"
                  data-selected={selectedImages.has(image.id)}
                  onClick={() => {
                    toggleSelection(image.id);
                  }}
                >
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="h-32 w-full object-cover"
                  />

                  <div
                    className="business-gallery-check absolute left-2 top-2 cursor-pointer"
                    data-selected={selectedImages.has(image.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(image.id);
                    }}
                  >
                    {selectedImages.has(image.id) ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span className="text-xs font-bold" style={mutedStyle}>
                        +
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => deleteImage(image.id, e)}
                    disabled={deleting === image.id}
                    className="business-icon-button business-icon-button--sm absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      background: "var(--business-danger)",
                      borderColor: "transparent",
                      color: "white",
                    }}
                    title="حذف الصورة"
                  >
                    {deleting === image.id ? (
                      <div
                        className="h-4 w-4 animate-spin rounded-full border-b-2"
                        style={{ borderColor: "currentColor" }}
                      />
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>

                  <div className="business-gallery-caption absolute bottom-0 left-0 right-0 p-2">
                    <p className="truncate text-xs">{image.filename}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedImages.size > 0 && (
          <div className="business-status-banner mx-3 mb-3 px-4 py-3 sm:mx-4" data-tone="primary">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium" style={primaryStyle}>
                الصور المختارة ({selectedImages.size}):
              </span>
              <button
                type="button"
                onClick={() => setSelectedImages(new Set())}
                className="text-xs"
                style={dangerStyle}
              >
                إلغاء الكل
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {savedImages
                .filter((img) => selectedImages.has(img.id))
                .map((image) => (
                  <div key={image.id} className="relative flex-shrink-0 group">
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="h-16 w-16 rounded-lg border-2 object-cover"
                      style={{ borderColor: "var(--color-primary)" }}
                    />
                    <button
                      type="button"
                      onClick={(e) => toggleSelection(image.id, e)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                      style={{
                        background: "var(--business-danger)",
                        color: "white",
                        boxShadow: "0 18px 34px -30px rgba(7, 17, 32, 0.3)",
                      }}
                    >
                      ✕
                    </button>
                    <p
                      className="mt-1 w-16 truncate text-center text-xs"
                      style={mutedStyle}
                    >
                      {image.filename.length > 8
                        ? image.filename.substring(0, 8) + "..."
                        : image.filename}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="business-hint-bar flex items-center justify-between text-center">
          <span>
            {selectedImages.size > 0
              ? `💡 اضغط على "إرسال ${selectedImages.size} صورة" لإرسال الصور المحددة`
              : "💡 اضغط على الصور لتحديدها ثم اضغط على زر الإرسال"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImageGalleryModal;
