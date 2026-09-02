const CACHE_NAME = 'rapkumer-static-v1';
const STATIC_PATTERN = /\.(js|css|woff2?|ttf|eot)(\?.*)?$/;

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	if (STATIC_PATTERN.test(request.url)) {
		event.respondWith(
			caches.open(CACHE_NAME).then(async (cache) => {
				const cached = await cache.match(request);
				const fetchPromise = fetch(request)
					.then((response) => {
						if (response.ok) cache.put(request, response.clone());
						return response;
					})
					.catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }));
				return cached || fetchPromise;
			})
		);
	}
});
