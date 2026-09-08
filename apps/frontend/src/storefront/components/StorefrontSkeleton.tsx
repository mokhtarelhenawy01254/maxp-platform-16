import React from "react";

const StorefrontSkeleton: React.FC = () => (
  <div
    className="storefront-shell flex min-h-screen w-full flex-col items-center justify-center bg-background"
    aria-busy="true"
  >
    <div className="h-8 w-8 rounded-full border-2 border-border/60 border-t-foreground/80 animate-spin" />
  </div>
);

export default StorefrontSkeleton;

