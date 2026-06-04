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

const successStyle: React.CSSProperties = {
  color: "color-mix(in srgb, var(--business-success) 74%, black)",
};

const warningStyle: React.CSSProperties = {
  color: "color-mix(in srgb, var(--business-warning) 74%, black)",
};

const dangerStyle: React.CSSProperties = {
  color: "color-mix(in srgb, var(--business-danger) 74%, black)",
};

const selectedToneStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--color-primary) 10%, white)",
  borderColor: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
  color: "var(--color-primary)",
};

interface SavedText {
  id: string;
  title: string;
  content: string;
  imageUrls?: string[];
  isPinned?: boolean;
  createdAt: Date;
}

interface TextGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectText: (text: { content: string; imageUrls?: string[] }) => void;
}

const TextGalleryModal: React.FC<TextGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectText,
}) => {
  // States
  const [savedTexts, setSavedTexts] = useState<SavedText[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [pinning, setPinning] = useState<string | null>(null);

  // New text form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  // Edit form
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);

  // Load texts
  const loadTexts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/user/text-gallery");
      if (response.data?.texts) {
        // ترتيب النصوص: المثبتة أولاً، ثم الباقي حسب التاريخ (الأحدث أولاً)
        const sortedTexts = [...response.data.texts].sort((a, b) => {
          // إذا كان كلاهما مثبت أو غير مثبت، رتب حسب التاريخ (الأحدث أولاً)
          if (!!a.isPinned === !!b.isPinned) {
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
          // النصوص المثبتة تظهر أولاً
          return a.isPinned ? -1 : 1;
        });
        setSavedTexts(sortedTexts);
      }
    } catch (error) {
      console.error("Error loading text gallery:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTexts();
    }
  }, [isOpen, loadTexts]);

  // Save new text
  const saveText = async () => {
    if (!newContent.trim() && newImages.length === 0) {
      alert("يرجى إدخال محتوى النص أو إرفاق صورة على الأقل");
      return;
    }

    try {
      setSaving(true);
      let imageUrls: string[] = [];

      // Upload images first
      if (newImages.length > 0) {
        for (const file of newImages) {
          if (!file.type.startsWith("image/")) continue;

          const formData = new FormData();
          formData.append("image", file);

          const uploadResponse = await apiClient.post(
            "/user/image-gallery/upload",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          const imageUrl =
            uploadResponse.data?.image?.url ||
            uploadResponse.data?.image?.fileUrl;
          if (imageUrl) {
            imageUrls.push(imageUrl);
          }
        }
      }

      // Save text
      await apiClient.post("/user/text-gallery", {
        title: newTitle.trim() || null,
        content: newContent.trim() || null,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      // Reload and clear form
      await loadTexts();
      setNewTitle("");
      setNewContent("");
      setNewImages([]);
      setNewImagePreviews([]);
      alert("✅ تم حفظ النص بنجاح!");
    } catch (error) {
      console.error("Error saving text:", error);
      alert("فشل حفظ النص. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  // Update text
  const updateText = async (textId: string, title: string, content: string) => {
    if (
      !content.trim() &&
      editExistingImages.length === 0 &&
      editImages.length === 0
    ) {
      alert("يرجى إدخال محتوى النص أو إرفاق صورة على الأقل");
      return;
    }

    try {
      setUpdating(true);
      let imageUrls: string[] = [...editExistingImages];

      // Upload new images
      if (editImages.length > 0) {
        for (const file of editImages) {
          if (!file.type.startsWith("image/")) continue;

          const formData = new FormData();
          formData.append("image", file);

          const uploadResponse = await apiClient.post(
            "/user/image-gallery/upload",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          const imageUrl =
            uploadResponse.data?.image?.url ||
            uploadResponse.data?.image?.fileUrl;
          if (imageUrl) {
            imageUrls.push(imageUrl);
          }
        }
      }

      // Update text
      await apiClient.put(`/user/text-gallery/${textId}`, {
        title: title.trim() || null,
        content: content.trim() || null,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      // Reload and clear edit state
      await loadTexts();
      setEditingId(null);
      setEditImages([]);
      setEditImagePreviews([]);
      setEditExistingImages([]);
      alert("✅ تم تحديث النص بنجاح!");
    } catch (error) {
      console.error("Error updating text:", error);
      alert("فشل تحديث النص. حاول مرة أخرى.");
    } finally {
      setUpdating(false);
    }
  };

  // Delete text
  const deleteText = async (textId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذا النص من الحافظة؟")) return;

    try {
      setDeleting(textId);
      await apiClient.delete(`/user/text-gallery/${textId}`);
      setSavedTexts((prev) => prev.filter((t) => t.id !== textId));
    } catch (error) {
      console.error("Error deleting text:", error);
      alert("فشل حذف النص. حاول مرة أخرى.");
    } finally {
      setDeleting(null);
    }
  };

  // Toggle pin
  const togglePin = async (textId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setPinning(textId);
      const text = savedTexts.find((t) => t.id === textId);
      // استخدام endpoint الصحيح للتثبيت
      await apiClient.patch(`/user/text-gallery/${textId}/pin`, {
        isPinned: !text?.isPinned,
      });
      await loadTexts();
    } catch (error) {
      console.error("Error toggling pin:", error);
      alert("فشل تحديث حالة التثبيت. حاول مرة أخرى.");
    } finally {
      setPinning(null);
    }
  };

  // Handle image selection for new text
  const handleNewImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const previews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      if (file.size > 10 * 1024 * 1024) {
        alert(`حجم الملف ${file.name} كبير جداً. الحد الأقصى 10 ميجابايت.`);
        continue;
      }
      if (!file.type.startsWith("image/")) {
        alert(`الملف ${file.name} ليس صورة.`);
        continue;
      }

      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    }

    setNewImages((prev) => [...prev, ...validFiles]);
    setNewImagePreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  // Handle image selection for edit
  const handleEditImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const previews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      if (file.size > 10 * 1024 * 1024) continue;
      if (!file.type.startsWith("image/")) continue;

      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    }

    setEditImages((prev) => [...prev, ...validFiles]);
    setEditImagePreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  // Remove image from new text
  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove existing image from edit
  const removeEditExistingImage = (index: number) => {
    setEditExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove new image from edit
  const removeEditNewImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
    setEditImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Start editing
  const startEditing = (text: SavedText, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(text.id);
    setEditExistingImages(text.imageUrls || []);
    setEditImages([]);
    setEditImagePreviews([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={overlayStyle}
    >
      <div className="business-modal-surface flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden">
        {/* Header */}
        <div className="business-gallery-toolbar flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <svg
              className="h-6 w-6"
              style={successStyle}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-bold" style={headingStyle}>
              حافظة النصوص المحفوظة
            </h3>
            <span className="text-sm" style={mutedStyle}>
              ({savedTexts.length} نص)
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {/* Add new text form */}
          <div className="business-page-panel mb-6 p-4">
            <h4 className="mb-3 text-sm font-semibold" style={headingStyle}>
              إضافة نص جديد
            </h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="عنوان النص (اختياري)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="business-control-input w-full px-3 py-2"
              />
              <textarea
                placeholder="محتوى النص..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                className="business-chat-input w-full resize-none px-3 py-2"
              />

              {/* Image upload */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium"
                  style={headingStyle}
                >
                  إرفاق صور (اختياري)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewImageSelect}
                  className="hidden"
                  id="text-gallery-new-image"
                />
                <label
                  htmlFor="text-gallery-new-image"
                  className="business-upload-dropzone cursor-pointer px-4 py-2"
                  data-tone="success"
                >
                  <svg
                    className="mr-2 h-5 w-5"
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
                  <span className="text-sm">اختر صور لإرفاقها</span>
                </label>

                {newImagePreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {newImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt=""
                          className="h-24 w-full rounded-lg border object-cover"
                          style={{ borderColor: "var(--business-card-border)" }}
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="business-icon-button business-icon-button--sm absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                          style={{
                            background: "var(--business-danger)",
                            borderColor: "transparent",
                            color: "white",
                          }}
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={saveText}
                disabled={
                  saving || (!newContent.trim() && newImages.length === 0)
                }
                className="business-chip-button w-full px-4 py-2 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, var(--business-success) 0%, color-mix(in srgb, var(--color-secondary) 82%, white) 100%)",
                  borderColor: "transparent",
                  color: "white",
                }}
              >
                {saving ? (
                  <div className="flex items-center justify-center">
                    <div
                      className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2"
                      style={{ borderColor: "currentColor" }}
                    />
                    <span>جاري الحفظ...</span>
                  </div>
                ) : (
                  "حفظ النص"
                )}
              </button>
            </div>
          </div>

          {/* Texts list */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div
                  className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"
                  style={{ borderColor: "var(--business-success)" }}
                />
                <p style={mutedStyle}>جاري تحميل النصوص...</p>
              </div>
            </div>
          ) : savedTexts.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-center">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mb-2 text-lg" style={headingStyle}>
                  لا توجد نصوص محفوظة
                </p>
                <p className="text-sm" style={mutedStyle}>
                  احفظ النصوص الشائعة هنا للإرسال السريع
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {savedTexts.map((text) => (
                <div
                  key={text.id}
                  className={`business-page-panel group p-4 transition-all ${
                    editingId === text.id ? "" : "cursor-pointer"
                  }`}
                  style={editingId === text.id ? selectedToneStyle : undefined}
                  onClick={() => {
                    if (editingId !== text.id) {
                      onSelectText({
                        content: text.content,
                        ...(text.imageUrls && { imageUrls: text.imageUrls }),
                      });
                    }
                  }}
                >
                  {editingId === text.id ? (
                    // Edit mode
                    <div
                      className="space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        placeholder="عنوان النص (اختياري)"
                        defaultValue={text.title || ""}
                        id={`edit-title-${text.id}`}
                        className="business-control-input w-full px-3 py-2"
                      />
                      <textarea
                        placeholder="محتوى النص..."
                        defaultValue={text.content}
                        id={`edit-content-${text.id}`}
                        rows={4}
                        className="business-chat-input w-full resize-none px-3 py-2"
                      />

                      {/* Existing images */}
                      {editExistingImages.length > 0 && (
                        <div className="space-y-2">
                          <label
                            className="block text-sm font-medium"
                            style={headingStyle}
                          >
                            الصور الحالية
                          </label>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                            {editExistingImages.map((url, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={url}
                                  alt=""
                                  className="h-24 w-full rounded-lg border object-cover"
                                  style={{
                                    borderColor: "var(--business-card-border)",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditExistingImage(index)}
                                  className="business-icon-button business-icon-button--sm absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                                  style={{
                                    background: "var(--business-danger)",
                                    borderColor: "transparent",
                                    color: "white",
                                  }}
                                >
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
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add new images */}
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEditImageSelect}
                          className="hidden"
                          id={`edit-image-${text.id}`}
                        />
                        <label
                          htmlFor={`edit-image-${text.id}`}
                          className="business-upload-dropzone cursor-pointer px-4 py-2"
                          data-tone="primary"
                        >
                          <svg
                            className="mr-2 h-5 w-5"
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
                          <span className="text-sm">إضافة صور جديدة</span>
                        </label>

                        {editImagePreviews.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                            {editImagePreviews.map((preview, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={preview}
                                  alt=""
                                  className="h-24 w-full rounded-lg border object-cover"
                                  style={{
                                    borderColor: "var(--business-card-border)",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditNewImage(index)}
                                  className="business-icon-button business-icon-button--sm absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                                  style={{
                                    background: "var(--business-danger)",
                                    borderColor: "transparent",
                                    color: "white",
                                  }}
                                >
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
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditImages([]);
                            setEditImagePreviews([]);
                            setEditExistingImages([]);
                          }}
                          className="business-chip-button px-4 py-2"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const titleEl = document.getElementById(
                              `edit-title-${text.id}`,
                            ) as HTMLInputElement;
                            const contentEl = document.getElementById(
                              `edit-content-${text.id}`,
                            ) as HTMLTextAreaElement;
                            if (titleEl && contentEl) {
                              updateText(
                                text.id,
                                titleEl.value,
                                contentEl.value,
                              );
                            }
                          }}
                          disabled={updating}
                          className="business-chip-button px-4 py-2"
                          data-active="true"
                        >
                          {updating ? "جاري التحديث..." : "حفظ التعديلات"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {text.isPinned && (
                            <svg
                              className="h-4 w-4"
                              style={warningStyle}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                            </svg>
                          )}
                          <h5 className="font-semibold" style={headingStyle}>
                            {text.title || "بدون عنوان"}
                          </h5>
                        </div>
                        {text.content && (
                          <p
                            className="line-clamp-3 whitespace-pre-wrap text-sm"
                            style={mutedStyle}
                          >
                            {text.content}
                          </p>
                        )}
                        {text.imageUrls && text.imageUrls.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {text.imageUrls.slice(0, 4).map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt=""
                                className="h-12 w-12 rounded border object-cover"
                                style={{
                                  borderColor: "var(--business-card-border)",
                                }}
                              />
                            ))}
                            {text.imageUrls.length > 4 && (
                              <div
                                className="flex h-12 w-12 items-center justify-center rounded border text-xs"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-border) 18%, white)",
                                  borderColor: "var(--business-card-border)",
                                  color: "var(--color-muted-foreground)",
                                }}
                              >
                                +{text.imageUrls.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mr-2 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => togglePin(text.id, e)}
                          disabled={pinning === text.id}
                          className="business-icon-button business-icon-button--sm"
                          style={text.isPinned ? warningStyle : mutedStyle}
                          title={text.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                        >
                          <svg
                            className="w-4 h-4"
                            fill={text.isPinned ? "currentColor" : "none"}
                            stroke="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => startEditing(text, e)}
                          className="business-icon-button business-icon-button--sm"
                          style={primaryStyle}
                          title="تعديل"
                        >
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteText(text.id, e)}
                          disabled={deleting === text.id}
                          className="business-icon-button business-icon-button--sm"
                          style={dangerStyle}
                          title="حذف"
                        >
                          {deleting === text.id ? (
                            <div
                              className="h-4 w-4 animate-spin rounded-full border-b-2"
                              style={{ borderColor: "var(--business-danger)" }}
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
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextGalleryModal;
