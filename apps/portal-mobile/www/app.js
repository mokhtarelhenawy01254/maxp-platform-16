(function () {
  'use strict';

  var STORAGE_KEY = 'maxp_portal_tenant_v1';
  var DEFAULT_API_BASE = 'https://maxp.online';

  var PORTAL_START_PATHS = {
    parent: '/parent/login',
    teacher: '/teacher/login',
    student: '/portal/login',
    academy: '/academy/login',
    doctor: '/doctor/login',
    patient: '/patient/login',
    dental: '/dental-portal/login',
    courier: '/courier-portal/login',
    wholesale: '/wholesale-portal/login',
    client: '/client-portal/login',
    customer: '/account',
  };

  var state = {
    config: {
      flavor: 'parent',
      appId: 'online.maxp.parent',
      appName: 'بوابة ولي الأمر - MaxP',
      accentColor: '#059669',
      accentDarkColor: '#047857',
      badgeLabel: 'بوابة ولي الأمر',
      title: 'اربط حسابك بالمدرسة أو المركز',
      subtitle: 'أدخل كود المؤسسة أو ابحث بالاسم.',
      defaultPortal: 'parent',
      startPath: '/parent/login',
      directPlatformPath: '/parent/login',
      directPlatformLabel: 'تسجيل الدخول عبر الرقم على المنصة مباشرة (maxp.online)',
      lookupMode: 'required',
      lookupPlaceholder: 'كود المؤسسة (مثل SWAN01) أو الاسم…',
      apiBaseUrl: DEFAULT_API_BASE,
      portals: [{ key: 'parent', label: 'بوابة ولي الأمر', loginPath: '/parent/login' }],
    },
    selectedPortal: 'parent',
    pendingUrl: null,
    redirectTimer: null,
  };

  var els = {
    metaThemeColor: document.getElementById('metaThemeColor'),
    offlineBanner: document.getElementById('offlineBanner'),
    retryBtn: document.getElementById('retryBtn'),
    updateBanner: document.getElementById('updateBanner'),
    updateTitle: document.getElementById('updateTitle'),
    updateDownloadLink: document.getElementById('updateDownloadLink'),
    updateDismissBtn: document.getElementById('updateDismissBtn'),
    savedView: document.getElementById('savedView'),
    savedAvatar: document.getElementById('savedAvatar'),
    savedCodeBadge: document.getElementById('savedCodeBadge'),
    savedTitle: document.getElementById('savedTitle'),
    savedSubtitle: document.getElementById('savedSubtitle'),
    openSavedBtn: document.getElementById('openSavedBtn'),
    switchTenantBtn: document.getElementById('switchTenantBtn'),
    connectView: document.getElementById('connectView'),
    flavorBadge: document.getElementById('flavorBadge'),
    appTitle: document.getElementById('appTitle'),
    appSubtitle: document.getElementById('appSubtitle'),
    directPrimaryWrap: document.getElementById('directPrimaryWrap'),
    directPrimaryBtn: document.getElementById('directPrimaryBtn'),
    lookupForm: document.getElementById('lookupForm'),
    lookupInput: document.getElementById('lookupInput'),
    lookupBtn: document.getElementById('lookupBtn'),
    portalPickerWrap: document.getElementById('portalPickerWrap'),
    portalPills: document.getElementById('portalPills'),
    statusMsg: document.getElementById('statusMsg'),
    resultsList: document.getElementById('resultsList'),
    directFallbackBtn: document.getElementById('directFallbackBtn'),
  };

  function getCapPlugin(name) {
    return window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null;
  }

  function sanitizeSlug(raw) {
    var val = String(raw || '').trim().toLowerCase();
    if (!val || val === 'www' || val === 'maxp' || val === 'api') return '';
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(val) ? val : '';
  }

  function sanitizePortal(raw) {
    var val = String(raw || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(PORTAL_START_PATHS, val) ? val : '';
  }

  function hexToRgba(hex, alpha) {
    var clean = String(hex || '').replace('#', '');
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return 'rgba(5, 150, 105, ' + alpha + ')';
    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function applyTheme(accent, accentDark) {
    var root = document.documentElement;
    var color = accent || state.config.accentColor || '#059669';
    var dark = accentDark || state.config.accentDarkColor || color;
    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-dark', dark);
    root.style.setProperty('--accent-soft', hexToRgba(color, 0.1));
    if (els.metaThemeColor) {
      els.metaThemeColor.setAttribute('content', color);
    }
  }

  async function readSavedTenant() {
    var prefs = getCapPlugin('Preferences');
    if (prefs && typeof prefs.get === 'function') {
      try {
        var res = await prefs.get({ key: STORAGE_KEY });
        if (res && res.value) {
          return JSON.parse(res.value);
        }
      } catch (_) {}
    }
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function writeSavedTenant(tenant) {
    var payload = JSON.stringify(tenant);
    try {
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch (_) {}
    var prefs = getCapPlugin('Preferences');
    if (prefs && typeof prefs.set === 'function') {
      try {
        await prefs.set({ key: STORAGE_KEY, value: payload });
      } catch (_) {}
    }
  }

  async function clearSavedTenant() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    var prefs = getCapPlugin('Preferences');
    if (prefs && typeof prefs.remove === 'function') {
      try {
        await prefs.remove({ key: STORAGE_KEY });
      } catch (_) {}
    }
  }

  function getPortalStartPath(portalKey) {
    var portals = Array.isArray(state.config.portals) ? state.config.portals : [];
    for (var i = 0; i < portals.length; i++) {
      if (portals[i].key === portalKey && portals[i].loginPath) {
        return portals[i].loginPath;
      }
    }
    return PORTAL_START_PATHS[portalKey] || state.config.startPath || '/parent/login';
  }

  function buildTenantUrl(tenant) {
    var slug = sanitizeSlug(tenant && tenant.slug);
    var portal = sanitizePortal(tenant && tenant.portal) || state.config.defaultPortal || 'parent';
    var startPath = (tenant && tenant.path && tenant.path.charAt(0) === '/')
      ? tenant.path
      : getPortalStartPath(portal);
    if (slug) {
      return 'https://' + slug + '.maxp.online' + startPath;
    }
    return DEFAULT_API_BASE + startPath;
  }

  function parseDeepLink(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    var parsed;
    try {
      parsed = new URL(rawUrl.trim());
    } catch (_) {
      return null;
    }

    var host = parsed.hostname.toLowerCase();
    var pathname = parsed.pathname || '/';
    var queryPortal = sanitizePortal(parsed.searchParams.get('portal'));
    var querySlug = sanitizeSlug(parsed.searchParams.get('slug'));

    // https://maxp.online/i/<slug>?portal=parent
    if (host === 'maxp.online' || host === 'www.maxp.online') {
      var inviteMatch = pathname.match(/^\/i\/([a-z0-9-]+)(?:\/.*)?$/i);
      if (inviteMatch) {
        var inviteSlug = sanitizeSlug(inviteMatch[1]);
        if (inviteSlug) {
          return {
            slug: inviteSlug,
            portal: queryPortal || state.config.defaultPortal || 'parent',
          };
        }
      }
      if (querySlug) {
        return {
          slug: querySlug,
          portal: queryPortal || state.config.defaultPortal || 'parent',
        };
      }
      return {
        slug: '',
        portal: queryPortal || inferPortalFromPath(pathname) || state.config.defaultPortal,
        path: pathname !== '/' ? pathname + parsed.search : '',
      };
    }

    // https://<slug>.maxp.online/...
    if (host.endsWith('.maxp.online')) {
      var subSlug = sanitizeSlug(host.slice(0, -'.maxp.online'.length));
      if (subSlug) {
        return {
          slug: subSlug,
          portal: queryPortal || inferPortalFromPath(pathname) || state.config.defaultPortal,
          path: pathname && pathname !== '/' ? pathname + parsed.search : '',
        };
      }
    }

    // Custom scheme fallback e.g. online.maxp.parent://open?slug=...
    if (querySlug) {
      return {
        slug: querySlug,
        portal: queryPortal || state.config.defaultPortal,
      };
    }

    return null;
  }

  function inferPortalFromPath(pathname) {
    var p = String(pathname || '').toLowerCase();
    if (p.indexOf('/parent') === 0) return 'parent';
    if (p.indexOf('/teacher') === 0) return 'teacher';
    if (p.indexOf('/portal') === 0) return 'student';
    if (p.indexOf('/academy') === 0) return 'academy';
    if (p.indexOf('/doctor') === 0) return 'doctor';
    if (p.indexOf('/patient') === 0) return 'patient';
    if (p.indexOf('/dental-portal') === 0) return 'dental';
    if (p.indexOf('/courier-portal') === 0) return 'courier';
    if (p.indexOf('/wholesale-portal') === 0) return 'wholesale';
    if (p.indexOf('/client-portal') === 0) return 'client';
    if (p.indexOf('/account') === 0) return 'customer';
    return '';
  }

  function setOfflineState(isOffline) {
    if (isOffline) {
      els.offlineBanner.classList.remove('hidden');
    } else {
      els.offlineBanner.classList.add('hidden');
    }
  }

  function setStatus(message, isError) {
    if (!message) {
      els.statusMsg.classList.add('hidden');
      els.statusMsg.classList.remove('is-error');
      els.statusMsg.textContent = '';
      return;
    }
    els.statusMsg.textContent = message;
    els.statusMsg.classList.remove('hidden');
    if (isError) {
      els.statusMsg.classList.add('is-error');
    } else {
      els.statusMsg.classList.remove('is-error');
    }
  }

  function navigateTo(url) {
    state.pendingUrl = url;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setOfflineState(true);
      return;
    }
    setOfflineState(false);
    window.location.replace(url);
  }

  function showConnectView() {
    if (state.redirectTimer) {
      clearTimeout(state.redirectTimer);
      state.redirectTimer = null;
    }
    els.savedView.classList.add('hidden');
    els.connectView.classList.remove('hidden');
  }

  function showSavedView(tenant) {
    var targetUrl = buildTenantUrl(tenant);
    state.pendingUrl = targetUrl;
    els.connectView.classList.add('hidden');
    els.savedView.classList.remove('hidden');

    if (tenant.primaryColor) {
      applyTheme(tenant.primaryColor, tenant.primaryColor);
    }

    var displayName = tenant.name || tenant.slug || state.config.appName;
    els.savedTitle.textContent = displayName;
    els.savedSubtitle.textContent = 'جارٍ فتح البوابة…';

    if (tenant.publicCode) {
      els.savedCodeBadge.textContent = tenant.publicCode;
      els.savedCodeBadge.classList.remove('hidden');
    } else {
      els.savedCodeBadge.classList.add('hidden');
    }

    els.savedAvatar.innerHTML = '';
    if (tenant.logo) {
      var img = document.createElement('img');
      img.src = tenant.logo.indexOf('http') === 0 ? tenant.logo : DEFAULT_API_BASE + tenant.logo;
      img.alt = displayName;
      img.onerror = function () {
        els.savedAvatar.textContent = displayName.charAt(0).toUpperCase() || 'M';
      };
      els.savedAvatar.appendChild(img);
    } else {
      els.savedAvatar.textContent = displayName.charAt(0).toUpperCase() || 'M';
    }

    if (navigator.onLine === false) {
      setOfflineState(true);
      els.savedSubtitle.textContent = 'في انتظار عودة الاتصال بالإنترنت…';
      return;
    }

    state.redirectTimer = setTimeout(function () {
      navigateTo(targetUrl);
    }, 380);
  }

  function normalizeLookupCompanies(payload) {
    if (!payload || typeof payload !== 'object') return [];
    var rawList = [];
    if (Array.isArray(payload.data)) rawList = payload.data;
    else if (payload.data && Array.isArray(payload.data.items)) rawList = payload.data.items;
    else if (payload.data && Array.isArray(payload.data.companies)) rawList = payload.data.companies;
    else if (Array.isArray(payload.companies)) rawList = payload.companies;
    else if (Array.isArray(payload.items)) rawList = payload.items;
    else if (payload.data && payload.data.slug) rawList = [payload.data];
    else if (payload.slug) rawList = [payload];

    return rawList
      .map(function (item) {
        var slug = sanitizeSlug(item.slug);
        if (!slug) return null;
        return {
          companyId: item.companyId || item.id || null,
          name: String(item.name || slug),
          slug: slug,
          publicCode: item.publicCode ? String(item.publicCode).toUpperCase() : '',
          logo: item.logo || null,
          primaryColor: item.primaryColor || null,
        };
      })
      .filter(Boolean);
  }

  async function lookupCompanies(query) {
    var q = String(query || '').trim();
    if (!q) return [];
    var base = state.config.apiBaseUrl || DEFAULT_API_BASE;
    var lookupUrl = base + '/api/v1/public/portal/lookup?q=' + encodeURIComponent(q);

    var response = await fetch(lookupUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      var json = await response.json();
      return normalizeLookupCompanies(json);
    }

    if (response.status === 404) {
      var codeUrl = base + '/api/v1/public/portal/branding?code=' + encodeURIComponent(q);
      var fallbackRes = await fetch(codeUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (fallbackRes.ok) {
        var fallbackJson = await fallbackRes.json();
        return normalizeLookupCompanies(fallbackJson);
      }
      if (fallbackRes.status === 404) return [];
      throw new Error('HTTP ' + fallbackRes.status);
    }

    throw new Error('HTTP ' + response.status);
  }

  function renderResults(companies) {
    els.resultsList.innerHTML = '';
    if (!companies.length) {
      setStatus('لم يتم العثور على مؤسسة مطابقة. تأكد من الكود أو الاسم.', true);
      return;
    }

    setStatus('', false);
    companies.forEach(function (company) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'company-item';

      var avatar = document.createElement('div');
      avatar.className = 'company-avatar';
      if (company.logo) {
        var img = document.createElement('img');
        img.src = company.logo.indexOf('http') === 0 ? company.logo : DEFAULT_API_BASE + company.logo;
        img.alt = company.name;
        img.onerror = function () {
          avatar.textContent = company.name.charAt(0).toUpperCase() || 'M';
        };
        avatar.appendChild(img);
      } else {
        avatar.textContent = company.name.charAt(0).toUpperCase() || 'M';
      }

      var meta = document.createElement('div');
      meta.className = 'company-meta';

      var nameEl = document.createElement('span');
      nameEl.className = 'company-name';
      nameEl.textContent = company.name;
      meta.appendChild(nameEl);

      var subEl = document.createElement('span');
      subEl.className = 'company-sub';
      if (company.publicCode) {
        var codeChip = document.createElement('span');
        codeChip.className = 'code-chip';
        codeChip.textContent = company.publicCode;
        subEl.appendChild(codeChip);
      }
      var domainText = document.createElement('span');
      domainText.textContent = company.slug + '.maxp.online';
      subEl.appendChild(domainText);
      meta.appendChild(subEl);

      var goEl = document.createElement('span');
      goEl.className = 'company-go';
      goEl.textContent = 'فتح';

      btn.appendChild(avatar);
      btn.appendChild(meta);
      btn.appendChild(goEl);

      btn.addEventListener('click', async function () {
        var tenant = {
          slug: company.slug,
          name: company.name,
          publicCode: company.publicCode,
          logo: company.logo,
          primaryColor: company.primaryColor,
          portal: state.selectedPortal || state.config.defaultPortal || 'parent',
          updatedAt: Date.now(),
        };
        await writeSavedTenant(tenant);
        navigateTo(buildTenantUrl(tenant));
      });

      els.resultsList.appendChild(btn);
    });
  }

  function renderPortalPills() {
    var portals = Array.isArray(state.config.portals) ? state.config.portals : [];
    if (portals.length <= 1) {
      els.portalPickerWrap.classList.add('hidden');
      return;
    }

    els.portalPickerWrap.classList.remove('hidden');
    els.portalPills.innerHTML = '';

    portals.forEach(function (item) {
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'pill';
      pill.setAttribute('role', 'radio');
      pill.setAttribute('aria-checked', item.key === state.selectedPortal ? 'true' : 'false');
      pill.textContent = item.label;
      pill.addEventListener('click', function () {
        state.selectedPortal = item.key;
        renderPortalPills();
      });
      els.portalPills.appendChild(pill);
    });
  }

  function applyShellConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    state.config = Object.assign({}, state.config, cfg);
    state.selectedPortal = sanitizePortal(cfg.defaultPortal) || 'parent';

    document.title = cfg.appName || 'MaxP Portal';
    applyTheme(cfg.accentColor, cfg.accentDarkColor);

    els.flavorBadge.textContent = cfg.badgeLabel || 'MaxP';
    els.appTitle.textContent = cfg.title || 'اربط حسابك بالمؤسسة';
    els.appSubtitle.textContent = cfg.subtitle || '';
    els.lookupInput.placeholder = cfg.lookupPlaceholder || 'مثال: SWAN01';
    els.directFallbackBtn.textContent =
      cfg.directPlatformLabel || 'تسجيل الدخول عبر الرقم على المنصة مباشرة (maxp.online)';

    if (cfg.lookupMode === 'optional') {
      els.directPrimaryWrap.classList.remove('hidden');
      els.directPrimaryBtn.textContent = cfg.directPlatformLabel || 'فتح البوابة مباشرة';
      els.directFallbackBtn.parentElement.classList.add('hidden');
    } else {
      els.directPrimaryWrap.classList.add('hidden');
      els.directFallbackBtn.parentElement.classList.remove('hidden');
    }

    renderPortalPills();
  }

  async function loadShellConfig() {
    try {
      var res = await fetch('shell-config.json', { cache: 'no-store' });
      if (res.ok) {
        var json = await res.json();
        applyShellConfig(json);
      }
    } catch (_) {
      applyShellConfig(state.config);
    }
  }

  async function handleIncomingDeepLink(url) {
    var parsed = parseDeepLink(url);
    if (!parsed) return false;
    if (parsed.slug) {
      var tenant = {
        slug: parsed.slug,
        name: parsed.slug,
        portal: parsed.portal || state.config.defaultPortal || 'parent',
        path: parsed.path || '',
        updatedAt: Date.now(),
      };
      await writeSavedTenant(tenant);
      navigateTo(buildTenantUrl(tenant));
      return true;
    }
    if (parsed.path) {
      navigateTo(DEFAULT_API_BASE + parsed.path);
      return true;
    }
    return false;
  }

  function setupNativeListeners() {
    var appPlugin = getCapPlugin('App');
    if (appPlugin && typeof appPlugin.addListener === 'function') {
      appPlugin.addListener('appUrlOpen', function (event) {
        if (event && event.url) {
          handleIncomingDeepLink(event.url);
        }
      });
      appPlugin.addListener('backButton', function (event) {
        if (event && event.canGoBack) {
          window.history.back();
        } else if (window.history && window.history.length > 1 && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
          window.history.back();
        } else if (typeof appPlugin.exitApp === 'function') {
          appPlugin.exitApp();
        }
      });
    }

    var pushPlugin = getCapPlugin('PushNotifications');
    if (pushPlugin && typeof pushPlugin.addListener === 'function') {
      pushPlugin.addListener('pushNotificationActionPerformed', function (action) {
        var targetUrl = action && action.notification && action.notification.data && action.notification.data.url;
        if (targetUrl) {
          handleIncomingDeepLink(targetUrl);
        }
      });
    }
  }

  function bindUiEvents() {
    window.addEventListener('online', function () {
      setOfflineState(false);
      if (state.pendingUrl && !els.savedView.classList.contains('hidden')) {
        navigateTo(state.pendingUrl);
      }
    });

    window.addEventListener('offline', function () {
      setOfflineState(true);
    });

    if (els.updateDismissBtn && els.updateBanner) {
      els.updateDismissBtn.addEventListener('click', function () {
        els.updateBanner.classList.add('hidden');
      });
    }

    els.retryBtn.addEventListener('click', function () {
      if (navigator.onLine === false) {
        setOfflineState(true);
        return;
      }
      setOfflineState(false);
      if (state.pendingUrl) {
        navigateTo(state.pendingUrl);
      }
    });

    els.openSavedBtn.addEventListener('click', function () {
      if (state.pendingUrl) {
        navigateTo(state.pendingUrl);
      }
    });

    els.switchTenantBtn.addEventListener('click', async function () {
      await clearSavedTenant();
      applyTheme(state.config.accentColor, state.config.accentDarkColor);
      showConnectView();
    });

    function openDirectPlatform() {
      var directPath = state.config.directPlatformPath || '/parent/login';
      navigateTo(DEFAULT_API_BASE + directPath);
    }

    els.directPrimaryBtn.addEventListener('click', openDirectPlatform);
    els.directFallbackBtn.addEventListener('click', openDirectPlatform);

    els.lookupForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      var query = els.lookupInput.value.trim();
      if (!query) {
        setStatus('أدخل كود المؤسسة أو اسمها للبحث.', true);
        els.lookupInput.focus();
        return;
      }

      if (navigator.onLine === false) {
        setOfflineState(true);
        return;
      }

      els.lookupBtn.disabled = true;
      setStatus('جارٍ البحث عن المؤسسة…', false);
      els.resultsList.innerHTML = '';

      try {
        var companies = await lookupCompanies(query);
        setOfflineState(false);
        renderResults(companies);
      } catch (_) {
        setOfflineState(navigator.onLine === false);
        setStatus('تعذر الاتصال بالخادم حالياً. حاول مرة أخرى.', true);
      } finally {
        els.lookupBtn.disabled = false;
      }
    });
  }

  async function checkAppUpdateNonBlocking() {
    if (typeof fetch !== 'function' || !els.updateBanner) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    var currentVersionCode = Number(state.config.versionCode || 1);
    var appKey = encodeURIComponent(state.config.appKey || 'portal');
    var url = DEFAULT_API_BASE + '/api/v1/app/version/android?app=' + appKey;
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, 4000)
      : null;

    try {
      var opts = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      if (controller) opts.signal = controller.signal;
      var res = await fetch(url, opts);
      if (!res || !res.ok) return;
      var json = await res.json();
      var data = json && json.data && typeof json.data === 'object' ? json.data : json;
      var latestCode = Number(data && data.latestVersionCode);
      var downloadUrl = data && typeof data.apkDownloadUrl === 'string' ? data.apkDownloadUrl.trim() : '';
      if (!Number.isFinite(latestCode) || latestCode <= currentVersionCode) return;
      if (downloadUrl.indexOf('https://') !== 0) return;

      var verName = data && data.latestVersionName ? String(data.latestVersionName).trim().replace(/^v/i, '') : '';
      if (els.updateTitle) {
        els.updateTitle.textContent = verName ? 'تحديث متاح v' + verName : 'تحديث متاح';
      }
      if (els.updateDownloadLink) {
        els.updateDownloadLink.setAttribute('href', downloadUrl);
      }
      els.updateBanner.classList.remove('hidden');
    } catch (_) {
      // Non-blocking check: silently ignore errors
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function bootstrap() {
    bindUiEvents();
    setupNativeListeners();
    await loadShellConfig();
    checkAppUpdateNonBlocking();

    if (navigator.onLine === false) {
      setOfflineState(true);
    }

    // 1. Check launch URL via Capacitor App plugin or query string
    var appPlugin = getCapPlugin('App');
    if (appPlugin && typeof appPlugin.getLaunchUrl === 'function') {
      try {
        var launch = await appPlugin.getLaunchUrl();
        if (launch && launch.url) {
          var handled = await handleIncomingDeepLink(launch.url);
          if (handled) return;
        }
      } catch (_) {}
    }

    if (window.location.search) {
      var params = new URLSearchParams(window.location.search);
      var deepSlug = sanitizeSlug(params.get('slug'));
      if (deepSlug) {
        var queryHandled = await handleIncomingDeepLink(
          DEFAULT_API_BASE + '/i/' + deepSlug + (params.get('portal') ? '?portal=' + encodeURIComponent(params.get('portal')) : '')
        );
        if (queryHandled) return;
      }
    }

    // 2. Check saved tenant in Preferences / localStorage
    var saved = await readSavedTenant();
    if (saved && sanitizeSlug(saved.slug)) {
      showSavedView(saved);
      return;
    }

    showConnectView();
  }

  bootstrap();
})();
