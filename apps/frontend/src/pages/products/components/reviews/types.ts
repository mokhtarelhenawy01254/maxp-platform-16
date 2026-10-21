export interface ReviewMediaItem {
  id?: string;
  type: "image" | "video";
  url: string;
  poster?: string;
  alt?: string;
}

export interface ReviewItem {
  id: string;
  productId: string;
  productName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
  media?: ReviewMediaItem[];
}

export interface ReviewsPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ReviewFiltersState {
  isApproved: "all" | "true" | "false";
  rating: string;
}
