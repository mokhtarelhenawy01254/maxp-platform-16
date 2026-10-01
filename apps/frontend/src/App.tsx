import React, { Suspense, useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuthSimple";
import tokenManager from "./utils/tokenManager";
import { shouldBootstrapStorefront } from "./bootstrap/requestTarget";
import {
  shouldRedirectAffiliateToDashboard,
  shouldRedirectMerchantToPortal,
} from "./utils/merchantAccess";
import { saveLastPath } from "./utils/postAuthRouting";
import { pushNotificationService } from "./services/pushNotificationService";
import { isCapacitorNative } from "./config/environment";
// fallback for old deployed bundles that reference undefined getStatusText
// (injected as inline script in index.html instead to avoid tree-shaking)

// Providers
import AppProviders from "./providers/AppProviders";

import PerformanceOptimizer from "./components/PerformanceOptimizer";
import { AndroidAppUpdateModal } from "./components/mobile/AndroidAppUpdateModal";
import { RoleProtectedRoute, PermissionProtectedRoute } from "./components/protection/CompanyProtectedRoute";
import { AppAccessRoute } from "./components/protection/AppAccessRoute";
import { DefaultPageRedirect } from "./components/routing/DefaultPageRedirect";
import { STORE_APP_SLUGS } from "./utils/storeShortcut";

const SHIPPING_APP_ACCESS_SLUGS = [
  'internal-courier-fleet',
  'order-shipping-turbo',
  'order-shipping-hub',
  'order-shipping-bosta',
  'order-shipping-qpexpress',
  'order-shipping',
  'order-core',
  'commerce-advanced',
  ...STORE_APP_SLUGS,
];

const Layout = React.lazy(() => import("./components/layout/Layout"));
const AuthLayout = React.lazy(() => import("./components/layout/AuthLayout"));
const SuperAdminLayout = React.lazy(() => import("./components/layout/SuperAdminLayout"));


// Import pages directly
const MainDashboardPage = React.lazy(() => import("./pages/dashboard/MainDashboardPage"));
const ModernLogin = React.lazy(() => import("./pages/auth/ModernLogin"));

const Register = React.lazy(() => import("./pages/auth/Register"));
const CustomerRegister = React.lazy(
  () => import("./pages/auth/CustomerRegister"),
);
const ForgotPassword = React.lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/auth/ResetPassword"));
const AcceptInvitation = React.lazy(
  () => import("./pages/auth/AcceptInvitation"),
);
const JoinEmployee = React.lazy(
  () => import("./pages/auth/JoinEmployee"),
);
// Legal & Compliance Pages (Public)
const PrivacyPolicy = React.lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/legal/TermsOfService"));
const DataDeletionPage = React.lazy(() => import("./pages/legal/DataDeletionPage"));

// Import HR pages
const PayrollTesting = React.lazy(() => import("./pages/hr/PayrollTesting"));

// Import pages
const CustomerList = React.lazy(() => import("./pages/customers/CustomerList"));
const CustomerCreate = React.lazy(
  () => import("./pages/customers/CustomerCreate"),
);
const LeadsList = React.lazy(() => import("./pages/customers/LeadsList"));
const CustomerDetails = React.lazy(
  () => import("./pages/customers/CustomerDetails"),
);
const CustomerEdit = React.lazy(() => import("./pages/customers/CustomerEdit"));
const CustomerPortalView = React.lazy(() => import("./pages/customers/CustomerPortalView"));
const CustomerWhatsAppNotify = React.lazy(
  () => import("./pages/customers/CustomerWhatsAppNotify"),
);
const ProductOffers = React.lazy(() => import("./pages/customers/ProductOffers"));
const CustomerBirthdayWhatsAppNotify = React.lazy(
  () => import("./pages/customers/BirthdayWhatsAppNotify"),
);

const CustomerOccasionsWhatsAppNotify = React.lazy(
  () => import("./pages/customers/CustomerOccasionsWhatsAppNotify"),
);
const CommentsManagement = React.lazy(
  () => import("./pages/comments/CommentsManagement"),
);
const CommentDetails = React.lazy(
  () => import("./pages/comments/CommentDetails"),
);
const CommentSettings = React.lazy(
  () => import("./pages/comments/CommentSettings"),
);
const PostsManagement = React.lazy(
  () => import("./pages/comments/PostsManagement"),
);
const PostSettings = React.lazy(() => import("./pages/comments/PostSettings"));
const PostComments = React.lazy(() => import("./pages/comments/PostComments"));

const MessengerChat = React.lazy(
  () => import("./pages/conversations/MessengerChat-final"),
);

const SentMessagesStats = React.lazy(
  () => import("./pages/conversations/SentMessagesStats"),
);
// const CampaignResultsPredictor = React.lazy(() => import('./pages/conversations/CampaignResultsPredictor'));
const CampaignPredictionCalculator = React.lazy(
  () => import("./pages/conversations/CampaignPredictionCalculator"),
);
const ProjectBreakEvenCalculator = React.lazy(
  () => import("./pages/marketing/ProjectBreakEvenCalculator"),
);
const ProductBreakEvenCalculator = React.lazy(
  () => import("./pages/marketing/ProductBreakEvenCalculator"),
);
const ProfitabilityEngine = React.lazy(
  () => import("./pages/marketing/ProfitabilityEngine"),
);
const PricingStrategyCalculator = React.lazy(
  () => import("./pages/marketing/PricingStrategyCalculator"),
);
const AdBudgetPlanner = React.lazy(
  () => import("./pages/marketing/AdBudgetPlanner"),
);
const DiscountImpactCalculator = React.lazy(
  () => import("./pages/marketing/DiscountImpactCalculator"),
);
const ShippingOptimizer = React.lazy(
  () => import("./pages/marketing/ShippingOptimizer"),
);
const MonthlyPnLDashboard = React.lazy(
  () => import("./pages/marketing/MonthlyPnLDashboard"),
);
const CLVCalculator = React.lazy(
  () => import("./pages/marketing/CLVCalculator"),
);
const UpsellPlanner = React.lazy(
  () => import("./pages/marketing/UpsellPlanner"),
);
const RefundRateCalculator = React.lazy(
  () => import("./pages/marketing/RefundRateCalculator"),
);
const FacebookInbox = React.lazy(
  () => import("./pages/facebook-inbox/FacebookInbox"),
);
const InstagramInbox = React.lazy(
  () => import("./pages/instagram-inbox/InstagramInbox"),
);
const TikTokInbox = React.lazy(
  () => import("./pages/tiktok-inbox/TikTokInbox"),
);
const FacebookPostCreator = React.lazy(
  () => import("./pages/facebook-inbox/FacebookPostCreator"),
);
const FacebookPostManager = React.lazy(
  () => import("./pages/facebook-inbox/FacebookPostManager"),
);
const UnifiedInbox = React.lazy(
  () => import("./pages/unified-inbox/UnifiedInbox"),
);
const PlatformConnections = React.lazy(
  () => import("./pages/unified-inbox/connections/PlatformConnections"),
);
const InboxPage = React.lazy(
  () => import("./pages/whatsapp-inbox/WhatsAppInboxHome"),
);
const InboxChat = React.lazy(
  () => import("./pages/whatsapp-inbox/WhatsAppChat"),
);
const ModeratorDashboard = React.lazy(
  () => import("./pages/whatsapp-inbox/ModeratorDashboard"),
);
const WhatsAppRoutingWorkspace = React.lazy(
  () => import("./pages/whatsapp-inbox/WhatsAppRoutingWorkspace"),
);
const InboxNotifications = React.lazy(
  () => import("./pages/whatsapp-inbox/InboxNotifications"),
);
const Products = React.lazy(() => import("./pages/products/Products"));
const ProductsTrash = React.lazy(
  () => import("./pages/products/ProductsTrash"),
);
const ProductNewFinal = React.lazy(
  () => import("./pages/products/ProductNewFinal"),
);
const ArticlesList = React.lazy(() => import("./pages/articles/ArticlesList"));
const ArticleEditor = React.lazy(() => import("./pages/articles/ArticleEditor"));
const StorefrontArticlePage = React.lazy(() => import("./storefront/pages/StorefrontArticlePage"));
const FunnelCodSalesPage = React.lazy(() => import("./storefront/pages/FunnelCodSalesPage"));
const FunnelWizardPage = React.lazy(() => import("./pages/advertising/FunnelWizardPage"));
const AffiliateSystemSettings = React.lazy(
  () => import("./pages/affiliates/AffiliateSystemSettings"),
);
const AmazonAffiliateSettings = React.lazy(
  () => import("./pages/amazon-affiliate/AmazonAffiliateSettings"),
);
const AmazonAffiliateImport = React.lazy(
  () => import("./pages/amazon-affiliate/AmazonImport"),
);
const AmazonAffiliateProducts = React.lazy(
  () => import("./pages/amazon-affiliate/AmazonProducts"),
);
const AffiliatesManagement = React.lazy(
  () => import("./pages/affiliates/AffiliatesManagement"),
);
const AffiliateProfile = React.lazy(
  () => import("./pages/affiliates/AffiliateProfile"),
);
const AffiliateQuickActions = React.lazy(
  () => import("./pages/affiliates/AffiliateQuickActions"),
);
const AffiliateDashboard = React.lazy(
  () => import("./pages/affiliates/AffiliateDashboard"),
);
const AffiliateRegister = React.lazy(
  () => import("./pages/affiliates/AffiliateRegister"),
);
const AffiliateCommission = React.lazy(
  () => import("./pages/affiliates/AffiliateCommission"),
);
const AffiliateOrders = React.lazy(
  () => import("./pages/affiliates/AffiliateOrders"),
);
const AffiliateOrderDetails = React.lazy(
  () => import("./pages/affiliates/AffiliateOrderDetails"),
);
const AffiliateCustomers = React.lazy(
  () => import("./pages/affiliates/AffiliateCustomers"),
);
const AffiliateReferrals = React.lazy(
  () => import("./pages/affiliates/AffiliateReferrals"),
);
const AffiliateProducts = React.lazy(
  () => import("./pages/affiliates/AffiliateProducts"),
);
const AffiliateProductsVisibility = React.lazy(
  () => import("./pages/affiliates/AffiliateProductsVisibility"),
);
const CompanyAffiliateDashboard = React.lazy(
  () => import("./pages/affiliates/CompanyAffiliateDashboard"),
);
const CompanyConsumerDetail = React.lazy(
  () => import("./pages/affiliates/CompanyConsumerDetail"),
);
const CompanyProviderDetail = React.lazy(
  () => import("./pages/affiliates/CompanyProviderDetail"),
);
const MerchantsList = React.lazy(
  () => import("./pages/merchants/MerchantsList"),
);
const MerchantRegister = React.lazy(
  () => import("./pages/merchants/MerchantRegister"),
);
const MerchantProfile = React.lazy(
  () => import("./pages/merchants/MerchantProfile"),
);
const MerchantProfileDetails = React.lazy(
  () => import("./pages/merchants/MerchantProfileDetails"),
);
const MerchantPortalDashboard = React.lazy(
  () => import("./pages/merchant-portal/MerchantPortalDashboard"),
);
const CommissionsManagement = React.lazy(
  () => import("./pages/platform/CommissionsManagement"),
);
const PublicAffiliateRegister = React.lazy(
  () => import("./pages/public/PublicAffiliateRegister"),
);
const AppExplanationsPage = React.lazy(
  () => import("./pages/public/AppExplanationsPage"),
);
const PublicMerchantRegister = React.lazy(
  () => import("./pages/public/PublicMerchantRegister"),
);
const PublicCompanyLinks = React.lazy(
  () => import("./pages/PublicCompanyLinks"),
);
const PublicApplicationForm = React.lazy(
  () => import("./pages/public/PublicApplicationForm"),
);
const BookAppointmentPage = React.lazy(
  () => import("./pages/public/BookAppointmentPage"),
);
const ProductStoreRedirect = React.lazy(
  () => import("./pages/products/ProductStoreRedirect"),
);
const ProductReviewsSimple = React.lazy(
  () => import("./pages/products/ProductReviewsSimple"),
);
const EasyOrdersImport = React.lazy(
  () => import("./pages/products/EasyOrdersImport"),
);
const WooCommerceImport = React.lazy(
  () => import("./pages/products/WooCommerceImport"),
);
const StoreAnalyticsDashboard = React.lazy(
  () => import("./pages/Analytics/StoreAnalyticsDashboard"),
);

const OrderStatusAutomationPage = React.lazy(
  () => import("./pages/orders/OrderStatusAutomationPage"),
);

const OrderStatusTemplatesPage = React.lazy(
  () => import("./pages/orders/OrderStatusTemplatesPage"),
);

const Categories = React.lazy(() => import("./pages/categories/Categories"));
const CompetitorList = React.lazy(() => import("./pages/competitors/CompetitorList"));
const CompetitorAdd = React.lazy(() => import("./pages/competitors/CompetitorAdd"));
const CompetitorDetail = React.lazy(() => import("./pages/competitors/CompetitorDetail"));
const CompetitorGapAnalysis = React.lazy(() => import("./pages/competitors/gap-analysis"));
const CompetitorPriceHistory = React.lazy(() => import("./pages/competitors/price-history"));
const CompetitorComparison = React.lazy(() => import("./pages/competitors/comparison"));
const CompetitorReportsPage = React.lazy(() => import("./pages/competitors/reports"));
const CompetitorBattlecard = React.lazy(() => import("./pages/competitors/BattlecardViewer"));
const CompetitorAutoDiscover = React.lazy(() => import("./pages/competitors/AutoDiscoverPage"));
const CompetitorSettingsPage = React.lazy(() => import("./pages/competitors/settings"));
const SocialOverview = React.lazy(() => import("./pages/competitors/social/SocialOverview"));
const AdIntelligence = React.lazy(() => import("./pages/competitors/social/AdIntelligence"));
const PlatformOverview = React.lazy(() => import("./pages/competitors/social/PlatformOverview"));
const StatusAnalysisReport = React.lazy(() => import("./pages/reports/StatusAnalysisReport"));
const ShippingReport = React.lazy(
  () => import("./pages/reports/ShippingReport"),
);
const ProductDeliveryReturnsPage = React.lazy(
  () => import("./pages/reports/productDeliveryReturns/ProductDeliveryReturnsPage"),
);
const Settings = React.lazy(() => import("./pages/settings/Settings"));
const OrderSettings = React.lazy(
  () => import("./pages/settings/OrderSettings"),
);
const CustomerBlockSettings = React.lazy(
  () => import("./pages/settings/CustomerBlockSettings"),
);
const FacebookBlockedCustomers = React.lazy(
  () => import("./pages/settings/FacebookBlockedCustomers"),
);

const InstagramSettings = React.lazy(
  () => import("./pages/settings/InstagramSettings"),
);
const CompanySettingsPage = React.lazy(
  () => import("./pages/settings/CompanySettings"),
);
const PageEngagementStats = React.lazy(
  () => import("./pages/PageEngagementStats"),
);
const TelegramSettings = React.lazy(
  () => import("./pages/settings/TelegramSettings"),
);
const TelegramConversationsPro = React.lazy(
  () => import("./pages/conversations/TelegramConversationsPro"),
);
const TelegramUserbot = React.lazy(
  () => import("./pages/telegram/TelegramUserbot"),
); // System 2
const TelegramAutoReply = React.lazy(
  () => import("./pages/telegram/TelegramAutoReply"),
);
const TelegramBulkMessages = React.lazy(
  () => import("./pages/telegram/TelegramBulkMessages"),
);
const TelegramScheduler = React.lazy(
  () => import("./pages/telegram/TelegramScheduler"),
);
const TelegramCampaigns = React.lazy(
  () => import("./pages/telegram/TelegramCampaigns"),
);
const TelegramGroups = React.lazy(
  () => import("./pages/telegram/TelegramGroups"),
);
const CustomDomainPage = React.lazy(
  () => import("./pages/settings/CustomDomainPage"),
);
const StoreSettings = React.lazy(
  () => import("./pages/settings/StoreSettings"),
);
const ConversionToolsIndexPage = React.lazy(
  () => import("./pages/settings/ConversionToolsIndexPage"),
);
const ConversionToolPage = React.lazy(
  () => import("./pages/settings/ConversionToolPage"),
);
const PaymentOffersSettings = React.lazy(
  () => import("./pages/settings/PaymentOffersSettings"),
);
const PostPurchaseOfferBuilderPage = React.lazy(
  () => import("./pages/marketing/PostPurchaseOfferBuilderPage"),
);
const StorefrontVisualEditorPage = React.lazy(
  () => import("./pages/settings/StorefrontVisualEditorPage"),
);
const StorePages = React.lazy(() => import("./pages/settings/StorePages"));
const StorefrontClaritySettings = React.lazy(
  () => import("./pages/settings/StorefrontClaritySettings"),
);
const CodDepositSettings = React.lazy(
  () => import("./pages/settings/CodDepositSettings"),
);
const TurboSettings = React.lazy(
  () => import("./pages/settings/TurboSettings"),
);
const TurboStatusMapping = React.lazy(
  () => import("./pages/settings/TurboStatusMapping"),
);
const TurboTicketDetails = React.lazy(
  () => import("./pages/settings/TicketDetails"),
);
const TurboTickets = React.lazy(() => import("./pages/tickets/TurboTickets"));
const ShippingCompanies = React.lazy(
  () => import("./pages/shipping/ShippingCompanies"),
);
const UnifiedShipmentsPage = React.lazy(
  () => import("./pages/orders/UnifiedShipmentsPage"),
);
const ShippingCompanyDetail = React.lazy(
  () => import("./pages/shipping/ShippingCompanyDetail"),
);
const ShippingSettlement = React.lazy(
  () => import("./pages/shipping/SettlementPage"),
);
const CourierManagementPage = React.lazy(
  () => import("./pages/shipping/couriers/CourierManagementPage"),
);
const DeliveryRunsPage = React.lazy(
  () => import("./pages/shipping/couriers/DeliveryRunsPage"),
);
const CourierSettlementPage = React.lazy(
  () => import("./pages/shipping/couriers/CourierSettlementPage"),
);
const CourierMobileRunPage = React.lazy(
  () => import("./pages/shipping/couriers/CourierMobileRunPage"),
);
const BulkStatusUpdate = React.lazy(
  () => import("./pages/orders/BulkStatusUpdatePage"),
);
const StockMovements = React.lazy(
  () => import("./pages/inventory/StockMovementsPage"),
);
const DeliveryOptions = React.lazy(
  () => import("./pages/settings/DeliveryOptions"),
);
const PromotionSettings = React.lazy(
  () => import("./pages/settings/PromotionSettings"),
);
const StorePromotionSettings = React.lazy(
  () => import("./pages/settings/StorePromotionSettings"),
);
const RecommendationSettings = React.lazy(
  () => import("./pages/settings/RecommendationSettings"),
);
const SmartRepliesSettings = React.lazy(
  () => import("./pages/settings/SmartRepliesSettings"),
);
const BotStudioPage = React.lazy(
  () => import("./pages/automation/BotStudioPage"),
);
const BotWidgetPage = React.lazy(
  () => import("./pages/public/BotWidgetPage"),
);
// Unused legacy components removed for deep cleanup.
const OrderWorkflow = React.lazy(() => import("./pages/admin/OrderWorkflow"));
const OrderInvoiceSettings = React.lazy(
  () => import("./pages/settings/OrderInvoiceSettings"),
);
const OrderNumberingSettings = React.lazy(
  () => import("./pages/settings/OrderNumberingSettings"),
);
const RatingSettingsManager = React.lazy(
  () => import("./pages/settings/RatingSettingsManager"),
);
const ScheduledOrderSettings = React.lazy(
  () => import("./pages/settings/ScheduledOrderSettings"),
);

// Procurement/Purchasing
const Suppliers = React.lazy(
  () => import("./components/procurement/Suppliers"),
);
const SupplierDetails = React.lazy(
  () => import("./components/procurement/SupplierDetails"),
);
const PurchaseOrders = React.lazy(
  () => import("./components/procurement/PurchaseOrders"),
);
const PurchaseOrderForm = React.lazy(
  () => import("./components/procurement/PurchaseOrderForm"),
);
const PurchaseInvoices = React.lazy(
  () => import("./components/procurement/PurchaseInvoices"),
);
const PurchaseInvoiceForm = React.lazy(
  () => import("./components/procurement/PurchaseInvoiceForm"),
);
const SupplierPayments = React.lazy(
  () => import("./components/procurement/SupplierPayments"),
);
const SupplierPaymentForm = React.lazy(
  () => import("./components/procurement/SupplierPaymentForm"),
);
const ProcurementDashboard = React.lazy(
  () => import("./components/procurement/ProcurementDashboard"),
);
const RecipeManagementPage = React.lazy(
  () => import("./pages/cafe/RecipeManagementPage"),
);
const StockCountSessionPage = React.lazy(
  () => import("./pages/cafe/StockCountSessionPage"),
);
const ModifiersManagementPage = React.lazy(
  () => import("./pages/cafe/ModifiersManagementPage"),
);
const WasteTrackingPage = React.lazy(
  () => import("./pages/cafe/WasteTrackingPage"),
);
const WholesaleDashboard = React.lazy(
  () => import("./pages/wholesale/WholesaleDashboard"),
);
const WholesalePriceLists = React.lazy(
  () => import("./pages/wholesale/WholesalePriceLists"),
);
const WholesalePriceListDetail = React.lazy(
  () => import("./pages/wholesale/WholesalePriceListDetail"),
);
const WholesaleCustomers = React.lazy(
  () => import("./pages/wholesale/WholesaleCustomers"),
);
const WholesaleCustomerDetail = React.lazy(
  () => import("./pages/wholesale/WholesaleCustomerDetail"),
);
const WholesaleStatements = React.lazy(
  () => import("./pages/wholesale/WholesaleStatements"),
);
const WholesaleDebts = React.lazy(
  () => import("./pages/wholesale/WholesaleDebts"),
);

// Advertising
const FacebookPixelSettings = React.lazy(
  () => import("./pages/advertising/FacebookPixelSettings"),
);
const GoogleTagManagerSettings = React.lazy(
  () => import("./pages/advertising/GoogleTagManagerSettings"),
);
const GoogleAnalyticsSettings = React.lazy(
  () => import("./pages/advertising/GoogleAnalyticsSettings"),
);
const FacebookAdsDashboard = React.lazy(
  () => import("./pages/advertising/FacebookAdsDashboard"),
);
const MarketingAiStudioPage = React.lazy(
  () => import("./pages/advertising/marketing-studio/MarketingAiStudioPage"),
);
const CreativeAiStudioPage = React.lazy(
  () => import("./pages/advertising/creative-studio/CreativeAiStudioPage"),
);
const NavigateFacebookAdsDiagnosis: React.FC = () => {
  const location = useLocation();
  return <Navigate to={`/advertising/facebook-ads${location.search}`} replace />;
};
const FacebookAdsConnection = React.lazy(
  () => import("./pages/advertising/FacebookAdsConnection"),
);
const BudgetAlertsPage = React.lazy(
  () => import("./pages/advertising/BudgetAlertsPage"),
);
const FacebookAdsGeoPage = React.lazy(
  () => import("./pages/advertising/FacebookAdsGeoPage"),
);
const AdLibraryResearch = React.lazy(
  () => import("./pages/advertising/AdLibraryResearch"),
);

const AgencyDashboard = React.lazy(
  () => import("./pages/agency/AgencyDashboard"),
);
const AgencyClientPortal = React.lazy(
  () => import("./pages/agency/AgencyClientPortal"),
);

const ProductLandingPages = React.lazy(
  () => import("./pages/advertising/ProductLandingPages"),
);
const CreateCampaign = React.lazy(
  () => import("./pages/advertising/CreateCampaign"),
);
const CreateAd = React.lazy(() => import("./pages/advertising/CreateAd"));
const AdDetails = React.lazy(() => import("./pages/advertising/AdDetails"));
const CampaignDetails = React.lazy(
  () => import("./pages/advertising/CampaignDetails"),
);
const AudiencesManagement = React.lazy(
  () => import("./pages/advertising/AudiencesManagement"),
);
const CreateCustomAudience = React.lazy(
  () => import("./pages/advertising/CreateCustomAudience"),
);
const CreateLookalikeAudience = React.lazy(
  () => import("./pages/advertising/CreateLookalikeAudience"),
);
const CustomAudienceDetails = React.lazy(
  () => import("./pages/advertising/CustomAudienceDetails"),
);
const CreateAdSet = React.lazy(() => import("./pages/advertising/CreateAdSet"));
const CatalogsManagement = React.lazy(
  () => import("./pages/advertising/CatalogsManagement"),
);
const CatalogDetails = React.lazy(
  () => import("./pages/advertising/CatalogDetails"),
);
const CreateCatalog = React.lazy(
  () => import("./pages/advertising/CreateCatalog"),
);
const CreateDynamicAd = React.lazy(
  () => import("./pages/advertising/CreateDynamicAd"),
);
const OverlayCampaigns = React.lazy(
  () => import("./pages/advertising/OverlayCampaigns"),
);
const OverlayCampaignDetails = React.lazy(
  () => import("./pages/advertising/OverlayCampaignDetails"),
);
const ABTestsManagement = React.lazy(
  () => import("./pages/advertising/ABTestsManagement"),
);
const CreateABTest = React.lazy(
  () => import("./pages/advertising/CreateABTest"),
);
const ABTestDetails = React.lazy(
  () => import("./pages/advertising/ABTestDetails"),
);
const CreateAdWizard = React.lazy(
  () => import("./pages/advertising/CreateAdWizard"),
);
const AutomationRules = React.lazy(
  () => import("./pages/advertising/AutomationRules"),
);
const MediaBuyingReports = React.lazy(
  () => import("./pages/advertising/MediaBuyingReports"),
);

const LeadFormsManagement = React.lazy(
  () => import("./pages/advertising/LeadFormsManagement"),
);
const DynamicCreativeOptimization = React.lazy(
  () => import("./pages/advertising/DynamicCreativeOptimization"),
);
const AdvantagePlusShopping = React.lazy(
  () => import("./pages/advertising/AdvantagePlusShopping"),
);
const AdPreview = React.lazy(() => import("./pages/advertising/AdPreview"));
const SavedAudiences = React.lazy(
  () => import("./pages/advertising/SavedAudiences"),
);
const AttributionSettings = React.lazy(
  () => import("./pages/advertising/AttributionSettings"),
);
const Profile = React.lazy(() => import("./pages/profile/Profile"));

const Orders = React.lazy(() => import("./pages/orders/Orders"));
const OrderActivityLogPage = React.lazy(
  () => import("./pages/orders/OrderActivityLogPage"),
);
const IncompleteOrders = React.lazy(
  () => import("./pages/orders/IncompleteOrders"),
);
const IncompleteOrderDetails = React.lazy(
  () => import("./pages/orders/IncompleteOrderDetails"),
);
const IncompleteReports = React.lazy(
  () => import("./pages/orders/IncompleteReports"),
);
const PreparationQueue = React.lazy(
  () => import("./pages/orders/PreparationQueue"),
);
const AgentWorkspace = React.lazy(
  () => import("./pages/orders/AgentWorkspace"),
);
const OrderInvoices = React.lazy(() => import("./pages/admin/OrderInvoices"));
const OrderInvoice = React.lazy(
  () => import("./components/orders/OrderInvoice"),
);
const PrintMultipleInvoices = React.lazy(
  () => import("./pages/orders/PrintMultipleInvoices"),
);
const OrderDetails = React.lazy(() => import("./pages/orders/OrderDetails"));
const OrderStats = React.lazy(() => import("./pages/orders/OrderStats"));
const QuickStatusChange = React.lazy(
  () => import("./pages/orders/QuickStatusChange"),
);
const OrdersAnalytics = React.lazy(
  () => import("./pages/orders/OrdersAnalytics"),
);
const WooCommerceSync = React.lazy(
  () => import("./pages/woocommerce/WooCommerceSync"),
);


// Orders Analytics Pages - Basic
const OrdersOverviewDashboard = React.lazy(
  () => import("./pages/Analytics/orders/OverviewDashboard"),
);
const OrdersAnalyticsPage = React.lazy(
  () => import("./pages/Analytics/orders/OrdersAnalytics"),
);
const RevenueAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/RevenueAnalytics"),
);
const ProductsAnalyticsPage = React.lazy(
  () => import("./pages/Analytics/orders/ProductsAnalytics"),
);
const VariationsAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/VariationsAnalytics"),
);
const CategoriesAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/CategoriesAnalytics"),
);
const CouponsAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/CouponsAnalytics"),
);
const TaxesAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/TaxesAnalytics"),
);
const DownloadsAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/DownloadsAnalytics"),
);
const StockAnalyticsPage = React.lazy(
  () => import("./pages/Analytics/orders/StockAnalytics"),
);
const CustomerAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/CustomerAnalytics"),
);
const PaymentMethodAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/PaymentMethodAnalytics"),
);
const CampaignAttributionAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/CampaignAttributionAnalytics"),
);

