import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { storefrontFetch } from "../../utils/storefrontApi";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { isKhemetLuxeTheme } from "../utils/navigationGuards";

interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  onSubmitted?: () => void;
}

type SelectedReviewMedia = {
  id: string;
  file: File;
  previewUrl: string;
  type: "image" | "video";
};

const MAX_REVIEW_MEDIA = 6;
const MAX_REVIEW_MEDIA_SIZE = 40 * 1024 * 1024;

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const mediaPreviewCardClassName =
  "group relative overflow-hidden rounded-2xl border border-border bg-background";

const WriteReviewDialog: React.FC<WriteReviewDialogProps> = ({
  open,
  onOpenChange,
  productId,
  onSubmitted,
}) => {
  const { theme } = useStorefrontTheme();
  const prefersArabicCopy = theme.direction === "rtl";
  const isKhemetEgyptianCopy = isKhemetLuxeTheme(theme.id);
  const [customerName, setCustomerName] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [rating, setRating] = React.useState(5);
  const [selectedMedia, setSelectedMedia] = React.useState<SelectedReviewMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const selectedMediaRef = React.useRef<SelectedReviewMedia[]>([]);
  const dialogBadge = prefersArabicCopy ? "مراجعة" : "Review";
  const dialogTitle = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "شاركي رأيك"
      : "اكتب مراجعتك"
    : "Write a review";
  const dialogDescription = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "احكي لنا رأيك في المنتج، ولو حابة ضيفي صور أو فيديو عشان التجربة تبقى أوضح."
      : "شارك تجربتك مع المنتج، ويمكنك إضافة صور أو فيديو لتكون المراجعة أوضح وأكثر إقناعًا."
    : "Share your experience, and add photos or video if you want your review to stand out on the product page.";
  const dialogDescriptionMobile = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "ضيفي تقييمك بسرعة، والصور أو الفيديو اختيارية."
      : "\u0623\u0636\u0641 \u062a\u0642\u064a\u064a\u0645\u0643 \u0648\u0645\u0644\u0627\u062d\u0638\u0627\u062a\u0643 \u0628\u0633\u0631\u0639\u0629\u060c \u0648\u0627\u0644\u0635\u0648\u0631 \u0623\u0648 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629."
    : "Share a quick rating and optional media.";
  const closeLabel = prefersArabicCopy ? "إغلاق" : "Close";
  const ratingLabel = prefersArabicCopy ? "تقييمك" : "Your rating";
  const customerNameLabel = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "اسمك"
      : "الاسم"
    : "Your name";
  const emailLabel = prefersArabicCopy ? "البريد الإلكتروني" : "Email";
  const phoneLabel = prefersArabicCopy ? "رقم الهاتف" : "Phone";
  const headlineLabel = prefersArabicCopy ? "عنوان المراجعة" : "Headline";
  const reviewLabel = prefersArabicCopy ? "محتوى المراجعة" : "Your review";
  const namePlaceholder = prefersArabicCopy ? "اكتب اسمك" : "Jane Doe";
  const emailPlaceholder = prefersArabicCopy ? "name@example.com" : "name@example.com";
  const phonePlaceholder = prefersArabicCopy ? "+20..." : "+20...";
  const headlinePlaceholder = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "إيه أكتر حاجة عجبتك؟"
      : "ما أكثر شيء أعجبك؟"
    : "What stood out most?";
  const reviewPlaceholder = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "احكي عن المقاس أو الخامة أو الشحن وأي تفصيلة شايفاها مهمة للي هتشتري بعدك."
      : "احكِ للمتسوقين الآخرين عن المقاس أو الجودة أو الشحن أو أي تفاصيل تستحق الذكر."
    : "Tell other shoppers what you liked, how it fit, delivery quality, and anything worth knowing.";
  const mediaTitle = prefersArabicCopy ? "صور أو فيديو" : "Photos or video";
  const mediaDescription = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "اختياري. تقدري ترفعي لحد 6 صور أو فيديو، بحد أقصى 40MB للملف."
      : "اختياري. يمكنك رفع حتى 6 صور أو فيديوهات، بحجم 40MB لكل ملف."
    : "Optional. Upload up to 6 images or videos, 40MB each.";
  const addMediaLabel = prefersArabicCopy ? "إضافة وسائط" : "Add media";
  const removeMediaLabel = prefersArabicCopy ? "إزالة" : "Remove";
  const emptyMediaText = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "ضيفي صور للمنتج أو فيديو قصير لو حابة توضحي التجربة أكتر."
      : "أضف صور المنتج أو فيديو فتح الصندوق أو مقطع قصير يساعد العملاء على اتخاذ القرار."
    : "Add product photos, unboxing clips, or short fit videos to increase trust.";
  const moderationText = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "ممكن التقييم يظهر فورًا أو بعد مراجعة سريعة حسب إعدادات المتجر."
      : "قد تظهر المراجعات مباشرة أو بعد المراجعة حسب إعدادات المتجر."
    : "Reviews may appear instantly or after moderation depending on store settings.";
  const submittingText = prefersArabicCopy ? "جارٍ الإرسال..." : "Submitting...";
  const submitLabel = prefersArabicCopy
    ? isKhemetEgyptianCopy
      ? "إرسال رأيك"
      : "إرسال المراجعة"
    : "Submit review";

  const revokeSelectedMedia = React.useCallback((items: SelectedReviewMedia[]) => {
    items.forEach((item) => {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        // Ignore object URL cleanup issues.
      }
    });
  }, []);

  const resetForm = React.useCallback(() => {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setTitle("");
    setComment("");
    setRating(5);
    setSelectedMedia((current) => {
      revokeSelectedMedia(current);
      return [];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [revokeSelectedMedia]);

  React.useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  React.useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    resetForm();
  }, [open, resetForm]);

  React.useEffect(
    () => () => {
      revokeSelectedMedia(selectedMediaRef.current);
    },
    [revokeSelectedMedia],
  );

  const handleMediaSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files || []);
    if (incomingFiles.length === 0) {
      return;
    }

    const remainingSlots = MAX_REVIEW_MEDIA - selectedMedia.length;
    if (remainingSlots <= 0) {
      toast.error(
        prefersArabicCopy
          ? `يمكنك رفع حتى ${MAX_REVIEW_MEDIA} صور أو فيديوهات فقط.`
          : `You can upload up to ${MAX_REVIEW_MEDIA} images or videos.`,
      );
      event.target.value = "";
      return;
    }

    const nextMedia: SelectedReviewMedia[] = [];

    incomingFiles.slice(0, remainingSlots).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(
          prefersArabicCopy
            ? `"${file.name}" ليس ملف صورة أو فيديو مدعومًا.`
            : `"${file.name}" is not a supported image or video file.`,
        );
        return;
      }

      if (file.size > MAX_REVIEW_MEDIA_SIZE) {
        toast.error(
          prefersArabicCopy
            ? `"${file.name}" يتجاوز حد الرفع المسموح وهو 40MB.`
            : `"${file.name}" exceeds the 40MB upload limit.`,
        );
        return;
      }

      nextMedia.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
      });
    });

    if (incomingFiles.length > remainingSlots) {
      toast.error(
        prefersArabicCopy
          ? `تمت إضافة أول ${remainingSlots} ملفات إضافية فقط.`
          : `Only the first ${remainingSlots} additional files were added.`,
      );
    }

    if (nextMedia.length > 0) {
      setSelectedMedia((current) => [...current, ...nextMedia].slice(0, MAX_REVIEW_MEDIA));
    }

    event.target.value = "";
  };

  const handleRemoveMedia = (mediaId: string) => {
    setSelectedMedia((current) => {
      const target = current.find((item) => item.id === mediaId);
      if (target) {
        revokeSelectedMedia([target]);
      }

      return current.filter((item) => item.id !== mediaId);
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productId) {
      toast.error(
        prefersArabicCopy
          ? "هذا المنتج غير جاهز لاستقبال المراجعات الآن."
          : "This product is not ready for review submission yet.",
      );
      return;
    }

    if (!customerName.trim()) {
      toast.error(
        prefersArabicCopy
          ? "أضف اسمك قبل إرسال المراجعة."
          : "Add your name before submitting the review.",
      );
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error(
        prefersArabicCopy
          ? "اختر تقييمًا من 1 إلى 5 نجوم."
          : "Choose a rating from 1 to 5 stars.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      let response;
      if (selectedMedia.length > 0) {
        const formData = new FormData();
        formData.append("customerName", customerName.trim());
        if (customerEmail.trim()) {
          formData.append("customerEmail", customerEmail.trim());
        }
        if (customerPhone.trim()) {
          formData.append("customerPhone", customerPhone.trim());
        }
        formData.append("rating", String(rating));
        if (title.trim()) {
          formData.append("title", title.trim());
        }
        if (comment.trim()) {
          formData.append("comment", comment.trim());
        }
        selectedMedia.forEach((item) => {
          formData.append("media", item.file);
        });

        response = await storefrontFetch(
          `/products/${encodeURIComponent(productId)}/reviews`,
          {
            method: "POST",
            body: formData,
          },
        );
      } else {
        response = await storefrontFetch(
          `/products/${encodeURIComponent(productId)}/reviews`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerName: customerName.trim(),
              customerEmail: customerEmail.trim() || undefined,
              customerPhone: customerPhone.trim() || undefined,
              rating,
              title: title.trim() || undefined,
              comment: comment.trim() || undefined,
            }),
          },
        );
      }

      toast.success(
        String(
          response?.message ||
            (prefersArabicCopy
              ? "تم إرسال مراجعتك بنجاح."
              : "Your review has been submitted successfully."),
        ),
      );

      onOpenChange(false);
      onSubmitted?.();
    } catch (error: unknown) {
      const normalizedError =
        error && typeof error === "object" ? (error as { response?: { data?: { error?: string } }; message?: string }) : undefined;
      const message =
        normalizedError?.response?.data?.error ||
        normalizedError?.message ||
        (prefersArabicCopy
          ? "تعذر إرسال مراجعتك الآن."
          : "Unable to submit your review right now.");
      toast.error(String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[91] flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-card shadow-2xl animate-in slide-in-from-bottom duration-200 sm:left-[50%] sm:top-[50%] sm:w-[calc(100vw-2rem)] sm:max-h-[calc(100vh-2rem)] sm:max-w-xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[1.5rem] sm:zoom-in-95"
        >
          <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-border/80 sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 pb-3 pt-3 sm:gap-4 sm:px-6 sm:pb-5 sm:pt-6">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                {dialogBadge}
              </span>
              <Dialog.Title className="mt-2.5 text-lg font-black text-foreground sm:mt-3 sm:text-2xl">
                {dialogTitle}
              </Dialog.Title>
              <p className="mt-1.5 text-sm leading-5 text-muted-foreground sm:hidden">
                {dialogDescriptionMobile}
              </p>
              <p className="mt-2 hidden text-sm leading-6 text-muted-foreground sm:block">
                {dialogDescription}
              </p>
            </div>
            <Dialog.Close className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-muted-foreground transition hover:text-foreground sm:h-auto sm:w-auto sm:px-3 sm:py-2">
              <span aria-hidden="true" className="sm:hidden">X</span>
              <span className="hidden sm:inline">{closeLabel}</span>
              <span className="sr-only sm:hidden">{closeLabel}</span>
            </Dialog.Close>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
              <div className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{ratingLabel}</label>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`min-w-[2.625rem] rounded-full px-3 py-2 text-sm font-bold leading-none transition sm:min-w-[3rem] ${
                      star <= rating
                        ? "bg-amber-100 text-amber-700"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {star}★
                  </button>
                ))}
              </div>
            </div>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">{customerNameLabel}</span>
                <input
                  className={fieldClassName}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  autoComplete="name"
                  placeholder={namePlaceholder}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">{emailLabel}</span>
                <input
                  className={fieldClassName}
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder={emailPlaceholder}
                />
              </label>
            </div>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">{phoneLabel}</span>
                <input
                  className={fieldClassName}
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder={phonePlaceholder}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">{headlineLabel}</span>
                <input
                  className={fieldClassName}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={headlinePlaceholder}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">{reviewLabel}</span>
              <textarea
                className={`${fieldClassName} min-h-[7.5rem] resize-y sm:min-h-32`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={reviewPlaceholder}
              />
            </label>

                <div className="space-y-3 rounded-[1.25rem] border border-dashed border-border bg-background/60 p-3.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{mediaTitle}</h3>
                  <p className="text-xs text-muted-foreground">
                    {mediaDescription}
                  </p>
                </div>
                <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary sm:w-auto">
                  {addMediaLabel}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="sr-only"
                    onChange={handleMediaSelection}
                  />
                </label>
              </div>

              {selectedMedia.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                  {selectedMedia.map((item) => (
                    <div key={item.id} className={mediaPreviewCardClassName}>
                      {item.type === "video" ? (
                        <video
                          src={item.previewUrl}
                          poster={undefined}
                          muted
                          playsInline
                          controls
                          className="h-24 w-full bg-black object-cover sm:h-28"
                        />
                      ) : (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-24 w-full object-cover sm:h-28"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(item.id)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-black sm:right-2 sm:top-2"
                      >
                        {removeMediaLabel}
                      </button>
                      <div className="space-y-1 p-2.5 sm:p-3">
                        <p className="line-clamp-1 text-xs font-semibold text-foreground">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.type === "video"
                            ? prefersArabicCopy
                              ? "فيديو"
                              : "Video"
                            : prefersArabicCopy
                              ? "صورة"
                              : "Image"}{" "}
                          •{" "}
                          {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-card/70 px-4 py-4 text-center text-xs text-muted-foreground sm:py-5">
                  {emptyMediaText}
                </div>
              )}
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.875rem)] pt-3 sm:px-6 sm:pb-6 sm:pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {moderationText}
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSubmitting ? submittingText : submitLabel}
              </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default WriteReviewDialog;
