/**
 * View Transitions API helpers. Used to give the orders section a smooth
 * fade between routes (orders list, details, preparation, etc).
 *
 * The base CSS is already wired up in `src/styles/index.css`:
 *
 *   @view-transition { navigation: auto; }
 *   ::view-transition-old(root) / ::view-transition-new(root) { ... }
 *
 * This module is the JS side: it wraps the browser's
 * `document.startViewTransition` API behind a feature check and a
 * navigate function that the rest of the app can use.
 */

interface StartViewTransitionOptions {
  update: () => void | Promise<void>;
}

interface ViewTransitionLike {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

interface DocumentWithViewTransition extends Document {
  startViewTransition?: (
    options: StartViewTransitionOptions,
  ) => ViewTransitionLike;
}

/**
 * Run a state update inside a view transition. Falls back to running the
 * update directly if the browser does not support the API.
 */
export const runWithViewTransition = (
  update: () => void | Promise<void>,
): void => {
  if (typeof document === "undefined") {
    void update();
    return;
  }
  const doc = document as DocumentWithViewTransition;
  if (typeof doc.startViewTransition !== "function") {
    void update();
    return;
  }
  try {
    doc.startViewTransition({ update });
  } catch {
    // Some browsers (older Safari, mobile WebKit) throw on
    // startViewTransition when used outside certain contexts. We swallow
    // the error and run the update directly.
    void update();
  }
};

/**
 * Returns true if the browser supports the View Transitions API. Use this
 * to gate UI affordances that depend on it.
 */
export const supportsViewTransitions = (): boolean => {
  if (typeof document === "undefined") return false;
  const doc = document as DocumentWithViewTransition;
  return typeof doc.startViewTransition === "function";
};
