import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  getRatingDistribution,
  normalizeProductReviewRecord,
  type ProductReview,
  useProductReviews,
} from '../hooks/useProductReviews';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { useProduct } from '../hooks/useProduct';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from '../utils/marketplaceApps';
import { STOREFRONT_REVIEWS_SECTION_ID } from '../utils/pdpCheckout';
import ReviewMediaGallery from '../components/ReviewMediaGallery';
import WriteReviewDialog from '../components/WriteReviewDialog';
import { resolveSectionVariant } from '../variants';
import { useDeferredSectionActivation } from '../hooks/useDeferredSectionActivation';
import { resolveSectionContentAlign } from '../utils/contentAlignment';

const StarRating: React.FC<{ rating: number; size?: number }> = ({
  rating,
  size = 14,
}) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={star <= rating ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        className={star <= rating ? 'text-yellow-500' : 'text-muted-foreground'}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

const ElessiAvatar: React.FC<{ label: string }> = ({ label }) => (
  <div
    aria-label={label}
    className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ececec] text-[#b5b5b5]"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="42"
      height="42"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 12c2.76 0 5-2.46 5-5.5S14.76 1 12 1 7 3.46 7 6.5 9.24 12 12 12Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" />
    </svg>
  </div>
);

interface ReviewsSectionProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    writeReviewText?: string;
    emptyText?: string;
    verifiedLabel?: string;
    outOfText?: string;
    reviewsLabel?: string;
    mediaTitle?: string;
    mediaDescription?: string;
    listTitle?: string;
    showMediaFeed?: boolean | string;
    reviewLimit?: number | string;
    mobileReviewLimit?: number | string;
    galleryStyle?: string;
    cardStyle?: string;
    contentAlign?: string;
    [key: string]: unknown;
  };
}

const ReviewSkeleton: React.FC = () => (
  <div className="rounded-[var(--radius)] border border-border bg-card p-5 animate-pulse">
    <div className="mb-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-muted" />
      <div className="space-y-1.5">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-2.5 w-16 rounded bg-muted" />
      </div>
    </div>
    <div className="space-y-1.5">
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
    </div>
  </div>
);

const formatDisplayDate = (value: string) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const getEnabledReviewMedia = (
  review: ProductReview,
  allowPhotoReviews: boolean,
  allowVideoReviews: boolean,
) =>
  review.media.filter((item) => {
    if (item.type === 'video') {
      return allowVideoReviews;
    }

    return allowPhotoReviews;
  });

const getReviewCardClassName = (cardStyle: string) => {
  switch (cardStyle) {
    case 'minimal':
      return 'space-y-3 rounded-[var(--radius)] border border-border bg-background p-5';
    case 'editorial':
      return 'space-y-3 rounded-[1.5rem] border border-primary/10 bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--secondary)/0.35))] p-5 shadow-[0_20px_70px_-55px_hsl(var(--primary)/0.55)]';
    default:
      return 'space-y-3 rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm';
  }
};

const parseBooleanSetting = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
};

const parsePositiveNumberSetting = (value: unknown, fallback: number) => {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.round(numericValue);
};

const resolveDirectionalCopy = ({
  value,
  englishFallback,
  arabicFallback,
  prefersArabicCopy,
}: {
  value: unknown;
  englishFallback: string;
  arabicFallback: string;
  prefersArabicCopy: boolean;
}) => {
  if (typeof value === 'string' && value.trim()) {
    const trimmedValue = value.trim();
    if (prefersArabicCopy && trimmedValue === englishFallback) {
      return arabicFallback;
    }

    return trimmedValue;
  }

  return prefersArabicCopy ? arabicFallback : englishFallback;
};

type ReviewsSectionVariant =
  | 'standard'
  | 'compact'
  | 'editorial'
  | 'minimal'
  | 'voice-notes'
  | 'scent-notes'
  | 'elessi-proof-wall'
  | 'elessi-story-grid'
  | 'elessi-trust-pile'
  | 'elessi-plant-reviews'
  | 'command-proof';

const REVIEWS_SECTION_FAMILY = 'ReviewsSection';

const normalizeReviewsVariant = (rawVariant: unknown): ReviewsSectionVariant => {
  return resolveSectionVariant<ReviewsSectionVariant>(
    REVIEWS_SECTION_FAMILY,
    rawVariant,
    'standard',
  );
};

