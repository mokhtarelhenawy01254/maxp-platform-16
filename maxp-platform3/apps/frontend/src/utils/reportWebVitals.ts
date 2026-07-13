/**
 * Web Vitals Reporting
 *
 * Reports Core Web Vitals metrics for performance monitoring
 */

const reportWebVitals = (onPerfEntry?: (metric: any) => void): void => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import("web-vitals")
      .then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
        if (typeof onCLS === "function") onCLS(onPerfEntry);
        if (typeof onINP === "function") onINP(onPerfEntry);
        if (typeof onFCP === "function") onFCP(onPerfEntry);
        if (typeof onLCP === "function") onLCP(onPerfEntry);
        if (typeof onTTFB === "function") onTTFB(onPerfEntry);
      })
      .catch((error) => {
        console.warn("Failed to load web-vitals:", error);
      });
  }
};

// Default reporter that logs to console in development
const defaultReporter = (metric: any) => {
  if (import.meta.env.DEV) {
    console.log("Web Vital:", metric);
  }

  // In production, you might want to send to analytics
  if (import.meta.env.PROD) {
    // Example: Send to Google Analytics
    // gtag('event', metric.name, {
    //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    //   event_label: metric.id,
    //   non_interaction: true,
    // });
  }
};

// Export with default reporter
export { reportWebVitals };
