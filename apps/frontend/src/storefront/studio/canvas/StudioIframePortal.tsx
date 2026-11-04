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

      // Sync font link specifically if present
      const hostFonts = document.getElementById("storefront-theme-fonts") as HTMLLinkElement | null;
      if (hostFonts) {
        let iframeFonts = doc.getElementById("storefront-theme-fonts") as HTMLLinkElement | null;
        if (!iframeFonts) {
          iframeFonts = doc.createElement("link");
          iframeFonts.id = "storefront-theme-fonts";
          iframeFonts.rel = "stylesheet";
          doc.head.appendChild(iframeFonts);
        }
        if (iframeFonts.href !== hostFonts.href) {
          iframeFonts.href = hostFonts.href;
        }
      }

      const hostStyles = document.querySelectorAll(
        'style, link[rel="stylesheet"], link[rel="preconnect"]'
      );
      hostStyles.forEach((node) => {
        if (node.id === "storefront-theme-fonts") return;
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

    // Copy theme CSS variables onto iframe documentElement and engine root
    const syncThemeVariables = () => {
      if (!doc?.documentElement) return;
      const hostRoot = document.documentElement;
      const hostComputed = getComputedStyle(hostRoot);
      const targetElement = (doc.getElementById("storefront-engine-root") || doc.documentElement) as HTMLElement;

      const coreVars = [
        "--primary",
        "--primary-foreground",
        "--background",
        "--foreground",
        "--card",
        "--card-foreground",
        "--muted",
        "--muted-foreground",
        "--border",
        "--radius",
        "--font-sans",
        "--font-heading",
        "--store-accent",
        "--store-radius",
        "--store-font-family",
      ];

      coreVars.forEach((v) => {
        const val = hostRoot.style.getPropertyValue(v) || hostComputed.getPropertyValue(v);
        if (val) {
          targetElement.style.setProperty(v, val.trim());
          doc.documentElement.style.setProperty(v, val.trim());
        }
      });

      // Copy --sf-* and --store-* variables
      for (let i = 0; i < hostRoot.style.length; i++) {
        const prop = hostRoot.style[i];
        if (prop.startsWith("--sf-") || prop.startsWith("--store-")) {
          const val = hostRoot.style.getPropertyValue(prop);
          if (val) {
            targetElement.style.setProperty(prop, val.trim());
            doc.documentElement.style.setProperty(prop, val.trim());
          }
        }
      }

      // Check if host has an element with id="storefront-engine-root"
      const hostEngineRoot = document.getElementById("storefront-engine-root");
      if (hostEngineRoot) {
        const engineComputed = getComputedStyle(hostEngineRoot);
        for (let i = 0; i < hostEngineRoot.style.length; i++) {
          const prop = hostEngineRoot.style[i];
          if (prop.startsWith("--")) {
            const val = hostEngineRoot.style.getPropertyValue(prop);
            if (val) {
              targetElement.style.setProperty(prop, val.trim());
              doc.documentElement.style.setProperty(prop, val.trim());
            }
          }
        }
        coreVars.forEach((v) => {
          const val = hostEngineRoot.style.getPropertyValue(v) || engineComputed.getPropertyValue(v);
          if (val) {
            targetElement.style.setProperty(v, val.trim());
            doc.documentElement.style.setProperty(v, val.trim());
          }
        });
      }
    };

    syncHeadStyles();
    syncThemeVariables();

    // Listen to dynamically injected styles and font changes in host head
    const observer = new MutationObserver(() => {
      syncHeadStyles();
      syncThemeVariables();
    });
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
    });

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

    // Keyboard bridge: in iframe.contentWindow, forward keydown events to parent window
    const contentWin = iframe.contentWindow;
    const handleIframeKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditingText =
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable;

      // Don't intercept typing in inputs unless Escape
      if (isEditingText && e.key !== "Escape") {
        return;
      }

      // Forward shortcut to parent window
      const forwardedEvent = new KeyboardEvent("keydown", {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
        which: e.which,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(forwardedEvent);
    };

    if (contentWin) {
      contentWin.addEventListener("keydown", handleIframeKeyDown);
    }

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      if (contentWin) {
        contentWin.removeEventListener("keydown", handleIframeKeyDown);
      }
    };
  }, [direction, isJsdom]);

  // If in JSDOM / test environment, render inline fallback without breaking
  if (isJsdom) {
    return (
      <div
        data-testid="studio-iframe-fallback"
        className={`w-full min-h-screen bg-background ${className}`}
        dir={direction}
        lang={direction === "rtl" ? "ar" : "en"}
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
        }}
      />
      {mountNode && createPortal(children, mountNode)}
    </div>
  );
};

export default StudioIframePortal;