const getReviewGridClassName = (variant: ReviewsSectionVariant, isZenOrganic: boolean) => {
  if (isZenOrganic) {
    return 'space-y-12';
  }

  switch (variant) {
    case 'compact':
      return 'grid gap-4 lg:grid-cols-2';
    case 'voice-notes':
    case 'scent-notes':
    case 'elessi-proof-wall':
    case 'elessi-trust-pile':
    case 'elessi-plant-reviews':
    case 'command-proof':
      return 'grid gap-4 lg:grid-cols-2';
    case 'elessi-story-grid':
      return 'space-y-0';
    case 'editorial':
      return 'grid gap-6';
    default:
      return 'space-y-6';
  }
};

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ section, settings }) => {
  const { id: productId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const sectionVariant = normalizeReviewsVariant(section?.variant);
  const isElessiStoryGrid = sectionVariant === 'elessi-story-grid';
  const { isActive, sectionRef } = useDeferredSectionActivation({
    idleTimeout: isElessiStoryGrid ? 3500 : 10000,
    rootMargin: isElessiStoryGrid ? '1600px 0px' : '360px 0px',
  });
  const {
    reviews: realReviews,
    totalCount: realTotalCount,
    averageRating: realAverageRating,
    ratingDistribution: realRatingDistribution,
    isLoading,
  } = useProductReviews(productId, { enabled: isActive });
  const { theme } = useStorefrontTheme();
  const { product } = useProduct(productId);
  const { settings: storefrontSettings } = useStorefrontSettings();
  const prefersArabicCopy = theme.direction === 'rtl';
  const notAvailableText = prefersArabicCopy ? 'غير متوفر' : 'N/A';

  const isContentCentered =
    resolveSectionContentAlign(settings?.contentAlign) === 'center';
  const title =
    settings?.title ||
    resolveDirectionalCopy({
      value: settings?.title,
      englishFallback: 'Customer reviews',
      arabicFallback: 'آراء العملاء',
      prefersArabicCopy,
    });
  const writeReviewText =
    settings?.writeReviewText ||
    resolveDirectionalCopy({
      value: settings?.writeReviewText,
      englishFallback: 'Write a review',
      arabicFallback: 'اكتب مراجعتك',
      prefersArabicCopy,
    });
  const emptyText =
    settings?.emptyText ||
    resolveDirectionalCopy({
      value: settings?.emptyText,
      englishFallback: 'There are no reviews yet. Be the first to review this product.',
      arabicFallback: 'لا توجد مراجعات بعد. كن أول من يشارك رأيه عن هذا المنتج.',
      prefersArabicCopy,
    });
  const verifiedLabel =
    settings?.verifiedLabel ||
    resolveDirectionalCopy({
      value: settings?.verifiedLabel,
      englishFallback: 'Verified buyer',
      arabicFallback: 'عميل موثق',
      prefersArabicCopy,
    });
  const outOfText =
    settings?.outOfText ||
    resolveDirectionalCopy({
      value: settings?.outOfText,
      englishFallback: 'out of 5',
      arabicFallback: 'من 5',
      prefersArabicCopy,
    });
  const reviewsLabel =
    settings?.reviewsLabel ||
    resolveDirectionalCopy({
      value: settings?.reviewsLabel,
      englishFallback: 'reviews',
      arabicFallback: 'مراجعات',
      prefersArabicCopy,
    });
  const mediaTitle =
    settings?.mediaTitle ||
    resolveDirectionalCopy({
      value: settings?.mediaTitle,
      englishFallback: 'Customer photos & videos',
      arabicFallback: 'صور ومقاطع العملاء',
      prefersArabicCopy,
    });
  const mediaDescription =
    settings?.mediaDescription ||
    resolveDirectionalCopy({
      value: settings?.mediaDescription,
      englishFallback: 'Rendered from review media when the UGC app is enabled.',
      arabicFallback: 'يتم عرض هذا القسم من وسائط المراجعات عند تفعيل تطبيق المراجعات المرئية.',
      prefersArabicCopy,
    });
  const listTitle =
    settings?.listTitle ||
    resolveDirectionalCopy({
      value: settings?.listTitle,
      englishFallback: 'Review list',
      arabicFallback: 'قائمة المراجعات',
      prefersArabicCopy,
    });
  const isZenOrganic = theme.id === 'zen-organic';
  const isKhemetLuxeTheme = theme.id === 'khemet-luxe-eg';
  const isCompactVariant = sectionVariant === 'compact';
  const isVoiceNotesVariant = sectionVariant === 'voice-notes';
  const isScentNotesVariant = sectionVariant === 'scent-notes';
  const isElessiProofWall = sectionVariant === 'elessi-proof-wall';
  const isElessiTrustPile = sectionVariant === 'elessi-trust-pile';
  const isElessiPlantReviews = sectionVariant === 'elessi-plant-reviews';
  const isCommandProofVariant = sectionVariant === 'command-proof';
  const isStoryNotesVariant = isVoiceNotesVariant || isScentNotesVariant;
  const ugcEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    'ugc-reviews-pro',
  );
  const ugcSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    'ugc-reviews-pro',
  );
  const ugcModules = (ugcSettings['modules'] as Record<string, unknown> | undefined) || {};
  const ugcUi = (ugcSettings['ui'] as Record<string, unknown> | undefined) || {};
  const allowPhotoReviews = ugcEnabled && ugcModules['photoReviews'] !== false;
  const allowVideoReviews = ugcEnabled && ugcModules['videoReviews'] !== false;
  const showVerifiedBadge = !ugcEnabled || ugcModules['verifiedBadge'] !== false;
  const galleryStyle =
    typeof settings?.galleryStyle === 'string' && settings.galleryStyle.trim()
      ? settings.galleryStyle.trim()
      : String(ugcUi['galleryStyle'] || 'mosaic');
  const cardStyle =
    typeof settings?.cardStyle === 'string' && settings.cardStyle.trim()
      ? settings.cardStyle.trim()
      : String(ugcUi['cardStyle'] || 'elevated');
  const showMediaFeed = parseBooleanSetting(settings?.showMediaFeed, true);
  const [activeTab, setActiveTab] = React.useState<
    'description' | 'additional' | 'reviews'
  >('reviews');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = React.useState(false);

  const mockReviews = React.useMemo(
    () => {
      const rawMockReviews = (
        Array.isArray(settings?.['reviews']) ? settings['reviews'] : []
      ) as unknown[];

      return rawMockReviews.map((review, index) =>
        normalizeProductReviewRecord(
          review && typeof review === 'object'
            ? (review as Record<string, unknown>)
            : { comment: String(review || '') },
          index,
        ),
      );
    },
    [settings],
  );

  const hasRealReviews = realReviews.length > 0;
  const reviews = hasRealReviews ? realReviews : mockReviews;
  const totalCount = hasRealReviews ? realTotalCount : mockReviews.length;
  const computedMockRating =
    mockReviews.length > 0
      ? mockReviews.reduce((total, review) => total + (review.rating || 5), 0) /
        mockReviews.length
      : 0;
  const averageRating = hasRealReviews ? realAverageRating : computedMockRating;
  const ratingDistribution = hasRealReviews
    ? realRatingDistribution
    : getRatingDistribution(mockReviews);
  const reviewLimit = parsePositiveNumberSetting(
    settings?.reviewLimit,
    isElessiStoryGrid ? 4 : 6,
  );
  const mobileReviewLimit = Math.min(
    reviewLimit,
    parsePositiveNumberSetting(settings?.mobileReviewLimit, reviewLimit),
  );
  const shouldShowLoading = !isActive || isLoading;
  const shouldUseCompactEmptyReviews =
    isKhemetLuxeTheme && isElessiStoryGrid && !shouldShowLoading && reviews.length === 0;
  const visibleReviews = reviews.slice(0, reviewLimit);
  const distributionRows = ratingDistribution.map((item) => ({
    ...item,
    percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
  }));
  const mediaFeed = React.useMemo(
    () =>
      reviews
        .flatMap((review) => getEnabledReviewMedia(review, allowPhotoReviews, allowVideoReviews))
        .slice(0, 8),
    [allowPhotoReviews, allowVideoReviews, reviews],
  );
  const elessiPreviewMedia = mediaFeed.slice(0, 4);
  const reviewCardClassName = isScentNotesVariant
    ? 'space-y-3 rounded-[1.65rem] border border-[#eadfd7] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf6_100%)] p-5 shadow-[0_20px_70px_-58px_rgba(61,41,44,0.16)]'
    : isVoiceNotesVariant
      ? 'space-y-3 rounded-[1.6rem] border border-[#ead9d8] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f7_100%)] p-5 shadow-[0_20px_70px_-58px_rgba(107,33,49,0.18)]'
      : isElessiStoryGrid
        ? ''
        : isElessiProofWall || isElessiStoryGrid || isElessiTrustPile
          ? 'space-y-3 rounded-[1.6rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] p-5 shadow-[0_20px_70px_-58px_rgba(91,57,40,0.16)]'
      : isElessiPlantReviews
        ? 'space-y-3 border border-[#d8e6d8] bg-white p-5 shadow-[0_20px_60px_-54px_rgba(32,53,40,0.12)]'
      : isCommandProofVariant
        ? 'space-y-3 rounded-[1.6rem] border border-[#dce4ef] bg-[linear-gradient(180deg,#ffffff_0%,#f9fafc_100%)] p-5 shadow-[0_20px_70px_-58px_rgba(15,23,42,0.18)]'
      : getReviewCardClassName(cardStyle);
  const reviewGridClassName = getReviewGridClassName(sectionVariant, isZenOrganic);
  const productTags = product?.['tags'];
  const tagsValue = Array.isArray(productTags) ? productTags.join(', ') : notAvailableText;
  const trustedBadgeTitle =
    typeof product?.['trustedBadgeTitle'] === 'string' && product['trustedBadgeTitle'].trim()
      ? product['trustedBadgeTitle'].trim()
      : prefersArabicCopy
        ? 'ثقة بعد الشراء'
        : 'Post-purchase trust';
  const trustedBadgeSubtitle =
    typeof product?.['trustedBadgeSubtitle'] === 'string' &&
    product['trustedBadgeSubtitle'].trim()
      ? product['trustedBadgeSubtitle'].trim()
      : prefersArabicCopy
        ? 'مؤشرات قصيرة عن الضمان والشحن وتجربة الاستخدام.'
        : 'Short cues about warranty, shipping, and real product use.';
  const trustedBadgeItems = Array.isArray(product?.['trustedBadgeItems'])
    ? (product['trustedBadgeItems'] as string[]).filter((item) => typeof item === 'string' && item.trim()).slice(0, 3)
    : [];
  const showingReviewsText = prefersArabicCopy
    ? `عرض ${visibleReviews.length} من أصل ${totalCount} مراجعة`
    : `Showing ${visibleReviews.length} of ${totalCount} reviews`;
  const mobileShowingReviewsText = prefersArabicCopy
    ? `عرض مختصر من أصل ${totalCount} مراجعة`
    : `Compact view from ${totalCount} reviews`;
  const ratingBreakdownTitle = prefersArabicCopy ? 'تفصيل التقييمات' : 'Rating Breakdown';
  const ratedByCustomersText = prefersArabicCopy ? 'تقييمات العملاء' : 'Rated by customers';
  const compactLayoutText = prefersArabicCopy ? 'عرض مضغوط' : 'Compact layout';
  const sortByText = prefersArabicCopy ? 'الترتيب حسب:' : 'Sort by:';
  const newestText = prefersArabicCopy ? 'الأحدث' : 'Newest';
  const verifiedZenText = prefersArabicCopy ? '(موثق)' : '(Verified)';
  const customerFeedbackText = prefersArabicCopy ? 'رأي العميل' : 'Customer feedback';
  const defaultFeedbackText = prefersArabicCopy
    ? 'أعجبته التجربة بشكل عام وأراد مشاركة ملاحظة سريعة.'
    : 'Loved the overall experience and wanted to share quick feedback.';
  const ratingOnlyCommentText = prefersArabicCopy
    ? 'شارك العميل تقييمه بدون إضافة تعليق مكتوب.'
    : 'Customer shared a rating without extra written feedback.';
  const helpfulCustomersText = (count: number) =>
    prefersArabicCopy
      ? `${count} عميل وجدوا هذه المراجعة مفيدة`
      : `${count} customers found this helpful`;
  const helpfulPeopleText = (count: number) =>
    prefersArabicCopy
      ? `${count} شخص وجدوا هذه المراجعة مفيدة`
      : `${count} people found this helpful`;
  const showingRangeStart = totalCount > 0 ? 1 : 0;
  const showingRangeEnd = Math.min(visibleReviews.length, totalCount);
  const showingRangeText = prefersArabicCopy
    ? `عرض ${showingRangeStart} - ${showingRangeEnd} من ${totalCount} مراجعات`
    : `Showing ${showingRangeStart} - ${showingRangeEnd} of ${totalCount} reviews`;
  const handleReviewSubmitted = React.useCallback(() => {
    if (!productId) {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: ['storefront', 'reviews', productId],
    });
  }, [productId, queryClient]);

  const elessiStoryGridSummary =
    !isZenOrganic && isElessiStoryGrid && !shouldShowLoading && totalCount > 0 ? (
      <div className="mb-8 border-b border-[#ead8ca] pb-8">
        <div
          dir="ltr"
          className="grid gap-6 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)_minmax(12rem,13rem)] lg:items-center"
        >
          <div
            dir={prefersArabicCopy ? 'rtl' : 'ltr'}
            className={`space-y-4 ${prefersArabicCopy ? 'text-right' : 'text-left'}`}
          >
            <div className="flex flex-wrap items-center gap-3 text-[#2d211e]">
              <span className="text-[2.45rem] font-black leading-none text-[#76a40f]">
                {averageRating.toFixed(2)}
              </span>
              <StarRating rating={Math.round(averageRating)} size={16} />
              <span className="text-sm text-[#6f5a54]">
                {totalCount.toLocaleString('en-US')} {reviewsLabel}
              </span>
            </div>
            <div className="space-y-2.5">
              {distributionRows.map((item) => (
                <div key={item.rating} className="flex items-center gap-3 text-sm">
                  <span className="inline-flex w-8 items-center gap-1 text-[#2d211e]">
                    <span>{item.rating}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-[#f5a200]"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#ececec]">
                    <div
                      className="h-full rounded-full bg-[#78aa08] transition-all duration-700"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-[#8f7b73]">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 border-y border-[#efe0d4] py-4 lg:border-y-0 lg:border-s lg:border-e lg:px-6 lg:py-0">
            {elessiPreviewMedia.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                {elessiPreviewMedia.map((item, index) => {
                  const previewSrc = item.type === 'video' ? item.poster || '' : item.url;

                  return (
                    <div
                      key={`${item.url}-${index}`}
                      className="relative h-[4.65rem] w-[4.65rem] shrink-0 overflow-hidden rounded-[0.9rem] border border-[#e6dfd7] bg-white"
                    >
                      {previewSrc ? (
                        <img
                          src={previewSrc}
                          alt={
                            item.alt ||
                            (prefersArabicCopy
                              ? 'وسائط من مراجعات العملاء'
                              : 'Customer review media')
                          }
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#f5f1ed]" />
                      )}
                      {item.type === 'video' ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/12">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/92 shadow-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="translate-x-[1px] text-[#2d211e]"
                            >
                              <polygon points="8,5 19,12 8,19" />
                            </svg>
                          </span>
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#8f7b73]">
                {prefersArabicCopy
                  ? 'لا توجد وسائط مرفوعة مع المراجعات بعد.'
                  : 'No review media has been uploaded yet.'}
              </p>
            )}
          </div>

          <div
            dir={prefersArabicCopy ? 'rtl' : 'ltr'}
            className={`flex ${prefersArabicCopy ? 'lg:justify-end' : 'lg:justify-start'}`}
          >
            <button
              type="button"
              onClick={() => setIsReviewDialogOpen(true)}
              className="inline-flex min-h-[2.65rem] w-full items-center justify-center rounded-[0.5rem] bg-[#fb6a6d] px-5 text-sm font-black text-white transition-colors hover:bg-[#f85d61] lg:w-auto lg:min-w-[11rem]"
            >
              {writeReviewText}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const elessiStoryGridMediaSection =
    !shouldShowLoading && ugcEnabled && showMediaFeed && mediaFeed.length > 0 && isElessiStoryGrid ? (
      null
    ) : null;

  const elessiStoryGridListToolbar =
    !shouldShowLoading && visibleReviews.length > 0 && isElessiStoryGrid ? (
      <div
        dir="ltr"
        className="mb-6 flex flex-col gap-3 border-b border-[#ead8ca] pb-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div
          dir={prefersArabicCopy ? 'rtl' : 'ltr'}
          className={`text-sm font-medium text-[#2d211e] ${
            prefersArabicCopy ? 'text-right' : 'text-left'
          }`}
        >
          {showingRangeText}
        </div>
        <div className="flex items-center gap-4 text-[#6f5a54]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-[#f2f2f2] text-[#bdbdbd]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z" />
              </svg>
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-[#f2f2f2] text-[#2d211e]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 6h4v4H4V6Zm6 0h10v4H10V6ZM4 14h4v4H4v-4Zm6 0h10v4H10v-4Z" />
              </svg>
            </span>
          </div>
          <span className="text-sm">
            {prefersArabicCopy ? 'الترتيب حسب' : 'Sort by'}{' '}
            <span className="font-medium text-[#2d211e]">
              {prefersArabicCopy ? 'الأحدث' : 'Latest'}
            </span>
          </span>
        </div>
      </div>
    ) : null;

  return (
    <section
      id={STOREFRONT_REVIEWS_SECTION_ID}
      ref={sectionRef as React.RefObject<HTMLElement>}
      className={`w-full border-t ${
        isElessiStoryGrid && !shouldUseCompactEmptyReviews ? 'min-h-[38rem]' : ''
      } ${shouldUseCompactEmptyReviews ? 'py-6 md:py-12' : 'py-12 md:py-16'} ${
        isElessiPlantReviews
          ? 'border-[#d8e6d8] bg-[linear-gradient(180deg,#fbfaf5_0%,#eef5ea_42%,#ffffff_100%)]'
        : isElessiStoryGrid
          ? 'border-[#ead8ca] bg-[#fffdfa]'
        : isElessiProofWall || isElessiStoryGrid || isElessiTrustPile
          ? 'border-[#ead8ca] bg-[linear-gradient(180deg,#fffdfa_0%,#fff7f1_42%,#ffffff_100%)]'
        : isScentNotesVariant
          ? 'border-[#eadfd7] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f4_42%,#ffffff_100%)]'
          : isVoiceNotesVariant
            ? 'border-[#ead9d8] bg-[linear-gradient(180deg,#fffdfc_0%,#fff9f8_42%,#ffffff_100%)]'
          : isCommandProofVariant
            ? 'border-[#dce4ef] bg-[linear-gradient(180deg,#fffdf7_0%,#f8fafc_42%,#ffffff_100%)]'
          : 'border-border bg-background'
      }`}
    >
      <div className="container px-4 md:px-6">
        {isZenOrganic && (
          <div className="mb-12 flex items-center justify-center gap-8 border-b border-[#e9ebe5] md:gap-12">
            {[
              { id: 'description', label: prefersArabicCopy ? 'الوصف' : 'Description' },
              {
                id: 'additional',
                label: prefersArabicCopy ? 'معلومات إضافية' : 'Additional Information',
              },
              { id: 'reviews', label: prefersArabicCopy ? 'المراجعات' : 'Review' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'description' | 'additional' | 'reviews')}
                className={`relative pb-4 text-sm font-bold transition-all md:text-base ${
                  activeTab === tab.id
                    ? 'text-[#1a3328]'
                    : 'text-[#1a3328]/30 hover:text-[#1a3328]/60'
                }`}
              >
                {tab.label}
                {activeTab === tab.id ? (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#88a876]" />
                ) : null}
              </button>
            ))}
          </div>
        )}

        {isZenOrganic && activeTab === 'description' ? (
          <div className="mx-auto max-w-4xl py-4">
            <div
              className="prose prose-sm max-w-none leading-relaxed text-[#1a3328]/60"
              dangerouslySetInnerHTML={{
                __html: product?.description || (prefersArabicCopy ? 'لا يوجد وصف متاح.' : 'No description available.'),
              }}
            />
          </div>
        ) : null}

        {isZenOrganic && activeTab === 'additional' ? (
          <div className="mx-auto max-w-4xl py-4">
            <table className="w-full border-collapse">
              <tbody>
                {[
                  {
                    label: prefersArabicCopy ? 'الفئة' : 'Category',
                    value: product?.category?.name || notAvailableText,
                  },
                  {
                    label: prefersArabicCopy ? 'الوسوم' : 'Tags',
                    value: tagsValue || notAvailableText,
                  },
                  {
                    label: prefersArabicCopy ? 'العلامة التجارية' : 'Brand',
                    value: prefersArabicCopy ? 'زين أورجانيك' : 'Zen Organic',
                  },
                  {
                    label: prefersArabicCopy ? 'الوزن' : 'Weight',
                    value: prefersArabicCopy ? '150 جم' : '150g',
                  },
                  {
                    label: prefersArabicCopy ? 'الأبعاد' : 'Dimensions',
                    value: '10 x 5 x 5 cm',
                  },
                  {
                    label: prefersArabicCopy ? 'بلد المنشأ' : 'Origin',
                    value: prefersArabicCopy ? 'صنع في الولايات المتحدة' : 'Made in USA',
                  },
                ].map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-[#e9ebe5] last:border-0"
                  >
                    <td className="w-1/3 py-4 text-sm font-bold text-[#1a3328]">
                      {row.label}
                    </td>
                    <td className="py-4 text-sm text-[#1a3328]/60">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className={isZenOrganic && activeTab !== 'reviews' ? 'hidden' : ''}>
          {isZenOrganic && !shouldShowLoading ? (
            <div className="mb-16 grid grid-cols-1 gap-12 pb-12 lg:grid-cols-2">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-[#1a3328]">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-lg font-bold text-[#1a3328]/30">{outOfText}</span>
                </div>
                <div className="mb-3 flex gap-1 text-[#ffb800]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(averageRating)
                          ? 'fill-current'
                          : 'fill-[#e9ebe5] text-[#e9ebe5]'
                      }`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-bold text-[#1a3328]/40">
                  ({totalCount} {reviewsLabel})
                </span>
              </div>

              <div className="space-y-3">
                {distributionRows.map((item) => (
                  <div key={item.rating} className="group flex items-center gap-4">
                    <span className="w-10 whitespace-nowrap text-xs font-bold text-[#1a3328]">
                      {prefersArabicCopy ? `${item.rating} نجوم` : `${item.rating} Star`}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f1f3ee]">
                      <div
                        className="h-full rounded-full bg-[#ffb800] transition-all duration-1000 ease-out"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-[10px] font-bold text-[#1a3328]/20">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isZenOrganic ? (
            sectionVariant === 'standard' || shouldShowLoading || totalCount === 0 ? (
              <div className={`mb-8 flex flex-col gap-4 ${isContentCentered ? 'items-center text-center' : 'sm:flex-row sm:items-center sm:justify-between'}`}>
                <div className={isContentCentered ? 'text-center' : ''}>
                  <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
                  {!shouldShowLoading && totalCount > 0 ? (
                    <div className={`mt-1 flex items-center gap-2 ${isContentCentered ? 'justify-center' : ''}`}>
                      <StarRating rating={Math.round(averageRating)} />
                      <span className="text-sm text-muted-foreground">
                        {averageRating.toFixed(1)} {outOfText} ({totalCount} {reviewsLabel})
                      </span>
                    </div>
                  ) : null}
                </div>
                {shouldShowLoading || totalCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsReviewDialogOpen(true)}
                    className="rounded-[var(--radius)] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {writeReviewText}
                  </button>
                ) : null}
              </div>
            ) : isElessiStoryGrid ? (
              elessiStoryGridSummary
            ) : (
              <div
                className={`mb-10 grid gap-6 ${
                  sectionVariant === 'editorial'
                    ? 'lg:grid-cols-[minmax(0,1fr)_320px]'
                    : 'lg:grid-cols-[minmax(0,1fr)_280px]'
                } ${isContentCentered ? 'mx-auto max-w-5xl' : ''}`}
              >
                <div
                  className={`rounded-[1.5rem] p-6 shadow-sm ${
                    isElessiPlantReviews
                      ? 'border border-[#d8e6d8] bg-white shadow-[0_24px_70px_-58px_rgba(32,53,40,0.12)]'
                    : isElessiProofWall || isElessiStoryGrid || isElessiTrustPile
                      ? 'border border-[#ead8ca] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] shadow-[0_24px_80px_-64px_rgba(91,57,40,0.14)]'
                    : isScentNotesVariant
                      ? 'border border-[#eadfd7] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] shadow-[0_24px_80px_-64px_rgba(61,41,44,0.14)]'
                      : isVoiceNotesVariant
                        ? 'border border-[#ead9d8] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f5_100%)] shadow-[0_24px_80px_-64px_rgba(107,33,49,0.18)]'
                      : isCommandProofVariant
                        ? 'border border-[#dce4ef] bg-[linear-gradient(180deg,#ffffff_0%,#f9fafc_100%)] shadow-[0_24px_80px_-64px_rgba(15,23,42,0.16)]'
                      : 'border border-border bg-card'
                  }`}
                >
                  <div className={`flex flex-col gap-4 ${isContentCentered ? 'items-center text-center' : 'sm:flex-row sm:items-start sm:justify-between'}`}>
                    <div className={`space-y-3 ${isContentCentered ? 'text-center' : ''}`}>
                      {isStoryNotesVariant ? (
                        <span
                          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.2em] ${
                            isElessiStoryGrid
                              ? 'border border-[#ead8ca] bg-[#fff7f1] text-[#8f5c44]'
                              : isScentNotesVariant
                              ? 'border border-[#eadfd7] bg-[#fff8f2] text-[#8b623e]'
                              : 'border border-[#f3c8c1] bg-[#fff2ee] text-[#8b3d33]'
                          } ${
                            isContentCentered ? 'mx-auto' : ''
                          }`}
                        >
                          <span
                            className={`inline-flex h-2 w-2 rounded-full ${
                              isElessiStoryGrid
                                ? 'bg-[#8f5c44]'
                                : isScentNotesVariant
                                  ? 'bg-[#8b623e]'
                                  : 'bg-[#ea580c]'
                            }`}
                          />
                          {isElessiStoryGrid
                            ? 'قصص الشراء'
                            : isScentNotesVariant
                              ? 'ملاحظات العطر'
                              : 'آراء سريعة'}
                        </span>
                      ) : isElessiPlantReviews ? (
                        <span
                          className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#d8e6d8] bg-[#f7fbf6] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#6b8a74] ${
                            isContentCentered ? 'mx-auto' : ''
                          }`}
                        >
                          <span className="inline-flex h-2 w-2 rounded-full bg-[#6b8a74]" />
                          آراء النباتات
                        </span>
                      ) : isElessiProofWall ? (
                        <span
                          className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fff7f1] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#8f5c44] ${
                            isContentCentered ? 'mx-auto' : ''
                          }`}
                        >
                          <span className="inline-flex h-2 w-2 rounded-full bg-[#8f5c44]" />
                          دليل الثقة
                        </span>
                      ) : isElessiTrustPile ? (
                        <span
                          className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fff7f1] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#8f5c44] ${
                            isContentCentered ? 'mx-auto' : ''
                          }`}
                        >
                          <span className="inline-flex h-2 w-2 rounded-full bg-[#8f5c44]" />
                          ثقة العملاء
                        </span>
                      ) : isCommandProofVariant ? (
                        <span
                          className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#f4d067] bg-[#101828] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#fff3bf] ${
                            isContentCentered ? 'mx-auto' : ''
                          }`}
                        >
                          <span className="inline-flex h-2 w-2 rounded-full bg-[#f7b500]" />
                          ثقة ما بعد الشراء
                        </span>
                      ) : null}
                      <div>
                        <h2 className="font-heading text-2xl font-bold text-foreground">
                          {title}
                        </h2>
                        <p
                          className={`mt-1 text-sm text-muted-foreground ${
                            isCompactVariant ? 'hidden sm:block' : ''
                          }`}
                        >
                          {averageRating.toFixed(1)} {outOfText} ({totalCount} {reviewsLabel})
                        </p>
                      </div>
                      <div className={`flex items-end gap-4 ${isContentCentered ? 'justify-center' : ''}`}>
                        <span className="text-5xl font-black text-foreground">
                          {averageRating.toFixed(1)}
                        </span>
                        <div className="space-y-2 pb-1">
                          <StarRating rating={Math.round(averageRating)} size={16} />
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {ratedByCustomersText}
                          </p>
                        </div>
                      </div>
                      {isCommandProofVariant ? (
                        <div className={`space-y-3 ${isContentCentered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
                          <p className="text-sm leading-7 text-muted-foreground">
                            {trustedBadgeSubtitle}
                          </p>
                          {trustedBadgeItems.length > 0 ? (
                            <div className={`flex flex-wrap gap-2 ${isContentCentered ? 'justify-center' : ''}`}>
                              {trustedBadgeItems.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full border border-[#dce4ef] bg-white px-3 py-1 text-xs font-bold text-[#475569]"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReviewDialogOpen(true)}
                      className="rounded-[var(--radius)] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      {writeReviewText}
                    </button>
                  </div>
                </div>

                <div
                  className={`rounded-[1.5rem] p-5 ${
                    isScentNotesVariant
                      ? 'border border-[#eadfd7] bg-white/92'
                      : isVoiceNotesVariant
                        ? 'border border-[#ead9d8] bg-white/90'
                      : isCommandProofVariant
                        ? 'border border-[#dce4ef] bg-white/92'
                      : 'border border-border bg-background'
                  }`}
                >
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-foreground">
                    {isCommandProofVariant ? trustedBadgeTitle : ratingBreakdownTitle}
                  </h3>
                  {isCommandProofVariant ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {prefersArabicCopy
                        ? 'توزيع التقييمات ومعه رسائل مختصرة تطمنك قبل اعتماد الطلب.'
                        : 'Rating distribution plus concise assurance cues before checkout.'}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-3">
                    {distributionRows.map((item) => (
                      <div key={item.rating} className="flex items-center gap-3">
                        <span className="w-10 text-xs font-semibold text-foreground">
                          {prefersArabicCopy ? `${item.rating} نجوم` : `${item.rating} Star`}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-muted-foreground">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                  {isCommandProofVariant && trustedBadgeItems.length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      {trustedBadgeItems.map((item) => (
                        <div
                          key={item}
                          className="rounded-[1rem] border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5 text-sm font-semibold text-[#334155]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          ) : null}

          {elessiStoryGridMediaSection}

          {!shouldShowLoading &&
          ugcEnabled &&
          showMediaFeed &&
          mediaFeed.length > 0 &&
          !isElessiStoryGrid ? (
            <div
              className={`mb-10 space-y-3 ${
                isZenOrganic ? 'border-b border-[#e9ebe5] pb-10' : ''
              }`}
            >
              <div className={isContentCentered ? 'text-center' : ''}>
                <h3
                  className={`text-lg font-bold ${
                    isZenOrganic ? 'text-[#1a3328]' : 'text-foreground'
                  }`}
                >
                  {mediaTitle}
                </h3>
                <p
                  className={`text-sm ${
                    isZenOrganic ? 'text-[#1a3328]/50' : 'text-muted-foreground'
                  }`}
                >
                  {mediaDescription}
                </p>
              </div>
              <ReviewMediaGallery media={mediaFeed} galleryStyle={galleryStyle} />
            </div>
          ) : null}

          {isZenOrganic && !shouldShowLoading && visibleReviews.length > 0 ? (
            <div className="mb-8 flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-[#1a3328]">{listTitle}</h3>
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-bold uppercase tracking-widest text-[#1a3328]/30">
                  {showingReviewsText}
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewDialogOpen(true)}
                  className="rounded-full border border-[#d8ddd2] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#1a3328] transition hover:border-[#88a876] hover:text-[#88a876]"
                >
                  {writeReviewText}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#1a3328]/30">
                    {sortByText}
                  </span>
                  <div className="group flex cursor-pointer items-center gap-1">
                    <span className="text-xs font-bold text-[#1a3328]">{newestText}</span>
                    <svg
                      className="h-4 w-4 text-[#1a3328]/40 transition-colors group-hover:text-[#1a3328]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {elessiStoryGridListToolbar}

          {!isZenOrganic && !shouldShowLoading && visibleReviews.length > 0 && !isElessiStoryGrid ? (
            <div className={`mb-6 flex flex-col gap-3 ${isContentCentered ? 'items-center text-center' : 'sm:flex-row sm:items-center sm:justify-between'}`}>
              <div className={isContentCentered ? 'text-center' : ''}>
                <h3
                  className={`text-lg font-bold text-foreground ${
                    isCompactVariant ? 'hidden sm:block' : ''
                  }`}
                >
                  {listTitle}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {mobileReviewLimit < visibleReviews.length ? (
                    <>
                      <span className="sm:hidden">{mobileShowingReviewsText}</span>
                      <span className="hidden sm:inline">{showingReviewsText}</span>
                    </>
                  ) : (
                    showingReviewsText
                  )}
                </p>
              </div>
              {isCompactVariant ? (
                <span className="hidden w-fit rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold text-foreground sm:inline-flex">
                  {compactLayoutText}
                </span>
              ) : null}
            </div>
          ) : null}

          {shouldShowLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((item) => (
                <ReviewSkeleton key={item} />
              ))}
            </div>
          ) : null}

          {!shouldShowLoading && reviews.length === 0 ? (
            <div
              className={
                shouldUseCompactEmptyReviews
                  ? 'rounded-[1.1rem] border border-dashed border-[#ead8ca] bg-[#fffaf6] p-4 text-center'
                  : 'rounded-[1.5rem] border border-dashed border-border bg-card/70 p-6 text-center sm:p-8'
              }
            >
              <div
                className={
                  shouldUseCompactEmptyReviews
                    ? 'mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e3d6]'
                    : 'mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10'
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={shouldUseCompactEmptyReviews ? '20' : '24'}
                  height={shouldUseCompactEmptyReviews ? '20' : '24'}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={shouldUseCompactEmptyReviews ? 'text-[#8f5c44]' : 'text-primary'}
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3
                className={
                  shouldUseCompactEmptyReviews
                    ? 'mt-3 text-base font-black text-[#2d211e]'
                    : 'mt-4 text-lg font-bold text-foreground'
                }
              >
                {prefersArabicCopy ? 'لا توجد مراجعات بعد' : 'No reviews yet'}
              </h3>
              <p
                className={
                  shouldUseCompactEmptyReviews
                    ? 'mx-auto mt-1 max-w-xl text-sm leading-6 text-[#6f5a54]'
                    : 'mt-2 mx-auto max-w-xl text-sm leading-7 text-muted-foreground'
                }
              >
                {emptyText}
              </p>
              {shouldUseCompactEmptyReviews ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    prefersArabicCopy ? '\u062A\u0628\u062F\u064A\u0644 \u0645\u0642\u0627\u0633' : 'Size exchange',
                    prefersArabicCopy ? '\u0634\u062D\u0646 \u062F\u0627\u062E\u0644 \u0645\u0635\u0631' : 'Egypt shipping',
                    prefersArabicCopy ? '\u062F\u0639\u0645 \u0628\u0639\u062F \u0627\u0644\u0634\u0631\u0627\u0621' : 'After-sale support',
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#ead8ca] bg-white px-3 py-1.5 text-[11px] font-black text-[#6b4a3c]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setIsReviewDialogOpen(true)}
                className={
                  shouldUseCompactEmptyReviews
                    ? 'mt-4 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition-opacity hover:opacity-90'
                    : 'mt-5 rounded-[var(--radius)] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
                }
              >
                {writeReviewText}
              </button>
            </div>
          ) : null}

          {!shouldShowLoading && visibleReviews.length > 0 ? (
            <div className={reviewGridClassName}>
              {visibleReviews.map((review, index) => {
                const reviewMedia = getEnabledReviewMedia(
                  review,
                  allowPhotoReviews,
                  allowVideoReviews,
                );
                const reviewDate = formatDisplayDate(review.createdAt || review.date);

                return (
                  <div
                    key={review.id}
                    className={[
                      isZenOrganic ? 'space-y-4' : reviewCardClassName,
                      isStoryNotesVariant ? 'relative overflow-hidden' : '',
                      index >= mobileReviewLimit ? 'hidden sm:block' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isStoryNotesVariant ? (
                      <div
                        className={`pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-[1.6rem] ${
                          isScentNotesVariant
                            ? 'bg-[linear-gradient(90deg,#d2b4a3_0%,#8b623e_52%,#3d292c_100%)]'
                            : 'bg-[linear-gradient(90deg,#fca5a5_0%,#fb7185_48%,#f59e0b_100%)]'
                        }`}
                      />
                    ) : isCommandProofVariant ? (
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-[1.6rem] bg-[linear-gradient(90deg,#f7b500_0%,#facc15_46%,#0f172a_100%)]" />
                    ) : null}
                    {!isElessiStoryGrid ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {isZenOrganic ? (
                            <div className="h-12 w-12 overflow-hidden rounded-full bg-[#f1f3ee]">
                              <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  review.author,
                                )}&format=svg&background=f1f3ee&color=1a3328`}
                                alt={review.author}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                              {review.author?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-bold ${
                                  isZenOrganic ? 'text-[#1a3328]' : 'text-foreground'
                                }`}
                              >
                                {review.author}
                              </span>
                              {showVerifiedBadge && review.verified !== false ? (
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider ${
                                    isZenOrganic
                                      ? 'text-[#88a876]'
                                      : 'rounded-full bg-green-500/10 px-1.5 py-0.5 text-green-600'
                                  }`}
                                >
                                  {isZenOrganic ? verifiedZenText : verifiedLabel}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[11px] font-bold text-[#1a3328]/20">
                              {reviewDate || review.date}
                            </span>
                          </div>
                        </div>
                        {!isZenOrganic ? <StarRating rating={review.rating || 5} /> : null}
                      </div>
                    ) : null}

                    {isZenOrganic ? (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-[#1a3328]">
                          {review.title || customerFeedbackText}
                        </h4>
                        <p className="max-w-2xl text-sm leading-relaxed text-[#1a3328]/60">
                          {review.comment || defaultFeedbackText}
                        </p>
                        <div className="flex gap-2">
                          <div className="flex gap-0.5 text-[#ffb800]">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= (review.rating || 5)
                                    ? 'fill-current'
                                    : 'fill-[#e9ebe5] text-[#e9ebe5]'
                                }`}
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-[11px] font-black text-[#1a3328]">
                            {review.rating.toFixed(1)}
                          </span>
                        </div>
                        {reviewMedia.length > 0 ? (
                          <ReviewMediaGallery
                            media={reviewMedia}
                            galleryStyle={galleryStyle}
                            className="pt-2"
                          />
                        ) : null}
                        {review.helpfulCount > 0 ? (
                          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a3328]/35">
                            {helpfulCustomersText(review.helpfulCount)}
                          </div>
                        ) : null}
                  </div>
                    ) : isElessiStoryGrid ? (
                      <div
                        dir={prefersArabicCopy ? 'rtl' : 'ltr'}
                        className="grid gap-4 border-b border-[#ece2d9] py-6 lg:grid-cols-[minmax(0,1fr)_13.25rem] lg:gap-5"
                      >
                        <div className="min-w-0">
                          <div className="grid items-start gap-3 md:grid-cols-[4.25rem_minmax(0,1fr)] md:gap-4">
                            <ElessiAvatar label={review.author} />
                            <div
                              dir={prefersArabicCopy ? 'rtl' : 'ltr'}
                              className={`min-w-0 ${prefersArabicCopy ? 'text-right' : 'text-left'}`}
                            >
                              <div className="mb-2 flex flex-wrap items-center justify-start gap-2">
                                <StarRating rating={review.rating || 5} />
                              </div>
                              <div className="flex flex-wrap items-center justify-start gap-2 text-[#2d211e]">
                                <span className="text-base font-black">{review.author}</span>
                                <span className="text-[#8f7b73]">—</span>
                                <span className="text-[0.92rem] text-[#8f7b73]">
                                  {reviewDate || review.date}
                                </span>
                              </div>
                              <p className="mt-2.5 max-w-[44rem] text-[0.98rem] leading-7 text-[#4f413b]">
                                {review.comment || ratingOnlyCommentText}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:items-end">
                          {reviewMedia.length > 0 ? (
                            <div className="flex gap-2 self-stretch overflow-x-auto pb-1 lg:w-[13.25rem] lg:self-auto [&::-webkit-scrollbar]:hidden">
                              {reviewMedia.slice(0, 3).map((item, mediaIndex) => {
                                const previewSrc =
                                  item.type === 'video' ? item.poster || '' : item.url;

                                return (
                                  <div
                                    key={`${item.url}-${mediaIndex}`}
                                    className="relative h-[3.9rem] w-[3.9rem] shrink-0 overflow-hidden rounded-[0.72rem] border border-[#ece2d9] bg-white lg:h-[4rem] lg:w-[4rem]"
                                  >
                                    {previewSrc ? (
                                      <img
                                        src={previewSrc}
                                        alt={
                                          item.alt ||
                                          (prefersArabicCopy
                                            ? 'وسائط من مراجعات العملاء'
                                            : 'Customer review media')
                                        }
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="h-full w-full bg-[#f5f1ed]" />
                                    )}
                                    {item.type === 'video' ? (
                                      <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/92 shadow-sm lg:h-7 lg:w-7">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="11"
                                            height="11"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="translate-x-[1px] text-[#2d211e]"
                                          >
                                            <polygon points="8,5 19,12 8,19" />
                                          </svg>
                                        </span>
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                          {review.helpfulCount > 0 ? (
                            <div className="flex items-center gap-2 text-[0.78rem] text-[#98837b] lg:gap-1.5">
                              <span>{prefersArabicCopy ? 'مفيد؟' : 'Helpful?'}</span>
                              <span className="inline-flex items-center gap-1 font-medium text-[#7c6963]">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  aria-hidden="true"
                                >
                                  <path d="M7 10v12" />
                                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.94 2.5l-1.34 5A2 2 0 0 1 18.5 19H7V8.53a2 2 0 0 1 .59-1.41l4.83-4.82A2 2 0 0 1 15.88 3 2 2 0 0 1 16 4.2v1.67Z" />
                                </svg>
                                {review.helpfulCount.toLocaleString('en-US')}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <>
                        {isCommandProofVariant ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center rounded-full border border-[#f4d067] bg-[#fff9de] px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-[#8b623e]">
                              {prefersArabicCopy ? 'تجربة فعلية' : 'Real usage'}
                            </span>
                            <StarRating rating={review.rating || 5} />
                          </div>
                        ) : null}
                        {review.title ? (
                          <h3 className="text-base font-semibold text-foreground">
                            {review.title}
                          </h3>
                        ) : null}
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {review.comment || ratingOnlyCommentText}
                        </p>
                        {reviewMedia.length > 0 ? (
                          <ReviewMediaGallery
                            media={reviewMedia}
                            galleryStyle={galleryStyle}
                            className="pt-1"
                          />
                        ) : null}
                        {review.helpfulCount > 0 ? (
                          <div className="text-xs font-medium text-muted-foreground">
                            {helpfulPeopleText(review.helpfulCount)}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <WriteReviewDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        productId={productId}
        onSubmitted={handleReviewSubmitted}
      />
    </section>
  );
};

export default ReviewsSection;