// Orders Analytics Pages - Advanced
const ProfitAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/ProfitAnalytics"),
);
const CODPerformanceAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/CODPerformanceAnalytics"),
);
const CancellationAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/CancellationAnalytics"),
);
const DeliveryRateAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/DeliveryRateAnalytics"),
);
const ProductFulfillmentAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/ProductFulfillmentAnalytics"),
);
const DeliveryReturnsAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/DeliveryReturnsAnalytics"),
);
const RegionAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/RegionAnalytics"),
);
const ReturnsAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/ReturnsAnalytics"),
);
const ReturnReasonsAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/ReturnReasonsAnalytics"),
);
const FunnelAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/FunnelAnalytics"),
);
const ConversionRateAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/ConversionRateAnalytics"),
);
const TeamPerformanceAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/TeamPerformanceAnalytics"),
);
const TodayOps = React.lazy(
  () => import("./pages/Analytics/orders/TodayOps"),
);
const OrderStatusAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/OrderStatusAnalytics"),
);
const OrderMovementPage = React.lazy(
  () => import("./pages/Analytics/orders/orderMovement/OrderMovementPage"),
);
const AbandonedCartAnalytics = React.lazy(
  () => import("./pages/Analytics/orders/AbandonedCartAnalytics"),
);

const FacebookOAuth = React.lazy(
  () => import("./pages/settings/FacebookOAuth"),
);
const InventoryAiStudioPage = React.lazy(
  () => import("./pages/inventory/studio/InventoryAiStudioPage"),
);
const Inventory = React.lazy(() => import("./pages/inventory/Inventory"));
const InventoryAudits = React.lazy(
  () => import("./pages/inventory/InventoryAudits"),
);
const InventoryReports = React.lazy(
  () => import("./pages/inventory/InventoryReports"),
);
const InventoryAnalytics = React.lazy(
  () => import("./pages/inventory/InventoryAnalytics"),
);
const ReorderPointsPage = React.lazy(
  () => import("./pages/inventory/ReorderPointsPage"),
);
const WarehouseManagement = React.lazy(
  () => import("./pages/inventory/WarehouseManagement"),
);
const Coupons = React.lazy(() => import("./pages/coupons/Coupons"));
const OffersReview = React.lazy(() => import("./pages/offers/OffersReview"));
const Appointments = React.lazy(
  () => import("./pages/appointments/Appointments"),
);

const Tasks = React.lazy(() => import("./pages/tasks/Tasks"));
const TasksDashboard = React.lazy(() => import("./pages/tasks/Dashboard"));
const KanbanBoard = React.lazy(() => import("./pages/tasks/KanbanBoard"));
const TurboRecords = React.lazy(() => import("./pages/orders/TurboRecords"));
const TurboCaptains = React.lazy(() => import("./pages/orders/TurboCaptains"));
const TurboCaptainDetails = React.lazy(() => import("./pages/orders/TurboCaptainDetails"));
const BulkOrders = React.lazy(() => import("./pages/orders/BulkOrders"));
const ProductAvailabilityGrid = React.lazy(
  () => import("./pages/orders/ProductAvailabilityGrid"),
);
const TaskDetails = React.lazy(() => import("./pages/tasks/TaskDetails"));
const TaskNotifications = React.lazy(
  () => import("./pages/tasks/TaskNotifications"),
);
const CalendarView = React.lazy(() => import("./pages/tasks/CalendarView"));
const TimeReports = React.lazy(() => import("./pages/tasks/TimeReports"));
const TaskTemplates = React.lazy(() => import("./pages/tasks/TaskTemplates"));
const ProfitLossReport = React.lazy(
  () => import("./pages/reports/ProfitLossReport"),
);
const StatusSummaryReport = React.lazy(
  () => import("./pages/reports/StatusSummaryReport"),
);
const PosPage = React.lazy(() => import("./pages/pos/PosPage"));
const PlatformIntegrations = React.lazy(
  () => import("./pages/platform-integrations/PlatformIntegrations"),
);
const TikTokPublish = React.lazy(
  () => import("./pages/tiktok-publish/TikTokPublish"),
);
const TikTokShop = React.lazy(() => import("./pages/tiktok-shop/TikTokShop"));
const TikTokSettings = React.lazy(() => import("./pages/tiktok-settings/TikTokSettings"));

const TestPublic = React.lazy(() => import("./pages/TestPublic"));
const TestMinimal = React.lazy(() => import("./pages/TestMinimal"));
const CafeThemeDemo = React.lazy(() => import("./pages/CafeThemeDemo"));
const PharmacyThemeDemo = React.lazy(
  () => import("./pages/themes/PharmacyThemeDemo"),
);
const FurnitureThemeDemo = React.lazy(
  () => import("./pages/themes/FurnitureThemeDemo"),
);
const ElectronicsThemeDemo = React.lazy(
  () => import("./pages/themes/ElectronicsThemeDemo"),
);
const RestaurantThemeDemo = React.lazy(
  () => import("./pages/themes/RestaurantThemeDemo"),
);
const ShadcnDemo = React.lazy(() => import("./pages/public/ShadcnDemo"));
const PlatformLandingPage = React.lazy(
  () => import("./pages/landing/PlatformLandingHost"),
);
const MaxPMerchantsLanding = React.lazy(
  () => import("./pages/public/MaxPMerchantsLanding"),
);
const MgAgencyLeadLanding = React.lazy(
  () => import("./pages/landing/MgAgencyLeadLanding"),
);

const MessagingLanding = React.lazy(
  () => import("./pages/landing/MessagingLanding"),
);
const AiInboxLanding = React.lazy(
  () => import("./pages/landing/AiInboxLanding"),
);
const MedicalLanding = React.lazy(
  () => import("./pages/landing/MedicalLanding"),
);
const PlatformLandingPreviewPage = React.lazy(
  () => import("./pages/landing/PlatformLandingPreviewPage"),
);
const StorefrontShell = React.lazy(
  () => import("./storefront/StorefrontShell"),
);

// Support System
const SupportCenter = React.lazy(() => import("./pages/support/SupportCenter"));
const CreateTicket = React.lazy(() => import("./pages/support/CreateTicket"));
const MyTickets = React.lazy(() => import("./pages/support/MyTickets"));
const SupportTicketDetails = React.lazy(
  () => import("./pages/support/TicketDetails"),
);
const FAQPage = React.lazy(() => import("./pages/support/FAQ"));
const SupportAdmin = React.lazy(() => import("./pages/admin/SupportAdmin"));
const ManualOrderPage = React.lazy(
  () => import("./pages/admin/ManualOrder/ManualOrderPage"),
);

// Activity Log System
const MyActivity = React.lazy(() => import("./pages/MyActivity"));
const CompanyActivity = React.lazy(() => import("./pages/CompanyActivity"));

const BroadcastDashboard = React.lazy(() =>
  import("./pages/broadcast").then((module) => ({
    default: module.BroadcastDashboard,
  })),
);
const Reminders = React.lazy(() => import("./pages/Reminders"));
const NotificationSettings = React.lazy(
  () => import("./pages/NotificationSettings"),
);
const Notifications = React.lazy(() => import("./pages/Notifications"));

const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));

const CompaniesManagement = React.lazy(
  () => import("./pages/CompaniesManagement"),
);
const UsersManagement = React.lazy(() => import("./pages/UsersManagement"));
const EmployeeStatsReport = React.lazy(
  () => import("./pages/EmployeeStatsReport"),
);
const RolesManagement = React.lazy(() => import("./pages/RolesManagement"));
const CompanyLinks = React.lazy(() => import("./pages/CompanyLinks"));
// PublicCompanyLinks already declared above

// Super Admin
const SuperAdminCompaniesV2 = React.lazy(
  () => import("./pages/SuperAdminCompaniesV2"),
);
const SuperAdminCompaniesReports = React.lazy(
  () => import("./pages/SuperAdminCompaniesReports"),
);
const SuperAdminCompanyDetails = React.lazy(
  () => import("./pages/super-admin/SuperAdminCompanyDetails"),
);
const SuperAdminSelfReviewLogs = React.lazy(
  () => import("./pages/super-admin/SuperAdminSelfReviewLogs"),
);
const SuperAdminFollowUp = React.lazy(
  () => import("./pages/SuperAdminFollowUp"),
);

const SuperAdminInvoices = React.lazy(
  () => import("./pages/SuperAdminInvoices"),
);
const SuperAdminPayments = React.lazy(
  () => import("./pages/SuperAdminPayments"),
);
const SuperAdminSystemManagement = React.lazy(
  () => import("./pages/SuperAdminSystemManagement"),
);
const SuperAdminStaffCompanyAccess = React.lazy(
  () => import("./pages/super-admin/StaffCompanyAccess"),
);
const SuperAdminWhatsAppOverview = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppOverview"),
);
const SuperAdminWhatsAppCompanies = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppCompanies"),
);
const SuperAdminWhatsAppCompanyWorkspace = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppCompanyWorkspace"),
);
const SuperAdminWhatsAppCompanySettings = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppCompanySettings"),
);
const SuperAdminWhatsAppCompanyNotifications = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppCompanyNotifications"),
);
const SuperAdminWhatsAppLogs = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppLogs"),
);

const SuperAdminWhatsAppAutomations = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppAutomations"),
);
const SuperAdminWhatsAppCompanyInbox = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppCompanyInbox"),
);
const SuperAdminWhatsAppCompanyChat = React.lazy(
  () => import("./pages/super-admin/SuperAdminWhatsAppCompanyChat"),
);

const SuperAdminServerUsage = React.lazy(
  () => import("./pages/super-admin/SuperAdminServerUsage"),
);
const SalaryUpdates = React.lazy(() => import("./pages/hr/SalaryUpdates"));

