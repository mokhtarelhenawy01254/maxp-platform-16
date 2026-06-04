import { useEffect } from "react";

type ClaritySettings = {
  clarityProjectId?: string | null;
};

export const useClarityAnalytics = (settings?: ClaritySettings | null) => {
  useEffect(() => {
    if (!settings) return;

    const projectId = settings.clarityProjectId;
    const isProduction = import.meta.env.PROD || import.meta.env.MODE === "production";
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (!isProduction || !projectId || window.clarity) {
      return;
    }

    const injectClarity = () => {
      if (window.clarity) {
        return;
      }

      (function(c: any,l: any,a: any,r: any,i: any,t?: any,y?: any){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.defer=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", projectId);
    };

    // Strategy: Delay injection by 7s OR until user interacts (whichever comes first)
    const interactionEvents = ["pointermove", "scroll", "keydown", "click"];
    let injected = false;

    const handleInteraction = () => {
      if (injected) return;
      injected = true;
      injectClarity();
      
      // Cleanup listeners
      interactionEvents.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
    };

    // Setup listeners for early interaction
    interactionEvents.forEach(event => {
      window.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    // Fallback timer (7 seconds)
    const fallbackId = window.setTimeout(() => {
      if (!injected) {
        handleInteraction();
      }
    }, 7000);

    return () => {
      window.clearTimeout(fallbackId);
      interactionEvents.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [settings?.clarityProjectId]);
};

// Add clarity to window object type
declare global {
  interface Window {
    clarity?: any;
  }
}
