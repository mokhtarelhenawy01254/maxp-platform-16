import React from "react";
import toast from "react-hot-toast";
import { storefrontFetch } from "../../utils/storefrontApi";
import { cn as cx } from "../../lib/utils";
import { useStorefrontTheme } from "../engine/ThemeProvider";

interface BackInStockSignupCardProps {
  productId: string;
  productName?: string;
  title?: string;
  description?: string;
  successMessage?: string;
  buttonLabel?: string;
  variant?: "panel" | "inline" | "accent";
  className?: string;
}

const inputClassName =
  "w-full rounded-xl border border-border/60 bg-background/50 px-3.5 py-2.5 text-sm text-foreground outline-none transition duration-300 placeholder:text-muted-foreground/50 focus:border-primary/40 focus:bg-background focus:ring-4 focus:ring-primary/5";

const BackInStockSignupCard: React.FC<BackInStockSignupCardProps> = ({
  productId,
  productName,
  title,
  description,
  successMessage,
  buttonLabel,
  variant = "panel",
  className = "",
}) => {
  const { theme } = useStorefrontTheme();
  const isRTL = theme.direction === "rtl";
  const resolvedTitle =
    title || (isRTL ? "نبّهيني عند عودة المقاس" : "Notify me when it's back");
  const resolvedDescription =
    description ||
    (isRTL
      ? "اكتبي اسمك مع البريد أو رقم الهاتف، وسنرسل لك تنبيهًا بمجرد عودة هذا الموديل أو المقاس."
      : "Leave your name plus email or phone and we'll let you know once this item returns.");
  const resolvedSuccessMessage =
    successMessage ||
    (isRTL
      ? "تم تسجيل طلب التنبيه. سنخبرك فور عودة هذا الموديل للمخزون."
      : "You're on the waitlist. We'll let you know when this product is back in stock.");
  const resolvedButtonLabel =
    buttonLabel || (isRTL ? "سجّليني في التنبيه" : "Join waitlist");
  const [form, setForm] = React.useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const updateField = (
    field: "customerName" | "customerEmail" | "customerPhone",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const customerName = form.customerName.trim();
    const customerEmail = form.customerEmail.trim();
    const customerPhone = form.customerPhone.trim();

    if (!customerName) {
      const message = isRTL
        ? "اكتبي اسمك حتى نقدر نحفظ طلب التنبيه."
        : "Add your name so we can save this alert.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!customerEmail && !customerPhone) {
      const message = isRTL
        ? "أضيفي بريدًا إلكترونيًا أو رقم هاتف حتى يصلك التنبيه."
        : "Add an email or phone number to receive the alert.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await storefrontFetch(
        `/products/${encodeURIComponent(productId)}/back-in-stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerName,
            customerEmail: customerEmail || undefined,
            customerPhone: customerPhone || undefined,
            notifyEmail: Boolean(customerEmail),
            notifySMS: Boolean(customerPhone),
          }),
        },
      );

      setIsSubmitted(true);
      setForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
      });

      toast.success(
        String(
          response?.message ||
            resolvedSuccessMessage ||
            `${productName || (isRTL ? "هذا المنتج" : "This product")} is now on your alert list.`,
        ),
      );
    } catch (submissionError: any) {
      const message =
        submissionError?.response?.data?.error ||
        submissionError?.message ||
        (isRTL
          ? "تعذر حفظ طلب التنبيه الآن. حاولي مرة أخرى بعد قليل."
          : "Unable to save your back in stock request right now.");
      setError(String(message));
      toast.error(String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerBase =
    "group relative overflow-hidden rounded-[1.5rem] border transition-all duration-500 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.1)]";
  const surfaceStyle = isSubmitted
    ? "border-emerald-500/20 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--emerald-500)/0.04))] p-5"
    : variant === "accent"
      ? "border-primary/20 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--primary)/0.06))] p-5 shadow-[0_30px_60px_-45px_hsl(var(--primary)/0.35)]"
      : "border-border/40 bg-secondary/5 p-4 sm:p-5";

  if (isSubmitted) {
    return (
      <div className={cx(containerBase, surfaceStyle, className)}>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600">
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          {isRTL ? "تم تسجيل التنبيه" : "Waitlist Joined"}
        </div>
        <h3 className="mt-4 text-lg font-black text-foreground">{resolvedTitle}</h3>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{resolvedSuccessMessage}</p>
      </div>
    );
  }

  return (
    <div className={cx(containerBase, surfaceStyle, className)}>
      <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-primary">
        <span className="h-1 w-1 rounded-full bg-primary" />
        {isRTL ? "تنبيه عودة المخزون" : "Back In Stock"}
      </div>
      <h3 className="mt-4 text-lg font-black text-foreground sm:text-xl">{resolvedTitle}</h3>
      <p className="mt-2 text-sm font-medium text-muted-foreground/80">{resolvedDescription}</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="relative">
          <input
            className={inputClassName}
            value={form.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            placeholder={isRTL ? "اسمك" : "Your name"}
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              className={inputClassName}
              value={form.customerEmail}
              onChange={(event) => updateField("customerEmail", event.target.value)}
              placeholder={isRTL ? "البريد الإلكتروني" : "Email address"}
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <div className="relative flex-1">
            <input
              className={inputClassName}
              value={form.customerPhone}
              onChange={(event) => updateField("customerPhone", event.target.value)}
              placeholder={isRTL ? "رقم الهاتف" : "Phone number"}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
          <p className="text-[11px] leading-relaxed text-muted-foreground/60 max-w-[200px]">
            {isRTL
              ? "سنرسل لك التنبيه على الوسيلة المتاحة فور عودة الموديل أو المقاس."
              : "We'll notify you across all saved channels as soon as inventory returns."}
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)] transition-all duration-300 hover:scale-102 hover:shadow-[0_12px_25px_-8px_hsl(var(--primary)/0.7)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (isRTL ? "جارٍ الحفظ..." : "Syncing...") : resolvedButtonLabel}
          </button>
        </div>

        {error ? <p className="text-xs font-semibold text-destructive/80 text-center">{error}</p> : null}
      </form>
    </div>
  );
};

export default BackInStockSignupCard;
