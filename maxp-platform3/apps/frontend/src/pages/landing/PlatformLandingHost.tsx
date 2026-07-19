import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import LandingPage from "../LandingPage";
import { platformSiteHomepageService } from "../../services/platformSiteHomepageService";
import PlatformLandingBusinessOs from "./PlatformLandingBusinessOs";
import PlatformLandingExecutiveAtlas from "./PlatformLandingExecutiveAtlas";
import PlatformLandingSalesFlow from "./PlatformLandingSalesFlow";
import {
  DEFAULT_PLATFORM_LANDING_VARIANT_ID,
  type PlatformLandingVariantId,
  getPlatformLandingVariant,
  isPlatformLandingVariantId,
} from "./platformLandingRegistry";

const variantComponents: Record<
  PlatformLandingVariantId,
  React.ComponentType
> = {
  "enterprise-os": LandingPage,
  "sales-flow": PlatformLandingSalesFlow,
  "executive-atlas": PlatformLandingExecutiveAtlas,
  "business-os": PlatformLandingBusinessOs,
};

interface PlatformLandingRendererProps {
  forcedVariantId?: string | null;
}

export const PlatformLandingRenderer: React.FC<
  PlatformLandingRendererProps
> = ({ forcedVariantId }) => {
  const location = useLocation();
  const [activeVariantId, setActiveVariantId] =
    useState<PlatformLandingVariantId>(DEFAULT_PLATFORM_LANDING_VARIANT_ID);
  const [loading, setLoading] = useState(!forcedVariantId);

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
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await platformSiteHomepageService.getPublicSettings();
        if (!isMounted) {
          return;
        }

        setActiveVariantId(
          isPlatformLandingVariantId(settings.activeLandingId)
            ? settings.activeLandingId
            : DEFAULT_PLATFORM_LANDING_VARIANT_ID,
        );
      } catch (error) {
        console.error(
          "Failed to load platform landing homepage settings, falling back to default variant.",
          error,
        );

        if (isMounted) {
          setActiveVariantId(DEFAULT_PLATFORM_LANDING_VARIANT_ID);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [resolvedOverride]);

  useEffect(() => {
    const variant = getPlatformLandingVariant(activeVariantId);
    document.title = `${variant.label} | Max P`;
  }, [activeVariantId]);

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white"
      >
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-teal-300" />
          <p className="text-sm font-semibold text-slate-300">
            جاري تجهيز الصفحة الرئيسية العامة...
          </p>
        </div>
      </div>
    );
  }

  const ActiveComponent = variantComponents[activeVariantId] || LandingPage;

  return <ActiveComponent />;
};

const PlatformLandingHost: React.FC = () => <PlatformLandingRenderer />;

export default PlatformLandingHost;
