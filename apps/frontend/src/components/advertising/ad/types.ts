import { CreateAdData } from "../../../services/facebookAdsService";

export interface FacebookPage {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
  category?: string;
  pictureUrl?: string;
}

export interface CarouselCardItem {
  id: string;
  imageFile?: File | null;
  imagePreview?: string;
  imageHash?: string;
  imageUrl?: string;
  headline: string;
  description?: string;
  linkUrl: string;
}

export interface AdFormData extends CreateAdData {
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  pageId: string;
  imageFile?: File | null;
  videoFile?: File | null;
  uploadedImageHash?: string;
  uploadedVideoId?: string;
  imagePreview?: string;
  videoPreview?: string;
  carouselCardsList: CarouselCardItem[];
  // UTM builder parts
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
}
