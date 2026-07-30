import { useQuery } from '@tanstack/react-query';
import { storefrontFetch } from '../../utils/storefrontApi';
import {
  isMarketplaceThemePreview,
  resolvePreviewThemeId,
} from '../preview/previewContext';

export interface ReviewMediaItem {
  type: 'image' | 'video';
  url: string;
  poster?: string;
  alt?: string;
}

export interface ProductReview {
  id: string;
  author: string;
  date: string;
  createdAt: string;
  rating: number;
  title?: string;
  comment: string;
  verified: boolean;
  helpfulCount: number;
  media: ReviewMediaItem[];
}

interface ReviewsResponse {
  reviews: ProductReview[];
  totalCount: number;
  averageRating: number;
  ratingDistribution: Array<{
    rating: number;
    count: number;
  }>;
}

interface UseProductReviewsOptions {
  enabled?: boolean;
}

interface ProductReviewsApiPayload {
  reviews?: Array<{
    id?: string;
    author?: string;
    customerName?: string;
    date?: string;
    createdAt?: string;
    rating?: number | string;
    title?: string | null;
    comment?: string | null;
    helpfulCount?: number | string | null;
    verified?: boolean;
    isVerified?: boolean;
    media?: unknown;
    mediaUrls?: unknown;
    images?: unknown;
    imageUrls?: unknown;
    photos?: unknown;
    videos?: unknown;
    videoUrls?: unknown;
    previewImage?: string | null;
    thumbnail?: string | null;
  }>;
  totalCount?: number;
  averageRating?: number | string;
  pagination?: {
    total?: number;
  };
  summary?: {
    averageRating?: number | string;
    ratingDistribution?: Array<{
      rating?: number | string;
      count?: number | string;
    }>;
  };
}

const looksLikeUrl = (value: string) =>
  /^(?:https?:\/\/|\/)/i.test(value.trim());

const looksLikeVideoUrl = (value: string) =>
  /\.(mp4|webm|ogg|mov|m4v)(?:$|\?)/i.test(value.trim());

const parseUnknownArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return looksLikeUrl(trimmed) ? [trimmed] : [];
    }
  }

  if (looksLikeUrl(trimmed)) {
    return [trimmed];
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((part) => part.trim())
      .filter((part) => looksLikeUrl(part));
  }

  return [];
};

const normalizeReviewMediaEntry = (
  entry: unknown,
  forcedType?: 'image' | 'video',
): ReviewMediaItem[] => {
  if (!entry) {
    return [];
  }

  if (typeof entry === 'string') {
    const url = entry.trim();
    if (!looksLikeUrl(url)) {
      return [];
    }

    return [
      {
        type: forcedType || (looksLikeVideoUrl(url) ? 'video' : 'image'),
        url,
      },
    ];
  }

  if (Array.isArray(entry)) {
    return entry.flatMap((item) => normalizeReviewMediaEntry(item, forcedType));
  }

  if (typeof entry === 'object') {
    const record = entry as Record<string, unknown>;
    const urlCandidate =
      record['url'] ||
      record['src'] ||
      record['fullUrl'] ||
      record['path'];

    if (typeof urlCandidate === 'string' && looksLikeUrl(urlCandidate)) {
      const typeValue =
        typeof record['type'] === 'string'
          ? record['type'].toLowerCase()
          : '';
      const mediaType =
        forcedType ||
        (typeValue.includes('video')
          ? 'video'
          : typeValue.includes('image')
            ? 'image'
            : looksLikeVideoUrl(urlCandidate)
              ? 'video'
              : 'image');

      return [
        {
          type: mediaType,
          url: urlCandidate,
          poster:
            typeof record['poster'] === 'string'
              ? record['poster']
              : typeof record['thumbnail'] === 'string'
                ? record['thumbnail']
                : typeof record['previewImage'] === 'string'
                  ? record['previewImage']
                  : undefined,
          alt: typeof record['alt'] === 'string' ? record['alt'] : undefined,
        },
      ];
    }
  }

  return [];
};

