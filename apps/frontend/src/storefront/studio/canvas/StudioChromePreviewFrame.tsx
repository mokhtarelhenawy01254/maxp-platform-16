import React from "react";
import StorefrontHeader from "../../components/header/StorefrontHeader";
import StorefrontFooter from "../../components/footer/StorefrontFooter";

export interface StudioChromePreviewFrameProps {
  showChrome?: boolean;
  onSelectHeader?: () => void;
  onSelectFooter?: () => void;
  isHeaderSelected?: boolean;
  isFooterSelected?: boolean;
  children: React.ReactNode;
}

export const StudioChromePreviewFrame: React.FC<StudioChromePreviewFrameProps> = ({
  showChrome = true,
  onSelectHeader,
  onSelectFooter,
  isHeaderSelected = false,
  isFooterSelected = false,
  children,
}) => {
  if (!showChrome) {
    return <>{children}</>;
  }

  return (
    <div className="studio-chrome-preview-frame flex min-h-screen flex-col bg-background text-foreground">
      {/* Live Header preview with selectable frame */}
      <div
        data-testid="studio-live-header-frame"
        onClick={(e) => {
          e.stopPropagation();
          onSelectHeader?.();
        }}
        className={`relative cursor-pointer transition-all ${
          isHeaderSelected
            ? "ring-2 ring-primary ring-offset-2 z-30"
            : "hover:ring-1 hover:ring-primary/40"
        }`}
        title="انقر لتعديل الترويسة والقوائم (Header)"
      >
        <div className="pointer-events-none select-none">
          <StorefrontHeader isMinimal={false} />
        </div>
        <div className="absolute top-1 start-2 z-40 rounded bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs opacity-0 hover:opacity-100 transition-opacity">
          ترويسة المتجر (Header)
        </div>
      </div>

      {/* Main page content sections */}
      <main className="flex-1 w-full">{children}</main>

      {/* Live Footer preview with selectable frame */}
      <div
        data-testid="studio-live-footer-frame"
        onClick={(e) => {
          e.stopPropagation();
          onSelectFooter?.();
        }}
        className={`relative cursor-pointer transition-all ${
          isFooterSelected
            ? "ring-2 ring-primary ring-offset-2 z-30"
            : "hover:ring-1 hover:ring-primary/40"
        }`}
        title="انقر لتعديل التذييل وروابط الفوتر (Footer)"
      >
        <div className="pointer-events-none select-none">
          <StorefrontFooter isMinimal={false} />
        </div>
        <div className="absolute top-1 start-2 z-40 rounded bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs opacity-0 hover:opacity-100 transition-opacity">
          تذييل المتجر (Footer)
        </div>
      </div>
    </div>
  );
};

export default StudioChromePreviewFrame;
