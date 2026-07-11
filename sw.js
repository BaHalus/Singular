const CACHE_PREFIX = "singular-alpha-shell";
const CACHE_VERSION = "v1";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const APP_SHELL = [
  "./mobile.html",
  "./manifest.webmanifest",
  "./icons/singular-192.svg",
  "./icons/singular-512.svg",
  "./src/ui/mobile/CharacterMobileApp.css",
  "./src/ui/mobile/CharacterMobileTouchTargets.css",
  "./src/ui/mobile/CharacterMobileTextOverflowGuards.css",
  "./src/ui/mobile/CharacterMobileSecondaryNotesApp.css",
  "./src/ui/mobile/CharacterMobileTraitEditApp.css",
  "./src/ui/mobile/CharacterMobileSkillTechniqueEditApp.css",
  "./src/ui/mobile/CharacterMobileLanguageCultureEditApp.css",
  "./src/ui/mobile/CharacterMobileAttackEditApp.css",
  "./src/ui/mobile/CharacterMobileEquipmentEditApp.css",
  "./src/ui/mobile/CharacterMobileSpellEditApp.css",
  "./src/ui/mobile/CharacterMobilePowerEditApp.css",
  "./src/ui/mobile/CharacterMobileCompositionRoot.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type !== "CACHE_LOADED_RESOURCES") return;

  const resources = Array.isArray(event.data.resources)
    ? event.data.resources.filter(resourceUrl => {
      try {
        return new URL(resourceUrl).origin === self.location.origin;
      } catch {
        return false;
      }
    })
    : [];

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(resources))
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(async () => {
        if (request.mode === "navigate") {
          return caches.match("./mobile.html");
        }
        throw new Error(`Recurso indisponível offline: ${url.pathname}`);
      });
    })
  );
});
