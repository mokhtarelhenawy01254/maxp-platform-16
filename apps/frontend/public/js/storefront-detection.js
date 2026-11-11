(function () {
  var hostname = (window.location.hostname || "").toLowerCase();
  var pathname = window.location.pathname || "/";
  var search = window.location.search || "";
  var isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  var hasPreviewParam =
    search.indexOf("previewTheme=") !== -1 ||
    search.indexOf("storefrontSubdomain=") !== -1;

  // Portals, registration, and proposal routes MUST run inside the main platform shell
  // even when accessed from a tenant subdomain (*.maxp.online) or custom domain.
  var nonStorefrontPrefixes = [
    "/parent",
    "/teacher",
    "/portal",
    "/academy",
    "/doctor",
    "/patient",
    "/dental-portal",
    "/account",
    "/wholesale-portal",
    "/courier-portal",
    "/client-portal",
    "/agency/client-portal",
    "/auth/customer-register",
    "/register/affiliate",
    "/register/merchant",
    "/affiliate-register",
    "/proposal",
    "/agency/proposal",
  ];

  function matchesPrefix(path, prefix) {
    return path === prefix || path.indexOf(prefix + "/") === 0;
  }

  var isNonStorefront = false;
  for (var i = 0; i < nonStorefrontPrefixes.length; i++) {
    if (matchesPrefix(pathname, nonStorefrontPrefixes[i])) {
      isNonStorefront = true;
      break;
    }
  }

  var isAdminProduct =
    /\/products\/(?:new|trash|reviews|import-|settings\/upsell)/.test(pathname) ||
    /\/products\/[^/]+\/edit$/.test(pathname);

  var isStorefront = false;
  if (isNonStorefront || isAdminProduct) {
    isStorefront = false;
  } else if (isLocalhost && !hasPreviewParam) {
    isStorefront = false;
  } else if (
    pathname === "/store" ||
    pathname.indexOf("/store/") === 0 ||
    pathname.indexOf("/product/") === 0 ||
    pathname.indexOf("/products/") === 0 ||
    pathname.indexOf("/shop/") === 0 ||
    pathname.indexOf("/cart") === 0 ||
    pathname.indexOf("/checkout") === 0 ||
    pathname.indexOf("/order-offer") === 0 ||
    pathname.indexOf("/thank-you") === 0 ||
    pathname.indexOf("/collections/") === 0 ||
    pathname.indexOf("/pages/") === 0
  ) {
    isStorefront = true;
  } else if (hasPreviewParam) {
    isStorefront = true;
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
