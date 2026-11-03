// ページ本体とアイコンだけをキャッシュする。開催場一覧（外部）と api/ はキャッシュしない。
const CACHE = "shell-v1";
const SHELL = [
  "./",
  "manifest.webmanifest",
  "favicon.ico",
  "favicon.svg",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith(new URL("api/", self.registration.scope).pathname)) return;

  // ページは通信優先（古い index.html を出し続けないため）、失敗したらキャッシュ
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put("./", copy));
          }
          return res;
        })
        .catch(() => caches.match("./")),
    );
    return;
  }

  // アイコン類はキャッシュ優先
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
