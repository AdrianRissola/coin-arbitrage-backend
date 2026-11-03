const caches = [];

jest.doMock('node-cache', () => {
	const NativeCache = jest.requireActual('node-cache');
	return class OwnedCache extends NativeCache {
		constructor(...args) {
			super(...args);
			caches.push(this);
		}
	};
});
afterEach(() => caches.forEach(cache => cache.close()));
