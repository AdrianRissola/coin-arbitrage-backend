const supertest = require('supertest');
const mongoose = require('mongoose');
const Market = require('../../../model/Market');
const Currency = require('../../../model/Currency');
const Arbitrage = require('../../../model/Arbitrage');
const manager = require('../../../marketsDBmanager');
const guard = require('./offline-guard.cjs');
const { clone, market, controlAxios } = require('./b2-fixtures.cjs');
const seed = require('../../fixtures/contracts/v1/seed.json');
const historical = require('../../fixtures/contracts/v1/historical-arbitrages.json');

const leases = [];
const defaultMarkets = () =>
	['Alpha', 'Beta', 'Gamma'].map(name => {
		const record = market(name);
		record.availableTickersToMarketTickers = {
			'BTC-USDT': 'BTC-USDT',
			'BTC-USD': 'BTC-USD',
			'ETH-USDT': 'ETH-USDT',
			'ETH-USD': 'ETH-USD',
		};
		return record;
	});
const loadHttpApp = async (options = {}) => {
	if (!guard.http) throw new Error('B3 HTTP tests require the explicit API profile');
	const caches = [];
	const cacheReady = [];
	const errors = [];
	const listeners = new Set();
	const pendingSaves = [];
	const saves = { Market: [], Currency: [], Arbitrage: [] };
	const saved = [];
	const resultDescriptor = Object.getOwnPropertyDescriptor(global, 'result');
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const errorLog = jest.spyOn(console, 'error').mockImplementation((...args) => {
		errors.push(args);
		Array.from(listeners).forEach(listener => listener(args));
	});
	const originalOrigins = process.env.LOCAL_ALLOWED_ORIGINS;
	process.env.LOCAL_ALLOWED_ORIGINS = JSON.stringify(
		options.origins || ['http://test-client.invalid']
	);
	jest.doMock('mongoose', () => mongoose);
	jest.doMock('../../../model/Market', () => Market);
	jest.doMock('../../../model/Currency', () => Currency);
	jest.doMock('../../../model/Arbitrage', () => Arbitrage);
	jest.doMock('../../../marketsDBmanager', () => manager);
	manager.setMarketsFromDB([]);
	manager.setAvailableCurrencies([]);
	manager.setAvailableTickers(clone(seed.legacyTickers));
	const markets = (options.markets || defaultMarkets()).map(record => new Market(record));
	const currencies = clone(seed.currencies).map(record => new Currency(record));
	const history = (options.history || historical).map(record => new Arbitrage(record));
	let context;
	jest.isolateModules(() => {
		jest.doMock('../../../mongo', () => ({ testOwnedBootstrap: true }));
		jest.doMock('node-cache', () => {
			const NativeCache = jest.requireActual('node-cache');
			return class OwnedCache extends NativeCache {
				constructor(...args) {
					super(...args);
					caches.push(this);
					cacheReady.push(
						new Promise(resolve => {
							this.once('set', resolve);
						})
					);
				}
			};
		});
		jest.spyOn(mongoose, 'connect').mockImplementation(() => {
			throw new Error('Unexpected Mongo connection');
		});
		jest.spyOn(Market, 'find').mockImplementation(() => Promise.resolve(markets));
		jest.spyOn(Currency, 'find').mockImplementation(() => Promise.resolve(currencies));
		const historySort = jest.fn(() =>
			Object.assign(Promise.resolve(history), {
				limit: count => Promise.resolve(history.slice(0, count)),
			})
		);
		jest.spyOn(Arbitrage, 'find').mockImplementation(() => ({ sort: historySort }));
		[Market, Currency, Arbitrage].forEach(Model => {
			jest.spyOn(Model.prototype, 'save').mockImplementation(function saveOwnedDocument() {
				const plan = saves[Model.modelName].shift();
				if (!plan) throw new Error(`Unexpected controlled ${Model.modelName} save`);
				saved.push({ model: Model.modelName, document: this });
				const operation = plan.error
					? Promise.reject(plan.error)
					: this.validate().then(() => this);
				pendingSaves.push(
					operation.then(
						() => {},
						() => {}
					)
				);
				return operation;
			});
		});
		const client = options.createClient
			? options.createClient()
			: {
					connectAndSend: jest.fn(() => {
						throw new Error('Unplanned exchange socket open');
					}),
					close: jest.fn(() => {
						throw new Error('Unplanned exchange socket close');
					}),
					getWebSocketConnections: jest.fn(() => []),
			  };
		jest.doMock('../../../marketWebSocketClient', () => client);
		const axios = jest.requireActual('axios');
		const transport = controlAxios(axios, options.exchange || []);
		const index = jest.requireActual('../../../index');
		context = {
			...index,
			mongoose,
			Market,
			Currency,
			Arbitrage,
			markets,
			currencies,
			historySort,
			client,
			axios,
			manager,
			transport,
			saved,
			errors,
			controllers: {
				market: jest.requireActual('../../../controller/marketController'),
				arbitrage: jest.requireActual('../../../controller/arbitrageController'),
				websocket: jest.requireActual('../../../controller/websocketClientController'),
			},
		};
		Object.assign(context, options.load?.());
	});
	let ownedHttp;
	let closed = false;
	const lease = {
		...context,
		planSave: (model, plan = {}) => saves[model].push(plan),
		waitForError: predicate => {
			const found = errors.find(predicate);
			if (found) return Promise.resolve(found);
			return new Promise(resolve => {
				const listener = args => {
					if (predicate(args)) {
						listeners.delete(listener);
						resolve(args);
					}
				};
				listeners.add(listener);
			});
		},
		close: async () => {
			if (closed) return;
			closed = true;
			try {
				try {
					await options.beforeClose?.();
				} finally {
					if (ownedHttp) await ownedHttp.close();
				}
				await Promise.all(pendingSaves);
				expect(listeners.size).toBe(0);
				Object.values(saves).forEach(plans => expect(plans).toEqual([]));
				context.transport.close();
				expect(context.mongoose.connection.readyState).toBe(0);
				expect(context.mongoose.connect).not.toHaveBeenCalled();
			} finally {
				caches.forEach(cache => cache.close());
				log.mockRestore();
				errorLog.mockRestore();
				if (originalOrigins === undefined) delete process.env.LOCAL_ALLOWED_ORIGINS;
				else process.env.LOCAL_ALLOWED_ORIGINS = originalOrigins;
				if (resultDescriptor) Object.defineProperty(global, 'result', resultDescriptor);
				else delete global.result;
			}
		},
	};
	leases.push(lease);
	await Promise.all(cacheReady);
	if (options.listen !== false) {
		ownedHttp = guard.http.lease(context.server);
		const address = await ownedHttp.listen();
		lease.api = supertest(`http://127.0.0.1:${address.port}`);
	}
	return lease;
};

afterEach(async () => {
	await Promise.all(leases.splice(0).map(lease => lease.close()));
	expect(guard.http.activeCount()).toBe(0);
});

module.exports = { loadHttpApp, defaultMarkets };
