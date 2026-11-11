const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Market = require('../../../model/Market');
const Currency = require('../../../model/Currency');
const Arbitrage = require('../../../model/Arbitrage');
const guard = require('./offline-guard.cjs');

const seedCurrencies = [
	{ _id: '000000000000000000000001', symbol: 'USD', name: 'US Dollar', quote: true, base: false },
	{ _id: '000000000000000000000002', symbol: 'BTC', name: 'Bitcoin', quote: false, base: true },
];
const seedMarkets = [
	{
		_id: '000000000000000000000011',
		name: 'Alpha',
		website: 'https://alpha.invalid',
		type: 'SPOT',
		availableTickersToMarketTickers: { 'BTC-USDT': 'BTCUSDT' },
	},
	{
		_id: '000000000000000000000012',
		name: 'Beta',
		website: 'https://beta.invalid',
		type: 'SPOT',
		availableTickersToMarketTickers: { 'BTC-USDT': 'XBTUSDT' },
	},
];
const makePersistence = () => {
	if (!guard.mongo) throw new Error('Persistence requires the explicitly owned MongoDB profile');
	const suffix = crypto.randomBytes(4).toString('hex');
	const namespace = `${guard.mongo.authorization.databasePrefix}_${suffix}`;
	const uri = guard.mongo.validateUri(`${guard.mongo.authorization.uri}_${suffix}`);
	const caches = [];
	const ready = [];
	const commands = [];
	const waiting = new Set();
	let client;
	const context = {
		mongoose,
		Market,
		Currency,
		Arbitrage,
		namespace,
		commands,
		loadRepositories: async () => {
			jest.doMock('node-cache', () => {
				const NativeCache = jest.requireActual('node-cache');
				return class OwnedCache extends NativeCache {
					constructor(...args) {
						super(...args);
						caches.push(this);
						ready.push(
							new Promise(resolve => {
								this.once('set', resolve);
							})
						);
					}
				};
			});
			context.currencyRepository = jest.requireActual(
				'../../../repository/currencyRepository'
			);
			context.marketRepository = jest.requireActual('../../../repository/marketRepository');
			context.manager = jest.requireActual('../../../marketsDBmanager');
			await Promise.all(ready);
		},
		failNext: (names, code) =>
			mongoose.connection.db.admin().command({
				configureFailPoint: 'failCommand',
				mode: { times: 1 },
				data: { failCommands: names, errorCode: code },
			}),
		waitInsertAcks: count => {
			let remaining = count;
			return new Promise(resolve => {
				const listener = event => {
					if (event.commandName !== 'insert') return;
					remaining -= 1;
					if (remaining) return;
					client.removeListener('commandSucceeded', listener);
					waiting.delete(listener);
					resolve();
				};
				waiting.add(listener);
				client.on('commandSucceeded', listener);
			});
		},
	};
	beforeAll(async () => {
		await mongoose.connect(uri, {
			directConnection: true,
			family: 4,
			maxPoolSize: 2,
			serverSelectionTimeoutMS: 5000,
			connectTimeoutMS: 1000,
			retryWrites: false,
			retryReads: false,
			autoCreate: false,
			autoIndex: false,
			monitorCommands: true,
		});
		client = mongoose.connection.getClient();
		client.on('commandStarted', event =>
			commands.push({
				name: event.commandName,
				database: event.databaseName,
				collection: event.command[event.commandName],
			})
		);
		await Currency.insertMany(seedCurrencies);
		await Market.insertMany(seedMarkets);
	});
	afterEach(async () => {
		if (mongoose.connection.readyState === 1)
			await mongoose.connection.db
				.admin()
				.command({ configureFailPoint: 'failCommand', mode: 'off' });
	});
	afterAll(async () => {
		try {
			expect(waiting.size).toBe(0);
			fs.writeFileSync(
				path.join(guard.root, `persistence-${suffix}.json`),
				JSON.stringify({
					namespace,
					commands,
					models: ['Currency', 'Market', 'Arbitrage'],
					caches: caches.length,
					noModelQueryOrSaveReplacement: true,
				})
			);
		} finally {
			caches.forEach(cache => cache.close());
			waiting.forEach(listener => client?.removeListener('commandSucceeded', listener));
			await mongoose.disconnect();
			await guard.mongo.whenIdle();
			expect(guard.mongo.activeCount()).toBe(0);
		}
	});
	return context;
};

const opportunity = (
	percentage = 10,
	ticker = 'BTC-USDT',
	buy = 'RecordBuy',
	sell = 'RecordSell',
	date = '2024-01-02T03:04:05.000Z'
) => ({
	transactions: [
		{ type: 'BUY', market: buy, pair: ticker, price: 100 },
		{ type: 'SELL', market: sell, pair: ticker, price: 100 + percentage },
	],
	profitPerUnit: percentage,
	profitPercentage: percentage,
	date,
	priceBasis: 'bidAsk',
});

module.exports = { makePersistence, opportunity };
