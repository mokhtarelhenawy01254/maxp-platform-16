import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { companyAwareApi } from "../../services/companyAwareApi";
import { uploadService } from "../../services/uploadService";
import {
  PhotoIcon,
  VideoCameraIcon,
  LinkIcon,
  CalendarIcon,
  XMarkIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface FacebookPage {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
}

type TabType = "STATUS" | "MEDIA" | "LINK";
type PostType = "FEED" | "STORY";

const headingStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--business-card-border)",
};

const selectedSurfaceStyle: React.CSSProperties = {
  borderColor: "color-mix(in srgb, var(--color-primary) 28%, transparent)",
  background: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
  boxShadow:
    "0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent)",
};

const idleSurfaceStyle: React.CSSProperties = {
  borderColor: "var(--business-card-border)",
  background:
    "color-mix(in srgb, var(--color-background) 88%, var(--shell-control-bg) 12%)",
};

const activeTabStyle: React.CSSProperties = {
  color: "var(--color-primary)",
  borderColor: "var(--color-primary)",
};

const accentTabStyle: React.CSSProperties = {
  color: "var(--color-secondary)",
  borderColor: "var(--color-secondary)",
};

const inactiveTabStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
  borderColor: "transparent",
};

const pillActiveStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
  background:
    "color-mix(in srgb, var(--color-background) 80%, var(--shell-control-bg) 20%)",
};

const pillIdleStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

const controlInputStyle: React.CSSProperties = {
  borderColor: "var(--business-card-border)",
  background:
    "color-mix(in srgb, var(--color-background) 90%, var(--shell-control-bg) 10%)",
  color: "var(--color-foreground)",
};

const dropzoneStyle: React.CSSProperties = {
  borderColor: "var(--business-card-border)",
  background:
    "color-mix(in srgb, var(--color-background) 84%, var(--shell-control-bg) 16%)",
};

const primaryActionStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
  color: "color-mix(in srgb, var(--color-background) 96%, transparent)",
};

const disabledActionStyle: React.CSSProperties = {
  background:
    "color-mix(in srgb, var(--color-muted-foreground) 24%, var(--shell-control-bg))",
  color: "color-mix(in srgb, var(--color-background) 82%, transparent)",
};

const successBannerStyle: React.CSSProperties = {
  background:
    "color-mix(in srgb, var(--business-success) 10%, var(--color-background))",
  borderColor: "color-mix(in srgb, var(--business-success) 18%, transparent)",
};

const errorBannerStyle: React.CSSProperties = {
  background:
    "color-mix(in srgb, var(--business-danger) 10%, var(--color-background))",
  borderColor: "color-mix(in srgb, var(--business-danger) 18%, transparent)",
};