const SuperAdminAIPlayground = React.lazy(
  () => import("./pages/super-admin/SuperAdminAIPlayground"),
);
const SuperAdminAIKeyManager = React.lazy(
  () => import("./pages/super-admin/SuperAdminAIKeyManager"),
);
const SuperAdminAIKeyLogs = React.lazy(
  () => import("./pages/super-admin/SuperAdminAIKeyLogs"),
);
const SuperAdminAIChatPage = React.lazy(
  () => import("./pages/super-admin/SuperAdminAIChatPage"),
);
const SuperAdminAIHubLayout = React.lazy(
  () => import("./pages/super-admin/SuperAdminAIHubLayout"),
);
const SuperAdminAiIncidentsPage = React.lazy(
  () => import("./pages/super-admin/ai-incidents/SuperAdminAiIncidentsPage"),
);
const SkillDetailPage = React.lazy(
  () => import("./pages/super-admin/SkillDetailPage"),
);
const SuperAdminAITemplates = React.lazy(
  () => import("./pages/super-admin/SuperAdminAITemplates"),
);
const SuperAdminAITemplateDetail = React.lazy(
  () => import("./pages/super-admin/SuperAdminAITemplateDetail"),
);
// Super Admin Product Embeddings
const SuperAdminProductEmbeddings = React.lazy(
  () => import("./pages/super-admin/SuperAdminProductEmbeddings"),
);
const SuperAdminAIConsumption = React.lazy(
  () => import("./pages/super-admin/SuperAdminAIConsumption"),
);
const SuperAdminCompanyActivity = React.lazy(
  () => import("./pages/super-admin/SuperAdminCompanyActivity"),
);
const SuperAdminDailyOrdersPage = React.lazy(
  () => import("./pages/super-admin/daily-orders"),
);
const SuperAdminVisualSearchLogs = React.lazy(
  () => import("./pages/super-admin/SuperAdminVisualSearchLogs"),
);
const SuperAdminSupportSettings = React.lazy(
  () => import("./pages/super-admin/SuperAdminSupportSettings"),
);
const SuperAdminAIImageGeneratorSettings = React.lazy(
  () => import("./pages/super-admin/SuperAdminAIImageGeneratorSettings"),
);
// Merchant AI Pages
const AIHubLayout = React.lazy(
  () => import("./pages/admin/AIHubLayout"),
);
const AgenticRAGLab = React.lazy(
  () => import("./pages/admin/AgenticRAGLab"),
);
const AgentCatalogPage = React.lazy(
  () => import("./pages/admin/AgentCatalogPage"),
);
const AgentSkillsPage = React.lazy(
  () => import("./pages/admin/AgentSkillsPage"),
);
const AgentToolsPage = React.lazy(
  () => import("./pages/admin/AgentToolsPage"),
);
const AIKnowledgeQuestionsPage = React.lazy(
  () => import("./pages/admin/AIKnowledgeQuestionsPage"),
);
const AgentProfilesPage = React.lazy(
  () => import("./pages/admin/agent-profiles/AgentProfilesPage"),
);
const AgentChatStudioPage = React.lazy(
  () => import("./pages/admin/agent-chat/AgentChatStudioPage"),
);
const BookingManagementPage = React.lazy(
  () => import("./pages/admin/BookingManagementPage"),
);
const EducationManagementPage = React.lazy(
  () => import("./pages/admin/EducationManagementPage"),
);
const BrandIdentitySettings = React.lazy(
  () => import("./pages/admin/BrandIdentitySettings"),
);
const EducationFunnelPage = React.lazy(
  () => import("./pages/admin/EducationFunnelPage"),
);
const HotelManagementPage = React.lazy(
  () => import("./pages/admin/HotelManagementPage"),
);
const LabManagementPage = React.lazy(
  () => import("./pages/lab/LabManagementPage"),
);
const RadiologyManagementPage = React.lazy(
  () => import("./pages/radiology/RadiologyManagementPage"),
);
const DentalLabManagementPage = React.lazy(
  () => import("./pages/dental-lab/DentalLabManagementPage"),
);
const TreasuryExpensesPage = React.lazy(
  () => import("./pages/treasury-expenses/TreasuryExpensesPage"),
);
const DentalCaseDetailPage = React.lazy(
  () => import("./pages/dental-lab/DentalCaseDetailPage"),
);
const DentalDoctorDetailPage = React.lazy(
  () => import("./pages/dental-lab/DentalDoctorDetailPage"),
);
const DentalPortalRoutes = React.lazy(
  () => import("./pages/dental-doctor/dentalPortalRoutes"),
);
const AcademyDashboardPage = React.lazy(
  () => import("./pages/academy/AcademyDashboardPage"),
);
const AcademyCoursesPage = React.lazy(
  () => import("./pages/academy/AcademyCoursesPage"),
);
const AcademyCourseEditorPage = React.lazy(
  () => import("./pages/academy/AcademyCourseEditorPage"),
);
const AcademyCatalogPage = React.lazy(
  () => import("./pages/academy/AcademyCatalogPage"),
);
const AcademyLessonViewerPage = React.lazy(
  () => import("./pages/academy/AcademyLessonViewerPage"),
);
const AcademyStudentsPage = React.lazy(
  () => import("./pages/academy/AcademyStudentsPage"),
);
const EducationTeacherSchedulePage = React.lazy(
  () => import("./pages/admin/EducationTeacherSchedulePage"),
);
const EducationTeacherPaymentsPage = React.lazy(
  () => import("./pages/admin/EducationTeacherPaymentsPage"),
);
const EducationCalendarPage = React.lazy(
  () => import("./pages/admin/EducationCalendarPage"),
);
const EducationTeacherProfilePage = React.lazy(
  () => import("./pages/admin/EducationTeacherProfilePage"),
);
const EducationStudentProfilePage = React.lazy(
  () => import("./pages/admin/EducationStudentProfilePage"),
);
const TeacherLoginPage = React.lazy(
  () => import("./pages/auth/TeacherLoginPage"),
);
const TeacherLayout = React.lazy(
  () => import("./components/layout/TeacherLayout"),
);
const TeacherDashboardPage = React.lazy(
  () => import("./pages/teacher/TeacherDashboardPage"),
);
const TeacherSchedulePage = React.lazy(
  () => import("./pages/teacher/TeacherSchedulePage"),
);
const TeacherPaymentsPage = React.lazy(
  () => import("./pages/teacher/TeacherPaymentsPage"),
);
const TeacherAvailabilityPage = React.lazy(
  () => import("./pages/teacher/TeacherAvailabilityPage"),
);
const DoctorLayout = React.lazy(
  () => import("./components/layout/DoctorLayout"),
);
const DoctorLoginPage = React.lazy(
  () => import("./pages/auth/DoctorLoginPage"),
);
const DoctorDashboardPage = React.lazy(
  () => import("./pages/doctor/DoctorDashboardPage"),
);
const DoctorSchedulePage = React.lazy(
  () => import("./pages/doctor/DoctorSchedulePage"),
);
const DoctorPatientsPage = React.lazy(
  () => import("./pages/doctor/DoctorPatientsPage"),
);
const DoctorAvailabilityPage = React.lazy(
  () => import("./pages/doctor/DoctorAvailabilityPage"),
);
const DoctorPaymentsPage = React.lazy(
  () => import("./pages/doctor/DoctorPaymentsPage"),
);
const PatientLayout = React.lazy(
  () => import("./components/layout/PatientLayout"),
);
const PatientLoginPage = React.lazy(
  () => import("./pages/auth/PatientLoginPage"),
);
const PatientDashboardPage = React.lazy(
  () => import("./pages/patient/PatientDashboardPage"),
);
const PatientAppointmentsPage = React.lazy(
  () => import("./pages/patient/PatientAppointmentsPage"),
);
const PatientHistoryPage = React.lazy(
  () => import("./pages/patient/PatientHistoryPage"),
);
const PatientInvoicesPage = React.lazy(
  () => import("./pages/patient/PatientInvoicesPage"),
);
const ParentLoginPage = React.lazy(
  () => import("./pages/auth/ParentLoginPage"),
);
const ParentLayout = React.lazy(
  () => import("./components/layout/ParentLayout"),
);
const ParentDashboardPage = React.lazy(
  () => import("./pages/parent/ParentDashboardPage"),
);
const ParentSessionsPage = React.lazy(
  () => import("./pages/parent/ParentSessionsPage"),
);
const ParentEnrollmentsPage = React.lazy(
  () => import("./pages/parent/ParentEnrollmentsPage"),
);
const ParentChildrenPage = React.lazy(
  () => import("./pages/parent/ParentChildrenPage"),
);
const ParentChildDetailPage = React.lazy(
  () => import("./pages/parent/ParentChildDetailPage"),
);
const ParentWalletPage = React.lazy(
  () => import("./pages/parent/ParentWalletPage"),
);
const ParentBuyPackagePage = React.lazy(
  () => import("./pages/parent/ParentBuyPackagePage"),
);
const CustomerPortalLayout = React.lazy(
  () => import("./pages/account/CustomerPortalLayout"),
);
const CustomerAccountHome = React.lazy(
  () => import("./pages/account/CustomerAccountHome"),
);
const CustomerWalletPage = React.lazy(
  () => import("./pages/account/CustomerWalletPage"),
);
const CustomerProfilePage = React.lazy(
  () => import("./pages/account/CustomerProfilePage"),
);
const FormsBuilderPage = React.lazy(
  () => import("./pages/admin/FormsBuilderPage"),
);
const ServiceOrdersPage = React.lazy(
  () => import("./pages/admin/ServiceOrdersPage"),
);
const ServiceOrderDetailPage = React.lazy(
  () => import("./pages/admin/ServiceOrderDetailPage"),
);
const ServiceManagementPage = React.lazy(
  () => import("./pages/admin/ServiceManagementPage"),
);
const ServiceOrdersSettingsPage = React.lazy(
  () => import("./pages/admin/ServiceOrdersSettingsPage"),
);
const ServiceRequestForm = React.lazy(
  () => import("./pages/ServiceRequestForm"),
);
const PublicFormPage = React.lazy(
  () => import("./pages/public/PublicFormPage"),
);
const SuperAdminFacebookOAuth = React.lazy(
  () => import("./pages/SuperAdminFacebookOAuth"),
);
const PlatformSiteMetaPixel = React.lazy(
  () => import("./pages/super-admin/PlatformSiteMetaPixel"),
);
const PlatformSiteHomepageTemplates = React.lazy(
  () => import("./pages/super-admin/PlatformSiteHomepageTemplates"),
);
const SuperAdminLandingPages = React.lazy(
  () => import("./pages/super-admin/SuperAdminLandingPages"),
);
const SuperAdminDefaultSidebar = React.lazy(
  () => import("./pages/super-admin/SuperAdminDefaultSidebar"),
);
const PlatformSignupCoupons = React.lazy(
  () => import("./pages/super-admin/PlatformSignupCoupons"),
);
const BusinessSpecialtiesManagement = React.lazy(
  () => import("./pages/super-admin/BusinessSpecialtiesManagement"),
);

const SuperAdminUsersManagement = React.lazy(
  () => import("./pages/SuperAdminUsersManagement"),
); // Super Admin Users Management

const BillingOverview = React.lazy(
  () => import("./pages/super-admin/BillingOverview"),
);
const SubscriptionCenter = React.lazy(
  () => import("./pages/super-admin/SubscriptionCenter"),
);
const SuperAdminAppDetail = React.lazy(
  () => import("./pages/super-admin/SuperAdminAppDetail"),
);
const StorefrontThemesManagement = React.lazy(
  () => import("./pages/super-admin/StorefrontThemesManagement"),
);
const MarketplaceCoverageCenter = React.lazy(
  () => import("./pages/super-admin/MarketplaceCoverageCenter"),
);
const SuperAdminAppExplanations = React.lazy(
  () => import("./pages/super-admin/SuperAdminAppExplanations"),
);

// Dev Tasks System
const SuperAdminDashboard = React.lazy(
  () => import("./pages/SuperAdminDashboard"),
);
const DevDashboardUnified = React.lazy(
  () => import("./pages/super-admin/DevDashboardUnified"),
);
const DevTasksList = React.lazy(
  () => import("./pages/super-admin/DevTasksList"),
);
const DevKanbanBoard = React.lazy(
  () => import("./pages/super-admin/DevKanbanBoard"),
);
const DevTaskForm = React.lazy(() => import("./pages/super-admin/DevTaskForm"));
const DevTaskDetails = React.lazy(
  () => import("./pages/super-admin/DevTaskDetails"),
);
const DevProjects = React.lazy(() => import("./pages/super-admin/DevProjects"));
const DevReleases = React.lazy(() => import("./pages/super-admin/DevReleases"));
const DevTeam = React.lazy(() => import("./pages/super-admin/DevTeam"));
const DevEvaluation = React.lazy(
  () => import("./pages/super-admin/DevEvaluation"),
);
const DevEvaluationMember = React.lazy(
  () => import("./pages/super-admin/DevEvaluationMember"),
);
const DatabaseMigration = React.lazy(
  () => import("./pages/super-admin/DatabaseMigration"),
);
const DevLeaderboard = React.lazy(
  () => import("./pages/super-admin/DevLeaderboard"),
);
const DevTaskSettings = React.lazy(
  () => import("./pages/super-admin/DevTaskSettings"),
);
const DevTaskIntegrations = React.lazy(
  () => import("./pages/super-admin/DevTaskIntegrations"),
);
const ExternalApiCredentialsPage = React.lazy(
  () => import("./pages/super-admin/external-api/ExternalApiCredentialsPage"),
);
const DevGoalsList = React.lazy(
  () => import("./pages/super-admin/DevGoalsList"),
);
const DevGoalDetails = React.lazy(
  () => import("./pages/super-admin/DevGoalDetails"),
);
const DevGoalForm = React.lazy(
  () => import("./pages/super-admin/DevGoalForm"),
);
const DevGoalAlignmentTree = React.lazy(
  () => import("./pages/super-admin/DevGoalAlignmentTree"),
);
const ActiveTimers = React.lazy(
  () => import("./pages/super-admin/ActiveTimers"),
);
const DevTimerDashboard = React.lazy(
  () => import("./pages/super-admin/DevTimerDashboard"),
);
const ProjectMap = React.lazy(() => import("./pages/super-admin/ProjectMap"));
const TimeTrackingDashboard = React.lazy(
  () => import("./pages/super-admin/TimeTrackingDashboard"),
);

const EscalationHistory = React.lazy(
  () => import("./pages/super-admin/EscalationHistory"),
);
const QueueMonitor = React.lazy(
  () => import("./pages/super-admin/QueueMonitor"),
);
// const SuperAdminMarketingLinks = React.lazy(() => import('./pages/super-admin/SuperAdminMarketingLinks'));
const PlatformPartnerManagement = React.lazy(
  () => import("./pages/super-admin/PlatformPartnerManagement"),
);
const TemplateSettingsPage = React.lazy(
  () => import("./pages/super-admin/TemplateSettings"),
);
const PendingReceipts = React.lazy(
  () => import("./pages/super-admin/PendingReceipts"),
);
const PayoutRequestsPage = React.lazy(
  () => import("./pages/super-admin/PayoutRequestsPage"),
);
const PartnerDashboard = React.lazy(
  () => import("./pages/platform-partner/PartnerDashboard"),
);

const PaymentPage = React.lazy(() => import("./pages/PaymentPage"));
const MessagingCheckout = React.lazy(() => import("./pages/payment/MessagingCheckout"));
const SubscriptionSuccess = React.lazy(() => import("./pages/payment/SubscriptionSuccess"));
const WalletManagement = React.lazy(() => import("./pages/WalletManagement"));
const CustomerPayments = React.lazy(() => import("./pages/CustomerPayments"));
const UnifiedCommentsManagement = React.lazy(
  () => import("./pages/comments/UnifiedCommentsManagement"),
);
const UnifiedCommentsSplit = React.lazy(
  () => import("./pages/comments/UnifiedCommentsSplit"),
);
const ReturnManagementPage = React.lazy(
  () => import("./pages/returns/ReturnManagementPage"),
);
const ReturnSettingsPage = React.lazy(
  () => import("./pages/returns/ReturnSettingsPage"),
);
const ReturnEmployeePerformance = React.lazy(
  () => import("./pages/returns/ReturnEmployeePerformance"),
);
const CancellationSettingsPage = React.lazy(
  () => import("./pages/cancellations/CancellationSettingsPage"),
);
const BulkSearchPage = React.lazy(
  () => import("./pages/bulk-search/BulkSearchPage"),
);

// Marketplace System
const MarketplaceV2 = React.lazy(() => import("./pages/marketplace/MarketplaceV2"));
const AgentMarketplacePage = React.lazy(
  () => import("./pages/marketplace/agents/AgentMarketplacePage"),
);
const StorefrontThemesMarketplace = React.lazy(
  () => import("./pages/marketplace/StorefrontThemes"),
);
const AppDetails = React.lazy(() => import("./pages/marketplace/AppDetails"));
const AppSettings = React.lazy(() => import("./pages/marketplace/AppSettings"));
const MyApps = React.lazy(() => import("./pages/marketplace/MyApps"));
const CustomerWalletRouteEntry = React.lazy(
  () => import("./pages/wallet/WalletRouteEntry"),
);
const Bundles = React.lazy(() => import("./pages/marketplace/Bundles"));
const BundleDetails = React.lazy(
  () => import("./pages/marketplace/BundleDetails"),
);
const CompareApps = React.lazy(
  () => import("./pages/marketplace/CompareApps"),
);
const AppDownloadsPage = React.lazy(
  () => import("./pages/marketplace/AppDownloadsPage"),
);
const AppHistoryPage = React.lazy(
  () => import("./pages/marketplace/AppHistoryPage"),
);

const MindMapPage = React.lazy(() => import("./pages/mindmap/MindMapPage"));

const AppPricingSheet = React.lazy(
  () => import("./pages/subscription/AppPricingSheet"),
);

// Knowledge base admin components
const FAQManagement = React.lazy(
  () => import("./components/Admin/FAQManagement"),
);
const PolicyManagement = React.lazy(
  () => import("./components/Admin/PolicyManagement"),
);

// WhatsApp
const WhatsAppSettings = React.lazy(() =>
  import("./pages/whatsapp").then((m) => ({ default: m.WhatsAppSettings })),
);
const WhatsAppTemplates = React.lazy(() =>
  import("./pages/whatsapp").then((m) => ({ default: m.WhatsAppTemplates })),
);
const WhatsAppChat = React.lazy(() =>
  import("./pages/whatsapp").then((m) => ({ default: m.WhatsAppChat })),
);
const WhatsAppNotifications = React.lazy(
  () => import("./pages/whatsapp/WhatsAppNotifications"),
);
const WhatsAppCustomerJourney = React.lazy(
  () => import("./pages/whatsapp/WhatsAppCustomerJourney"),
);
const WhatsAppMetaTemplates = React.lazy(
  () => import("./pages/whatsapp/WhatsAppMetaTemplates"),
);
const WhatsAppTemplateBroadcast = React.lazy(
  () => import("./pages/whatsapp/WhatsAppTemplateBroadcast"),
);
const WhatsAppLeadFollowUp = React.lazy(
  () => import("./pages/whatsapp/WhatsAppLeadFollowUp"),
);
const WhatsAppCloudConnect = React.lazy(() =>
  import("./pages/whatsapp").then((m) => ({ default: m.WhatsAppCloudConnect })),
);
const WhatsAppEmployeeAnalytics = React.lazy(() =>
  import("./pages/whatsapp/WhatsAppEmployeeAnalytics"),
);
const WhatsAppConversationAnalytics = React.lazy(() =>
  import("./pages/whatsapp/WhatsAppConversationAnalytics"),
);
const WhatsAppNotificationLogs = React.lazy(() =>
  import("./pages/whatsapp/WhatsAppNotificationLogs"),
);

// HR Module
const HRDashboard = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.HRDashboard })),
);
const MonitorDashboard = React.lazy(() => import("./pages/hr/monitor/MonitorDashboard"));
const EmployeeMonitorDetails = React.lazy(() => import("./pages/hr/monitor/EmployeeMonitorDetails"));
const OnlineTeam = React.lazy(() => import("./pages/hr/OnlineTeam"));
const MyCompaniesDashboard = React.lazy(
  () => import("./pages/hr/MyCompaniesDashboard"),
);
const OwnerReports = React.lazy(() => import("./pages/owner/OwnerReports"));
const OwnerAttendanceReport = React.lazy(
  () => import("./pages/owner/OwnerAttendanceReport"),
);
const OwnerUsersManagement = React.lazy(
  () => import("./pages/owner/OwnerUsersManagement"),
);
const CompanyOrdersDetails = React.lazy(
  () => import("./pages/owner/CompanyOrdersDetails"),
);
const Employees = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Employees })),
);
const EmployeeDetails = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.EmployeeDetails })),
);
const EmployeeEdit = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.EmployeeEdit })),
);
const Departments = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Departments })),
);
const PositionsManagement = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.PositionsManagement })),
);
const Attendance = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Attendance })),
);
const ManualAttendanceEdit = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.ManualAttendanceEdit })),
);
const Leaves = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Leaves })),
);
const Permissions = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Permissions })),
);
const Payroll = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Payroll })),
);
const Deductions = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Deductions })),
);
const HRSettings = React.lazy(() => import("./pages/hr/HRSettings"));
const HRApiIntegrations = React.lazy(() => import("./pages/hr/HRApiIntegrations"));
const HRReports = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.HRReports })),
);
const HRReportsHub = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.HRReportsHub })),
);
const Documents = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Documents })),
);
const MyDeductions = React.lazy(() =>
  import("./pages/employee").then((m) => ({ default: m.MyDeductions })),
);
const SalaryHistory = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.SalaryHistory })),
);
const PerformanceReviews = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.PerformanceReviews })),
);
const Training = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Training })),
);
const CreateTraining = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CreateTraining })),
);
const Warnings = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Warnings })),
);
const EmployeesPromotion = React.lazy(
  () => import("./pages/hr/EmployeesPromotion"),
);
const CreatePromotion = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CreatePromotion })),
);
const EditPromotion = React.lazy(() => import("./pages/hr/EditPromotion"));
const WarningDetails = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.WarningDetails })),
);
const EditWarning = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.EditWarning })),
);
const CreateWarning = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CreateWarning })),
);
const Shifts = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Shifts })),
);
const ShiftDetails = React.lazy(() => import("./pages/hr/ShiftDetails"));
const Benefits = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Benefits })),
);
const Goals = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Goals })),
);
const CreateGoal = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CreateGoal })),
);
const CreateFeedback = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CreateFeedback })),
);
const Feedback = React.lazy(() => import("./pages/hr/Feedback"));
const Resignations = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Resignations })),
);
const CreateResignation = React.lazy(
  () => import("./pages/hr/CreateResignation"),
);
const DecisionResignation = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.DecisionResignation })),
);
const CreatePerformanceReview = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CreatePerformanceReview })),
);
const Advances = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.Advances })),
);
const CreateAdvance = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CreateAdvance })),
);
const AuditLogs = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.AuditLogs })),
);
const CompanyPolicy = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CompanyPolicy })),
);
const ClearanceChecklist = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.ClearanceChecklist })),
);
const AssetsDashboard = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.AssetsDashboard })),
);
const RewardsList = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.RewardsList })),
);
const RewardDetails = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.RewardDetails })),
);
const CreateEditReward = React.lazy(() =>
  import("./pages/hr").then((m) => ({ default: m.CreateEditReward })),
);
// const CustomerLoyalty = React.lazy(() => import('./pages/hr/CustomerLoyalty'));
const CashbackSettings = React.lazy(
  () => import("./pages/customers/CashbackSettings"),
);
const LoyaltyPrograms = React.lazy(
  () => import("./pages/customers/LoyaltyPrograms"),
);
const LoyaltyTiers = React.lazy(() => import("./pages/customers/LoyaltyTiers"));
const LoyaltyMembers = React.lazy(
  () => import("./pages/customers/LoyaltyMembers"),
);
const LoyaltyAnalytics = React.lazy(
  () => import("./pages/customers/LoyaltyAnalytics"),
);
const LoyaltySystemMap = React.lazy(
  () => import("./pages/customers/LoyaltySystemMap"),
);
const CustomerPointsCenter = React.lazy(
  () => import("./pages/customers/CustomerPointsCenter"),
);
const CustomerSegments = React.lazy(
  () => import("./pages/customers/CustomerSegments"),
);
const CustomerAutoDiscount = React.lazy(
  () => import("./pages/customers/CustomerAutoDiscount"),
);
const CustomerLoyaltySettings = React.lazy(
  () => import("./pages/customers/CustomerLoyaltySettings"),
);
const CustomerNotifications = React.lazy(
  () => import("./pages/customers/CustomerNotifications"),
);
const CustomerLists = React.lazy(
  () => import("./pages/customers/CustomerLists"),
);
const RecruitmentDashboard = React.lazy(
  () => import("./pages/hr/recruitment/RecruitmentDashboard"),
);
const WorkReportFormsDashboard = React.lazy(
  () => import("./pages/hr/work-reporting/WorkReportFormsDashboard"),
);
const WorkReportFormBuilder = React.lazy(
  () => import("./pages/hr/work-reporting/WorkReportFormBuilder"),
);
const WorkReportFormPreview = React.lazy(
  () => import("./pages/hr/work-reporting/WorkReportFormPreview"),
);
const WorkReportSubmissionPage = React.lazy(
  () => import("./pages/hr/work-reporting/WorkReportSubmissionPage"),
);
const WorkReportRecordsPage = React.lazy(
  () => import("./pages/hr/work-reporting/WorkReportRecordsPage"),
);

