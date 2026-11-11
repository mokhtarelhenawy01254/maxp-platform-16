const PORTAL_SHELL_CACHE = "maxp-portal-shell-v1";

const OFFLINE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>غير متصل بالإنترنت</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { max-width: 380px; width: 100%; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 4px 16px rgba(15,23,42,0.06); }
    h1 { margin: 0 0 8px; font-size: 18px; font-weight: 700; }
    p { margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6; }
    button { min-height: 44px; padding: 10px 20px; border: 0; border-radius: 12px; background: #4f46e5; color: #ffffff; font-size: 14px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <main class="card">
    <h1>لا يوجد اتصال بالإنترنت</h1>
    <p>يرجى التحقق من الشبكة والمحاولة مرة أخرى لعرض أحدث بيانات البوابة.</p>
    <button type="button" onclick="window.location.reload()">إعادة المحاولة</button>
  </main>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys
            .filter((key) => key !== PORTAL_SHELL_CACHE)
            .map((key) => caches.delete(key)),
        );
      } catch {
        // Ignore cache cleanup failures
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!request || request.method !== "GET" || request.mode !== "navigate") {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/api/") ||
    /\.(js|css|map|json|png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname)
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const contentType = networkResponse.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            const cache = await caches.open(PORTAL_SHELL_CACHE);
            await cache.put(request, networkResponse.clone()).catch(() => {});
          }
        }
        return networkResponse;
      } catch {
        try {
          const cache = await caches.open(PORTAL_SHELL_CACHE);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
        } catch {
          // Ignore cache match failure
        }

        return new Response(OFFLINE_HTML, {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json() || {};
    } catch {
      try {
        const text = event.data.text();
        payload = text ? { body: text } : {};
      } catch {
        payload = {};
      }
    }
  }

  const extraData =
    payload && typeof payload.data === "object" && payload.data !== null
      ? payload.data
      : {};
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "إشعار جديد";
  const body = typeof payload.body === "string" ? payload.body : "";
  const icon =
    typeof payload.icon === "string" && payload.icon.trim()
      ? payload.icon.trim()
      : "/icons/icon-192x192.png";
  const badge =
    typeof payload.badge === "string" && payload.badge.trim()
      ? payload.badge.trim()
      : "/icons/icon-96x96.png";
  const tag =
    typeof payload.tag === "string" && payload.tag.trim()
      ? payload.tag.trim()
      : "maxp-portal-notification";
  const url =
    (typeof payload.url === "string" && payload.url.trim()) ||
    (typeof extraData.url === "string" && extraData.url.trim()) ||
    self.registration.scope ||
    "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      dir: "rtl",
      lang: "ar",
      data: {
        ...extraData,
        url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl =
    (event.notification.data && event.notification.data.url) ||
    self.registration.scope ||
    "/";
  let targetUrl;
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    targetUrl =
      parsed.origin === self.location.origin
        ? parsed.href
        : new URL(self.registration.scope || "/", self.location.origin).href;
  } catch {
    targetUrl = new URL(self.registration.scope || "/", self.location.origin).href;
  }

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const targetParsed = new URL(targetUrl);
      for (const client of windowClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === targetParsed.origin && clientUrl.pathname === targetParsed.pathname) {
            if ("focus" in client) {
              await client.focus();
            }
            if (client.url !== targetUrl && "navigate" in client) {
              await client.navigate(targetUrl).catch(() => {});
            }
            return;
          }
        } catch {
          // Skip invalid client URL
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
