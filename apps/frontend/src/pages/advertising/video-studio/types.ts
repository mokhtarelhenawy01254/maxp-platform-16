// AI Video Studio — shared types (mirrors backend /api/v1/video-studio contracts)

export type VideoJobType = "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO" | "MOTION_TRANSFER" | "CHARACTER_SHEET" | "TEXT_TO_IMAGE";
export type VideoJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type VideoBillingMode = "BYOK" | "PLATFORM";

export interface VideoModel {
  id: string;
  name: string;
  kind: "video" | "image";
  priceUsdPerSecond?: number;
  priceUsdPerImage?: number;
  maxDurationSeconds?: number;
  resolutions?: string[];
  aspectRatios?: string[];
  characterStability?: number; // 1..3
  supportsCharacterRefs?: boolean;
  supportsKeyframes?: boolean;
  supportsAudio?: boolean;
  recommendedFor?: string;
}

export interface VideoJobParams {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
  resolution?: string;
  cameraMotion?: string;
  negativePrompt?: string;
  referenceImages?: string[];
  startFrameUrl?: string | null;
  sourceVideoUrl?: string | null;
  characterIds?: string[];
  quantity?: number;
  [key: string]: unknown;
}

export interface VideoJob {
  id: string;
  companyId: string;
  type: VideoJobType;
  provider: string;
  model: string;
  params: VideoJobParams;
  status: VideoJobStatus;
  progress: number;
  costUsd: number;
  costEgp: number;
  chargedEgp: number;
  billingMode: VideoBillingMode;
  outputUrl: string | null;
  outputPosterUrl: string | null;
  lastFrameUrl: string | null;
  errorMessage: string | null;
  providerMeta?: { simulated?: boolean; outputAssets?: string[]; [k: string]: unknown } | null;
  createdAt: string;
}

export interface VideoCharacter {
  id: string;
  name: string;
  description: string | null;
  gender: string | null;
  ageRange: string | null;
  style: string | null;
  sourceType: "GENERATED" | "UPLOADED";
  referenceImages: string[];
  thumbnailUrl: string | null;
  sheetJobId: string | null;
  createdAt: string;
}

export interface StoryScene {
  id: string;
  storyId: string;
  sceneOrder: number;
  prompt: string;
  characterIds: string[];
  durationSeconds: number;
  cameraMotion: string | null;
  videoJobId: string | null;
  status: "PENDING" | "RENDERING" | "COMPLETED" | "FAILED";
  errorMessage: string | null;
  job?: { id: string; status: VideoJobStatus; outputUrl: string | null; outputPosterUrl: string | null; progress: number } | null;
}

export interface VideoStory {
  id: string;
  title: string;
  status: "DRAFT" | "RENDERING" | "COMPLETED" | "FAILED";
  settings: { chaining?: boolean; model?: string; aspectRatio?: string };
  scenes: StoryScene[];
  createdAt: string;
}

export interface StudioConfig {
  models: VideoModel[];
  settings: {
    usdToEgp: number;
    markupPercent: number;
    minChargeEgp: number;
    maxJobsPerDayPerCompany: number;
  };
  walletBalance: number;
  byok: { configured: boolean; masked: string | null; keyName: string | null; isActive: boolean };
  billingMode: VideoBillingMode;
  simulation: boolean;
}

export interface CostEstimate {
  costUsd: number;
  costEgp: number;
  usdToEgp: number;
  markupPercent: number;
  modelKind: "video" | "image";
}