const collectNormalizedMedia = (
  review: Record<string, unknown>,
): ReviewMediaItem[] => {
  const candidates = [
    ...normalizeReviewMediaEntry(review['media']),
    ...normalizeReviewMediaEntry(review['mediaUrls']),
    ...parseUnknownArray(review['images']).flatMap((entry) =>
      normalizeReviewMediaEntry(entry, 'image'),
    ),
    ...parseUnknownArray(review['imageUrls']).flatMap((entry) =>
      normalizeReviewMediaEntry(entry, 'image'),
    ),
    ...parseUnknownArray(review['photos']).flatMap((entry) =>
      normalizeReviewMediaEntry(entry, 'image'),
    ),
    ...parseUnknownArray(review['videos']).flatMap((entry) =>
      normalizeReviewMediaEntry(entry, 'video'),
    ),
    ...parseUnknownArray(review['videoUrls']).flatMap((entry) =>
      normalizeReviewMediaEntry(entry, 'video'),
    ),
  ];

  const seen = new Set<string>();

  return candidates.filter((item) => {
    const key = `${item.type}:${item.url}`;
    if (!item.url || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const normalizeProductReviewRecord = (
  review: Record<string, unknown>,
  index = 0,
): ProductReview => {
  const createdAt =
    typeof review['createdAt'] === 'string'
      ? review['createdAt']
      : typeof review['date'] === 'string'
        ? review['date']
        : '';
  const ratingValue =
    typeof review['rating'] === 'string'
      ? parseFloat(review['rating'])
      : Number(review['rating'] || 0);
  const author =
    typeof review['author'] === 'string' && review['author'].trim()
      ? review['author']
      : typeof review['customerName'] === 'string' && review['customerName'].trim()
        ? review['customerName']
        : 'Customer';

  return {
    id:
      (typeof review['id'] === 'string' && review['id']) ||
      `${author}-${createdAt || index}`,
    author,
    date: createdAt,
    createdAt,
    rating: Number.isFinite(ratingValue) ? ratingValue : 0,
    title:
      typeof review['title'] === 'string' && review['title'].trim()
        ? review['title']
        : undefined,
    comment: typeof review['comment'] === 'string' ? review['comment'] : '',
    verified:
      (typeof review['verified'] === 'boolean' ? review['verified'] : undefined) ??
      (typeof review['isVerified'] === 'boolean' ? review['isVerified'] : undefined) ??
      false,
    helpfulCount: Number(review['helpfulCount'] || 0) || 0,
    media: collectNormalizedMedia(review),
  };
};

export const getRatingDistribution = (
  reviews: Array<Pick<ProductReview, 'rating'>>,
) =>
  [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => Math.round(review.rating) === rating).length,
  }));

const normalizeReviewsResponse = (
  payload?: ProductReviewsApiPayload,
): ReviewsResponse => {
  const reviewEntries = Array.isArray(payload?.reviews) ? payload?.reviews ?? [] : [];
  const reviews = reviewEntries.map((review, index) =>
    normalizeProductReviewRecord(
      review as Record<string, unknown>,
      index,
    ),
  );

  const totalCount =
    payload?.totalCount ??
    payload?.pagination?.total ??
    reviews.length;
  const averageRating = Number(
    payload?.averageRating ??
      payload?.summary?.averageRating ??
      0,
  );
  const summaryRatingDistribution = payload?.summary?.ratingDistribution;
  const ratingDistribution = Array.isArray(summaryRatingDistribution)
    ? [5, 4, 3, 2, 1].map((rating) => {
        const matched = summaryRatingDistribution.find(
          (item) => Number(item.rating) === rating,
        );
        return {
          rating,
          count: Number(matched?.count || 0) || 0,
        };
      })
    : getRatingDistribution(reviews);

  return {
    reviews,
    totalCount,
    averageRating: Number.isFinite(averageRating) ? averageRating : 0,
    ratingDistribution,
  };
};

/**
 * Fetches real product reviews from the public API.
 * Falls back to empty state gracefully if the API is unavailable.
 */
export const useProductReviews = (
  productId?: string,
  options: UseProductReviewsOptions = {},
) => {
  const enabled = options.enabled ?? true;
  const marketplacePreviewThemeId = isMarketplaceThemePreview()
    ? resolvePreviewThemeId()
    : '';
  const { data, isLoading, error } = useQuery<ReviewsResponse>({
    queryKey: ['storefront', 'reviews', productId, marketplacePreviewThemeId],
    queryFn: async () => {
      if (!productId) {
        return {
          reviews: [],
          totalCount: 0,
          averageRating: 0,
          ratingDistribution: getRatingDistribution([]),
        };
      }

      const previewReviews = marketplacePreviewThemeId
        ? (
            await import('../preview/marketplaceSampleData')
          ).getMarketplacePreviewProductReviews(
            productId,
            marketplacePreviewThemeId,
          )
        : null;

      if (previewReviews) {
        return normalizeReviewsResponse(previewReviews);
      }

      if (marketplacePreviewThemeId) {
        return {
          reviews: [],
          totalCount: 0,
          averageRating: 0,
          ratingDistribution: getRatingDistribution([]),
        };
      }

      try {
        const response = await storefrontFetch(
          `/products/${encodeURIComponent(productId)}/reviews`,
          {
            query: { limit: 10 },
          },
        );

        if (response.success) {
          return normalizeReviewsResponse(response.data);
        }

        return {
          reviews: [],
          totalCount: 0,
          averageRating: 0,
          ratingDistribution: getRatingDistribution([]),
        };
      } catch {
        return {
          reviews: [],
          totalCount: 0,
          averageRating: 0,
          ratingDistribution: getRatingDistribution([]),
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled,
  });

  return {
    reviews: data?.reviews ?? [],
    totalCount: data?.totalCount ?? 0,
    averageRating: data?.averageRating ?? 0,
    ratingDistribution: data?.ratingDistribution ?? getRatingDistribution([]),
    isLoading,
    hasError: !!error,
  };
};
