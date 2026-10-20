import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDetailsData } from "./hooks/useAppDetailsData";
import { AppDetailsHeader } from "./components/app-details/AppDetailsHeader";
import { AppDetailsPricingSidebar } from "./components/app-details/AppDetailsPricingSidebar";
import { AppDetailsFeaturesTab } from "./components/app-details/AppDetailsFeaturesTab";
import { AppDetailsScreenshotsTab } from "./components/app-details/AppDetailsScreenshotsTab";
import { AppDetailsFaqTab } from "./components/app-details/AppDetailsFaqTab";
import { AppDetailsReviewsTab } from "./components/app-details/AppDetailsReviewsTab";
import { AppDetailsChangelogTab } from "./components/app-details/AppDetailsChangelogTab";
import { AppDetailsAuxiliarySections } from "./components/app-details/AppDetailsAuxiliarySections";
import { AppDetailsMobileStickyBar } from "./components/app-details/AppDetailsMobileStickyBar";
import { isLikelyImageUrl } from "./types/appDetailsTypes";

export default function AppDetails() {
  const {
    app,
    loading,
    screenshotIndex,
    setScreenshotIndex,
    activeTab,
    setActiveTab,
    userRating,
    setUserRating,
    reviewText,
    setReviewText,
    submittingReview,
    installing,
    isInstalled,
    appExplanation,
    selectedPlan,
    setSelectedPlan,
    isExpired,
    handleInstall,
    handleUninstall,
    handleSubmitReview,
    navigate,
  } = useAppDetailsData();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <AlertCircle size={44} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">App not found</p>
          <Link
            to="/marketplace"
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            Back to Marketplace <ChevronRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  const rawScreenshots: unknown[] = Array.isArray(app.screenshots)
    ? app.screenshots
    : Array.isArray(app.images)
    ? app.images
    : [];
  const screenshots = rawScreenshots
    .map((s) => (typeof s === "string" ? s : (s as { url?: string })?.url || ""))
    .filter((s) => isLikelyImageUrl(s));

  const faq = Array.isArray(app.faq) ? app.faq : [];
  const changelog = Array.isArray(app.changelog) ? app.changelog : [];
  const reviews = Array.isArray(app.reviews) ? app.reviews : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <AppDetailsHeader app={app} onBack={() => navigate("/marketplace")} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {(screenshots.length > 0 ||
                faq.length > 0 ||
                reviews.length > 0 ||
                changelog.length > 0) && (
                <TabsList className="w-full justify-start gap-0 rounded-xl border bg-card p-1 overflow-x-auto">
                  <TabsTrigger value="features" className="rounded-lg text-xs font-bold">
                    الميزات
                  </TabsTrigger>
                  {screenshots.length > 0 && (
                    <TabsTrigger value="screenshots" className="rounded-lg text-xs font-bold">
                      لقطات الشاشة
                    </TabsTrigger>
                  )}
                  {faq.length > 0 && (
                    <TabsTrigger value="faq" className="rounded-lg text-xs font-bold">
                      الأسئلة الشائعة
                    </TabsTrigger>
                  )}
                  {reviews.length > 0 && (
                    <TabsTrigger value="reviews" className="rounded-lg text-xs font-bold">
                      التقييمات
                    </TabsTrigger>
                  )}
                  {changelog.length > 0 && (
                    <TabsTrigger value="changelog" className="rounded-lg text-xs font-bold">
                      سجل التحديثات
                    </TabsTrigger>
                  )}
                </TabsList>
              )}

              <TabsContent value="features" className="mt-4">
                <AppDetailsFeaturesTab app={app} />
              </TabsContent>

              {screenshots.length > 0 && (
                <TabsContent value="screenshots" className="mt-4">
                  <AppDetailsScreenshotsTab
                    screenshots={screenshots}
                    screenshotIndex={screenshotIndex}
                    onSelectIndex={setScreenshotIndex}
                  />
                </TabsContent>
              )}

              {faq.length > 0 && (
                <TabsContent value="faq" className="mt-4">
                  <AppDetailsFaqTab faq={faq} />
                </TabsContent>
              )}

              {reviews.length > 0 && (
                <TabsContent value="reviews" className="mt-4">
                  <AppDetailsReviewsTab
                    rating={app.rating || 0}
                    reviewCount={app.reviewCount || 0}
                    reviews={reviews}
                    userRating={userRating}
                    reviewText={reviewText}
                    submittingReview={submittingReview}
                    onRatingChange={setUserRating}
                    onReviewTextChange={setReviewText}
                    onSubmitReview={handleSubmitReview}
                  />
                </TabsContent>
              )}

              {changelog.length > 0 && (
                <TabsContent value="changelog" className="mt-4">
                  <AppDetailsChangelogTab changelog={changelog} />
                </TabsContent>
              )}
            </Tabs>

            <AppDetailsAuxiliarySections app={app} appExplanation={appExplanation} />
          </div>

          <div>
            <AppDetailsPricingSidebar
              app={app}
              isInstalled={isInstalled}
              installing={installing}
              isExpired={isExpired}
              selectedPlan={selectedPlan}
              onSelectPlan={setSelectedPlan}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
            />
          </div>
        </div>
      </div>

      <AppDetailsMobileStickyBar
        app={app}
        isInstalled={isInstalled}
        installing={installing}
        isExpired={isExpired}
        selectedPlan={selectedPlan}
        onInstall={handleInstall}
      />
    </div>
  );
}
