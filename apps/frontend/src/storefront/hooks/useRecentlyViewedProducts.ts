import { useCallback, useEffect, useState } from 'react';

export interface RecentlyViewedSnapshot {
  id: string;
  name: string;
  slug?: string;
  price: number;
  comparePrice?: number | null;
  image?: string;
  category?: string;
}

const STORAGE_KEY = 'maxp_recently_viewed_products';
const MAX_ITEMS = 8;

const safeParse = (raw: string | null): RecentlyViewedSnapshot[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object' && typeof item.id === 'string');
  } catch {
    return [];
  }
};

export const readRecentlyViewed = (): RecentlyViewedSnapshot[] => {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY)).slice(0, MAX_ITEMS);
};

const writeRecentlyViewed = (items: RecentlyViewedSnapshot[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* storage full or blocked — the rail simply stays empty */
  }
};

/** Records a product view (call from the product page) so home can render a "recently viewed" rail. */
export const useRecordRecentlyViewed = (product: unknown) => {
  useEffect(() => {
    if (!product || typeof product !== 'object') return;
    const record = product as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] : '';
    const name = typeof record['name'] === 'string' ? record['name'] : '';
    if (!id || !name) return;

    const images = record['images'];
    const firstImage =
      Array.isArray(images) && images.length
        ? typeof images[0] === 'string'
          ? (images[0] as string)
          : typeof (images[0] as Record<string, unknown>)?.['url'] === 'string'
            ? ((images[0] as Record<string, unknown>)['url'] as string)
            : ''
        : typeof record['imageUrl'] === 'string'
          ? (record['imageUrl'] as string)
          : '';

    const snapshot: RecentlyViewedSnapshot = {
      id,
      name,
      slug: typeof record['slug'] === 'string' ? (record['slug'] as string) : undefined,
      price: Number(record['price']) || 0,
      comparePrice:
        typeof record['comparePrice'] === 'number'
          ? (record['comparePrice'] as number)
          : typeof record['compareAtPrice'] === 'number'
            ? (record['compareAtPrice'] as number)
            : null,
      image: firstImage,
      category:
        typeof (record['category'] as Record<string, unknown>)?.['name'] === 'string'
          ? ((record['category'] as Record<string, unknown>)['name'] as string)
          : undefined,
    };

    const current = readRecentlyViewed().filter((item) => item.id !== id);
    writeRecentlyViewed([snapshot, ...current]);
  }, [product]);
};

/** Reads the rail; returns [] until mounted so SSR/first paint stays stable. */
export const useRecentlyViewed = () => {
  const [items, setItems] = useState<RecentlyViewedSnapshot[]>([]);
  const refresh = useCallback(() => setItems(readRecentlyViewed()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { items, refresh };
};
