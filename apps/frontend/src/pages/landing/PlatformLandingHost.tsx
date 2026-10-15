import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import LandingPage from "../LandingPage";
import { platformSiteHomepageService } from "../../services/platformSiteHomepageService";
import {
  DEFAULT_PLATFORM_LANDING_VARIANT_ID,
  type PlatformLandingVariantId,
  getPlatformLandingVariant,
  isPlatformLandingVariantId,
} from "./platformLandingRegistry";

// Lazy-load alternate landing variants to keep the initial landing bundle minimal
const PlatformLandingSalesFlow = React.lazy(() => import("./PlatformLandingSalesFlow"));
const PlatformLandingExecutiveAtlas = React.lazy(() => import("./PlatformLandingExecutiveAtlas"));
const PlatformLandingBusinessOs = React.lazy(() => import("./PlatformLandingBusinessOs"));
const MerchantDaylightLanding = React.lazy(() => import("./merchant-daylight/MerchantDaylightLanding"));
const MerchantDossierLanding = React.lazy(() => import("./merchant-dossier/MerchantDossierLanding"));

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

  const ActiveComponent = variantComponents[activeVariantId] || LandingPage;

  return (
    <Suspense fallback={<LandingPage />}>
      <ActiveComponent />
    </Suspense>
  );
};

const PlatformLandingHost: React.FC = () => <PlatformLandingRenderer />;

export default PlatformLandingHost;
