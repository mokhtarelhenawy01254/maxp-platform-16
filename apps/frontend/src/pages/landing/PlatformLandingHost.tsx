import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
// Operix Luxury Landing is synchronously imported to eliminate legacy variant flash
import { OperixLuxuryLanding } from "./operix-luxury/OperixLuxuryLanding";
import { platformSiteHomepageService } from "../../services/platformSiteHomepageService";
import {
  DEFAULT_PLATFORM_LANDING_VARIANT_ID,
  type PlatformLandingVariantId,
  getPlatformLandingVariant,
  isPlatformLandingVariantId,
} from "./platformLandingRegistry";

// Lazy-load alternate legacy/preview variants to keep the initial landing bundle clean
const LandingPage = React.lazy(() => import("../LandingPage"));
const PlatformLandingSalesFlow = React.lazy(() => import("./PlatformLandingSalesFlow"));
const PlatformLandingExecutiveAtlas = React.lazy(() => import("./PlatformLandingExecutiveAtlas"));
const PlatformLandingBusinessOs = React.lazy(() => import("./PlatformLandingBusinessOs"));
const MerchantDaylightLanding = React.lazy(() => import("./merchant-daylight/MerchantDaylightLanding"));
const MerchantDossierLanding = React.lazy(() => import("./merchant-dossier/MerchantDossierLanding"));
const MerchantPerformsLanding = React.lazy(() => import("./merchant-performs/MerchantPerformsLanding"));
const MerchantAnnualLanding = React.lazy(() => import("./merchant-annual/MerchantAnnualLanding"));
const MerchantPosterLanding = React.lazy(() => import("./merchant-poster/MerchantPosterLanding"));

const variantComponents: Record<
  PlatformLandingVariantId,
  React.ComponentType
> = {
  "enterprise-os": LandingPage,
  "sales-flow": PlatformLandingSalesFlow,
  "executive-atlas": PlatformLandingExecutiveAtlas,
  "business-os": PlatformLandingBusinessOs,
  "merchant-daylight": MerchantDaylightLanding,
  "merchant-dossier": MerchantDossierLanding,
  "merchant-performs": MerchantPerformsLanding,
  "merchant-annual": MerchantAnnualLanding,
  "merchant-poster": MerchantPosterLanding,
  "operix-luxury": OperixLuxuryLanding,
};

interface PlatformLandingRendererProps {
  forcedVariantId?: string | null;
}

export const PlatformLandingRenderer: React.FC<
  PlatformLandingRendererProps
> = ({ forcedVariantId }) => {
  const location = useLocation();
  const [activeVariantId, setActiveVariantId] =
    useState<PlatformLandingVariantId>(() => {
      const searchParams = new URLSearchParams(location.search);
      const queryVariant = searchParams.get("landingVariant");
      const candidate = forcedVariantId || queryVariant;
      return isPlatformLandingVariantId(candidate)
        ? candidate
        : DEFAULT_PLATFORM_LANDING_VARIANT_ID;
    });

  const queryVariantId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("landingVariant");
  }, [location.search]);

  const resolvedOverride = useMemo(() => {
    const candidate = forcedVariantId || queryVariantId;
    return isPlatformLandingVariantId(candidate) ? candidate : null;
  }, [forcedVariantId, queryVariantId]);

  useEffect(() => {
    let isMounted = true;

    if (resolvedOverride) {
      setActiveVariantId(resolvedOverride);
      return () => {
        isMounted = false;
      };
    }

    // Fetch active landing variant in background without blocking initial view
    const loadSettings = async () => {
      try {
        const settings = await platformSiteHomepageService.getPublicSettings();
        if (!isMounted) return;

        if (
          isPlatformLandingVariantId(settings?.activeLandingId) &&
          settings.activeLandingId !== activeVariantId
        ) {
          setActiveVariantId(settings.activeLandingId);
        }
      } catch (error) {
        // Silently preserve default variant on error
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [resolvedOverride, activeVariantId]);

  useEffect(() => {
    const variant = getPlatformLandingVariant(activeVariantId);
    if (variant?.label) {
      document.title = `${variant.label} | Max P`;
    }
  }, [activeVariantId]);

  const ActiveComponent = variantComponents[activeVariantId] || OperixLuxuryLanding;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#013735]/15 border-t-[#013735] animate-spin" />
        </div>
      }
    >
      <ActiveComponent />
    </Suspense>
  );
};

const PlatformLandingHost: React.FC = () => <PlatformLandingRenderer />;

export default PlatformLandingHost;
