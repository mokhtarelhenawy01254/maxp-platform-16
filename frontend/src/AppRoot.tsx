import React, { Suspense, lazy } from "react";

const FullApp = lazy(() => import("./App"));

const LoadingFallback = (): React.ReactElement =>
  React.createElement(
    "div",
    { className: "min-h-screen flex flex-col items-center justify-center bg-white" },
    React.createElement("div", {
      className: "w-10 h-10 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin",
    }),
  );

const AppRoot = (): React.ReactElement => {
  return React.createElement(
    Suspense,
    { fallback: React.createElement(LoadingFallback, null) },
    React.createElement(FullApp, null),
  );
};

export default AppRoot;
