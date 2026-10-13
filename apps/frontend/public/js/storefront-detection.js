(function () {
  var hostname = window.location.hostname;
  var pathname = window.location.pathname || "/";
  var isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  var isStorefront = false;
  if (
    pathname === "/store" ||
    pathname.indexOf("/store/") === 0 ||
    pathname.indexOf("/product/") === 0 ||
    pathname.indexOf("/products/") === 0 ||
    pathname.indexOf("/shop/") === 0 ||
    pathname.indexOf("/cart") === 0 ||
    pathname.indexOf("/checkout") === 0 ||
    pathname.indexOf("/thank-you") === 0 ||
    pathname.indexOf("/collections/") === 0 ||
    pathname.indexOf("/pages/") === 0
  ) {
    isStorefront = true;
  } else if (
    pathname === "/register/affiliate" ||
    pathname === "/register/merchant" ||
    pathname.indexOf("/affiliate-register") === 0
  ) {
    isStorefront = false;
  } else if (isLocalhost) {
    isStorefront = false;
  } else if (hostname.slice(-10) === ".localhost") {
    isStorefront = true;
  } else {
    var parts = hostname.split(".");
    if (parts.length >= 3 && parts[0] !== "www") {
      isStorefront = true;
    }
  }

  // Flag consumed by the inline shell-preload script injected into index.html
  // (see maxp-preload-shell-chain plugin in vite.config.ts): storefront
  // visitors must not prefetch the admin shell chunks.
  window.__MAXP_IS_STOREFRONT__ = isStorefront;

  if (isStorefront) {
    var loadingEl = document.getElementById("initial-loading");
    if (loadingEl) {
      loadingEl.className = "storefront-loading";
      loadingEl.innerHTML = '<div class="storefront-spinner"></div>';
    }
  }
})();
