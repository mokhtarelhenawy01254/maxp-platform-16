import React, { useMemo } from 'react';

interface Props {
    content: string;
    /** متغيرات المعاينة — كلها افتراضية */
    variables?: Record<string, string>;
    /** اسم العميل/المناسبة تظهر في الشريط العلوي */
    headerLabel?: string;
    mediaUrl?: string;
    className?: string;
}

/**
 * 💬 معاينة رسالة واتساب بشكل حقيقي (فقاعة خضراء RTL)
 * بتعرض المتغيرات مستبدلة بقيم واقعية عشان العميلة تشوف الشكل النهائي.
 */
const WhatsAppBubblePreview: React.FC<Props> = ({
    content,
    variables,
    headerLabel,
    mediaUrl,
    className = '',
}) => {
    const defaults: Record<string, string> = {
        customerName: 'مروة',
        'اسم العميل': 'مروة',
        first_name: 'مروة',
        full_name: 'مروة محمود',
        'اسم المناسبة': 'المناسبة',
        occasionName: 'المناسبة',
        coupon_code: 'SWAN20',
        discountPercent: '20%',
        cashAmount: '50',
        currency: 'ج.م',
        points: '120',
        customer_link: 'maxp.online/u/mrw',
        product_name: 'شوز صيفي',
        productName: 'شوز صيفي',
        price: '450 ج.م',
        ...variables,
    };

    const rendered = useMemo(() => {
        let out = content || '';
        for (const [key, val] of Object.entries(defaults)) {
            out = out.split(`{${key}}`).join(val);
            out = out.split(`{{${key}}}`).join(val);
        }
        // أي متغير مش متوفر نعرضه بشكل واضح
        out = out.replace(/\{\{?([^{}]+)\}?\}/g, '…');
        return out;
    }, [content, variables]);

    return (
        <div className={`overflow-hidden rounded-2xl border border-[color:var(--color-border)] ${className}`}>
            {/* شريط محادثة واتساب */}
            <div className="flex items-center gap-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-4 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a13 13 0 0 1-5.7-5c-.4-.7-.9-1.6-.9-2.5 0-.9.5-1.4.7-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.8 1.8c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6a8.2 8.2 0 0 0 3.7 3.2c.3.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.7.8c.3.2.3.3.3.5 0 .1 0 .4-.2.8Z" />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">{headerLabel || 'سوان'}</p>
                    <p className="text-[11px] text-[color:var(--color-muted-foreground)]">متصل</p>
                </div>
            </div>
            {/* خلفية محادثة */}
            <div
                className="px-4 py-6"
                style={{
                    backgroundColor: 'var(--color-muted)',
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
                    backgroundSize: '18px 18px',
                }}
            >
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white p-3 shadow-sm dark:bg-zinc-800">
                    {mediaUrl ? (
                        <img src={mediaUrl} alt="مرفق" className="mb-2 max-h-44 w-full rounded-xl object-cover" />
                    ) : null}
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-100">
                        {rendered || <span className="italic text-zinc-400">اكتب الرسالة لتظهر المعاينة هنا…</span>}
                    </p>
                    <p className="mt-1 text-left text-[10px] text-zinc-400">١٢:٠٠ ✓✓</p>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppBubblePreview;
