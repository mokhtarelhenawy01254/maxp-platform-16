import React from "react";
import GracefulHeader from "../GracefulHeader";
import { useStorefrontHeaderController } from "./useStorefrontHeaderController";
import { MensGroomingHeader } from "./subheaders/MensGroomingHeader";
import { RedlineAutoHeader } from "./subheaders/RedlineAutoHeader";
import { KhemetLuxeHeader } from "./subheaders/KhemetLuxeHeader";
import { ButcherAtelierHeader } from "./subheaders/ButcherAtelierHeader";
import { LegacyDefaultOldHeader } from "./subheaders/LegacyDefaultOldHeader";
import { PcHubHeader } from "./subheaders/PcHubHeader";
import { DigitalCommandHeader } from "./subheaders/DigitalCommandHeader";
import { VelaFashionHeader } from "./subheaders/VelaFashionHeader";
import { StandardStorefrontHeader } from "./subheaders/StandardStorefrontHeader";
import { MarketplaceHeader } from "./subheaders/MarketplaceHeader";
import {
  StorefrontHomeLink,
  resolveStorefrontDocumentLanguage,
  parsePositiveNumber,
  ARABIC_SCRIPT_PATTERN,
  isRuntimePharmacyThemeId,
} from "./storefrontHeaderHelpers";
import type { StorefrontHeaderProps } from "./storefrontHeaderTypes";

/**
 * StorefrontHeader coordinator component.
 * Dispatches to specialized domain header layouts based on active storefront theme configuration.
 */
export const StorefrontHeader: React.FC<StorefrontHeaderProps> = (props) => {
  const controller = useStorefrontHeaderController(props);
  const { isMinimal, isGracefulTheme, isMensGroomingPro, isRedlineAutoHeader, isKhemetLuxe, isKhemetUnifiedHeaderPath, isButcherAtelierHeader, isLegacyDefaultOldHeader, isPcHub, isDigitalCommandHeader, isVelaFashionHeader, isMarketplaceBazaarHeader } = controller;

  // 0. Department-store marketplace header (navy utility + search + red category bar)
  if (isMarketplaceBazaarHeader && !isMinimal) {
    return <MarketplaceHeader controller={controller} />;
  }

  // 1. Soft Graceful theme header
  if (isGracefulTheme && !isMinimal) {
    return <GracefulHeader search={props.search} />;
  }

  // 2. Mens Grooming Pro dark navy header
  if (isMensGroomingPro && !isMinimal) {
    return <MensGroomingHeader controller={controller} />;
  }

  // 3. Redline Auto telemetry rail header
  if (isRedlineAutoHeader && !isMinimal) {
    return <RedlineAutoHeader controller={controller} />;
  }

  // 4. Khemet Luxe minimal (checkout) or unified luxury fashion header
  if ((isKhemetLuxe && isMinimal) || isKhemetUnifiedHeaderPath) {
    return <KhemetLuxeHeader controller={controller} />;
  }

  // 5. Butcher Atelier black label cold-chain header
  if (isButcherAtelierHeader && !isMinimal) {
    return <ButcherAtelierHeader controller={controller} />;
  }

  // 6. Legacy default / Fastly header
  if (isLegacyDefaultOldHeader && !isMinimal) {
    return <LegacyDefaultOldHeader controller={controller} />;
  }

  // 7. PC Hub high-density electronics header
  if (isPcHub && !isMinimal) {
    return <PcHubHeader controller={controller} />;
  }

  // 8. Digital Command tech desk header
  if (isDigitalCommandHeader && !isMinimal) {
    return <DigitalCommandHeader controller={controller} />;
  }

  // 9. Vela Fashion editorial header
  if (isVelaFashionHeader && !isMinimal) {
    return <VelaFashionHeader controller={controller} />;
  }

  // 10. Standard storefront multi-theme responsive header
  return <StandardStorefrontHeader controller={controller} />;
};

const MemoStorefrontHeader = React.memo(StorefrontHeader);
export default MemoStorefrontHeader;

export {
  StorefrontHomeLink,
  resolveStorefrontDocumentLanguage,
  parsePositiveNumber,
  ARABIC_SCRIPT_PATTERN,
  isRuntimePharmacyThemeId,
};
export type { StorefrontHeaderProps } from "./storefrontHeaderTypes";
