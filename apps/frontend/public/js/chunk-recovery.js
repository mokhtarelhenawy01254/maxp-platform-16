(function () {
  var RECOVERY_ATTEMPT_KEY = "maxp:chunk-load-recovery:last-attempt";
  var RECOVERY_SOURCE_KEY = "maxp:chunk-load-recovery:last-source";
  var RECOVERY_COUNT_KEY = "maxp:chunk-load-recovery:count";
  var RECOVERY_GUARD_WINDOW_MS = 15000;
  // Shared with the TS chunkLoadRecovery module: one automatic reload per
  // failure episode. The app clears this key after every healthy boot.
  var RECOVERY_MAX_AUTO_RELOADS = 1;
  var RECOVERY_QUERY_KEY = "__maxp_cache_recovery";
  var CHUNK_LOAD_ERROR_PATTERNS = [
    "failed to fetch dynamically imported module",
    "error loading dynamically imported module",
    "importing a module script failed",
    "failed to load module script",
    "unable to preload css",
    "loading chunk",
    "chunkloaderror",
    "vite:preloaderror",
    "err_cache_read_failure",
    "node_modules/.vite/deps/chunk-",
    "cannot read properties of undefined (reading 'default')",
    "cannot read property 'default' of undefined",
    "cannot read properties of null (reading 'default')",
    "undefined (reading 'default')",
    "failed to load lazy",
    "failed to load chunk"
  ];

  var stringifyError = function (error) {
    if (!error) {
      return "";
    }

    if (typeof error === "string") {
      return error;
    }

    if (error instanceof Error) {
      return [error.name, error.message, error.stack].filter(Boolean).join(" ");
    }

    if (typeof error === "object") {
      return [
        "name" in error ? String(error.name) : "",
        "message" in error ? String(error.message) : "",
        "type" in error ? String(error.type) : ""
      ].filter(Boolean).join(" ");
    }

    return String(error);
  };

  var isChunkLoadError = function (error) {
    var normalizedMessage = stringifyError(error).toLowerCase();

    return CHUNK_LOAD_ERROR_PATTERNS.some(function (pattern) {
      return normalizedMessage.indexOf(pattern) !== -1;
    });
  };

  var getRecentAttempt = function (now) {
    try {
      var lastAttempt = window.sessionStorage.getItem(RECOVERY_ATTEMPT_KEY);
      var lastAttemptAt = lastAttempt ? Number(lastAttempt) : 0;

      return (
        Number.isFinite(lastAttemptAt) &&
        now - lastAttemptAt < RECOVERY_GUARD_WINDOW_MS
      );
    } catch (_error) {
      return false;
    }
  };

  var markRecoveryAttempt = function (source, now) {
    try {
      window.sessionStorage.setItem(RECOVERY_ATTEMPT_KEY, String(now));
      window.sessionStorage.setItem(RECOVERY_SOURCE_KEY, source);
    } catch (_error) {
    }
  };

  var resolveFailedResourceUrl = function (event, error) {
    var target = event && event.target;
    var directUrl = target && (target.src || target.href);

    if (directUrl) {
      return directUrl;
    }

    var match = stringifyError(error).match(/https?:\/\/[^\s"')]+/);
    return match ? match[0] : "";
  };

  var refreshFailedResource = function (failedResourceUrl) {
    if (!failedResourceUrl || typeof window.fetch !== "function") {
      return Promise.resolve();
    }

    try {
      var url = new URL(failedResourceUrl, window.location.href);

      if (url.origin !== window.location.origin) {
        return Promise.resolve();
      }

      return window.fetch(url.href, { cache: "reload" }).catch(function () {
        return undefined;
      });
    } catch (_error) {
      return Promise.resolve();
    }
  };

  var reloadWithCacheBust = function () {
    try {
      if ("caches" in window && window.caches) {
        window.caches.keys().then(function (keys) {
          keys.forEach(function (k) { window.caches.delete(k); });
        });
      }
      if ("serviceWorker" in navigator && navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) {
            r.unregister();
          });
        });
      }
      try {
        window.localStorage.removeItem("maxp:sw_migrated");
      } catch (_s) {}
    } catch (_e) {}
    var url = new URL(window.location.href);
    url.searchParams.set(RECOVERY_QUERY_KEY, String(Date.now()));
    window.location.replace(url.toString());
  };

  var readRecoveryCount = function () {
    try {
      var count = window.sessionStorage.getItem(RECOVERY_COUNT_KEY);
      var parsed = count ? Number(count) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (_error) {
      return 0;
    }
  };

  var incrementRecoveryCount = function () {
    try {
      window.sessionStorage.setItem(
        RECOVERY_COUNT_KEY,
        String(readRecoveryCount() + 1)
      );
    } catch (_error) {
    }
  };

  var recoverFromChunkLoadError = function (source, error, event) {
    var failedResourceUrl = resolveFailedResourceUrl(event, error);
    var recoverySignal = [stringifyError(error), failedResourceUrl].join(" ");

    if (!isChunkLoadError(recoverySignal)) {
      return false;
    }

    var now = Date.now();

    if (getRecentAttempt(now)) {
      return false;
    }

    if (readRecoveryCount() >= RECOVERY_MAX_AUTO_RELOADS) {
      return false;
    }

    markRecoveryAttempt("early-" + source, now);
    incrementRecoveryCount();
    refreshFailedResource(failedResourceUrl).finally(function () {
      window.setTimeout(reloadWithCacheBust, 0);
    });

    return true;
  };

  window.addEventListener("error", function (event) {
    if (recoverFromChunkLoadError("error", event.error || event.message, event)) {
      event.preventDefault();
    }
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var reasonStr = String(reason && (reason.message || reason) || "").toLowerCase();
    if ((reason && reason.name === "AbortError") || reasonStr.indexOf("transition was skipped") !== -1) {
      event.preventDefault();
      return;
    }
    if (recoverFromChunkLoadError("unhandled-rejection", event.reason, event)) {
      event.preventDefault();
    }
  });

  window.addEventListener("vite:preloadError", function (event) {
    var error = event.payload || event.reason || event.error || event.detail || event.message;

    if (recoverFromChunkLoadError("vite-preload", error, event)) {
      event.preventDefault();
    }
  });
})();
