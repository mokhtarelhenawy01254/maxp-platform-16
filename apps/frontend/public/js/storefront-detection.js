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

  if (isStorefront) {
    var loadingEl = document.getElementById("initial-loading");
    if (loadingEl) {
      loadingEl.className = "storefront-loading";
      loadingEl.innerHTML = [
        '<header class="skeleton-header">',
        '  <div class="skeleton-logo skeleton-pulse"></div>',
        '  <div class="skeleton-nav">',
        '    <div class="skeleton-nav-item skeleton-pulse"></div>',
        '    <div class="skeleton-nav-item skeleton-pulse"></div>',
        '    <div class="skeleton-nav-item skeleton-pulse"></div>',
        '  </div>',
        '  <div class="skeleton-actions">',
        '    <div class="skeleton-icon skeleton-pulse"></div>',
        '    <div class="skeleton-icon skeleton-pulse"></div>',
        '  </div>',
        '</header>',
        '<main class="skeleton-main">',
        '  <div class="skeleton-hero skeleton-pulse"></div>',
        '  <div class="skeleton-container">',
        '    <div class="skeleton-title skeleton-pulse"></div>',
        '    <div class="skeleton-grid">',
        '      <div class="skeleton-card">',
        '        <div class="skeleton-card-media skeleton-pulse"></div>',
        '        <div class="skeleton-card-title skeleton-pulse"></div>',
        '        <div class="skeleton-card-price skeleton-pulse"></div>',
        '      </div>',
        '      <div class="skeleton-card">',
        '        <div class="skeleton-card-media skeleton-pulse"></div>',
        '        <div class="skeleton-card-title skeleton-pulse"></div>',
        '        <div class="skeleton-card-price skeleton-pulse"></div>',
        '      </div>',
        '      <div class="skeleton-card">',
        '        <div class="skeleton-card-media skeleton-pulse"></div>',
        '        <div class="skeleton-card-title skeleton-pulse"></div>',
        '        <div class="skeleton-card-price skeleton-pulse"></div>',
        '      </div>',
        '      <div class="skeleton-card">',
        '        <div class="skeleton-card-media skeleton-pulse"></div>',
        '        <div class="skeleton-card-title skeleton-pulse"></div>',
        '        <div class="skeleton-card-price skeleton-pulse"></div>',
        '      </div>',
        '    </div>',
        '  </div>',
        '</main>'
      ].join("");
    }
  }
})();
