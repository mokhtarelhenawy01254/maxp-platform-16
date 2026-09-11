import React, { Suspense, lazy, useEffect } from "react";

const FullApp = lazy(() => import("./App"));

const AppMountNotifier: React.FC = () => {
  useEffect(() => {
    // Dismiss the HTML initial loading screen now that the React app is mounted
    const removeLoader = (window as unknown as { __MAXP_REMOVE_INITIAL_LOADER__?: () => void })
      .__MAXP_REMOVE_INITIAL_LOADER__;
    if (typeof removeLoader === "function") {
      removeLoader();
    } else {
      const el = document.getElementById("initial-loading");
      if (el) {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 200);
      }
      document.body.classList.add("app-ready");
    }
  }, []);
  return null;
};

// While FullApp chunk is downloading, keep the initial loading screen seamlessly active
// without flashing a secondary white screen with a different spinner
const LoadingFallback = (): React.ReactElement =>
  React.createElement("div", { className: "min-h-screen bg-transparent pointer-events-none" });

const AppRoot = (): React.ReactElement => {
  return React.createElement(
    Suspense,
    { fallback: React.createElement(LoadingFallback, null) },
    React.createElement(
      React.Fragment,
      null,
      React.createElement(FullApp, null),
      React.createElement(AppMountNotifier, null),
    ),
  );
};

export default AppRoot;