const FacebookPostCreator: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>("STATUS");
  const [postType, setPostType] = useState<PostType>("FEED");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

  // Content State
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<
    { url: string; type: "image" | "video" }[]
  >([]);

  // Processing State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const hasFetchedPages = useRef(false);

  useEffect(() => {
    if (!hasFetchedPages.current) {
      hasFetchedPages.current = true;
      fetchPages();
    }
  }, []);

  const fetchPages = async () => {
    // Prevent multiple simultaneous calls
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await companyAwareApi.get(
        "/integrations/facebook/connected",
      );
      if (response.data.success) {
        setPages(response.data.pages || []);
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // For Stories, only allow one media
    if (postType === "STORY" && mediaFiles.length + files.length > 1) {
      alert("القصص (Stories) تدعم ملف وسائط واحد فقط.");
      return;
    }

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/")
        ? "video"
        : ("image" as "image" | "video"),
    }));

    setMediaFiles((prev) => [...prev, ...files]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => {
      // Revoke URL to avoid memory leaks
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId],
    );
  };

  const handleSelectAll = () => {
    if (selectedPages.length === pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(pages.map((p) => p.pageId));
    }
  };

  const handleSubmit = async () => {
    if (selectedPages.length === 0) {
      alert("يرجى اختيار صفحة واحدة على الأقل");
      return;
    }

    // Validation
    if (postType === "STORY" && mediaFiles.length === 0) {
      alert("يجب إضافة صورة أو فيديو لنشر القصة");
      return;
    }
    if (activeTab === "LINK" && !linkUrl) {
      alert("يرجى إدخال الرابط");
      return;
    }
    if (activeTab === "STATUS" && !message && mediaFiles.length === 0) {
      alert("يرجى كتابة نص أو إضافة وسائط");
      return;
    }
    if (isScheduled && !scheduledDate) {
      alert("يرجى تحديد موعد النشر");
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      // 1. Upload Media if any
      const uploadedMediaUrls: string[] = [];
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const uploadRes = await uploadService.uploadMedia(file);
          if (uploadRes.success && uploadRes.data) {
            let finalUrl = uploadRes.data.fullUrl || uploadRes.data.url;
            if (finalUrl && !finalUrl.startsWith("http")) {
              finalUrl = window.location.origin + finalUrl;
            }
            uploadedMediaUrls.push(finalUrl);
          } else {
            throw new Error(`فشل رفع الملف: ${file.name}`);
          }
        }
      }

      // 2. Determine Media Type
      let mediaType = "NONE";
      if (mediaFiles.length > 0) {
        // Check if video
        const hasVideo = mediaFiles.some((f) => f.type.startsWith("video/"));
        if (hasVideo) mediaType = "VIDEO";
        else if (mediaFiles.length > 1)
          mediaType = "CAROUSEL"; // Or just multiple images
        else mediaType = "IMAGE";
      }

      // 3. Prepare Payload
      const payload = {
        pageIds: selectedPages,
        message: message,
        mediaUrls: uploadedMediaUrls,
        mediaType: mediaType,
        linkUrl: activeTab === "LINK" ? linkUrl : undefined,
        postType: postType,
        scheduledTime: isScheduled ? scheduledDate : undefined,
      };

      const response = await companyAwareApi.post(
        "/integrations/facebook/publish",
        payload,
      );

      if (response.data.success) {
        setResult(response.data);
        // Reset form partially
        setMessage("");
        setMediaFiles([]);
        setMediaPreviews([]);
        setLinkUrl("");
      } else {
        alert("حدث خطأ أثناء النشر");
      }
    } catch (error: any) {
      console.error("Publishing error:", error);
      alert("فشل في عملية النشر: " + (error.message || "خطأ غير معروف"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="w-full min-h-screen space-y-6 p-6"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-background) 92%, var(--shell-control-bg) 8%) 0%, color-mix(in srgb, var(--shell-control-bg) 84%, var(--color-background) 16%) 100%)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={headingStyle}>
            إنشاء ومجدولة المنشورات
          </h1>
          <p className="mt-1 text-sm" style={mutedStyle}>
            انشر أو جدول محتواك على فيسبوك بكل سهولة
          </p>
        </div>
        <button
          onClick={() => navigate("/facebook-inbox")}
          className="business-chip-button flex items-center gap-1 px-4 py-2"
        >
          <XMarkIcon className="h-5 w-5" />
          إلغاء
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Creator */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Page Selector */}
          <div className="business-page-panel p-5" style={panelStyle}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="flex items-center font-bold" style={headingStyle}>
                <span
                  className="ml-2 flex h-6 w-6 items-center justify-center rounded-full text-xs"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                    color: "var(--color-primary)",
                  }}
                >
                  1
                </span>
                اختر الصفحات
              </h2>
              <button
                onClick={handleSelectAll}
                className="text-sm font-medium"
                style={{ color: "var(--color-primary)" }}
              >
                {selectedPages.length === pages.length
                  ? "إلغاء التحديد"
                  : "تحديد الكل"}
              </button>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-2">
                <div
                  className="h-10 rounded"
                  style={{
                    background:
                      "color-mix(in srgb, var(--shell-control-bg) 82%, var(--color-background) 18%)",
                  }}
                ></div>
                <div
                  className="h-10 rounded"
                  style={{
                    background:
                      "color-mix(in srgb, var(--shell-control-bg) 82%, var(--color-background) 18%)",
                  }}
                ></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => togglePageSelection(page.pageId)}
                    className="flex cursor-pointer items-center rounded-lg border p-3 transition-all"
                    style={
                      selectedPages.includes(page.pageId)
                        ? selectedSurfaceStyle
                        : idleSurfaceStyle
                    }
                  >
                    <div
                      className="mr-3 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-colors"
                      style={
                        selectedPages.includes(page.pageId)
                          ? {
                              background: "var(--color-primary)",
                              color:
                                "color-mix(in srgb, var(--color-background) 96%, transparent)",
                            }
                          : controlInputStyle
                      }
                    >
                      {selectedPages.includes(page.pageId) && (
                        <CheckCircleIcon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="truncate font-medium" style={headingStyle}>
                      {page.pageName}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs" style={mutedStyle}>
              تم تحديد {selectedPages.length} صفحة
            </p>
          </div>

          {/* 2. Content Creator */}
          <div className="business-page-panel p-5" style={panelStyle}>
            <div
              className="mb-4 flex items-center justify-between pb-4"
              style={{ borderBottom: "1px solid var(--business-card-border)" }}
            >
              <div className="flex space-x-4 space-x-reverse">
                <button
                  onClick={() => setPostType("FEED")}
                  className="border-b-2 px-1 pb-2 text-sm font-semibold transition-colors"
                  style={
                    postType === "FEED" ? activeTabStyle : inactiveTabStyle
                  }
                >
                  منشور (Feed)
                </button>
                <button
                  onClick={() => {
                    setPostType("STORY");
                    setActiveTab("MEDIA");
                  }}
                  className="border-b-2 px-1 pb-2 text-sm font-semibold transition-colors"
                  style={
                    postType === "STORY" ? accentTabStyle : inactiveTabStyle
                  }
                >
                  قصة (Story)
                </button>
              </div>
            </div>

            {/* Tabs for Feed */}
            {postType === "FEED" && (
              <div className="flex space-x-2 space-x-reverse mb-4">
                <button
                  onClick={() => setActiveTab("STATUS")}
                  className="flex items-center rounded-full px-3 py-1.5 text-sm"
                  style={
                    activeTab === "STATUS" ? pillActiveStyle : pillIdleStyle
                  }
                >
                  <DocumentTextIcon className="w-4 h-4 ml-1" /> حالة
                </button>
                <button
                  onClick={() => setActiveTab("MEDIA")}
                  className="flex items-center rounded-full px-3 py-1.5 text-sm"
                  style={
                    activeTab === "MEDIA" ? pillActiveStyle : pillIdleStyle
                  }
                >
                  <PhotoIcon className="w-4 h-4 ml-1" /> صور/فيديو
                </button>
                <button
                  onClick={() => setActiveTab("LINK")}
                  className="flex items-center rounded-full px-3 py-1.5 text-sm"
                  style={activeTab === "LINK" ? pillActiveStyle : pillIdleStyle}
                >
                  <LinkIcon className="w-4 h-4 ml-1" /> رابط
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="space-y-4">
              {/* Text Input */}
              {(activeTab !== "LINK" || postType === "FEED") && (
                <textarea
                  className="h-32 w-full resize-none rounded-lg p-3 text-base"
                  style={controlInputStyle}
                  placeholder={
                    postType === "STORY"
                      ? "ملاحظة: القصص لا تدعم النص المرفق بشكل كامل في API."
                      : "اكتب شيئاً مميزاً..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              )}

              {/* Link Input */}
              {activeTab === "LINK" && postType === "FEED" && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    style={headingStyle}
                  >
                    رابط المقال أو الصفحة
                  </label>
                  <div className="flex">
                    <span
                      className="inline-flex items-center rounded-r-md border border-l-0 px-3 text-sm"
                      style={controlInputStyle}
                    >
                      https://
                    </span>
                    <input
                      type="text"
                      className="block w-full min-w-0 flex-1 rounded-l-md px-3 py-2 text-sm"
                      style={controlInputStyle}
                      placeholder="www.example.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Media Uploader */}
              {(activeTab === "MEDIA" || postType === "STORY") && (
                <div
                  className="rounded-lg border-2 border-dashed p-6 text-center transition-colors"
                  style={dropzoneStyle}
                >
                  <input
                    type="file"
                    id="mediaUpload"
                    multiple={postType === "FEED"} // Stories take 1 file
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleMediaChange}
                  />
                  <label
                    htmlFor="mediaUpload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <div
                      className="mb-3 rounded-full p-3"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                      }}
                    >
                      <VideoCameraIcon
                        className="h-8 w-8"
                        style={{ color: "var(--color-primary)" }}
                      />
                    </div>
                    <span className="font-medium" style={headingStyle}>
                      اضغط لإضافة صور أو فيديو
                    </span>
                    <span className="mt-1 text-xs" style={mutedStyle}>
                      يدعم JPG, PNG, MP4
                    </span>
                  </label>
                </div>
              )}

              {/* Previews */}
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mediaPreviews.map((preview, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square overflow-hidden rounded-lg border"
                      style={panelStyle}
                    >
                      {preview.type === "video" ? (
                        <video
                          src={preview.url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={preview.url}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        onClick={() => removeMedia(idx)}
                        className="absolute right-1 top-1 rounded-full p-1 opacity-0 transition-opacity transform group-hover:opacity-100 hover:scale-110"
                        style={errorBannerStyle}
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Scheduling & Publish Action */}
          <div className="business-page-panel p-5" style={panelStyle}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <input
                    type="checkbox"
                    id="schedule"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: "var(--color-primary)" }}
                  />
                  <label
                    htmlFor="schedule"
                    className="cursor-pointer select-none font-medium"
                    style={headingStyle}
                  >
                    جدولة المنشور لوقت لاحق
                  </label>
                </div>
                {isScheduled && (
                  <div className="mt-2">
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="block w-full rounded-md px-3 py-2 text-sm"
                      style={controlInputStyle}
                    />
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--business-warning)" }}
                    >
                      يجب أن يكون الوقت بين 10 دقائق و 6 أشهر من الآن
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || selectedPages.length === 0}
                className={`flex w-full items-center justify-center rounded-lg px-8 py-3 font-bold transition-all transform hover:-translate-y-0.5 sm:w-auto ${
                  submitting || selectedPages.length === 0
                    ? "cursor-not-allowed"
                    : ""
                }`}
                style={
                  submitting || selectedPages.length === 0
                    ? disabledActionStyle
                    : primaryActionStyle
                }
              >
                {submitting ? (
                  "جاري النشر..."
                ) : (
                  <>
                    <PaperAirplaneIcon
                      className={`w-5 h-5 ml-2 ${isScheduled ? "hidden" : ""}`}
                    />
                    <CalendarIcon
                      className={`w-5 h-5 ml-2 ${!isScheduled ? "hidden" : ""}`}
                    />
                    {isScheduled ? "جدولة المنشور" : "نشر الآن"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Results */}
        <div className="space-y-6">
          {/* Live Preview Card */}
          <div
            className="business-page-panel sticky top-6 overflow-hidden"
            style={panelStyle}
          >
            <div
              className="flex items-center justify-between p-4"
              style={{
                borderBottom: "1px solid var(--business-card-border)",
                background:
                  "color-mix(in srgb, var(--color-background) 80%, var(--shell-control-bg) 20%)",
              }}
            >
              <h3 className="font-bold" style={headingStyle}>
                معاينة البوست
              </h3>
              <span className="text-xs font-mono" style={mutedStyle}>
                Desktop Preview
              </span>
            </div>
            <div className="p-4">
              <div
                className="rounded-lg border p-4"
                style={{
                  ...panelStyle,
                  background:
                    "color-mix(in srgb, var(--color-background) 88%, var(--shell-control-bg) 12%)",
                }}
              >
                {/* Fake Header */}
                <div className="flex items-center mb-3">
                  <div
                    className="mr-3 h-10 w-10 rounded-full"
                    style={{
                      background:
                        "color-mix(in srgb, var(--shell-control-bg) 78%, var(--color-background) 22%)",
                    }}
                  ></div>
                  <div className="flex-1">
                    <div
                      className="mb-2 h-4 w-24 rounded"
                      style={{
                        background:
                          "color-mix(in srgb, var(--shell-control-bg) 78%, var(--color-background) 22%)",
                      }}
                    ></div>
                    <div
                      className="h-3 w-16 rounded"
                      style={{
                        background:
                          "color-mix(in srgb, var(--shell-control-bg) 84%, var(--color-background) 16%)",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <p
                    className="dir-auto whitespace-pre-line text-sm"
                    style={headingStyle}
                  >
                    {message || "سيظهر نص منشورك هنا..."}
                  </p>

                  {linkUrl && activeTab === "LINK" && (
                    <div
                      className="rounded-lg border p-3"
                      style={{
                        ...panelStyle,
                        background:
                          "color-mix(in srgb, var(--shell-control-bg) 82%, var(--color-background) 18%)",
                      }}
                    >
                      <div
                        className="truncate text-sm"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {linkUrl}
                      </div>
                      <div
                        className="mt-2 h-20 rounded"
                        style={{
                          background:
                            "color-mix(in srgb, var(--shell-control-bg) 78%, var(--color-background) 22%)",
                        }}
                      ></div>
                    </div>
                  )}

                  {/* Media Grid Preview */}
                  {mediaPreviews.length > 0 && (
                    <div
                      className={`grid gap-1 overflow-hidden rounded-lg border ${mediaPreviews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
                      style={panelStyle}
                    >
                      {mediaPreviews.slice(0, 4).map((p, i) => (
                        <div
                          key={i}
                          className={`relative h-40 ${mediaPreviews.length === 3 && i === 0 ? "col-span-2" : ""}`}
                          style={{
                            background:
                              "color-mix(in srgb, var(--color-foreground) 82%, transparent)",
                          }}
                        >
                          {p.type === "video" ? (
                            <div
                              className="flex h-full w-full items-center justify-center"
                              style={{
                                background:
                                  "color-mix(in srgb, var(--color-foreground) 70%, transparent)",
                                color:
                                  "color-mix(in srgb, var(--color-background) 96%, transparent)",
                              }}
                            >
                              <VideoCameraIcon className="w-8 h-8" />
                            </div>
                          ) : (
                            <img
                              src={p.url}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                      {mediaPreviews.length > 4 && (
                        <div
                          className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                          style={{
                            background:
                              "color-mix(in srgb, var(--color-foreground) 42%, transparent)",
                            color:
                              "color-mix(in srgb, var(--color-background) 96%, transparent)",
                          }}
                        >
                          +{mediaPreviews.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Area */}
          {result && (
            <div
              className="animate-fade-in overflow-hidden rounded-xl"
              style={{ ...panelStyle, ...successBannerStyle }}
            >
              <div
                className="p-4"
                style={{
                  ...successBannerStyle,
                  borderBottom:
                    "1px solid color-mix(in srgb, var(--business-success) 18%, transparent)",
                }}
              >
                <h3
                  className="flex items-center font-bold"
                  style={{ color: "var(--business-success)" }}
                >
                  <CheckCircleIcon className="w-5 h-5 ml-2" />
                  تمت العملية بنجاح!
                </h3>
              </div>
              <div className="p-4">
                <p className="mb-3 text-sm" style={headingStyle}>
                  {result.message}
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.results.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded border p-2 text-xs"
                      style={
                        res.success ? successBannerStyle : errorBannerStyle
                      }
                    >
                      <div className="flex justify-between">
                        <span className="font-bold">{res.pageName}</span>
                        <span>
                          {res.success
                            ? isScheduled
                              ? "تمت الجدولة"
                              : "تم النشر"
                            : "فشل"}
                        </span>
                      </div>
                      {!res.success && (
                        <div
                          className="mt-1"
                          style={{ color: "var(--business-danger)" }}
                        >
                          {res.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacebookPostCreator;
