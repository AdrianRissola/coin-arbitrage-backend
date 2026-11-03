const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const guard = require('../backend/support/offline-guard.cjs');
const { createMongoScope } = require('./mongo-scope.cjs');
const { ExchangeClient } = require('./exchange.cjs');

const file = process.env.INT_TEST_AUTHORIZATION;
if (
	!file ||
	path.resolve(file) !== path.join(guard.root, 'int-authorization.json') ||
	!fs.lstatSync(file).isFile() ||
	fs.statSync(file).mode % 0o100 !== 0
)
	throw new Error('INT provider needs a private owned authorization record');
const authorization = Object.freeze(JSON.parse(fs.readFileSync(file, 'utf8')));
if (
	authorization.version !== 1 ||
	authorization.scope !== 'owned-int-provider' ||
	authorization.reportRoot !== guard.root ||
	!/^[A-Za-z0-9_-]{1,40}$/.test(authorization.runId || '') ||
	!/^[a-f0-9]{64}$/.test(authorization.token || '') ||
	!/^[a-f0-9]{64}$/.test(authorization.containerId || '') ||
	!Number.isInteger(authorization.mongoPort) ||
	authorization.mongoPort < 1024 ||
	authorization.mongoPort > 65535 ||
	[3000, 3001, 27017].includes(authorization.mongoPort) ||
	authorization.mongoUri !==
		`mongodb://127.0.0.1:${authorization.mongoPort}/testfoundation_${authorization.runId}`
)
	throw new Error('Invalid INT provider authorization');
const deny = message => {
	guard.violations.push(message);
	process.exitCode = process.exitCode || 1;
	return new Error(`INT_TEST_GUARD_BLOCKED: ${message}`);
};
if (guard.mongo) throw new Error('INT must not widen or reuse a pre-existing MongoDB grant');
guard.mongo = createMongoScope(authorization, deny);
const originalLoad = Reflect.get(Module, '_load');
const resolveFilename = Reflect.get(Module, '_resolveFilename');
const caches = [];
const cacheReady = [];
const startup = path.resolve(__dirname, '../../mongo.js');
Reflect.set(Module, '_load', function load(request, parent, ...args) {
	if (
		parent &&
		request.startsWith('.') &&
		Reflect.apply(resolveFilename, Module, [request, parent]) === startup
	)
		return {};
	if (
		request === 'node-cache' &&
		parent?.filename.startsWith(path.resolve(__dirname, '../../repository') + path.sep)
	) {
		const NativeCache = Reflect.apply(originalLoad, this, [request, parent, ...args]);
		return class OwnedCache extends NativeCache {
			constructor(...values) {
				super(...values);
				caches.push(this);
				cacheReady.push(
					new Promise(resolve => {
						this.once('set', resolve);
					})
				);
			}
		};
	}
	if (
		request === 'websocket' &&
		parent?.filename === path.resolve(__dirname, '../../marketWebSocketClient.js')
	) {
		const native = Reflect.apply(originalLoad, this, [request, parent, ...args]);
		return { ...native, client: ExchangeClient };
	}
	return Reflect.apply(originalLoad, this, [request, parent, ...args]);
});

module.exports = { guard, authorization, caches, cacheReady };
