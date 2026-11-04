import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StudioDeviceMode, StudioZoomLevel } from "../StudioTypes";

export interface StudioIframePortalProps {
  deviceMode: StudioDeviceMode;
  direction?: "rtl" | "ltr";
  zoomLevel?: StudioZoomLevel;
  className?: string;
  children: React.ReactNode;
}

export const StudioIframePortal: React.FC<StudioIframePortalProps> = ({
  deviceMode,
  direction = "rtl",
  zoomLevel = 1,
  className = "",
  children,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(800);

  const isJsdom =
    typeof navigator !== "undefined" &&
    (navigator.userAgent?.includes("jsdom") ||
      navigator.userAgent?.includes("Node.js"));

  useEffect(() => {
    if (isJsdom || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    // Set direction and base attributes
    doc.documentElement.dir = direction;
    doc.documentElement.lang = direction === "rtl" ? "ar" : "en";
    doc.documentElement.classList.add("storefront-canvas-isolated");

    // Copy head style elements from host to iframe
    const syncHeadStyles = () => {
      if (!doc.head) return;
      const hostStyles = document.querySelectorAll(
        'style, link[rel="stylesheet"], link[rel="preconnect"]'
      );
      hostStyles.forEach((node) => {
        // Prevent duplicate injection
        const key =
          node.tagName === "STYLE"
            ? node.textContent?.slice(0, 50)
            : (node as HTMLLinkElement).href;
        if (key && !doc.head.querySelector(`[data-synced-key="${encodeURIComponent(key)}"]`)) {
          const clone = node.cloneNode(true) as HTMLElement;
          clone.setAttribute("data-synced-key", encodeURIComponent(key));
          doc.head.appendChild(clone);
        }
      });

      // Inject clean canvas defaults inside iframe
      if (!doc.head.querySelector('[data-studio-base-styles="true"]')) {
        const baseStyle = doc.createElement("style");
        baseStyle.setAttribute("data-studio-base-styles", "true");
        baseStyle.textContent = `
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            background-color: transparent;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
          }
          /* Ensure smooth interaction */
          * {
            box-sizing: border-box;
          }
        `;
        doc.head.appendChild(baseStyle);
      }
    };

    syncHeadStyles();

    // Listen to dynamically injected styles in host head
    const observer = new MutationObserver(syncHeadStyles);
    observer.observe(document.head, { childList: true, subtree: true });

    // Ensure body mount container exists
    let container = doc.getElementById("studio-iframe-mount");
    if (!container) {
      container = doc.createElement("div");
      container.id = "studio-iframe-mount";
      container.className = "w-full min-h-screen bg-background text-foreground";
      doc.body.appendChild(container);
    }
    setMountNode(container);

    // Auto-measure iframe content height to avoid double scrollbars
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.target.scrollHeight || entry.contentRect.height;
        if (height > 100) {
          setIframeHeight(Math.max(height + 40, 700));
        }
      }
    });

    if (doc.body) {
      resizeObserver.observe(doc.body);
    }

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [direction, isJsdom]);

  // If in JSDOM / test environment, render inline fallback without breaking
  if (isJsdom) {
    return (
      <div
        data-testid="studio-iframe-fallback"
        className={`w-full min-h-screen bg-background ${className}`}
        dir={direction}
      >
        {children}
      </div>
    );
  }

  const getViewportWidth = () => {
    if (deviceMode === "mobile") return "390px";
    if (deviceMode === "tablet") return "768px";
    return "100%";
  };

  return (
    <div
      className={`studio-iframe-container relative mx-auto transition-all duration-200 shrink-0 ${className}`}
      style={{
        width: getViewportWidth(),
        maxWidth: getViewportWidth(),
      }}
    >
      <iframe
        ref={iframeRef}
        data-testid="studio-canvas-iframe"
        data-device-mode={deviceMode}
        title="Storefront Live Canvas"
        className="w-full border-0 shadow-none block"
        style={{
          height: `${iframeHeight}px`,
          minHeight: "750px",
          width: "100%",
          zoom: zoomLevel !== 1 ? zoomLevel : undefined,
        }}
      />
      {mountNode && createPortal(children, mountNode)}
    </div>
  );
};

export default StudioIframePortal;
