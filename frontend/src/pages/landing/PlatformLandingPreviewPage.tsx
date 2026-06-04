import React from "react";
import { useParams } from "react-router-dom";
import { PlatformLandingRenderer } from "./PlatformLandingHost";

const PlatformLandingPreviewPage: React.FC = () => {
  const { variantId } = useParams<{ variantId: string }>();

  return <PlatformLandingRenderer forcedVariantId={variantId} />;
};

export default PlatformLandingPreviewPage;
