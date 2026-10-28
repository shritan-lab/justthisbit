// Just This Bit service worker. It exists only so the site can be installed (SPEC 6.1).
//
// There is deliberately no fetch handler: every request goes straight to the network and
// nothing is ever cached, so nobody sees a stale clip. Chrome no longer needs a fetch
// handler to offer installation.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
