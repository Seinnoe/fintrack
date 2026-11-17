/* FinTrack PWA service worker. API/auth responses are intentionally never cached. */
const CACHE_PREFIX = "fintrack-pwa-";
const CACHE_VERSION = "v1";
const APP_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin GET requests. Never cache API calls, auth, or financial data.
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(APP_CACHE);
          cache.put("/index.html", response.clone());
        }
        return response;
      } catch {
        return (await caches.match("/index.html")) || (await caches.match("/"));
      }
    })());
    return;
  }

  // Cache static same-origin assets; update cache in the background when online.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || network;
    })());
  }
});


// Receive Web Push messages while the FinTrack PWA is in the background.
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let data = {};

    try {
      data = event.data ? event.data.json() : {};
    } catch {
      data = {
        title: "FinTrack",
        body: event.data ? event.data.text() : "You have a new notification."
      };
    }

    const title = data.title || "FinTrack";
    const options = {
      body: data.body || "You have a new financial update.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "fintrack-" + Date.now(),
      data: {
        url: data.url || "/"
      }
    };

    await self.registration.showNotification(title, options);

    if (self.registration.setAppBadge) {
      await self.registration.setAppBadge(1).catch(() => {});
    }
  })());
});

// Open FinTrack when a notification is tapped.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil((async () => {
    const targetUrl = new URL(
      event.notification.data?.url || "/",
      self.location.origin
    );

    if (targetUrl.origin !== self.location.origin) return;

    if (self.registration.clearAppBadge) {
      await self.registration.clearAppBadge().catch(() => {});
    }

    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.focus();
        if ("navigate" in client) {
          await client.navigate(targetUrl.href);
        }
        return;
      }
    }

    await self.clients.openWindow(targetUrl.href);
  })());
});