// Employee Self-Service
const MyAttendance = React.lazy(() => import("./pages/employee/MyAttendance"));
const MyDashboard = React.lazy(() => import("./pages/employee/MyDashboard"));
const MyAdvances = React.lazy(() =>
  import("./pages/employee").then((m) => ({ default: m.MyAdvances })),
);
const MyPayroll = React.lazy(() => import("./pages/hr/MyPayroll"));
const MyCustody = React.lazy(() => import("./pages/my-custody/MyCustody"));
const MyFeedback = React.lazy(() => import("./pages/hr/MyFeedback"));
const MyWarnings = React.lazy(() =>
  import("./pages/employee").then((m) => ({ default: m.MyWarnings })),
);
const MyPromotions = React.lazy(() =>
  import("./pages/employee").then((m) => ({ default: m.MyPromotions })),
);
const MyRewards = React.lazy(() =>
  import("./pages/employee").then((m) => ({ default: m.MyRewards })),
);
const MyResignation = React.lazy(() =>
  import("./pages/employee").then((m) => ({ default: m.MyResignation })),
);
const MyTraining = React.lazy(() => import("./pages/employee/MyTraining"));

import { PageSkeleton } from "./components/common/PageSkeleton";

const LoadingFallback = () => <PageSkeleton />;

// Route prefetch registry — triggers dynamic imports on hover for instant navigation
if (typeof window !== "undefined") {
  const p = (window as unknown as Record<string, Record<string, () => Promise<unknown>>>).__MAXP_ROUTE_PREFETCH__ = {};

  p["/dashboard"] = () => import("./pages/dashboard/MainDashboardPage");
  p["/company-dashboard"] = () => import("./pages/dashboard/MainDashboardPage");
  p["/merchant-portal"] = () => import("./pages/merchant-portal/MerchantPortalDashboard");
  p["/merchant-portal/dashboard"] = () => import("./pages/merchant-portal/MerchantPortalDashboard");
  p["/merchant-portal/commissions"] = () => import("./pages/merchant-portal/MerchantPortalDashboard");
  p["/customers"] = () => import("./pages/customers/CustomerList");
  p["/customers/segments"] = () => import("./pages/customers/CustomerSegments");
  p["/customers/auto-discount"] = () => import("./pages/customers/CustomerAutoDiscount");
  p["/customers/settings"] = () => import("./pages/customers/CustomerLoyaltySettings");
  p["/customers/lists"] = () => import("./pages/customers/CustomerLists");
  p["/customers/customer-notifications"] = () => import("./pages/customers/CustomerNotifications");
  p["/customers/product-offers"] = () => import("./pages/customers/ProductOffers");
  p["/orders"] = () => import("./pages/orders/Orders");
  p["/products"] = () => import("./pages/products/Products");
  p["/analytics"] = () => import("./pages/Analytics/StoreAnalyticsDashboard");
  p["/analytics/orders"] = () => import("./pages/Analytics/orders/OverviewDashboard");
  p["/analytics/store"] = () => import("./pages/Analytics/StoreAnalyticsDashboard");
  p["/whatsapp"] = () => import("./pages/whatsapp-inbox/WhatsAppChat");
  p["/pos"] = () => import("./pages/pos/PosPage");
  p["/tickets"] = () => import("./pages/tickets/TurboTickets");
  p["/advertising"] = () => import("./pages/advertising/FacebookAdsDashboard");
  p["/advertising/marketing-studio"] = () => import("./pages/advertising/marketing-studio/MarketingAiStudioPage");
  p["/advertising/creative-studio"] = () => import("./pages/advertising/creative-studio/CreativeAiStudioPage");
  p["/affiliates"] = () => import("./pages/affiliates/AffiliateDashboard");
  p["/hr"] = () => import("./pages/hr/HRDashboard");
  p["/settings"] = () => import("./pages/settings/Settings");
  p["/settings/company"] = () => import("./pages/settings/CompanySettings");
  p["/settings/custom-domain"] = () => import("./pages/settings/CustomDomainPage");
  p["/facebook-inbox"] = () => import("./pages/facebook-inbox/FacebookInbox");
  p["/instagram-inbox"] = () => import("./pages/instagram-inbox/InstagramInbox");
  p["/unified-inbox"] = () => import("./pages/unified-inbox/UnifiedInbox");
  p["/unified-inbox/connections"] = () => import("./pages/unified-inbox/connections/PlatformConnections");
  p["/tasks"] = () => import("./pages/tasks/Dashboard");
  p["/inventory"] = () => import("./pages/inventory/Inventory");
  p["/inventory/studio"] = () => import("./pages/inventory/studio/InventoryAiStudioPage");
  p["/support"] = () => import("./pages/support/SupportCenter");
  p["/profile"] = () => import("./pages/profile/Profile");
  p["/marketplace"] = () => import("./pages/marketplace/MarketplaceV2");
  p["/marketplace/downloads"] = () => import("./pages/marketplace/AppDownloadsPage");
  p["/marketplace/history"] = () => import("./pages/marketplace/AppHistoryPage");
  p["/marketplace/agents"] = () => import("./pages/marketplace/agents/AgentMarketplacePage");
  p["/my-apps"] = () => import("./pages/marketplace/MyApps");
  p["/mindmap"] = () => import("./pages/mindmap/MindMapPage");
  p["/broadcast"] = () => import("./pages/broadcast/BroadcastDashboard");
}

