const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { createRequire } = require('node:module');
const { guard, authorization, caches, cacheReady } = require('./provider-preload.cjs');
const { validateControl } = require('./bridge-protocol.cjs');
const exchange = require('./exchange.cjs');

const load = createRequire(__filename);
const fixtures = name => load(`../fixtures/contracts/v1/${name}.json`);
const root = path.resolve(__dirname, '../..');
const requests = [];
const sendAttempts = [];
const receivedFrames = [];
const timers = new Map();
const running = new Set();
const timerErrors = [];
const originals = {};
let server;
let lease;
let wsServer;
let stopping;

['Interval', 'Timeout'].forEach(type => {
	originals[`set${type}`] = global[`set${type}`];
	originals[`clear${type}`] = global[`clear${type}`];
	global[`set${type}`] = (callback, delay, ...args) => {
		const { stack } = new Error();
		if (
			!stack.includes(`${root}/webSocketServerHandler.js`) &&
			!stack.includes(`${root}/marketWebSocketClient.js`)
		)
			return originals[`set${type}`](callback, delay, ...args);
		const handle = originals[`set${type}`](
			(...values) => {
				if (type === 'Timeout') timers.delete(handle);
				const result = callback(...values);
				if (result?.then) {
					running.add(result);
					result.then(
						() => running.delete(result),
						error => {
							running.delete(result);
							timerErrors.push(error.message);
						}
					);
				}
			},
			delay,
			...args
		);
		timers.set(handle, type);
		return handle;
	};
	global[`clear${type}`] = handle => {
		timers.delete(handle);
		originals[`clear${type}`](handle);
	};
});
const binding = () => ({
	runId: authorization.runId,
	token: authorization.token,
	pid: process.pid,
	listening: server?.listening === true,
	...server?.address(),
});
const observeHttp = (request, response) => {
	const record = { method: request.method, url: request.url, origin: request.headers.origin };
	const chunks = [];
	const { write } = response;
	const { end } = response;
	response.write = function observeWrite(chunk, ...args) {
		if (chunk) chunks.push(Buffer.from(chunk));
		return write.call(this, chunk, ...args);
	};
	response.end = function observeEnd(chunk, ...args) {
		if (chunk) chunks.push(Buffer.from(chunk));
		return end.call(this, chunk, ...args);
	};
	response.once('finish', () => {
		Object.assign(record, {
			status: response.statusCode,
			headers: response.getHeaders(),
			rawBody: Buffer.concat(chunks).toString(),
		});
	});
	requests.push(record);
};
const parse = text => {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};
const stop = () => {
	if (stopping) return stopping;
	stopping = (async () => {
		const failures = [];
		timers.forEach((type, handle) => originals[`clear${type}`](handle));
		timers.clear();
		const releases = [
			() => Promise.all(Array.from(running)),
			() => wsServer?.shutDown(),
			() => server && load('../../marketWebSocketClient').close({ allMarkets: true }),
			() => exchange.settled(),
			...caches.map(cache => () => cache.close()),
			() => lease?.close(),
			() =>
				Object.entries(originals).forEach(([name, fn]) => {
					global[name] = fn;
				}),
			() => mongoose.disconnect(),
			() => guard.mongo.whenIdle(),
		];
		await releases.reduce(
			(previous, release) =>
				previous.then(() =>
					Promise.resolve()
						.then(release)
						.catch(error => {
							failures.push(error);
						})
				),
			Promise.resolve()
		);
		if (timerErrors.length)
			failures.push(
				new Error(`Unexpected INT scheduler rejection: ${timerErrors.join(', ')}`)
			);
		fs.writeFileSync(
			path.join(guard.root, 'provider-cleanup.json'),
			JSON.stringify(
				{
					success:
						!failures.length &&
						!guard.violations.length &&
						!guard.mongo.activeCount() &&
						!guard.http.activeCount(),
					timers: timers.size,
					runningCallbacks: running.size,
					mongoSockets: guard.mongo.activeCount(),
					httpLeases: guard.http.activeCount(),
					caches: caches.length,
					violations: guard.violations,
					errors: failures.map(error => error.message),
				},
				null,
				2
			)
		);
		if (failures.length) throw new AggregateError(failures, 'INT provider cleanup failed');
	})();
	return stopping;
};
const start = async () => {
	await mongoose.connect(guard.mongo.validateUri(authorization.mongoUri), {
		directConnection: true,
		family: 4,
		maxPoolSize: 2,
		serverSelectionTimeoutMS: 5000,
		connectTimeoutMS: 1000,
		retryReads: false,
		retryWrites: false,
		autoCreate: false,
		autoIndex: false,
	});
	const Market = load('../../model/Market');
	const Currency = load('../../model/Currency');
	const Arbitrage = load('../../model/Arbitrage');
	const tickerPlaceholder = '$'.concat('{ticker}');
	const tickers = Object.keys(fixtures('market-prices'));
	const tickerPattern = {
		separator: '-',
		baseCurrencyCaseFunction: 'toUpperCase',
		quoteCurrencyCaseFunction: 'toUpperCase',
		currencies: [],
	};
	await Currency.insertMany(
		fixtures('seed').currencies.map((currency, index) => ({
			...currency,
			_id: String(index + 1).padStart(24, '0'),
		}))
	);
	await Market.insertMany(
		fixtures('markets').map((market, index) => ({
			_id: String(index + 11).padStart(24, '0'),
			name: market.name,
			website: market.website,
			type: market.type,
			availableTickersToMarketTickers: Object.fromEntries(
				tickers.map(ticker => [ticker, ticker])
			),
			com: {
				api: {
					rest: {
						base: `https://${market.name.toLowerCase()}.invalid/`,
						tickerPath: 'ticker?symbol='.concat(tickerPlaceholder),
						pathToPrice: ['price'],
						tickerPattern,
					},
					websocket: {
						host: `${market.name.toLowerCase()}.invalid`,
						url: 'wss://'.concat('$', '{host}', '/feed'),
						tickerRequest: JSON.stringify({ symbol: tickerPlaceholder }),
						tickers,
						tickerPattern,
						pathToPrice: ['price'],
						pathToTicker: ['symbol'],
						pathToSubscriptionId: [],
					},
				},
			},
		}))
	);
	await Arbitrage.insertMany(fixtures('historical-arbitrages'));
	load('../../repository/currencyRepository');
	load('../../repository/marketRepository');
	await Promise.all(cacheReady);
	const manager = load('../../marketsDBmanager');
	manager.setAvailableTickers(fixtures('seed').legacyTickers);
	if (manager.getAllMarkets().length !== 3 || manager.getAvailableCurrencies().length !== 4)
		throw new Error('INT actual repository/cache readiness mismatch');
	const actual = load('../../index');
	server = actual.server;
	server.prependListener('request', observeHttp);
	lease = guard.http.lease(server);
	const NativeServer = load('websocket').server;
	wsServer = new NativeServer({
		httpServer: server,
		autoAcceptConnections: false,
		keepalive: false,
	});
	wsServer.on('connect', connection => {
		const send = connection.sendUTF;
		Object.assign(connection, {
			sendUTF: function observeSend(raw, ...args) {
				sendAttempts.push({
					raw,
					payload: parse(raw),
					connected: connection.connected,
					state: connection.state,
				});
				return send.call(this, raw, ...args);
			},
		});
		connection.on('message', message =>
			receivedFrames.push({ raw: message.utf8Data, payload: parse(message.utf8Data) })
		);
	});
	const handler = load('../../webSocketServerHandler');
	wsServer.on('request', request => handler.onRequest(wsServer, request));
	await lease.listen();
	await load('../../service/webSocketClientService').openAndSend({ tickers });
	await exchange.settled();
	const control = async message => {
		validateControl(message, authorization.token);
		if (message.action === 'status') return binding();
		if (message.action === 'snapshot')
			return {
				requests,
				sendAttempts,
				receivedFrames,
				rawExchangeFrames: exchange.rawFrames,
				exchangeSubscriptions: exchange.subscriptions,
				timers: timers.size,
				history: await Arbitrage.find({}).sort({ date: -1 }).lean(),
			};
		if (message.action === 'feed') {
			await exchange.settled();
			return { delivered: exchange.rawFrames.length };
		}
		if (message.action === 'disconnect') {
			const client = exchange.clients.find(
				value => value.host === message.args.host && value.connection?.connected
			);
			if (!client) throw new Error('No owned exchange connection for controlled close');
			client.connection.close(1000, 'synthetic disconnect');
			return { closed: client.host };
		}
		if (message.action === 'close-browser') {
			wsServer.connections.slice().forEach(connection => connection.close());
			return { closing: true };
		}
		throw new Error('Unsupported INT control');
	};
	process.on('message', message => {
		Promise.resolve()
			.then(() => control(message))
			.then(
				value => process.send?.({ version: 1, id: message.id, ok: true, value }),
				error =>
					process.send?.({ version: 1, id: message.id, ok: false, error: error.message })
			);
	});
	process.send?.({ version: 1, ready: true, binding: binding() });
};
const shutdown = () => {
	stop().then(
		() => {
			if (process.connected) process.disconnect();
		},
		error => {
			process.stderr.write(`${error.stack}\n`);
			process.exitCode = 1;
			if (process.connected) process.disconnect();
		}
	);
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
start().catch(async error => {
	process.stderr.write(`${error.stack}\n`);
	process.exitCode = 1;
	try {
		await stop();
	} catch (cleanup) {
		process.stderr.write(`${cleanup.stack}\n`);
	}
	if (process.connected) process.disconnect();
});
