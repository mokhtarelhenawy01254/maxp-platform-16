import React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Link } from 'react-router-dom';
import { X, Truck, RotateCcw } from 'lucide-react';

interface PolicyDetail {
  label: string;
  value: string;
}

interface SizeGuideRow {
  target: string;
  eu: string;
  uk: string;
  us: string;
  cm: string;
}

export interface ProductInfoShippingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction?: 'ltr' | 'rtl';
  modalTitle: string;
  prefersArabicCopy: boolean;
  shippingTitle: string;
  shippingBody: string;
  shippingDetails: PolicyDetail[];
  returnsTitle: string;
  returnsBody: string;
  returnsDetails: PolicyDetail[];
}

export const ProductInfoShippingDialog: React.FC<ProductInfoShippingDialogProps> = ({
  open,
  onOpenChange,
  direction = 'rtl',
  modalTitle,
  prefersArabicCopy,
  shippingTitle,
  shippingBody,
  shippingDetails,
  returnsTitle,
  returnsBody,
  returnsDetails,
}) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <DialogPrimitive.Popup
          dir={direction}
          className="fixed inset-x-0 bottom-0 z-[95] w-full max-h-[92vh] overflow-y-auto rounded-t-[1.6rem] border-t border-border bg-card p-0 shadow-2xl animate-in slide-in-from-bottom duration-300 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.4rem] md:border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="relative p-5 sm:p-6">
            <DialogPrimitive.Close className={`absolute top-4 rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-foreground ${direction === 'rtl' ? 'left-4' : 'right-4'}`}>
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <div className="space-y-2 pe-12">
              <DialogPrimitive.Title className="text-lg font-black text-foreground sm:text-2xl">
                {modalTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
                {prefersArabicCopy
                  ? 'هذه النافذة تشرح سياسة الشحن والاستبدال، بينما موعد الوصول المتوقع يظل ظاهرًا في الشريط المختصر أعلى مساحة الحسم.'
                  : 'This modal explains shipping and returns, while the estimated arrival stays visible in the utility strip above the decision area.'}
              </DialogPrimitive.Description>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.25rem] border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-foreground">{shippingTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {prefersArabicCopy ? 'تفاصيل تجهيز الطلب والتوصيل' : 'Order prep and delivery details'}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{shippingBody}</p>
                {shippingDetails.length ? (
                  <div className="mt-4 grid gap-2">
                    {shippingDetails.map((item) => (
                      <div
                        key={`shipping-${item.label}`}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-3"
                      >
                        <span className="text-xs font-black text-foreground">{item.label}</span>
                        <span className="text-xs leading-6 text-muted-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.25rem] border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <RotateCcw className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-foreground">{returnsTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {prefersArabicCopy ? 'متى وكيف تطلب الاستبدال أو الاسترجاع' : 'When and how to request an exchange or return'}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{returnsBody}</p>
                {returnsDetails.length ? (
                  <div className="mt-4 grid gap-2">
                    {returnsDetails.map((item) => (
                      <div
                        key={`returns-${item.label}`}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-3"
                      >
                        <span className="text-xs font-black text-foreground">{item.label}</span>
                        <span className="text-xs leading-6 text-muted-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export interface ProductInfoSizeGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction?: 'ltr' | 'rtl';
  modalTitle: string;
  prefersArabicCopy: boolean;
  rows: SizeGuideRow[];
  quickNote: string;
  guideHref?: string;
  isExternalHref: (href: string) => boolean;
}

export const ProductInfoSizeGuideDialog: React.FC<ProductInfoSizeGuideDialogProps> = ({
  open,
  onOpenChange,
  direction = 'rtl',
  modalTitle,
  prefersArabicCopy,
  rows,
  quickNote,
  guideHref,
  isExternalHref,
}) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <DialogPrimitive.Popup
          dir={direction}
          className="fixed inset-x-0 bottom-0 z-[95] w-full max-h-[88vh] overflow-y-auto rounded-t-[1.6rem] border-t border-border bg-card p-0 shadow-2xl animate-in slide-in-from-bottom duration-300 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.4rem] md:border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="relative p-5 sm:p-6">
            <DialogPrimitive.Close className={`absolute top-4 rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-foreground ${direction === 'rtl' ? 'left-4' : 'right-4'}`}>
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <div className="space-y-2 pe-12">
              <DialogPrimitive.Title className="text-lg font-black text-foreground sm:text-2xl">
                {modalTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
                {prefersArabicCopy
                  ? 'مرجع سريع فقط للمقاس الأنسب، من غير شرح طويل أو تكرار داخل الصفحة.'
                  : 'A short size reference without extra copy or repetition on the page.'}
              </DialogPrimitive.Description>
            </div>

            <div className="mt-5 space-y-4">
              {rows.length > 0 ? (
                <div className="overflow-hidden rounded-[1.1rem] border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-secondary text-secondary-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-start font-black">EU</th>
                        <th scope="col" className="px-4 py-3 text-start font-black">UK</th>
                        <th scope="col" className="px-4 py-3 text-start font-black">US</th>
                        <th scope="col" className="px-4 py-3 text-start font-black">CM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={`${row.target}-${row.eu}`} className="border-t border-border bg-card">
                          <td className="px-4 py-3 font-bold text-foreground">{row.eu}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.uk}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.us}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.cm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="rounded-[1.1rem] border border-border bg-secondary/20 px-4 py-4">
                <p className="text-sm font-black text-foreground">
                  {prefersArabicCopy ? 'ملاحظة سريعة' : 'Quick note'}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{quickNote}</p>
              </div>

              {guideHref ? (
                isExternalHref(guideHref) ? (
                  <a
                    href={guideHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {prefersArabicCopy ? 'فتح الدليل الكامل' : 'Open full guide'}
                  </a>
                ) : (
                  <Link
                    to={guideHref}
                    className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {prefersArabicCopy ? 'فتح الدليل الكامل' : 'Open full guide'}
                  </Link>
                )
              ) : null}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export interface ProductInfoQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction?: 'ltr' | 'rtl';
  prefersArabicCopy: boolean;
  productName: string;
  displayPrice: string;
  selectedPrimaryImage?: string;
  questionForm: {
    name: string;
    email: string;
    phone: string;
    message: string;
  };
  onFieldChange: (field: 'name' | 'email' | 'phone' | 'message', value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const ProductInfoQuestionDialog: React.FC<ProductInfoQuestionDialogProps> = ({
  open,
  onOpenChange,
  direction = 'rtl',
  prefersArabicCopy,
  productName,
  displayPrice,
  selectedPrimaryImage,
  questionForm,
  onFieldChange,
  onSubmit,
}) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
        <DialogPrimitive.Popup
          dir={direction}
          className="fixed inset-x-0 bottom-0 z-[95] w-full max-h-[92vh] overflow-y-auto rounded-t-[1.6rem] border-t border-[#ead8ca] bg-white p-0 shadow-2xl animate-in slide-in-from-bottom duration-300 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.4rem] md:border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="relative p-5 sm:p-6">
            <DialogPrimitive.Close className={`absolute top-4 rounded-full border border-[#ead8ca] bg-white p-2 text-[#8f5c44] transition-colors hover:text-[#2d211e] ${direction === 'rtl' ? 'left-4' : 'right-4'}`}>
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <div className="space-y-2 pe-12">
              <DialogPrimitive.Title className="text-lg font-black text-[#2d211e] sm:text-2xl">
                {prefersArabicCopy ? 'اسألي عن المنتج' : 'Ask a question'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-6 text-[#6f5a54]">
                {prefersArabicCopy
                  ? 'اكتبي سؤالك عن المقاس أو الخامة أو الاستبدال، وسيصل إلى فريق المتجر مع اسم المنتج المختار.'
                  : 'Ask about fit, material, or delivery and the request will be sent with the current product context.'}
              </DialogPrimitive.Description>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-[#ead8ca] bg-[#fffaf6] p-4">
              <div className="flex items-center gap-3">
                {selectedPrimaryImage ? (
                  <img
                    src={selectedPrimaryImage}
                    alt={productName}
                    className="h-16 w-16 rounded-[1rem] border border-[#ead8ca] object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#2d211e]">{productName}</p>
                  <p className="mt-1 text-sm text-[#8f5c44]">{displayPrice}</p>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <div className="grid gap-3 border-b border-[#ead8ca] pb-5 sm:grid-cols-2">
                <input
                  value={questionForm.name}
                  onChange={(event) => onFieldChange('name', event.target.value)}
                  placeholder={prefersArabicCopy ? 'الاسم' : 'Your name'}
                  className="h-12 rounded-[1rem] border border-[#ead8ca] bg-white px-4 text-sm text-[#2d211e] outline-none transition-colors placeholder:text-[#9a857c] focus:border-[#c79f8b]"
                />
                <input
                  type="email"
                  value={questionForm.email}
                  onChange={(event) => onFieldChange('email', event.target.value)}
                  placeholder={prefersArabicCopy ? 'البريد الإلكتروني' : 'Your email'}
                  className="h-12 rounded-[1rem] border border-[#ead8ca] bg-white px-4 text-sm text-[#2d211e] outline-none transition-colors placeholder:text-[#9a857c] focus:border-[#c79f8b]"
                />
              </div>
              <input
                value={questionForm.phone}
                onChange={(event) => onFieldChange('phone', event.target.value)}
                placeholder={prefersArabicCopy ? 'رقم الهاتف (اختياري)' : 'Phone number (optional)'}
                className="h-12 w-full rounded-[1rem] border border-[#ead8ca] bg-white px-4 text-sm text-[#2d211e] outline-none transition-colors placeholder:text-[#9a857c] focus:border-[#c79f8b]"
              />
              <textarea
                value={questionForm.message}
                onChange={(event) => onFieldChange('message', event.target.value)}
                placeholder={prefersArabicCopy ? 'رسالتك أو سؤالك' : 'Your message'}
                rows={5}
                className="w-full rounded-[1rem] border border-[#ead8ca] bg-white px-4 py-3 text-sm leading-7 text-[#2d211e] outline-none transition-colors placeholder:text-[#9a857c] focus:border-[#c79f8b]"
              />
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#163828] px-5 text-sm font-black text-white shadow-[0_22px_56px_-34px_rgba(22,56,40,0.55)] transition-colors hover:bg-[#204a36]"
              >
                {prefersArabicCopy ? 'إرسال السؤال' : 'Submit question'}
              </button>
            </form>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