// Create a separate component that uses auth
const AppContent = () => {
  // Use real authentication state
  const { isAuthenticated, isLoading, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV || import.meta.env.MODE === "development";

  const [activeLpSlugs, setActiveLpSlugs] = useState<Set<string> | null>(null);

  // Catch Vite dynamic-import failures when a redeploy deleted old chunks
  // that a cached browser still references. Reload to get fresh index.html.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', handler);
    return () => window.removeEventListener('vite:preloadError', handler);
  }, []);

  useEffect(() => {
    // تأجيل جلب صفحات الهبوط لوقت الخمول حتى لا تنافس طلبات الإقلاع الحرجة
    let cancelled = false;
    const loadLpPages = () => {
      if (cancelled) return;
      fetch("/api/v1/public/lp-pages", { credentials: "include" })
        .then((r) => {
          if (!r.ok) throw new Error("API not available");
          return r.json();
        })
        .then((pages: Array<{ isActive?: boolean; slug?: string }>) => {
          if (cancelled) return;
          setActiveLpSlugs(new Set(pages.filter((p) => p.isActive && p.slug).map((p) => p.slug as string)));
        })
        .catch(() => {
          if (!cancelled) setActiveLpSlugs(null);
        });
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(loadLpPages, { timeout: 2500 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idleId);
      };
    }
    const fallbackTimer = window.setTimeout(loadLpPages, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  // Remember the last app page per user+company so they can resume it after login.
  useEffect(() => {
    if (isAuthenticated && user) {
      saveLastPath(user, pathname);
    }
  }, [isAuthenticated, pathname, user]);

  // Native Mobile Push Notifications (FCM)
  useEffect(() => {
    pushNotificationService.init();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      pushNotificationService.syncTokenWithBackend();
    }
  }, [isAuthenticated, user]);

  // Native Mobile Back Button & In-App Navigation (Android)
  useEffect(() => {
    let removeBackListener: (() => void) | undefined;
    const win = window as any;

    if (typeof win !== "undefined" && win.Capacitor?.isNativePlatform?.() && win.Capacitor?.Plugins?.App) {
      try {
        win.Capacitor.Plugins.App.addListener("backButton", ({ canGoBack }: any) => {
          // 1. Check if any active modal, dialog, drawer, or sheet is open first
          const openOverlay = document.querySelector<HTMLElement>(
            '.business-mobile-overlay[data-open="true"], [role="dialog"][data-open="true"], dialog[open], .app-shell-drawer--open, .modal-overlay, [data-state="open"][role="dialog"]'
          );
          if (openOverlay) {
            const closeBtn = openOverlay.querySelector<HTMLElement>(
              'button[aria-label*="close" i], button[aria-label*="إغلاق" i], [data-close-button], button.close-btn, button[aria-label*="Close" i]'
            );
            if (closeBtn) {
              closeBtn.click();
              return;
            }
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            return;
          }

          const currentPath = window.location.pathname;
          if (currentPath === "/dashboard" || currentPath === "/" || currentPath === "/apps" || currentPath === "/auth/login") {
            win.Capacitor.Plugins.App.exitApp();
          } else if (canGoBack || window.history.length > 1) {
            navigate(-1);
          } else {
            navigate("/apps");
          }
        }).then((listener: any) => {
          removeBackListener = () => listener?.remove?.();
        });
      } catch (err) {
        // Safe fallback if plugins not available
      }
    }

    const handleCustomNavigate = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail) {
        navigate(customEvt.detail);
      }
    };
    window.addEventListener("maxp:navigate", handleCustomNavigate);

    return () => {
      if (removeBackListener) removeBackListener();
      window.removeEventListener("maxp:navigate", handleCustomNavigate);
    };
  }, [navigate]);

  // Subdomain Detection Logic
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  let tenantSubdomain: string | null = null;

  if (!isLocalhost) {
    if (hostname.endsWith(".localhost")) {
      tenantSubdomain = hostname.replace(".localhost", "");
    } else {
      const parts = hostname.split(".");
      const firstPart = parts[0] ?? null;
      if (parts.length >= 3 && firstPart && firstPart !== "www") {
        tenantSubdomain = firstPart;
      }
    }
  } else {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("previewTheme") || searchParams.has("storefrontSubdomain")) {
      tenantSubdomain = searchParams.get("storefrontSubdomain") || "demo";
    }
  }

  const shouldRenderTenantStorefront =
    Boolean(tenantSubdomain) &&
    shouldBootstrapStorefront(hostname, pathname, window.location.search);

  // If a tenant subdomain is detected for a storefront route, we strictly render
  // the Storefront. Public affiliate/merchant registration paths are handled by
  // the regular public shell even when accessed from a subdomain.
  if (shouldRenderTenantStorefront && tenantSubdomain) {
    return (
      <PerformanceOptimizer>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              path="/*"
              element={<StorefrontShell subdomain={tenantSubdomain} />}
            />
          </Routes>
        </Suspense>
      </PerformanceOptimizer>
    );
  }

  // Debug: Log current route and auth status
  const currentPath = pathname;
  if (isDev) {
    console.debug(" [App] Current path:", currentPath);
    console.debug(" [App] Is authenticated:", isAuthenticated);
    console.debug(" [App] Is loading:", isLoading);
  }

  // Check if current path is a public route
  const isPublicRoute =
    currentPath.startsWith("/test-public") ||
    currentPath.startsWith("/company-links/") ||
    currentPath.startsWith("/auth/") ||
    currentPath.startsWith("/register/") ||
    currentPath.startsWith("/dental-portal") ||
    currentPath.startsWith("/affiliate-register") ||
    currentPath.startsWith("/payment/") ||
    currentPath.startsWith("/checkout/") ||
    currentPath.startsWith("/apply/") ||
    currentPath.startsWith("/for-merchants") ||
    currentPath.startsWith("/lp/") ||
    currentPath.startsWith("/theme-demo/") ||
    currentPath.startsWith("/store") ||
    currentPath.startsWith("/cafe-demo") ||
    currentPath.startsWith("/book/") ||
    currentPath === "/faq" ||
    currentPath === "/support/faq" ||
    currentPath === "/";

  const faqRouteElement = isAuthenticated ? (
    <Layout>
      <FAQPage />
    </Layout>
  ) : (
    <FAQPage />
  );

  // On native mobile app (Capacitor), unauthenticated merchants must go straight to login
  // instead of the public web marketing landing page
  if (isCapacitorNative() && !isAuthenticated && !isLoading) {
    if (currentPath === "/" || currentPath === "/for-merchants" || currentPath.startsWith("/lp/")) {
      return <Navigate to="/auth/login" replace />;
    }
  }

  // Only show loading for non-public routes
  if (isLoading && !isPublicRoute) {
    return <LoadingFallback />;
  }

  if (
    shouldRedirectMerchantToPortal({
      isAuthenticated,
      isLoading,
      isPublicRoute,
      pathname: currentPath,
      role: user?.role,
    })
  ) {
    return <Navigate to="/merchant-portal" replace />;
  }

  if (
    shouldRedirectAffiliateToDashboard({
      isAuthenticated,
      isLoading,
      isPublicRoute,
      pathname: currentPath,
      role: user?.role,
    })
  ) {
    return <Navigate to="/affiliates/dashboard" replace />;
  }

  // Check if path is /products/reviews or /my-activity and log debug info
  if (currentPath === "/products/reviews" || currentPath === "/my-activity") {
    const hasAccessToken = tokenManager.hasAccessToken();

    if (isDev) {
      console.debug(` [App] Accessing ${currentPath} `);
      console.debug(" [App] Is authenticated:", isAuthenticated);
      console.debug(" [App] Is loading:", isLoading);
      console.debug(" [App] Token exists:", hasAccessToken);
      console.debug(
        " [App] Will render:",
        isAuthenticated ? "Component" : "Redirect to login",
      );
    }

    // If not authenticated but token exists, log more details
    if (!isAuthenticated && hasAccessToken) {
      if (isDev) {
        console.warn(
          " [App] User has token but isAuthenticated is false! This might be a timing issue.",
        );
        console.warn(" [App] isLoading:", isLoading);
      }
    }
  }

  return (
    <PerformanceOptimizer>
      <div className="App w-full min-w-full">
        {/* <EnvironmentIndicator position="bottom-right" /> */}
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/auth/login"
              element={
                <AuthLayout>
                  <ModernLogin />
                </AuthLayout>
              }
            />
            <Route
              path="/auth/register"
              element={
                <AuthLayout>
                  <Register />
                </AuthLayout>
              }
            />
            <Route
              path="/auth/customer-register"
              element={
                <AuthLayout>
                  <CustomerRegister />
                </AuthLayout>
              }
            />
            <Route
              path="/auth/customer-register/:companyId"
              element={
                <AuthLayout>
                  <CustomerRegister />
                </AuthLayout>
              }
            />
            <Route
              path="/auth/forgot-password"
              element={
                <AuthLayout>
                  <ForgotPassword />
                </AuthLayout>
              }
            />
            <Route
              path="/auth/reset-password"
              element={
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              }
            />
            <Route
              path="/auth/accept-invitation"
              element={
                <AuthLayout>
                  <AcceptInvitation />
                </AuthLayout>
              }
            />
            <Route
              path="/auth/join-employee"
              element={
                <AuthLayout>
                  <JoinEmployee />
                </AuthLayout>
              }
            />
            <Route
              path="/company-links/:token"
              element={<PublicCompanyLinks />}
            />
            <Route
              path="/agency/client-portal/:token"
              element={
                <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                  <AgencyClientPortal />
                </React.Suspense>
              }
            />
            {/* Public Registration Routes - No Company Required */}
            <Route
              path="/register/affiliate"
              element={
                <AuthLayout>
                  <PublicAffiliateRegister />
                </AuthLayout>
              }
            />
            <Route
              path="/register/merchant"
              element={
                <AuthLayout>
                  <PublicMerchantRegister />
                </AuthLayout>
              }
            />
            {/* Public Affiliate Registration - Support both with and without slug */}
            <Route
              path="/affiliate-register"
              element={
                <AuthLayout>
                  <PublicAffiliateRegister />
                </AuthLayout>
              }
            />
            <Route
              path="/affiliate-register/:slug"
              element={
                <AuthLayout>
                  <PublicAffiliateRegister />
                </AuthLayout>
              }
            />
            {/* Teacher Portal Login */}
            <Route
              path="/teacher/login"
              element={
                <AuthLayout>
                  <TeacherLoginPage />
                </AuthLayout>
              }
            />
            {/* Doctor Portal Login */}
            <Route
              path="/doctor/login"
              element={
                <AuthLayout>
                  <DoctorLoginPage />
                </AuthLayout>
              }
            />
            {/* Patient Portal Login */}
            <Route
              path="/patient/login"
              element={
                <AuthLayout>
                  <PatientLoginPage />
                </AuthLayout>
              }
            />
            {/* Parent Portal Routes (outside ProtectedRoute - use own auth) */}
            <Route path="/parent/dashboard" element={<ParentLayout><ParentDashboardPage /></ParentLayout>} />
            <Route path="/parent/children" element={<ParentLayout><ParentChildrenPage /></ParentLayout>} />
            <Route path="/parent/children/:studentId" element={<ParentLayout><ParentChildDetailPage /></ParentLayout>} />
            <Route path="/parent/sessions" element={<ParentLayout><ParentSessionsPage /></ParentLayout>} />
            <Route path="/parent/enrollments" element={<ParentLayout><ParentEnrollmentsPage /></ParentLayout>} />
            <Route path="/parent/wallet" element={<ParentLayout><ParentWalletPage /></ParentLayout>} />
            <Route path="/parent/buy-package" element={<ParentLayout><ParentBuyPackagePage /></ParentLayout>} />
            <Route
              path="/parent/login"
              element={
                <AuthLayout>
                  <ParentLoginPage />
                </AuthLayout>
              }
            />
            {/* Portal Routes (outside ProtectedRoute - use own auth) */}
            <Route path="/teacher/dashboard" element={<TeacherLayout><TeacherDashboardPage /></TeacherLayout>} />
            <Route path="/teacher/schedule" element={<TeacherLayout><TeacherSchedulePage /></TeacherLayout>} />
            <Route path="/teacher/payments" element={<TeacherLayout><TeacherPaymentsPage /></TeacherLayout>} />
            <Route path="/teacher/availability" element={<TeacherLayout><TeacherAvailabilityPage /></TeacherLayout>} />
            <Route path="/doctor/dashboard" element={<DoctorLayout><DoctorDashboardPage /></DoctorLayout>} />
            <Route path="/doctor/schedule" element={<DoctorLayout><DoctorSchedulePage /></DoctorLayout>} />
            <Route path="/doctor/patients" element={<DoctorLayout><DoctorPatientsPage /></DoctorLayout>} />
            <Route path="/doctor/payments" element={<DoctorLayout><DoctorPaymentsPage /></DoctorLayout>} />
            <Route path="/doctor/availability" element={<DoctorLayout><DoctorAvailabilityPage /></DoctorLayout>} />
            <Route path="/patient/dashboard" element={<PatientLayout><PatientDashboardPage /></PatientLayout>} />
            <Route path="/patient/appointments" element={<PatientLayout><PatientAppointmentsPage /></PatientLayout>} />
            <Route path="/patient/history" element={<PatientLayout><PatientHistoryPage /></PatientLayout>} />
            <Route path="/patient/invoices" element={<PatientLayout><PatientInvoicesPage /></PatientLayout>} />
            {/* Customer Portal Routes (outside ProtectedRoute - use own auth) */}
            <Route path="/account" element={<CustomerPortalLayout><CustomerAccountHome /></CustomerPortalLayout>} />
            <Route path="/account/cashback" element={<CustomerPortalLayout><CustomerWalletPage /></CustomerPortalLayout>} />
            <Route path="/account/profile" element={<CustomerPortalLayout><CustomerProfilePage /></CustomerPortalLayout>} />
            {/* Public Application Form - For job applicants */}
            <Route path="/apply/:formId" element={<PublicApplicationForm />} />
            
            <Route path="/app-explanations" element={<AppExplanationsPage />} />
            <Route path="/book/:slug" element={<BookAppointmentPage />} />
            <Route path="/forms/:slug" element={<PublicFormPage />} />
            <Route path="/request-service" element={<ServiceRequestForm />} />
            <Route path="/faq" element={faqRouteElement} />
            <Route path="/support/faq" element={faqRouteElement} />
            {/* Legal and Compliance Routes (Public - Required for Facebook/Meta App Review) */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/policies" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/data-deletion" element={<DataDeletionPage />} />
            {/* Public Storefront Routes - No Authentication Required */}
            <Route path="/test-minimal" element={<TestMinimal />} />
            <Route path="/test-public" element={<TestPublic />} />
            <Route
              path="/cafe-demo"
              element={
                <Suspense fallback={<div>Loading Demo...</div>}>
                  <CafeThemeDemo />
                </Suspense>
              }
            />
            {/* Theme Demos - Public Storefront Previews */}
            <Route
              path="/theme-demo/pharmacy"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <PharmacyThemeDemo />
                </Suspense>
              }
            />
            <Route
              path="/theme-demo/furniture"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <FurnitureThemeDemo />
                </Suspense>
              }
            />
            <Route
              path="/theme-demo/electronics"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <ElectronicsThemeDemo />
                </Suspense>
              }
            />
            <Route
              path="/theme-demo/restaurant"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <RestaurantThemeDemo />
                </Suspense>
              }
            />
            <Route path="/shadcn-demo" element={<ShadcnDemo />} />
            <Route path="/for-merchants" element={<MaxPMerchantsLanding />} />
            {activeLpSlugs && !activeLpSlugs.has("mg") ? <Route path="/lp/mg" element={<Navigate to="/" replace />} /> : <Route path="/lp/mg" element={<MgAgencyLeadLanding />} />}
            {activeLpSlugs && !activeLpSlugs.has("mg-agency") ? <Route path="/lp/mg-agency" element={<Navigate to="/" replace />} /> : <Route path="/lp/mg-agency" element={<MgAgencyLeadLanding />} />}
            {activeLpSlugs && !activeLpSlugs.has("messaging") ? <Route path="/lp/messaging" element={<Navigate to="/" replace />} /> : <Route path="/lp/messaging" element={<MessagingLanding />} />}
            {activeLpSlugs && !activeLpSlugs.has("ai-inbox") ? <Route path="/lp/ai-inbox" element={<Navigate to="/" replace />} /> : <Route path="/lp/ai-inbox" element={<AiInboxLanding />} />}
            {activeLpSlugs && !activeLpSlugs.has("medical") ? <Route path="/lp/medical" element={<Navigate to="/" replace />} /> : <Route path="/lp/medical" element={<MedicalLanding />} />}
            <Route
              path="/preview/platform-home/:variantId"
              element={<PlatformLandingPreviewPage />}
            />
            <Route path="/store/articles/:slug" element={<StorefrontArticlePage />} />
            {/* Phase 3 — COD Sales Landing (#3 of 4 product display shapes) */}
            <Route path="/funnel/:slug" element={<FunnelCodSalesPage />} />
            <Route path="/p/:slug" element={<FunnelCodSalesPage />} />
            <Route path="/products/:slug" element={<FunnelCodSalesPage />} />
            {/* New Storefront Theme Engine - Fully Isolated */}
            <Route path="/store/*" element={<StorefrontShell />} />
            <Route path="/shop" element={<StorefrontShell />} />
            {isAuthenticated && (
              <>
            <Route
              path="/super-admin"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route
              path="/super-admin/dashboard"
              element={
                <Layout>
                  <SuperAdminDashboard />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp"
              element={
                <Layout>
                  <SuperAdminWhatsAppOverview />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/companies"
              element={
                <Layout>
                  <SuperAdminWhatsAppCompanies />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/companies/:companyId"
              element={
                <Layout>
                  <SuperAdminWhatsAppCompanyWorkspace />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/companies/:companyId/settings"
              element={
                <Layout>
                  <SuperAdminWhatsAppCompanySettings />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/companies/:companyId/notifications"
              element={
                <Layout>
                  <SuperAdminWhatsAppCompanyNotifications />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/logs"
              element={
                <Layout>
                  <SuperAdminWhatsAppLogs />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/automations"
              element={
                <Layout>
                  <SuperAdminWhatsAppAutomations />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/companies/:companyId/routing"
              element={
                <Layout fullWidth>
                  <SuperAdminWhatsAppCompanyInbox />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/companies/:companyId/routing/:sessionId"
              element={
                <Layout fullWidth>
                  <SuperAdminWhatsAppCompanyInbox />
                </Layout>
              }
            />
            <Route
              path="/super-admin/whatsapp/companies/:companyId/chat/:conversationId"
              element={
                <Layout fullWidth>
                  <SuperAdminWhatsAppCompanyChat />
                </Layout>
              }
            />
            <Route
              path="/super-admin/companies-v2"
              element={
                <Layout fullWidth>
                  <SuperAdminCompaniesV2 />
                </Layout>
              }
            />
            <Route
              path="/super-admin/companies"
              element={<Navigate to="/super-admin/companies-v2" replace />}
            />
            <Route
              path="/super-admin/follow-up"
              element={
                <Layout fullWidth>
                  <SuperAdminFollowUp />
                </Layout>
              }
            />
            <Route
              path="/super-admin/company-activity"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminCompanyActivity />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/companies-reports"
              element={
                <Layout fullWidth>
                  <SuperAdminCompaniesReports />
                </Layout>
              }
            />
            <Route
              path="/super-admin/daily-orders"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                    <SuperAdminDailyOrdersPage />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/companies/:companyId"
              element={
                <Layout>
                  <SuperAdminCompanyDetails />
                </Layout>
              }
            />
            <Route
              path="/super-admin/users"
              element={
                <Layout>
                  <SuperAdminUsersManagement />
                </Layout>
              }
            />
            <Route
              path="/super-admin/staff-access"
              element={
                <Layout>
                  <SuperAdminStaffCompanyAccess />
                </Layout>
              }
            />
            <Route
              path="/super-admin/storefront-themes"
              element={
                <Layout>
                  <StorefrontThemesManagement />
                </Layout>
              }
            />
            <Route
              path="/super-admin/invoices"
              element={
                <Layout>
                  <SuperAdminInvoices />
                </Layout>
              }
            />
            <Route
              path="/super-admin/payments"
              element={
                <Layout>
                  <SuperAdminPayments />
                </Layout>
              }
            />
            <Route
              path="/super-admin/system-management"
              element={
                <Layout>
                  <SuperAdminSystemManagement />
                </Layout>
              }
            />
            <Route
              path="/super-admin/app-pricing"
              element={
                <Layout>
                  <SubscriptionCenter initialTab={6} />
                </Layout>
              }
            />
            <Route
              path="/super-admin/app-explanations"
              element={
                <Layout>
                  <SuperAdminAppExplanations />
                </Layout>
              }
            />
            <Route
              path="/super-admin/pages"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route
              path="/super-admin/landing-pages"
              element={
                <Layout>
                  <SuperAdminLandingPages />
                </Layout>
              }
            />
            <Route
              path="/super-admin/homepage-templates"
              element={
                <Layout>
                  <PlatformSiteHomepageTemplates />
                </Layout>
              }
            />
            <Route
              path="/super-admin/default-sidebar"
              element={
                <Layout>
                  <SuperAdminDefaultSidebar />
                </Layout>
              }
            />
            <Route
              path="/super-admin/homepage-templates/:templateId/pages"
              element={<Navigate to="/super-admin/homepage-templates" replace />}
            />
            <Route
              path="/super-admin/storefront-templates"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route
              path="/super-admin/theme-engine"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route
              path="/super-admin/theme-factory"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route
              path="/demo/theme-engine"
              element={<Navigate to="/settings/store" replace />}
            />
            <Route
              path="/preview/theme/:id"
              element={<Navigate to="/settings/store" replace />}
            />
            <Route
              path="/super-admin/product-embeddings"
              element={
                <Layout fullWidth>
                  <SuperAdminProductEmbeddings />
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-consumption"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminAIConsumption />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/self-review"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminSelfReviewLogs />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/visual-search-logs"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminVisualSearchLogs />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/support-settings"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminSupportSettings />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-image-generator-settings"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminAIImageGeneratorSettings />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-key-manager"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminAIKeyManager />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-key-logs"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminAIKeyLogs />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-playground"
              element={
                <Layout fullWidth>
                  <SuperAdminAIPlayground />
                </Layout>
              }
            />
            <Route
              path="/super-admin/server-usage"
              element={
                <Layout>
                  <SuperAdminServerUsage />
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-hub"
              element={
                <Layout fullWidth>
                  <SuperAdminAIHubLayout />
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-incidents"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <SuperAdminAiIncidentsPage />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-hub/skills/:skillId"
              element={
                <Layout fullWidth>
                  <SkillDetailPage />
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-chat"
              element={
                <Layout fullWidth>
                  <SuperAdminAIChatPage />
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-templates"
              element={
                <Layout fullWidth>
                  <SuperAdminAITemplates />
                </Layout>
              }
            />
            <Route
              path="/super-admin/ai-templates/:slug"
              element={
                <Layout fullWidth>
                  <SuperAdminAITemplateDetail />
                </Layout>
              }
            />
            <Route
              path="/super-admin/platform-site-meta-pixel"
              element={
                <Layout>
                  <PlatformSiteMetaPixel />
                </Layout>
              }
            />
            <Route
              path="/super-admin/platform-signup-coupons"
              element={
                <Layout>
                  <PlatformSignupCoupons />
                </Layout>
              }
            />
            <Route
              path="/super-admin/business-specialties"
              element={
                <Layout>
                  <BusinessSpecialtiesManagement />
                </Layout>
              }
            />
            <Route
              path="/super-admin/facebook-oauth"
              element={
                <Layout>
                  <SuperAdminFacebookOAuth />
                </Layout>
              }
            />
            <Route
              path="/super-admin/wallet-management"
              element={
                <Layout>
                  <WalletManagement />
                </Layout>
              }
            />
            {/* Dev Tasks System Routes */}
            <Route
              path="/super-admin/dev-dashboard"
              element={
                <Layout>
                  <DevDashboardUnified />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-tasks"
              element={
                <Layout>
                  <DevTasksList />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-tasks/new"
              element={
                <Layout>
                  <DevTaskForm />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-tasks/:id"
              element={
                <Layout>
                  <DevTaskDetails />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-tasks/:id/edit"
              element={
                <Layout>
                  <DevTaskForm />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-kanban"
              element={
                <Layout>
                  <DevKanbanBoard />
                </Layout>
              }
            />
            <Route
              path="/super-admin/active-timers"
              element={
                <Layout>
                  <ActiveTimers />
                </Layout>
              }
            />
            <Route
              path="/super-admin/time-tracking"
              element={
                <Layout>
                  <TimeTrackingDashboard />
                </Layout>
              }
            />
            <Route
              path="/super-admin/timer-dashboard"
              element={
                <Layout>
                  <DevTimerDashboard />
                </Layout>
              }
            />

            <Route
              path="/super-admin/dev/escalations"
              element={
                <Layout>
                  <EscalationHistory />
                </Layout>
              }
            />
            <Route
              path="/super-admin/project-map"
              element={
                <Layout>
                  <ProjectMap />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-projects"
              element={
                <Layout>
                  <DevProjects />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-releases"
              element={
                <Layout>
                  <DevReleases />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev/team"
              element={
                <Layout>
                  <DevTeam />
                </Layout>
              }
            />
            <Route
              path="/super-admin/db-migration"
              element={
                <Layout>
                  <DatabaseMigration />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-settings"
              element={
                <Layout>
                  <DevTaskSettings />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-task-integrations"
              element={
                <Layout>
                  <DevTaskIntegrations />
                </Layout>
              }
            />
            <Route
              path="/super-admin/external-api"
              element={
                <Layout>
                  <ExternalApiCredentialsPage />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-leaderboard"
              element={
                <Layout>
                  <DevLeaderboard />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-evaluations"
              element={
                <Layout>
                  <DevEvaluation />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-evaluations/member/:memberId"
              element={
                <Layout>
                  <DevEvaluationMember />
                </Layout>
              }
            />
            {/* Dev Goals (OKRs) Routes */}
            <Route
              path="/super-admin/dev-goals"
              element={
                <Layout>
                  <DevGoalsList />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-goals/new"
              element={
                <Layout>
                  <DevGoalForm />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-goals/alignment"
              element={
                <Layout>
                  <DevGoalAlignmentTree />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-goals/:id"
              element={
                <Layout>
                  <DevGoalDetails />
                </Layout>
              }
            />
            <Route
              path="/super-admin/dev-goals/:id/edit"
              element={
                <Layout>
                  <DevGoalForm />
                </Layout>
              }
            />
            {/* Super Admin Platform Management Routes */}
            <Route
              path="/super-admin/billing-overview"
              element={
                <Layout>
                  <BillingOverview />
                </Layout>
              }
            />
            <Route
              path="/super-admin/queue-monitor"
              element={
                <Layout>
                  <QueueMonitor />
                </Layout>
              }
            />
            <Route
              path="/super-admin/apps"
              element={
                <Layout>
                  <SubscriptionCenter />
                </Layout>
              }
            />
            <Route
              path="/super-admin/apps/:appId"
              element={
                <Layout>
                  <SuperAdminAppDetail />
                </Layout>
              }
            />
            <Route
              path="/super-admin/marketplace-coverage"
              element={
                <Layout fullWidth>
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                    <MarketplaceCoverageCenter />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route
              path="/super-admin/marketplace-management"
              element={<Navigate to="/super-admin/apps" replace />}
            />

            <Route
              path="/super-admin/partner-management"
              element={
                <Layout>
                  <PlatformPartnerManagement />
                </Layout>
              }
            />
            <Route
              path="/super-admin/ui-templates"
              element={
                <Layout>
                  <TemplateSettingsPage />
                </Layout>
              }
            />
            <Route
              path="/super-admin/pending-receipts"
              element={
                <Layout>
                  <PendingReceipts />
                </Layout>
              }
            />
            <Route
              path="/super-admin/payout-requests"
              element={
                <Layout>
                  <PayoutRequestsPage />
                </Layout>
              }
            />
            <Route
              path="/super-admin/storefront/tools"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route
              path="/super-admin/storefront/layout-studio"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route
              path="/super-admin/storefront/sf-library"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route
              path="/super-admin/storefront/structure-manager"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
              </>
            )}
            {/* Public Payment Routes */}
            <Route path="/payment/:invoiceId" element={<PaymentPage />} />
            <Route
              path="/checkout/messaging"
              element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>}>
                  <MessagingCheckout />
                </Suspense>
              }
            />
            <Route
              path="/subscription"
              element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>}>
                  <SubscriptionSuccess />
                </Suspense>
              }
            />
            {/* Protected Routes with ProtectedRoute component (handles auth internally) */}
            {/* Protected Routes - Only accessible when authenticated */}
            {isLoading ? (
              // While loading, don't render any routes to avoid race condition
              <Route
                path="*"
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                      <p className="mt-4 text-gray-600">...</p>
                    </div>
                  </div>
                }
              />
            ) : isAuthenticated ? (
              <>
                {/* Root redirect: check user's defaultPage preference */}
                <Route path="/" element={<DefaultPageRedirect />} />
                {/* App Dashboard Routes */}
                <Route
                  path="/company-dashboard"
                  element={
                    <Layout>
                      <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'TEAM_LEADER', 'MODERATOR', 'EMPLOYEE', 'ADMIN', 'HR_MANAGER', 'Team Lead', 'Project Manager', 'Developer', 'Tester', 'Agent', 'AGENT']}>
                        <MainDashboardPage />
                      </RoleProtectedRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/apps"
                  element={
                    <Layout>
                      <RoleProtectedRoute
                        allowedRoles={['COMPANY_ADMIN', 'OWNER', 'MANAGER', 'TEAM_LEADER', 'MODERATOR', 'EMPLOYEE', 'ADMIN', 'HR_MANAGER', 'Team Lead', 'Project Manager', 'Developer', 'Tester', 'Agent', 'AGENT']}
                        fallback={<Navigate to="/super-admin/dev-dashboard" replace />}
                      >
                        <div />
                      </RoleProtectedRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/apps/:appId"
                  element={
                    <Layout>
                      <RoleProtectedRoute
                        allowedRoles={['COMPANY_ADMIN', 'OWNER', 'MANAGER', 'TEAM_LEADER', 'MODERATOR', 'EMPLOYEE', 'ADMIN', 'HR_MANAGER', 'Team Lead', 'Project Manager', 'Developer', 'Tester', 'Agent', 'AGENT']}
                        fallback={<Navigate to="/super-admin/dev-dashboard" replace />}
                      >
                        <div />
                      </RoleProtectedRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/partner-dashboard"
                  element={
                    <Layout>
                      <PartnerDashboard />
                    </Layout>
                  }
                />
                {/* Agency OS Route */}
                <Route
                  path="/agency"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['marketing-agency-pro', 'agency-system']}>
                        <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                          <AgencyDashboard />
                        </React.Suspense>
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/agency/:tab"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['marketing-agency-pro', 'agency-system']}>
                        <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                          <AgencyDashboard />
                        </React.Suspense>
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                {/* Marketplace Routes */}
                <Route
                  path="/marketplace"
                  element={
                    <Layout>
                      <MarketplaceV2 />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/agents"
                  element={
                    <Layout fullWidth>
                      <AgentMarketplacePage />
                    </Layout>
                  }
                />
                <Route
                  path="/agents/market"
                  element={<Navigate to="/marketplace/agents" replace />}
                />
                <Route
                  path="/mindmap"
                  element={
                    <Layout>
                      <MindMapPage />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/v2"
                  element={<Navigate to="/marketplace" replace />}
                />
                <Route
                  path="/marketplace/downloads"
                  element={
                    <Layout>
                      <AppDownloadsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/apps/downloads"
                  element={<Navigate to="/marketplace/downloads" replace />}
                />
                <Route
                  path="/marketplace/themes"
                  element={
                    <Layout>
                      <StorefrontThemesMarketplace />
                    </Layout>
                  }
                />
                <Route
                  path="/templates"
                  element={<Navigate to="/marketplace/themes" replace />}
                />
                <Route
                  path="/marketplace/bundles"
                  element={
                    <Layout>
                      <Bundles />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/bundle/:slug"
                  element={
                    <Layout>
                      <BundleDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/compare"
                  element={
                    <Layout>
                      <CompareApps />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/:slug"
                  element={
                    <Layout>
                      <AppDetails />
                    </Layout>
                  }
                />
                {/* My Apps (Installed) */}
                <Route
                  path="/my-apps"
                  element={
                    <Layout>
                      <MyApps />
                    </Layout>
                  }
                />
                {/* Marketplace Audit / History Log */}
                <Route
                  path="/marketplace/history"
                  element={
                    <Layout>
                      <AppHistoryPage />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/logs"
                  element={<Navigate to="/marketplace/history" replace />}
                />
                <Route
                  path="/my-apps/history"
                  element={<Navigate to="/marketplace/history" replace />}
                />
                <Route
                  path="/my-apps/logs"
                  element={<Navigate to="/marketplace/history" replace />}
                />
                {/* App Management Routes */}
                <Route
                  path="/my-apps/:slug/upgrade"
                  element={
                    <Layout>
                      <AppDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/my-apps/quantity-offers-pro/settings"
                  element={<Navigate to="/products" replace />}
                />
                <Route
                  path="/marketplace/quantity-offers-pro/settings"
                  element={<Navigate to="/products" replace />}
                />
                <Route
                  path="/marketplace/apps/quantity-offers-pro/settings"
                  element={<Navigate to="/products" replace />}
                />
                <Route
                  path="/my-apps/:slug/settings"
                  element={
                    <Layout>
                      <AppSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/:slug/settings"
                  element={
                    <Layout>
                      <AppSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/apps/:slug"
                  element={
                    <Layout>
                      <AppDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/apps/:slug/settings"
                  element={
                    <Layout>
                      <AppSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/marketplace/wallet"
                  element={<Navigate to="/payments" replace />}
                />
                <Route
                  path="/subscription/pricing"
                  element={
                    <Layout>
                      <AppPricingSheet />
                    </Layout>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerList />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/new"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.create']}>
                      <Layout>
                        <CustomerCreate />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/lists"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerLists />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/leads"
                  element={
                    <Layout>
                      <LeadsList />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/whatsapp-notify"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerWhatsAppNotify />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/product-offers"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <ProductOffers />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/birthday-whatsapp-notify"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerBirthdayWhatsAppNotify />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/occasions-notify"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerOccasionsWhatsAppNotify />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/:id"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerDetails />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/:id/edit"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.edit']}>
                      <Layout>
                        <CustomerEdit />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/:id/portal"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerPortalView />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/wallet"
                  element={
                    <Layout>
                      <CustomerWalletRouteEntry />
                    </Layout>
                  }
                />
                <Route
                  path="/conversations"
                  element={<Navigate to="/facebook-inbox" replace />}
                />
                <Route
                  path="/conversations-improved"
                  element={<Navigate to="/facebook-inbox" replace />}
                />
                <Route
                  path="/sent-messages-stats"
                  element={
                    <Layout>
                      <SentMessagesStats />
                    </Layout>
                  }
                />
                <Route
                  path="/campaign-calculator"
                  element={
                    <Layout>
                      <CampaignPredictionCalculator />
                    </Layout>
                  }
                />
                <Route
                  path="/tools/break-even"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['project-break-even-calculator', 'store-pro']}>
                        <ProjectBreakEvenCalculator />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/product-break-even"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['product-break-even-calculator', 'store-pro']}>
                        <ProductBreakEvenCalculator />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/profitability-engine"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['profitability-engine', 'store-pro']}>
                        <ProfitabilityEngine />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/pricing-strategy"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['pricing-strategy-calculator', 'store-pro']}>
                        <PricingStrategyCalculator />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/ad-budget-planner"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['ad-budget-planner', 'marketing-agency-pro']}>
                        <AdBudgetPlanner />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/discount-impact"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['discount-impact-calculator', 'store-pro']}>
                        <DiscountImpactCalculator />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/shipping-optimizer"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['shipping-optimizer', 'store-pro']}>
                        <ShippingOptimizer />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/monthly-pnl"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['monthly-pnl-calculator', 'store-pro']}>
                        <MonthlyPnLDashboard />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/clv-calculator"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['clv-calculator', 'store-pro']}>
                        <CLVCalculator />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/upsell-planner"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['upsell-planner', 'store-pro']}>
                        <UpsellPlanner />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tools/refund-rate"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['refund-rate-calculator', 'store-pro']}>
                        <RefundRateCalculator />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/facebook-inbox"
                  element={
                    <Layout>
                      <FacebookInbox />
                    </Layout>
                  }
                />
                <Route
                  path="/instagram-inbox"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['instagram-business']}>
                        <InstagramInbox />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tiktok-inbox"
                  element={
                    <Layout>
                      <TikTokInbox />
                    </Layout>
                  }
                />
                <Route
                  path="/unified-inbox"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['unified-inbox', 'whatsapp-business']}>
                        <UnifiedInbox />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/unified-inbox/connections"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['unified-inbox', 'whatsapp-business']}>
                        <PlatformConnections />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/routing"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <InboxPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/routing/:sessionId"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <InboxPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp-chat/:conversationId"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <InboxChat />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/moderator-dashboard"
                  element={
                    <Layout>
                      <ModeratorDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/whatsapp-numbers"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppRoutingWorkspace />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/settings/roles"
                  element={<Navigate to="/roles" replace />}
                />
                <Route
                  path="/settings/inbox"
                  element={<Navigate to="/whatsapp/routing" replace />}
                />
                <Route
                  path="/coupons"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['coupons-pro', 'store-pro', 'store']}>
                        <Coupons />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/offers-review"
                  element={
                    <Layout>
                      <OffersReview />
                    </Layout>
                  }
                />
                <Route
                  path="/appointments"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['booking-app', 'service-request-app', 'booking-appointments']}>
                        <Appointments />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/projects"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/categories"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/integrations"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/settings"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/dashboard"
                  element={
                    <Layout>
                      <TasksDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/kanban"
                  element={
                    <Layout>
                      <KanbanBoard />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/notifications"
                  element={
                    <Layout>
                      <TaskNotifications />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/calendar"
                  element={
                    <Layout>
                      <CalendarView />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/time-reports"
                  element={
                    <Layout>
                      <TimeReports />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/templates"
                  element={
                    <Layout>
                      <TaskTemplates />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/:id"
                  element={
                    <Layout>
                      <TaskDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/reports/shipping"
                  element={
                    <Layout>
                      <ShippingReport />
                    </Layout>
                  }
                />
                <Route
                  path="/pos"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['pos-pro', 'store-pro']}>
                        <PosPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <Layout>
                      <CustomerPayments />
                    </Layout>
                  }
                />
                <Route
                  path="/broadcast"
                  element={
                    <Layout>
                      <BroadcastDashboard />
                    </Layout>
                  }
                />
                {/* Advertising Routes */}
                <Route
                  path="/advertising/facebook-pixel"
                  element={
                    <Layout>
                      <FacebookPixelSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/google-tag-manager"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['google-tag-manager']}>
                        <GoogleTagManagerSettings />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/google-analytics"
                  element={
                    <Layout>
                      <GoogleAnalyticsSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads"
                  element={
                    <Layout>
                      <FacebookAdsDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/marketing-studio"
                  element={
                    <Layout>
                      <MarketingAiStudioPage />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/creative-studio"
                  element={
                    <Layout fullWidth>
                      <CreativeAiStudioPage />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/connection"
                  element={
                    <Layout>
                      <FacebookAdsConnection />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/campaigns"
                  element={
                    <Layout>
                      <FacebookAdsDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/ad-library"
                  element={
                    <Layout>
                      <AdLibraryResearch />
                    </Layout>
                  }
                />

                <Route
                  path="/advertising/product-landing-pages"
                  element={
                    <Layout fullWidth>
                      <ProductLandingPages />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/landing-builder"
                  element={
                    <Layout fullWidth>
                      <ProductLandingPages />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/funnel-wizard"
                  element={
                    <Layout>
                      <FunnelWizardPage />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/campaigns/create"
                  element={
                    <Layout>
                      <CreateCampaign />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/create-ad"
                  element={
                    <Layout>
                      <CreateAdWizard />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/create-full-ad"
                  element={
                    <Layout>
                      <CreateAdWizard />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/campaigns/:id"
                  element={
                    <Layout>
                      <CampaignDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/ads/:adId"
                  element={
                    <Layout>
                      <AdDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/campaigns/:campaignId/adsets/create"
                  element={
                    <Layout>
                      <CreateAdSet />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/adsets/:adSetId/ads/create"
                  element={
                    <Layout>
                      <CreateAd />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/catalogs"
                  element={
                    <Layout>
                      <CatalogsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/catalogs/:id"
                  element={
                    <Layout>
                      <CatalogDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/catalogs/create"
                  element={
                    <Layout>
                      <CreateCatalog />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/overlay-campaigns"
                  element={
                    <Layout>
                      <OverlayCampaigns />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/overlay-campaigns/:id"
                  element={
                    <Layout>
                      <OverlayCampaignDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/adsets/:adSetId/dynamic-ads/create"
                  element={
                    <Layout>
                      <CreateDynamicAd />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/tests"
                  element={
                    <Layout>
                      <ABTestsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/tests/create"
                  element={
                    <Layout>
                      <CreateABTest />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/tests/:id"
                  element={
                    <Layout>
                      <ABTestDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/audiences"
                  element={
                    <Layout>
                      <AudiencesManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/audiences/custom/create"
                  element={
                    <Layout>
                      <CreateCustomAudience />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/audiences/custom/:id"
                  element={
                    <Layout>
                      <CustomAudienceDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/audiences/lookalike/create"
                  element={
                    <Layout>
                      <CreateLookalikeAudience />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/automation-rules"
                  element={
                    <Layout>
                      <AutomationRules />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/decision-reports"
                  element={
                    <Layout>
                      <MediaBuyingReports />
                    </Layout>
                  }
                />

                <Route
                  path="/advertising/facebook-ads/lead-forms"
                  element={
                    <Layout>
                      <LeadFormsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/dco"
                  element={
                    <Layout>
                      <DynamicCreativeOptimization />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/advantage-plus"
                  element={
                    <Layout>
                      <AdvantagePlusShopping />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/conversions"
                  element={
                    <Navigate to="/advertising/facebook-pixel" replace />
                  }
                />
                <Route
                  path="/advertising/facebook-ads/creative-formats"
                  element={
                    <Navigate to="/advertising/facebook-ads" replace />
                  }
                />
                <Route
                  path="/advertising/facebook-ads/ad-preview"
                  element={
                    <Layout>
                      <AdPreview />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/saved-audiences"
                  element={
                    <Layout>
                      <SavedAudiences />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/attribution"
                  element={
                    <Layout>
                      <AttributionSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/diagnosis"
                  element={<NavigateFacebookAdsDiagnosis />}
                />
                <Route
                  path="/advertising/facebook-ads/budget-alerts"
                  element={
                    <Layout>
                      <BudgetAlertsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/geo"
                  element={
                    <Layout>
                      <FacebookAdsGeoPage />
                    </Layout>
                  }
                />
                <Route
                  path="/reminders"
                  element={
                    <Layout>
                      <Reminders />
                    </Layout>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <Layout>
                      <Notifications />
                    </Layout>
                  }
                />
                <Route
                  path="/notification-settings"
                  element={
                    <Layout>
                      <NotificationSettings />
                    </Layout>
                  }
                />


                <Route
                  path="/monitor-reports"
                  element={
                    <Layout>
                      <ReportsPage />
                    </Layout>
                  }
                />
                
                <Route
                  path="/company-links"
                  element={<Navigate to="/my-companies/links" replace />}
                />
                <Route
                  path="/my-companies/links"
                  element={
                    <Layout>
                      <CompanyLinks />
                    </Layout>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <Layout fullWidth>
                      <Profile />
                    </Layout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Layout>
                      <Settings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/company"
                  element={
                    <Layout>
                      <CompanySettingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/:tab"
                  element={
                    <Layout>
                      <Settings />
                    </Layout>
                  }
                />
                <Route
                  path="/facebook/create-post"
                  element={
                    <Layout>
                      <FacebookPostCreator />
                    </Layout>
                  }
                />
                <Route
                  path="/facebook/posts"
                  element={
                    <Layout>
                      <FacebookPostManager />
                    </Layout>
                  }
                />
                <Route
                  path="/my-companies"
                  element={<Navigate to="/my-companies/links" replace />}
                />
                <Route
                  path="/companies"
                  element={
                    <Layout>
                      <RoleProtectedRoute
                        allowedRoles={['SUPER_ADMIN']}
                        fallback={<Navigate to="/my-companies/links" replace />}
                      >
                        <CompaniesManagement />
                      </RoleProtectedRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <Layout>
                      <UsersManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/employee-stats"
                  element={
                    <Layout>
                      <EmployeeStatsReport />
                    </Layout>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <Layout>
                      <RolesManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/comments/:id"
                  element={
                    <Layout>
                      <CommentDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/comments/settings"
                  element={
                    <Layout>
                      <CommentSettings />
                    </Layout>
                  }
                />
                {/* Unified Comments Management Routes */}
                <Route
                  path="/unified-comments"
                  element={
                    <Layout>
                      <PostsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/unified-comments-split"
                  element={
                    <Layout>
                      <UnifiedCommentsSplit />
                    </Layout>
                  }
                />
                <Route
                  path="/unified-comments/:postId"
                  element={
                    <Layout>
                      <UnifiedCommentsManagement />
                    </Layout>
                  }
                />
                {/* Posts Management Routes */}
                <Route
                  path="/posts"
                  element={
                    <Layout>
                      <PostsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/posts/:postId/settings"
                  element={
                    <Layout>
                      <PostSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/posts/:postId/comments"
                  element={
                    <Layout>
                      <PostComments />
                    </Layout>
                  }
                />
                <Route
                  path="/messenger-chat"
                  element={
                    <Layout>
                      <MessengerChat />
                    </Layout>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.view']}>
                      <Layout>
                        <Products />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/products/trash"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.view']}>
                      <Layout>
                        <ProductsTrash />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/products/new"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.create']}>
                      <Layout>
                        <ProductNewFinal />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/products/reviews"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['orders.product-reviews.view']}>
                      <Layout>
                        <ProductReviewsSimple />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/products/import-easy-orders"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.view']}>
                      <Layout>
                        <EasyOrdersImport />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/products/import-woocommerce"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.view']}>
                      <Layout>
                        <WooCommerceImport />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/articles"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.view']}>
                      <Layout>
                        <ArticlesList />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/articles/new"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.create']}>
                      <Layout>
                        <ArticleEditor />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/articles/:id"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.view']}>
                      <Layout>
                        <ArticleEditor />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/products/:id"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.view']}>
                      <Layout>
                        <ProductStoreRedirect />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/products/:id/edit"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['products.edit']}>
                      <Layout>
                        <ProductNewFinal />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                {/* Platform Integrations */}
                <Route
                  path="/platform-integrations"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['woocommerce-pro', 'webhooks-pro']}>
                        <PlatformIntegrations />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tiktok/publish"
                  element={
                    <Layout>
                      <TikTokPublish />
                    </Layout>
                  }
                />
                <Route
                  path="/tiktok/shop"
                  element={
                    <Layout>
                      <TikTokShop />
                    </Layout>
                  }
                />
                <Route
                  path="/tiktok/settings"
                  element={
                    <Layout>
                      <TikTokSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/categories"
                  element={
                    <Layout>
                      <Categories />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors"
                  element={
                    <Layout>
                      <CompetitorList />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/add"
                  element={
                    <Layout>
                      <CompetitorAdd />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/:id/edit"
                  element={
                    <Layout>
                      <CompetitorAdd />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/:id"
                  element={
                    <Layout>
                      <CompetitorDetail />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/:competitorId/products/:productId/price-history"
                  element={
                    <Layout>
                      <CompetitorPriceHistory />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/:id/price-compare"
                  element={
                    <Layout>
                      <CompetitorComparison />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/gap-analysis"
                  element={
                    <Layout>
                      <CompetitorGapAnalysis />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/reports"
                  element={
                    <Layout>
                      <CompetitorReportsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/settings"
                  element={
                    <Layout>
                      <CompetitorSettingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/auto-discover"
                  element={
                    <Layout>
                      <CompetitorAutoDiscover />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/:competitorId/battlecard"
                  element={
                    <Layout>
                      <CompetitorBattlecard />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/:competitorId/social"
                  element={
                    <Layout>
                      <SocialOverview />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/:competitorId/ads"
                  element={
                    <Layout>
                      <AdIntelligence />
                    </Layout>
                  }
                />
                <Route
                  path="/competitors/:competitorId/platforms"
                  element={
                    <Layout>
                      <PlatformOverview />
                    </Layout>
                  }
                />
                {/* Amazon Affiliate Routes */}
                <Route
                  path="/amazon-affiliate/settings"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['amazon-affiliate-pro']}>
                        <AmazonAffiliateSettings />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/amazon-affiliate/import"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['amazon-affiliate-pro']}>
                        <AmazonAffiliateImport />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/amazon-affiliate/products"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['amazon-affiliate-pro']}>
                        <AmazonAffiliateProducts />
                      </AppAccessRoute>
                    </Layout>
                  }
                />

                {/* Affiliate Routes */}
                <Route
                  path="/affiliates/management/:id"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateProfile />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/management"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliatesManagement />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/quick-actions"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateQuickActions />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/settings"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateSystemSettings />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/register"
                  element={
                    <Layout>
                      <AffiliateRegister />
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/dashboard"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateDashboard />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/orders"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateOrders />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/orders/:orderId"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateOrderDetails />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/orders/create"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <ManualOrderPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/customers"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateCustomers />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/referrals"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateReferrals />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/products"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateProducts />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/commission"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateCommission />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/affiliates/products/visibility"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['affiliate-pro']}>
                        <AffiliateProductsVisibility />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/company-affiliates"
                  element={
                    <Layout>
                      <CompanyAffiliateDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/company-affiliates/consumer/:connectionId"
                  element={
                    <Layout>
                      <CompanyConsumerDetail />
                    </Layout>
                  }
                />
                <Route
                  path="/company-affiliates/provider/:connectionId"
                  element={
                    <Layout>
                      <CompanyProviderDetail />
                    </Layout>
                  }
                />
                {/* Merchant Portal */}
                <Route
                  path="/merchant-portal/products"
                  element={<Navigate to="/products" replace />}
                />
                <Route
                  path="/merchant-portal/orders"
                  element={<Navigate to="/orders" replace />}
                />
                <Route
                  path="/merchant-portal/*"
                  element={
                    <Layout>
                      <MerchantPortalDashboard />
                    </Layout>
                  }
                />
                {/* Merchant Routes */}
                <Route
                  path="/merchants"
                  element={
                    <Layout>
                      <MerchantsList />
                    </Layout>
                  }
                />
                <Route
                  path="/merchants/new"
                  element={
                    <Layout>
                      <MerchantRegister />
                    </Layout>
                  }
                />
                <Route
                  path="/merchants/:id"
                  element={
                    <Layout>
                      <MerchantProfileDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/merchants/:id/edit"
                  element={
                    <Layout>
                      <MerchantProfile />
                    </Layout>
                  }
                />
                {/* Platform Management Routes */}
                <Route
                  path="/platform/commissions"
                  element={
                    <Layout>
                      <CommissionsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <Layout>
                      <Orders />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/activity-log"
                  element={
                    <Layout>
                      <OrderActivityLogPage />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/automation"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['order-automation']}>
                        <OrderStatusAutomationPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/status-templates"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business']}>
                        <OrderStatusTemplatesPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/workspace"
                  element={
                    <Layout>
                      <AgentWorkspace />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/confirmations"
                  element={<Navigate to="/orders/workspace?tab=confirmation" replace />}
                />
                <Route
                  path="/orders/preparation"
                  element={
                    <Layout>
                      <PreparationQueue />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/preparation-hold"
                  element={<Navigate to="/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP" replace />}
                />
                <Route
                  path="/orders/preparation/on-hold"
                  element={<Navigate to="/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP" replace />}
                />
                <Route
                  path="/apps/order-preparation-hold"
                  element={<Navigate to="/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP" replace />}
                />
                <Route
                  path="/apps/order-preparation"
                  element={<Navigate to="/orders/preparation" replace />}
                />
                <Route
                  path="/orders/incomplete"
                  element={
                    <Layout>
                      <IncompleteOrders />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/incomplete/reports"
                  element={
                    <Layout>
                      <IncompleteReports />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/incomplete/report"
                  element={
                    <Navigate to="/orders/incomplete/reports" replace />
                  }
                />
                <Route
                  path="/orders/incomplete/:cartId"
                  element={
                    <Layout>
                      <IncompleteOrderDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/analytics"
                  element={
                    <Layout fullWidth>
                      <OrdersAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/products/products-availability"
                  element={
                    <Layout>
                      <PermissionProtectedRoute requiredPermissions={['products.view']}>
                        <ProductAvailabilityGrid />
                      </PermissionProtectedRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/woocommerce-sync"
                  element={
                    <Layout>
                      <WooCommerceSync />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/shipments"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={SHIPPING_APP_ACCESS_SLUGS}>
                        <UnifiedShipmentsPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/turbo-records"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={SHIPPING_APP_ACCESS_SLUGS}>
                        <UnifiedShipmentsPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/bosta-records"
                  element={
                    <Layout>
                      <UnifiedShipmentsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/turbo-captains"
                  element={
                    <Layout>
                      <TurboCaptains />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/turbo-captains/:name"
                  element={
                    <Layout>
                      <TurboCaptainDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/bulk"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['bulk-orders']}>
                        <BulkOrders />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/quick-status"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['quick-status']}>
                        <QuickStatusChange />
                      </AppAccessRoute>
                    </Layout>
                  }
                />

                <Route
                  path="/orders/:id"
                  element={
                    <Layout>
                      <OrderDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/invoices"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['order-invoicing', 'store-pro']}>
                        <OrderInvoices />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/invoice/:invoiceId"
                  element={<OrderInvoice />}
                />
                <Route
                  path="/orders/invoices/print-multiple"
                  element={<PrintMultipleInvoices />}
                />
                <Route
                  path="/returns"
                  element={
                    <Layout>
                      <PermissionProtectedRoute requiredPermissions={['orders.returns.view']}>
                        <ReturnManagementPage />
                      </PermissionProtectedRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/returns/settings"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['returns-settings', 'store-pro']}>
                        <PermissionProtectedRoute requiredPermissions={['orders.return-settings.view']}>
                          <ReturnSettingsPage />
                        </PermissionProtectedRoute>
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/returns/employee-performance"
                  element={
                    <Layout>
                      <PermissionProtectedRoute requiredPermissions={['orders.returns.view']}>
                        <ReturnEmployeePerformance />
                      </PermissionProtectedRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/cancellations/settings"
                  element={<Navigate to="/settings/orders?tab=cancellation_reasons" replace />}
                />
                <Route
                  path="/bulk-search"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['bulk-search']}>
                        <BulkSearchPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/manual"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['manual-orders-pro', 'store-pro']}>
                        <ManualOrderPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/orders/status-summary"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['status-summary']}>
                        <StatusSummaryReport />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                {/* Procurement/Purchasing Routes */}
                <Route
                  path="/procurement"
                  element={<Navigate to="/procurement/dashboard" replace />}
                />
                <Route
                  path="/procurement/dashboard"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <ProcurementDashboard />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/suppliers"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <Suppliers />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/suppliers/:id"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <SupplierDetails />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/purchase-orders"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <PurchaseOrders />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/purchase-orders/new"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <PurchaseOrderForm />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/purchase-orders/:id/edit"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <PurchaseOrderForm />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/purchase-orders/:id"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <PurchaseOrders />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/purchase-invoices"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <PurchaseInvoices />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/purchase-invoices/new"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <PurchaseInvoiceForm />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/purchase-invoices/:id/edit"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <PurchaseInvoiceForm />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/purchase-invoices/:id"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <PurchaseInvoices />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/supplier-payments"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <SupplierPayments />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/supplier-payments/new"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <SupplierPaymentForm />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/procurement/supplier-payments/:id"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['procurement-pro', 'store-pro']}>
                        <SupplierPaymentForm />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                {/* Cafe & Restaurant Pro Routes */}
                <Route
                  path="/cafe"
                  element={<Navigate to="/cafe/recipes" replace />}
                />
                <Route
                  path="/cafe/recipes"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['cafe-restaurant-pro']}>
                        <RecipeManagementPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/cafe/audits"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['cafe-restaurant-pro']}>
                        <StockCountSessionPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/cafe/modifiers"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['cafe-restaurant-pro']}>
                        <ModifiersManagementPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/cafe/waste"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['cafe-restaurant-pro']}>
                        <WasteTrackingPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                {/* Wholesale Routes */}
                <Route
                  path="/wholesale/dashboard"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['wholesale-pro']}>
                        <WholesaleDashboard />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/wholesale/price-lists"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['wholesale-pro']}>
                        <WholesalePriceLists />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/wholesale/price-lists/new"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['wholesale-pro']}>
                        <WholesalePriceListDetail />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/wholesale/price-lists/:id"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['wholesale-pro']}>
                        <WholesalePriceListDetail />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/wholesale/customers"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['wholesale-pro']}>
                        <WholesaleCustomers />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/wholesale/customers/:id"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['wholesale-pro']}>
                        <WholesaleCustomerDetail />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/wholesale/statements"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['wholesale-pro']}>
                        <WholesaleStatements />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/wholesale/debts"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['wholesale-pro']}>
                        <WholesaleDebts />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                {/* Orders Analytics Routes */}
                <Route
                  path="/analytics/orders"
                  element={
                    <Layout>
                      <OrdersOverviewDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/orders"
                  element={
                    <Layout>
                      <OrdersAnalyticsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/revenue"
                  element={
                    <Layout>
                      <RevenueAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/products"
                  element={
                    <Layout>
                      <ProductsAnalyticsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/variations"
                  element={
                    <Layout>
                      <VariationsAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/categories"
                  element={
                    <Layout>
                      <CategoriesAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/coupons"
                  element={
                    <Layout>
                      <CouponsAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/taxes"
                  element={
                    <Layout>
                      <TaxesAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/downloads"
                  element={
                    <Layout>
                      <DownloadsAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/stock"
                  element={
                    <Layout>
                      <StockAnalyticsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/customers"
                  element={
                    <Layout>
                      <CustomerAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/payments"
                  element={
                    <Layout>
                      <PaymentMethodAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/campaign-attribution"
                  element={
                    <Layout>
                      <CampaignAttributionAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/profit"
                  element={
                    <Layout>
                      <ProfitAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/cod-performance"
                  element={
                    <Layout>
                      <CODPerformanceAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/today-ops"
                  element={
                    <Layout>
                      <TodayOps />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/status-analysis"
                  element={
                    <Layout>
                      <OrderStatusAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/status-movement"
                  element={
                    <Layout>
                      <OrderMovementPage />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/cancellations"
                  element={
                    <Layout>
                      <CancellationAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/delivery-rate"
                  element={
                    <Layout>
                      <DeliveryRateAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/fulfillment"
                  element={
                    <Layout>
                      <ProductFulfillmentAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/delivery-returns"
                  element={
                    <Layout>
                      <DeliveryReturnsAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/product-delivery-returns"
                  element={
                    <Layout>
                      <ProductDeliveryReturnsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/regions"
                  element={
                    <Layout>
                      <RegionAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/returns"
                  element={
                    <Layout>
                      <ReturnsAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/returns-reasons"
                  element={
                    <Layout>
                      <ReturnReasonsAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/funnel"
                  element={<Navigate to="/analytics/store" replace />}
                />
                <Route
                  path="/analytics/orders/conversion"
                  element={<Navigate to="/analytics/store" replace />}
                />
                <Route
                  path="/analytics/orders/team-performance"
                  element={
                    <Layout>
                      <TeamPerformanceAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics/orders/abandoned-cart"
                  element={
                    <Layout>
                      <AbandonedCartAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/coupons"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['coupons-pro', 'store-pro', 'store']}>
                        <Coupons />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/appointments"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['booking-app', 'service-request-app', 'booking-appointments']}>
                        <Appointments />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/projects"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/categories"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/integrations"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/settings"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/dashboard"
                  element={
                    <Layout>
                      <TasksDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/kanban"
                  element={
                    <Layout>
                      <KanbanBoard />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/notifications"
                  element={
                    <Layout>
                      <TaskNotifications />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/calendar"
                  element={
                    <Layout>
                      <CalendarView />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/time-reports"
                  element={
                    <Layout>
                      <TimeReports />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/templates"
                  element={
                    <Layout>
                      <TaskTemplates />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/:id"
                  element={
                    <Layout>
                      <TaskDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/reports/profit-loss"
                  element={
                    <Layout>
                      <ProfitLossReport />
                    </Layout>
                  }
                />
                <Route
                  path="/reports/status-analysis"
                  element={
                    <Layout>
                      <StatusAnalysisReport />
                    </Layout>
                  }
                />
                <Route
                  path="/reports/product-delivery-returns"
                  element={
                    <Layout>
                      <ProductDeliveryReturnsPage />
                    </Layout>
                  }
                />
                {/* <Route path="/reports/shipping" element={<Layout><ShippingReport /></Layout>} /> */}
                <Route
                  path="/analytics/store"
                  element={
                    <Layout>
                      <StoreAnalyticsDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/pos"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['pos-pro', 'store-pro']}>
                        <PosPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/treasury-expenses"
                  element={
                    <Layout>
                      <TreasuryExpensesPage />
                    </Layout>
                  }
                />
                <Route
                  path="/treasury"
                  element={<Navigate to="/treasury-expenses?tab=treasury" replace />}
                />
                <Route
                  path="/expenses"
                  element={<Navigate to="/treasury-expenses?tab=expenses" replace />}
                />
                <Route
                  path="/settings/facebook-oauth"
                  element={
                    <Layout>
                      <FacebookOAuth />
                    </Layout>
                  }
                />
                <Route
                  path="/orders/stats"
                  element={
                    <Layout>
                      <OrderStats />
                    </Layout>
                  }
                />
                {/* <Route path="/opportunities" element={<Layout><Opportunities /></Layout>} /> */}
                <Route
                  path="/inventory/studio"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['inventory-pro', 'multi-warehouse-pro', 'store-pro', 'store']}>
                        <InventoryAiStudioPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/products/studio"
                  element={<Navigate to="/inventory/studio" replace />}
                />
                <Route
                  path="/inventory"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['inventory-pro', 'multi-warehouse-pro', 'store-pro', 'store']}>
                        <Inventory />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/inventory/analytics"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['inventory-pro', 'multi-warehouse-pro', 'store-pro', 'store']}>
                        <InventoryAnalytics />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/inventory/warehouses"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['inventory-pro', 'multi-warehouse-pro', 'store-pro', 'store']}>
                        <WarehouseManagement />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/inventory/audits"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['inventory-pro', 'multi-warehouse-pro', 'store-pro', 'store']}>
                        <InventoryAudits />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/inventory/reorder-points"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['inventory-pro', 'multi-warehouse-pro', 'store-pro', 'store']}>
                        <ReorderPointsPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/inventory/reports"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['inventory-pro', 'multi-warehouse-pro', 'store-pro', 'store']}>
                        <InventoryReports />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/coupons"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['coupons-pro', 'store-pro', 'store']}>
                        <Coupons />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/appointments"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['booking-app', 'service-request-app', 'booking-appointments']}>
                        <Appointments />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/projects"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/categories"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/integrations"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/settings"
                  element={
                    <Layout>
                      <Tasks />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/dashboard"
                  element={
                    <Layout>
                      <TasksDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/kanban"
                  element={
                    <Layout>
                      <KanbanBoard />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/notifications"
                  element={
                    <Layout>
                      <TaskNotifications />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/calendar"
                  element={
                    <Layout>
                      <CalendarView />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/time-reports"
                  element={
                    <Layout>
                      <TimeReports />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/templates"
                  element={
                    <Layout>
                      <TaskTemplates />
                    </Layout>
                  }
                />
                <Route
                  path="/tasks/:id"
                  element={
                    <Layout>
                      <TaskDetails />
                    </Layout>
                  }
                />
                {/* <Route path="/reports/shipping" element={<Layout><ShippingReport /></Layout>} /> */}
                <Route
                  path="/pos"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['pos-pro', 'store-pro']}>
                        <PosPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <Layout>
                      <CustomerPayments />
                    </Layout>
                  }
                />
                <Route
                  path="/subscription/pricing"
                  element={
                    <Layout>
                      <AppPricingSheet />
                    </Layout>
                  }
                />
                <Route
                  path="/broadcast"
                  element={
                    <Layout>
                      <BroadcastDashboard />
                    </Layout>
                  }
                />
                {/* Advertising Routes */}
                <Route
                  path="/advertising/facebook-pixel"
                  element={
                    <Layout>
                      <FacebookPixelSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/google-tag-manager"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['google-tag-manager']}>
                        <GoogleTagManagerSettings />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/google-analytics"
                  element={
                    <Layout>
                      <GoogleAnalyticsSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads"
                  element={
                    <Layout>
                      <FacebookAdsDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/marketing-studio"
                  element={
                    <Layout>
                      <MarketingAiStudioPage />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/creative-studio"
                  element={
                    <Layout fullWidth>
                      <CreativeAiStudioPage />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/connection"
                  element={
                    <Layout>
                      <FacebookAdsConnection />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/campaigns"
                  element={
                    <Layout>
                      <FacebookAdsDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/ad-library"
                  element={
                    <Layout>
                      <AdLibraryResearch />
                    </Layout>
                  }
                />

                <Route
                  path="/advertising/product-landing-pages"
                  element={
                    <Layout fullWidth>
                      <ProductLandingPages />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/landing-builder"
                  element={
                    <Layout fullWidth>
                      <ProductLandingPages />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/funnel-wizard"
                  element={
                    <Layout>
                      <FunnelWizardPage />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/campaigns/create"
                  element={
                    <Layout>
                      <CreateCampaign />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/create-ad"
                  element={
                    <Layout>
                      <CreateAdWizard />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/create-full-ad"
                  element={
                    <Layout>
                      <CreateAdWizard />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/campaigns/:id"
                  element={
                    <Layout>
                      <CampaignDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/ads/:adId"
                  element={
                    <Layout>
                      <AdDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/campaigns/:campaignId/adsets/create"
                  element={
                    <Layout>
                      <CreateAdSet />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/adsets/:adSetId/ads/create"
                  element={
                    <Layout>
                      <CreateAd />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/catalogs"
                  element={
                    <Layout>
                      <CatalogsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/catalogs/:id"
                  element={
                    <Layout>
                      <CatalogDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/catalogs/create"
                  element={
                    <Layout>
                      <CreateCatalog />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/adsets/:adSetId/dynamic-ads/create"
                  element={
                    <Layout>
                      <CreateDynamicAd />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/tests"
                  element={
                    <Layout>
                      <ABTestsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/tests/create"
                  element={
                    <Layout>
                      <CreateABTest />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/tests/:id"
                  element={
                    <Layout>
                      <ABTestDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/audiences"
                  element={
                    <Layout>
                      <AudiencesManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/audiences/custom/create"
                  element={
                    <Layout>
                      <CreateCustomAudience />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/audiences/custom/:id"
                  element={
                    <Layout>
                      <CustomAudienceDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/audiences/lookalike/create"
                  element={
                    <Layout>
                      <CreateLookalikeAudience />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/automation-rules"
                  element={
                    <Layout>
                      <AutomationRules />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/decision-reports"
                  element={
                    <Layout>
                      <MediaBuyingReports />
                    </Layout>
                  }
                />

                <Route
                  path="/advertising/facebook-ads/lead-forms"
                  element={
                    <Layout>
                      <LeadFormsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/dco"
                  element={
                    <Layout>
                      <DynamicCreativeOptimization />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/advantage-plus"
                  element={
                    <Layout>
                      <AdvantagePlusShopping />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/conversions"
                  element={
                    <Navigate to="/advertising/facebook-pixel" replace />
                  }
                />
                <Route
                  path="/advertising/facebook-ads/creative-formats"
                  element={
                    <Navigate to="/advertising/facebook-ads" replace />
                  }
                />
                <Route
                  path="/advertising/facebook-ads/ad-preview"
                  element={
                    <Layout>
                      <AdPreview />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/saved-audiences"
                  element={
                    <Layout>
                      <SavedAudiences />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/attribution"
                  element={
                    <Layout>
                      <AttributionSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/diagnosis"
                  element={<NavigateFacebookAdsDiagnosis />}
                />
                <Route
                  path="/advertising/facebook-ads/budget-alerts"
                  element={
                    <Layout>
                      <BudgetAlertsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/advertising/facebook-ads/geo"
                  element={
                    <Layout>
                      <FacebookAdsGeoPage />
                    </Layout>
                  }
                />
                <Route
                  path="/reminders"
                  element={
                    <Layout>
                      <Reminders />
                    </Layout>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <Layout>
                      <Notifications />
                    </Layout>
                  }
                />
                <Route
                  path="/notification-settings"
                  element={
                    <Layout>
                      <NotificationSettings />
                    </Layout>
                  }
                />


                <Route
                  path="/monitor-reports"
                  element={
                    <Layout>
                      <ReportsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Layout>
                      <Settings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/customer-blocks"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['customer-blocks']}>
                        <CustomerBlockSettings />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/settings/orders"
                  element={
                    <Layout fullWidth>
                      <OrderSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/order-invoice"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['order-invoicing', 'store-pro']}>
                        <OrderInvoiceSettings />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/settings/order-numbering"
                  element={
                    <Layout>
                      <OrderNumberingSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/ratings"
                  element={
                    <Layout>
                      <RatingSettingsManager />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/rule-responses"
                  element={<Navigate to="/settings/smart-replies" replace />}
                />
                <Route
                  path="/settings/scheduled-orders"
                  element={
                    <Layout>
                      <ScheduledOrderSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/order-workflow"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['order-workflow']}>
                        <OrderWorkflow />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/store-settings"
                  element={
                    <Navigate to="/settings/store?tab=branches" replace />
                  }
                />
                <Route
                  path="/settings/store"
                  element={
                    <Layout>
                      <StoreSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/custom-domain"
                  element={
                    <Layout>
                      <CustomDomainPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store/product-conversion"
                  element={<Navigate to="/settings/store/tools" replace />}
                />
                <Route
                  path="/settings/store/offers-bundles"
                  element={<Navigate to="/settings/store/tools" replace />}
                />
                <Route
                  path="/settings/store/growth-widgets"
                  element={<Navigate to="/settings/store/tools" replace />}
                />
                <Route
                  path="/settings/store/selling-modes"
                  element={<Navigate to="/settings/store/tools" replace />}
                />
                <Route
                  path="/settings/store/reviews-social-proof"
                  element={<Navigate to="/settings/store/tools" replace />}
                />
                <Route
                  path="/settings/store/tools"
                  element={
                    <Layout fullWidth>
                      <ConversionToolsIndexPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store/tools/:toolId"
                  element={
                    <Layout fullWidth>
                      <ConversionToolPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store-payment-offers"
                  element={
                    <Layout>
                      <PaymentOffersSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/post-purchase-offer"
                  element={
                    <Layout>
                      <PostPurchaseOfferBuilderPage />
                    </Layout>
                  }
                />
                <Route
                  path="/post-purchase-offer"
                  element={
                    <Navigate to="/settings/post-purchase-offer" replace />
                  }
                />
                  <Route
                    path="/settings/storefront/*"
                    element={
                      <Navigate to="/settings/storefront/editor" replace />
                    }
                  />
                  <Route
                    path="/settings/storefront-preview/*"
                    element={
                      <Navigate
                        to="/settings/storefront/editor"
                        replace
                      />
                    }
                  />
                  <Route
                    path="/settings/storefront/sections-editor"
                    element={
                      <Navigate to="/settings/storefront/editor" replace />
                    }
                  />
                  <Route
                    path="/settings/storefront/editor"
                    element={
                      <Layout fullWidth>
                        <StorefrontVisualEditorPage />
                    </Layout>
                  }
                />
                <Route
                  path="/home-builder"
                  element={
                    <Layout fullWidth>
                      <StorefrontVisualEditorPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store-pages"
                  element={
                    <Layout>
                      <StorePages />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/product-images"
                  element={
                    <Navigate
                      to="/settings/storefront/editor"
                      replace
                    />
                  }
                />
                <Route
                  path="/settings/checkout"
                  element={<Navigate to="/settings/store?tab=checkout" replace />}
                />
                  <Route
                    path="/settings/clarity"
                    element={
                      <Layout>
                        <StorefrontClaritySettings />
                      </Layout>
                    }
                  />
                  <Route
                    path="/settings/cod-deposit"
                    element={
                      <Layout>
                        <AppAccessRoute requiredAppSlugs={['cod-deposit']}>
                          <CodDepositSettings />
                        </AppAccessRoute>
                      </Layout>
                    }
                  />
                    <Route
                      path="/settings/storefront/tools"
                    element={<Navigate to="/settings/storefront/editor" replace />}
                  />
                <Route
                  path="/settings/storefront/studio"
                  element={
                    <Navigate to="/settings/storefront/editor" replace />
                  }
                />
                <Route
                  path="/settings/storefront/studio/templates"
                  element={
                    <Navigate to="/marketplace/themes" replace />
                  }
                />
                <Route
                  path="/settings/storefront/studio/footers"
                  element={<Navigate to="/settings/store?tab=footer" replace />}
                />
                  <Route
                    path="/settings/storefront/shop-studio"
                    element={<Navigate to="/settings/storefront/editor" replace />}
                  />
                <Route
                  path="/settings/storefront/shop-studio/templates"
                  element={<Navigate to="/marketplace/themes" replace />}
                />
                  <Route
                    path="/settings/storefront/studio/shop"
                    element={<Navigate to="/settings/storefront/editor" replace />}
                  />
                <Route
                  path="/settings/storefront/studio/shop/templates"
                  element={<Navigate to="/marketplace/themes" replace />}
                />
                  <Route
                    path="/settings/storefront/tools-legacy"
                    element={<Navigate to="/settings/storefront/editor" replace />}
                  />
                <Route
                  path="/settings/storefront/layout-studio"
                  element={
                    <Navigate to="/settings/storefront/editor" replace />
                  }
                />
                <Route
                  path="/settings/storefront/structure-manager"
                  element={
                    <Navigate to="/settings/storefront/editor" replace />
                  }
                />
                <Route
                  path="/settings/conversion-tools"
                  element={
                    <Navigate to="/settings/store/tools" replace />
                  }
                />
                <Route
                  path="/settings/delivery-options"
                  element={
                    <Layout>
                      <DeliveryOptions />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/turbo"
                  element={
                    <Layout>
                      <TurboSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/turbo/status-mapping"
                  element={
                    <Layout>
                      <TurboStatusMapping />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/turbo/ticket/:ticketId"
                  element={
                    <Layout>
                      <TurboTicketDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/tickets"
                  element={
                    <Layout>
                      <TurboTickets />
                    </Layout>
                  }
                />
                <Route
                  path="/shipping"
                  element={<Navigate to="/shipping-companies" replace />}
                />
                <Route
                  path="/apps/shipping"
                  element={<Navigate to="/shipping-companies" replace />}
                />
                <Route
                  path="/shipping-companies"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={SHIPPING_APP_ACCESS_SLUGS}>
                        <ShippingCompanies />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/shipping-companies/:id"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={SHIPPING_APP_ACCESS_SLUGS}>
                        <ShippingCompanyDetail />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/shipping-settlement"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={SHIPPING_APP_ACCESS_SLUGS}>
                        <ShippingSettlement />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/shipping/couriers"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['internal-courier-fleet']}>
                        <CourierManagementPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/shipping/delivery-runs"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['internal-courier-fleet']}>
                        <DeliveryRunsPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/shipping/courier-settlements"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['internal-courier-fleet']}>
                        <CourierSettlementPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/courier/run/:id"
                  element={<CourierMobileRunPage />}
                />
                <Route
                  path="/orders/bulk-status"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['bulk-orders']}>
                        <BulkStatusUpdate />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/inventory/movements"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['inventory-pro', 'multi-warehouse-pro', 'store-pro', 'store']}>
                        <StockMovements />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/settings/smart-replies"
                  element={
                    <Layout>
                      <SmartRepliesSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/automation/bot-studio"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['bot-automation']}>
                        <BotStudioPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/settings/promotion"
                  element={
                    <Layout>
                      <PromotionSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store-promotion"
                  element={
                    <Layout>
                      <StorePromotionSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/volume-discounts"
                  element={
                    <Layout>
                      <StorePromotionSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/recommendations"
                  element={
                    <Layout>
                      <RecommendationSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/upsell"
                  element={
                    <Layout>
                      <RecommendationSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/upsell"
                  element={
                    <Navigate to="/settings/upsell" replace />
                  }
                />
                <Route
                  path="/settings/homepage"
                  element={
                    <Navigate to="/settings/storefront/editor" replace />
                  }
                />
                <Route
                  path="/settings/homepage/create"
                  element={
                    <Navigate to="/settings/storefront/editor" replace />
                  }
                />
                <Route
                  path="/settings/homepage/edit/:id"
                  element={
                    <Navigate to="/settings/storefront/editor" replace />
                  }
                />
                <Route
                  path="/preview/homepage/:id"
                  element={
                    <Navigate to="/settings/storefront/editor" replace />
                  }
                />
                <Route
                  path="/preview/engine/*"
                  element={
                    <Navigate to="/settings/storefront/editor" replace />
                  }
                />
                <Route
                  path="/settings/instagram"
                  element={
                    <Layout>
                      <InstagramSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/facebook-oauth"
                  element={
                    <Layout>
                      <FacebookOAuth />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/facebook-blocked"
                  element={
                    <Layout>
                      <FacebookBlockedCustomers />
                    </Layout>
                  }
                />
                <Route
                  path="/facebook/engagement-stats"
                  element={
                    <Layout>
                      <PageEngagementStats />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/telegram"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['telegram-business', 'telegram-integration']}>
                        <TelegramSettings />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/telegram/pro"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['telegram-business', 'telegram-integration']}>
                        <TelegramConversationsPro />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/telegram-userbot"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['telegram-business', 'telegram-integration']}>
                        <TelegramUserbot />
                      </AppAccessRoute>
                    </Layout>
                  }
                />{" "}
                {/* System 2 */}
                <Route
                  path="/telegram/auto-reply"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['telegram-business', 'telegram-integration']}>
                        <TelegramAutoReply />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/telegram/bulk-messages"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['telegram-business', 'telegram-integration']}>
                        <TelegramBulkMessages />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/telegram/scheduler"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['telegram-business', 'telegram-integration']}>
                        <TelegramScheduler />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/telegram/campaigns"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['telegram-business', 'telegram-integration']}>
                        <TelegramCampaigns />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/telegram/groups"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['telegram-business', 'telegram-integration']}>
                        <TelegramGroups />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                {/* WhatsApp Routes */}
                <Route
                  path="/whatsapp"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppChat />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/chat"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppChat />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/settings"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppSettings />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/notifications"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppNotifications />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/templates"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppTemplates />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/customer-journey"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppCustomerJourney />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/meta-templates"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppMetaTemplates />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/template-broadcast"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppTemplateBroadcast />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/lead-followup"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppLeadFollowUp />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/cloud-connect"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppCloudConnect />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/employee-analytics"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppEmployeeAnalytics />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/conversation-analytics"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppConversationAnalytics />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/whatsapp/notification-logs"
                  element={
                    <Layout>
                      <AppAccessRoute requiredAppSlugs={['whatsapp-business', 'whatsapp-cloud-api']}>
                        <WhatsAppNotificationLogs />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                {/* HR Routes */}
                <Route
                  path="/hr"
                  element={
                    <Layout>
                      <HRDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/dashboard"
                  element={
                    <Layout>
                      <HRDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/monitor"
                  element={
                    <Layout>
                      <MonitorDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/monitor/:employeeId"
                  element={
                    <Layout>
                      <EmployeeMonitorDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/my-companies/hr"
                  element={
                    <Layout>
                      <MyCompaniesDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/my-companies/reports"
                  element={
                    <Layout>
                      <OwnerReports />
                    </Layout>
                  }
                />
                <Route
                  path="/my-companies/company/:companyId/orders"
                  element={
                    <Layout>
                      <CompanyOrdersDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/my-companies/attendance"
                  element={
                    <Layout>
                      <OwnerAttendanceReport />
                    </Layout>
                  }
                />
                <Route
                  path="/my-companies/users"
                  element={
                    <Layout>
                      <OwnerUsersManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/employees"
                  element={
                    <Layout>
                      <Employees />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/online"
                  element={
                    <Layout>
                      <OnlineTeam />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/employees/:id"
                  element={
                    <Layout>
                      <EmployeeDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/employees/:id/edit"
                  element={
                    <Layout>
                      <EmployeeEdit />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/salary-updates"
                  element={
                    <Layout>
                      <SalaryUpdates />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/departments"
                  element={
                    <Layout>
                      <Departments />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/positions"
                  element={
                    <Layout>
                      <PositionsManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/attendance"
                  element={
                    <Layout>
                      <Attendance />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/attendance/manual-edit"
                  element={
                    <Layout>
                      <ManualAttendanceEdit />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/leaves"
                  element={
                    <Layout>
                      <Leaves />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/permissions"
                  element={
                    <Layout>
                      <Permissions />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/payroll"
                  element={
                    <Layout>
                      <Payroll />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/payroll/testing"
                  element={
                    <Layout>
                      <PayrollTesting />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/deductions"
                  element={
                    <Layout>
                      <Deductions />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/settings"
                  element={
                    <Layout>
                      <HRSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/integrations"
                  element={
                    <Layout>
                      <HRApiIntegrations />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/reports"
                  element={
                    <Layout>
                      <HRReports />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/reports-hub"
                  element={
                    <Layout>
                      <HRReportsHub />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/documents/:employeeId"
                  element={
                    <Layout>
                      <Documents />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/salary-history"
                  element={
                    <Layout>
                      <SalaryHistory />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/salary-history/:employeeId"
                  element={
                    <Layout>
                      <SalaryHistory />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/performance-reviews"
                  element={
                    <Layout>
                      <PerformanceReviews />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/performance-reviews/new"
                  element={
                    <Layout>
                      <CreatePerformanceReview />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/performance-reviews/:id"
                  element={
                    <Layout>
                      <PerformanceReviews />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/performance-reviews/:id/edit"
                  element={
                    <Layout>
                      <CreatePerformanceReview />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/training"
                  element={
                    <Layout>
                      <Training />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/training/new"
                  element={
                    <Layout>
                      <CreateTraining />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/training/:id"
                  element={
                    <Layout>
                      <CreateTraining />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/rewards"
                  element={
                    <Layout>
                      <RewardsList />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/rewards/create"
                  element={
                    <Layout>
                      <CreateEditReward />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/rewards/edit/:id"
                  element={
                    <Layout>
                      <CreateEditReward />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/rewards/:id"
                  element={
                    <Layout>
                      <RewardDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/cashback"
                  element={
                    <Layout>
                      <CashbackSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/loyalty-programs"
                  element={
                    <Layout>
                      <LoyaltyPrograms />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/loyalty-tiers"
                  element={
                    <Layout>
                      <LoyaltyTiers />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/loyalty-members"
                  element={<Navigate to="/customers/points-center" replace />}
                />
                <Route
                  path="/customers/loyalty-analytics"
                  element={
                    <Layout>
                      <LoyaltyAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/loyalty-system-map"
                  element={
                    <Layout>
                      <LoyaltySystemMap />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/points-center"
                  element={
                    <Layout>
                      <CustomerPointsCenter />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/segments"
                  element={
                    <Layout>
                      <CustomerSegments />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/auto-discount"
                  element={<Navigate to="/customers/settings?tab=discount" replace />}
                />
                <Route
                  path="/customers/settings"
                  element={
                    <Layout>
                      <CustomerLoyaltySettings />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/customer-notifications"
                  element={
                    <Layout>
                      <CustomerNotifications />
                    </Layout>
                  }
                />
                {/* <Route path="/customers/loyalty" element={<Layout><CustomerLoyalty /></Layout>} /> */}
                <Route
                  path="/hr/warnings"
                  element={
                    <Layout>
                      <Warnings />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/warnings/new"
                  element={
                    <Layout>
                      <CreateWarning />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/warnings/:id"
                  element={
                    <Layout>
                      <WarningDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/warnings/:id/edit"
                  element={
                    <Layout>
                      <EditWarning />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/promotions"
                  element={
                    <Layout>
                      <EmployeesPromotion />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/promotions/new"
                  element={
                    <Layout>
                      <CreatePromotion />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/promotions/edit/:id"
                  element={
                    <Layout>
                      <EditPromotion />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/promotions/:id/edit"
                  element={
                    <Layout>
                      <EditPromotion />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/shifts"
                  element={
                    <Layout>
                      <Shifts />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/shifts/:id"
                  element={
                    <Layout>
                      <ShiftDetails />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/benefits"
                  element={
                    <Layout>
                      <Benefits />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/benefits/:id"
                  element={
                    <Layout>
                      <Benefits />
                    </Layout>
                  }
                />
                <Route
                  path="/goals"
                  element={
                    <Layout>
                      <Goals />
                    </Layout>
                  }
                />
                <Route
                  path="/goals/new"
                  element={
                    <Layout>
                      <CreateGoal />
                    </Layout>
                  }
                />
                <Route
                  path="/goals/:id"
                  element={
                    <Layout>
                      <CreateGoal />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/goals"
                  element={<Navigate to="/goals" replace />}
                />
                <Route
                  path="/hr/goals/new"
                  element={<Navigate to="/goals/new" replace />}
                />
                <Route
                  path="/hr/goals/:id"
                  element={
                    <Layout>
                      <CreateGoal />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/feedback"
                  element={
                    <Layout>
                      <Feedback />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/feedback/new"
                  element={
                    <Layout>
                      <CreateFeedback />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/feedback/edit/:id"
                  element={
                    <Layout>
                      <CreateFeedback />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/resignations"
                  element={
                    <Layout>
                      <Resignations />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/resignations/new"
                  element={
                    <Layout>
                      <CreateResignation />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/resignations/:id/approve"
                  element={
                    <Layout>
                      <DecisionResignation />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/resignations/:id/reject"
                  element={
                    <Layout>
                      <DecisionResignation />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/resignations/:id/clearance"
                  element={
                    <Layout>
                      <ClearanceChecklist />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/advances"
                  element={
                    <Layout>
                      <Advances />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/advances/new"
                  element={
                    <Layout>
                      <CreateAdvance />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/audit-logs"
                  element={
                    <Layout>
                      <AuditLogs />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/assets"
                  element={
                    <Layout>
                      <AssetsDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/recruitment"
                  element={
                    <Layout>
                      <RecruitmentDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/reporting/forms"
                  element={
                    <Layout>
                      <WorkReportFormsDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/reporting/forms/new"
                  element={
                    <Layout>
                      <WorkReportFormBuilder />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/reporting/forms/:formId/edit"
                  element={
                    <Layout>
                      <WorkReportFormBuilder />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/reporting/forms/:formId/preview"
                  element={
                    <Layout>
                      <WorkReportFormPreview />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/reporting/forms/:formId/fill"
                  element={
                    <Layout>
                      <WorkReportSubmissionPage />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/reporting/forms/:formId/records"
                  element={
                    <Layout>
                      <WorkReportRecordsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/company-policy"
                  element={
                    <Layout>
                      <CompanyPolicy />
                    </Layout>
                  }
                />
                {/* Employee Self-Service Routes */}
                <Route
                  path="/my-attendance"
                  element={
                    <Layout>
                      <MyAttendance />
                    </Layout>
                  }
                />
                <Route
                  path="/my-dashboard"
                  element={
                    <Layout>
                      <MyDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/my-leaves"
                  element={
                    <Layout>
                      <Leaves />
                    </Layout>
                  }
                />
                <Route
                  path="/my-permissions"
                  element={
                    <Layout>
                      <Permissions />
                    </Layout>
                  }
                />
                <Route
                  path="/my-payroll"
                  element={
                    <Layout>
                      <MyPayroll />
                    </Layout>
                  }
                />
                <Route
                  path="/my-deductions"
                  element={
                    <Layout>
                      <MyDeductions />
                    </Layout>
                  }
                />
                <Route
                  path="/my-warnings"
                  element={
                    <Layout>
                      <MyWarnings />
                    </Layout>
                  }
                />
                <Route
                  path="/my-promotions"
                  element={
                    <Layout>
                      <MyPromotions />
                    </Layout>
                  }
                />
                <Route
                  path="/my-rewards"
                  element={
                    <Layout>
                      <MyRewards />
                    </Layout>
                  }
                />
                <Route
                  path="/my-resignation"
                  element={
                    <Layout>
                      <MyResignation />
                    </Layout>
                  }
                />
                <Route
                  path="/my-advances"
                  element={
                    <Layout>
                      <MyAdvances />
                    </Layout>
                  }
                />
                <Route
                  path="/my-custody"
                  element={
                    <Layout>
                      <MyCustody />
                    </Layout>
                  }
                />
                <Route
                  path="/my-feedback"
                  element={
                    <Layout>
                      <MyFeedback />
                    </Layout>
                  }
                />
                <Route
                  path="/my-feedback/new"
                  element={
                    <Layout>
                      <CreateFeedback />
                    </Layout>
                  }
                />
                <Route
                  path="/my-training"
                  element={
                    <Layout>
                      <MyTraining />
                    </Layout>
                  }
                />
                <Route
                  path="/hr/resignations/:id"
                  element={
                    <Layout>
                      <Resignations />
                    </Layout>
                  }
                />
                {/* Support System Routes */}
                <Route
                  path="/support"
                  element={
                    <Layout>
                      <SupportCenter />
                    </Layout>
                  }
                />
                <Route
                  path="/support/tickets"
                  element={
                    <Layout>
                      <MyTickets />
                    </Layout>
                  }
                />
                <Route
                  path="/support/tickets/new"
                  element={
                    <Layout>
                      <CreateTicket />
                    </Layout>
                  }
                />
                <Route
                  path="/support/tickets/:ticketId"
                  element={
                    <Layout>
                      <SupportTicketDetails />
                    </Layout>
                  }
                />
                {/* Activity Log Routes */}
                <Route
                  path="/my-activity"
                  element={
                    <Layout>
                      <MyActivity />
                    </Layout>
                  }
                />
                <Route
                  path="/company/activity"
                  element={
                    <Layout>
                      <CompanyActivity />
                    </Layout>
                  }
                />
                {/* Admin Support Routes */}
                <Route
                  path="/admin/support"
                  element={
                    <SuperAdminLayout>
                      <SupportAdmin />
                    </SuperAdminLayout>
                  }
                />
                {/* Gamification Route */}
                <Route
                  path="/super-admin/dev-leaderboard"
                  element={
                    <Layout>
                      <DevLeaderboard />
                    </Layout>
                  }
                />
                <Route
                  path="/super-admin/dev-evaluations"
                  element={
                    <Layout>
                      <DevEvaluation />
                    </Layout>
                  }
                />
                <Route
                  path="/super-admin/dev-evaluations/member/:memberId"
                  element={
                    <Layout>
                      <DevEvaluationMember />
                    </Layout>
                  }
                />
                {/* Knowledge base routes */}
                <Route
                  path="/admin/faqs"
                  element={
                    <Layout>
                      <FAQManagement />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/policies"
                  element={
                    <Layout>
                      <PolicyManagement />
                    </Layout>
                  }
                />
                {/* Merchant AI Pages */}
                <Route
                  path="/admin/agent-config"
                  element={<Navigate to="/admin/agent-profiles?agent=ceo" replace />}
                />
                <Route
                  path="/admin/ai-agent-sandbox"
                  element={<Navigate to="/admin/ai-hub?tab=sandbox" replace />}
                />
                <Route
                  path="/admin/ai-agents"
                  element={<Navigate to="/admin/agent-profiles" replace />}
                />
                <Route
                  path="/admin/ai-hub"
                  element={
                    <Layout fullWidth>
                      <AIHubLayout />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/ai-hub/skills/:skillId"
                  element={
                    <Layout fullWidth>
                      <SkillDetailPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/ai-incidents"
                  element={
                    <Layout fullWidth>
                      <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                        <SuperAdminAiIncidentsPage />
                      </React.Suspense>
                    </Layout>
                  }
                />
                <Route
                  path="/admin/agent-chat"
                  element={
                    <Layout fullWidth>
                      <AgentChatStudioPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/agent-profiles"
                  element={
                    <Layout fullWidth>
                      <AgentProfilesPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/ai-catalog"
                  element={
                    <Layout fullWidth>
                      <AgentCatalogPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/ai-knowledge-questions"
                  element={
                    <Layout fullWidth>
                      <AIKnowledgeQuestionsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/booking/*"
                  element={
                    <Layout fullWidth>
                      <BookingManagementPage />
                    </Layout>
                  }
                />
                <Route
                  path="/lab/*"
                  element={
                    <Layout fullWidth>
                      <LabManagementPage />
                    </Layout>
                  }
                />
                <Route
                  path="/radiology/*"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['radiology-app']}>
                        <RadiologyManagementPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/dental-lab/cases/:id"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['dental-lab-app', 'dental-lab']}>
                        <DentalCaseDetailPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/dental-lab/doctors/:id"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['dental-lab-app', 'dental-lab']}>
                        <DentalDoctorDetailPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/dental-lab/*"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['dental-lab-app', 'dental-lab']}>
                        <DentalLabManagementPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route path="/dental-portal/*" element={<DentalPortalRoutes />} />

                {/* MaxP Academy Routes */}
                <Route
                  path="/academy/dashboard"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['academy-app']}>
                        <AcademyDashboardPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/academy/courses"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['academy-app']}>
                        <AcademyCoursesPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/academy/courses/:id"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['academy-app']}>
                        <AcademyCourseEditorPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/academy/catalog"
                  element={
                    <Layout fullWidth>
                      <AcademyCatalogPage />
                    </Layout>
                  }
                />
                <Route
                  path="/academy/catalog/:courseId"
                  element={
                    <Layout fullWidth>
                      <AcademyLessonViewerPage />
                    </Layout>
                  }
                />
                <Route
                  path="/academy/catalog/:courseId/lessons/:lessonId"
                  element={
                    <Layout fullWidth>
                      <AcademyLessonViewerPage />
                    </Layout>
                  }
                />
                <Route
                  path="/academy/students"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['academy-app']}>
                        <AcademyStudentsPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/academy"
                  element={
                    <Layout fullWidth>
                      <AppAccessRoute requiredAppSlugs={['academy-app']}>
                        <AcademyDashboardPage />
                      </AppAccessRoute>
                    </Layout>
                  }
                />
                <Route
                  path="/admin/education/funnel"
                  element={
                    <Layout fullWidth>
                      <EducationFunnelPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/education/calendar"
                  element={
                    <Layout fullWidth>
                      <EducationCalendarPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/education/teacher-schedule"
                  element={
                    <Layout fullWidth>
                      <EducationTeacherSchedulePage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/education/teacher-payments"
                  element={
                    <Layout fullWidth>
                      <EducationTeacherPaymentsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/education/teacher/:id"
                  element={
                    <Layout fullWidth>
                      <EducationTeacherProfilePage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/education/student/:id"
                  element={
                    <Layout fullWidth>
                      <EducationStudentProfilePage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/education/*"
                  element={
                    <Layout fullWidth>
                      <EducationManagementPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/hotel/*"
                  element={
                    <Layout fullWidth>
                      <HotelManagementPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/ai-image-generator"
                  element={<Navigate to="/advertising/creative-studio" replace />}
                />
                <Route
                  path="/admin/brand-identity"
                  element={
                    <Layout fullWidth>
                      <BrandIdentitySettings />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/forms"
                  element={
                    <Layout fullWidth>
                      <FormsBuilderPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/service-orders"
                  element={
                    <Layout fullWidth>
                      <ServiceOrdersPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/service-orders/:id"
                  element={
                    <Layout fullWidth>
                      <ServiceOrderDetailPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/services"
                  element={
                    <Layout fullWidth>
                      <ServiceManagementPage />
                    </Layout>
                  }
                />
                <Route
                  path="/admin/services/settings"
                  element={
                    <Layout fullWidth>
                      <ServiceOrdersSettingsPage />
                    </Layout>
                  }
                />
                {/* Catch-all for authenticated users: role-aware redirect */}
                <Route path="*" element={<AuthenticatedFallbackRedirect />} />
              </>
            ) : (
              // Redirect unauthenticated users trying to access protected routes
              <>
                <Route
                  path="/admin/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route path="/" element={isCapacitorNative() ? <Navigate to="/auth/login" replace /> : <PlatformLandingPage />} />
                <Route path="/dental-portal/*" element={<DentalPortalRoutes />} />
                <Route path="/bot-widget/:companyId" element={<BotWidgetPage />} />
                <Route
                  path="/store-settings"
                  element={<Navigate to="/auth/login" replace />}
                />
                  <Route
                    path="/settings/storefront/*"
                    element={<Navigate to="/auth/login" replace />}
                  />
                  <Route
                    path="/settings/storefront-preview/*"
                    element={<Navigate to="/auth/login" replace />}
                  />
                  <Route
                    path="/settings/storefront/editor"
                    element={<Navigate to="/auth/login" replace />}
                  />
                  <Route
                    path="/home-builder"
                    element={<Navigate to="/auth/login" replace />}
                  />
                <Route
                  path="/settings/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/dashboard"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/products/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/orders/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/customers"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/invoices"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/payments"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/subscription"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/broadcast"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/reminders"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/notifications"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/notification-settings"
                  element={<Navigate to="/auth/login" replace />}
                />

                <Route
                  path="/comments/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/unified-comments/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/posts/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/messenger-chat"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/conversations-improved"
                  element={<Navigate to="/facebook-inbox" replace />}
                />
                {/* <Route path="/external-messages-stats" element={<Navigate to="/auth/login" replace />} /> */}
                <Route
                  path="/sent-messages-stats"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/facebook-inbox"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                    path="/home-builder"
                    element={<Navigate to="/auth/login" replace />}
                  />
                <Route
                  path="/facebook/create-post"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/facebook/posts"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/facebook/engagement-stats"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/categories"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/competitors"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/competitors/:id"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/appointments"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/tasks/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/goals/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                {/* Gamification Public Route */}
                <Route
                  path="/super-admin/dev-leaderboard"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/whatsapp/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/hr/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/support/*"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/admin/support"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route
                  path="/super-admin/dev-reports"
                  element={<Navigate to="/auth/login" replace />}
                />
                <Route path="*" element={<Navigate to="/auth/login" replace />} />
              </>
            )}
          </Routes>
        </Suspense>
        <AndroidAppUpdateModal />
      </div>
    </PerformanceOptimizer>
  );
};

// Fallback redirect component for unmatched authenticated routes
const AuthenticatedFallbackRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === "SUPER_ADMIN") {
    return <Navigate to="/super-admin/dashboard" replace />;
  }
  return <Navigate to="/apps" replace />;
};

// Fallback redirect for unmatched authenticated routes
const RedirectToApps: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  React.useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      navigate("/super-admin/dashboard", { replace: true });
    } else {
      navigate("/apps", { replace: true });
    }
  }, [navigate, user]);
  return null;
};

// Main App component with providers
const App = () => {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
};

export default App;

