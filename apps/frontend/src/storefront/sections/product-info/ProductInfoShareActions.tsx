import React from 'react';
import { toast } from 'sonner';
import { Facebook, Twitter, MessageCircle, Share2 } from 'lucide-react';

export type SharePlatform = 'facebook' | 'twitter' | 'copy' | 'whatsapp';

export interface ProductInfoShareProps {
  productName?: string;
  prefersArabicCopy?: boolean;
  className?: string;
  buttonClassName?: string;
}

export const executeProductShare = async (
  action: SharePlatform,
  productName?: string,
  prefersArabicCopy = true,
): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentUrl = window.location.href;
  const shareTitle = productName || (prefersArabicCopy ? 'هذا المنتج' : 'This product');

  if (action === 'copy') {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: currentUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        toast.success(prefersArabicCopy ? 'تم نسخ رابط المنتج' : 'Product link copied');
        return;
      } catch (error) {
        console.error('Failed to copy product link:', error);
      }
    }

    window.prompt(
      prefersArabicCopy ? 'انسخ رابط المنتج من هنا:' : 'Copy the product link:',
      currentUrl,
    );
    return;
  }

  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(shareTitle);
  const shareTarget =
    action === 'facebook'
      ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
      : action === 'whatsapp'
        ? `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
        : `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;

  window.open(shareTarget, '_blank', 'noopener,noreferrer');
};

export const ProductInfoShareRow: React.FC<ProductInfoShareProps> = ({
  productName,
  prefersArabicCopy = true,
  className = 'flex items-center gap-2',
  buttonClassName = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary',
}) => {
  return (
    <div className={className}>
      <span className="text-xs font-bold text-muted-foreground">
        {prefersArabicCopy ? 'مشاركة:' : 'Share:'}
      </span>
      <button
        type="button"
        aria-label="WhatsApp"
        onClick={() => void executeProductShare('whatsapp', productName, prefersArabicCopy)}
        className={buttonClassName}
      >
        <MessageCircle className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Facebook"
        onClick={() => void executeProductShare('facebook', productName, prefersArabicCopy)}
        className={buttonClassName}
      >
        <Facebook className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Twitter / X"
        onClick={() => void executeProductShare('twitter', productName, prefersArabicCopy)}
        className={buttonClassName}
      >
        <Twitter className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={prefersArabicCopy ? 'نسخ الرابط' : 'Copy link'}
        onClick={() => void executeProductShare('copy', productName, prefersArabicCopy)}
        className={buttonClassName}
      >
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
};
