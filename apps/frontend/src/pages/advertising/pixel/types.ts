export interface FacebookPixelSettings {
  // Pixel Settings
  facebookPixelEnabled: boolean;
  facebookPixelId: string;
  pixelTrackPageView: boolean;
  pixelTrackViewContent: boolean;
  pixelTrackAddToCart: boolean;
  pixelTrackInitiateCheckout: boolean;
  pixelTrackPurchase: boolean;
  pixelTrackSearch: boolean;
  pixelTrackAddToWishlist: boolean;

  // CAPI Settings
  facebookConvApiEnabled: boolean;
  facebookConvApiToken: string;
  facebookConvApiTestCode: string;
  capiTrackPageView: boolean;
  capiTrackViewContent: boolean;
  capiTrackAddToCart: boolean;
  capiTrackInitiateCheckout: boolean;
  capiTrackPurchase: boolean;
  capiTrackSearch: boolean;

  // Advanced Privacy & Optimization
  eventDeduplicationEnabled: boolean;
  eventMatchQualityTarget: number;
  gdprCompliant: boolean;
  hashUserData: boolean;

  // Status & Telemetry
  pixelStatus?: string;
  capiStatus?: string;
  lastPixelTest?: string;
  lastCapiTest?: string;
}

export interface PixelConfig {
  id: string;
  pixelId: string;
  pixelName: string;
  accessToken?: string;
  isActive: boolean;
  isPrimary: boolean;
  trackPageView: boolean;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  trackSearch: boolean;
  trackAddToWishlist: boolean;
  trackLead: boolean;
  trackCompleteRegistration: boolean;
  lastTestAt?: string;
  lastTestResult?: string;
  totalEventsSent: number;
  errorCount: number;
  lastError?: string;
  tokenStatus?: string;
  eventMatchQuality?: number;
}

export interface DiagnosticsData {
  timestamp: string;
  overall: {
    status: string;
    score: number;
    issues: Array<{ type: string; code: string; message: string }>;
    recommendations: Array<{ priority: string; message: string }>;
  };
  pixel: {
    configured: boolean;
    status: string;
    pixelId: string | null;
    lastTest: string | null;
    issues: Array<{ type: string; code: string; message: string }>;
  };
  capi: {
    configured: boolean;
    status: string;
    hasToken: boolean;
    tokenStatus: string;
    lastTest: string | null;
    issues: Array<{ type: string; code: string; message: string }>;
  };
  events: {
    pixelEvents: string[];
    capiEvents: string[];
    deduplicationEnabled: boolean;
  };
  multiplePixels: {
    enabled: boolean;
    count: number;
    pixels: PixelConfig[];
  };
}

export interface FacebookOAuthPixel {
  pixelId: string;
  pixelName: string;
  businessId?: string;
  businessName?: string;
}

export interface TokenPermissionIssue {
  type: "error" | "warning" | string;
  message: string;
}

export interface TokenPermissionsData {
  valid: boolean;
  permissions?: string[];
  expiresAt?: string;
  issues?: TokenPermissionIssue[];
}

export interface SimulatorResult {
  eventId: string;
  eventName: string;
  timestamp: string;
  testEventCode?: string;
  status: "success" | "error";
  details?: Record<string, any>;
}

export type SimulatorEventType = "Purchase" | "AddToCart" | "ViewContent" | "PageView" | "InitiateCheckout";
