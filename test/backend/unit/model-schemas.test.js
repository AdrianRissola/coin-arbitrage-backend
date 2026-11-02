const mongoose = require('mongoose');
const Arbitrage = require('../../../model/Arbitrage');
const AvailableTicker = require('../../../model/AvailableTicker');
const Currency = require('../../../model/Currency');
const Market = require('../../../model/Market');
const { market, now } = require('../support/b2-fixtures.cjs');

const id = '64b000000000000000000001';
const childId = '64b000000000000000000002';
const models = [
	['Arbitrage', Arbitrage],
	['AvailableTicker', AvailableTicker],
	['Currency', Currency],
	['Market', Market],
];

afterEach(() => {
	expect(mongoose.connection.readyState).toBe(0);
});

test.each(models)(
	'%s accepts omitted optional fields without adding required assumptions',
	(name, Model) => {
		const document = new Model({ _id: id, unrelated: 'dropped' });
		expect(document.validateSync()).toBeUndefined();
		expect(document.toJSON()).toEqual(
			Model === Arbitrage
				? { _id: new mongoose.Types.ObjectId(id), transactions: [] }
				: { _id: new mongoose.Types.ObjectId(id) }
		);
		expect(JSON.parse(JSON.stringify(document))).not.toHaveProperty('__v');
	}
);

test.each(models)('%s generates an actual ID even without persistence', (name, Model) => {
	const document = new Model();
	expect(document.get('_id')).toBeInstanceOf(mongoose.Types.ObjectId);
	expect(document.id).toMatch(/^[0-9a-f]{24}$/);
});

test('Arbitrage casts nested prices/profits and serialises supplied Date/IDs literally', async () => {
	const document = new Arbitrage({
		_id: id,
		transactions: [
			{
				_id: childId,
				type: 'BUY',
				market: 'Alpha',
				pair: 'BTC-USDT',
				price: '80',
				ignored: true,
			},
		],
		profitPercentage: '36',
		profitPerUnit: '45',
		date: now,
		ignored: true,
	});
	await expect(document.validate()).resolves.toBeUndefined();
	expect(JSON.parse(JSON.stringify(document))).toEqual({
		_id: id,
		transactions: [{ _id: childId, type: 'BUY', market: 'Alpha', pair: 'BTC-USDT', price: 80 }],
		profitPercentage: 36,
		profitPerUnit: 45,
		date: now,
	});
});

test('transaction type, zero/negative prices and incomplete transactions are not restricted by enums/required fields', () => {
	const document = new Arbitrage({
		transactions: [{ type: 'OTHER', price: 0 }, { price: -2 }, {}],
	});
	expect(document.validateSync()).toBeUndefined();
	expect(document.transactions.map(value => [value.type, value.price])).toEqual([
		['OTHER', 0],
		[undefined, -2],
		[undefined, undefined],
	]);
});

test('explicit null arrays remain distinct from omitted/default empty transaction arrays', () => {
	expect(new Arbitrage({ transactions: null }).transactions).toBeNull();
	expect(new Arbitrage().transactions).toHaveLength(0);
});

test.each([
	[{ profitPercentage: 'not-number' }, 'profitPercentage', 'Number'],
	[{ profitPerUnit: 'not-number' }, 'profitPerUnit', 'Number'],
	[{ date: 'not-date' }, 'date', 'date'],
	[{ transactions: [{ price: 'not-number' }] }, 'transactions.0.price', 'Number'],
	[{ _id: 'not-id' }, '_id', 'ObjectId'],
])('Arbitrage retains actual cast validation for %j', (input, field, kind) => {
	const error = new Arbitrage(input).validateSync();
	expect(error.name).toBe('ValidationError');
	expect(error.errors[field]).toMatchObject({ name: 'CastError', kind });
});

test('Currency casts real string/Boolean fields and omits unset flags', () => {
	const document = new Currency({
		_id: id,
		symbol: 123,
		name: 456,
		base: 'true',
		quote: 0,
		extra: true,
	});
	expect(document.validateSync()).toBeUndefined();
	expect(JSON.parse(JSON.stringify(document))).toEqual({
		_id: id,
		symbol: '123',
		name: '456',
		base: true,
		quote: false,
	});
	expect(new Currency({ symbol: 'BTC' }).toObject()).not.toHaveProperty('base');
});

test('AvailableTicker keeps literal flags/descriptions and strips undeclared fields', () => {
	const document = new AvailableTicker({
		_id: id,
		name: 123,
		description: 456,
		type: 'custom',
		rest: 'false',
		websocket: 1,
		extra: true,
	});
	expect(JSON.parse(JSON.stringify(document))).toEqual({
		_id: id,
		name: '123',
		description: '456',
		type: 'custom',
		rest: false,
		websocket: true,
	});
});

test.each([
	['Currency', 'base', Currency],
	['Currency', 'quote', Currency],
	['AvailableTicker', 'rest', AvailableTicker],
	['AvailableTicker', 'websocket', AvailableTicker],
])('%s.%s invalid Boolean casts remain model validation failures', (name, field, Model) => {
	expect(new Model({ [field]: 'not-boolean' }).validateSync().errors[field]).toMatchObject({
		kind: 'Boolean',
		name: 'CastError',
	});
});

test('Market retains declared native mappings but silently strips unsupported pair keys', () => {
	const document = new Market({
		_id: id,
		name: 'Alpha',
		availableTickersToMarketTickers: {
			_id: childId,
			'BTC-USDT': 123,
			'BTC-ARS': 'nativeARS',
			'SOL-USD': 'not-declared',
		},
		extra: true,
	});
	expect(JSON.parse(JSON.stringify(document))).toEqual({
		_id: id,
		name: 'Alpha',
		availableTickersToMarketTickers: {
			_id: childId,
			'BTC-USDT': '123',
			'BTC-ARS': 'nativeARS',
		},
	});
});

test('Market mixed arrays/functions retain their actual types while nested numeric flags cast', async () => {
	const input = market();
	input.com.api.websocket.tickers = ['BTC-USDT', 7, { literal: true }];
	input.com.api.websocket.pathToPrice = [0, { literal: true }];
	input.com.api.websocket.isAvailablePairCurrencyFn = { source: 'test-owned literal' };
	input.com.api.websocket.tickerKeyIndex = '1';
	input.com.api.websocket.pingFrequencyInSeconds = '15';
	input.com.api.websocket.tickerPattern = { quoteCurrencyFirst: 'true' };
	const document = new Market(input);
	await expect(document.validate()).resolves.toBeUndefined();
	expect(document.com.api.websocket.toObject()).toMatchObject({
		tickers: ['BTC-USDT', 7, { literal: true }],
		pathToPrice: [0, { literal: true }],
		isAvailablePairCurrencyFn: { source: 'test-owned literal' },
		tickerKeyIndex: 1,
		pingFrequencyInSeconds: 15,
		tickerPattern: { quoteCurrencyFirst: true, currencies: [] },
		pathToSubscriptionId: [],
		pathToTicker: [],
		pairCurrencies: [],
	});
});

test('Market invalid nested number and Boolean inputs surface dotted validation paths', () => {
	const document = new Market({
		com: {
			api: {
				websocket: {
					pingFrequencyInSeconds: 'bad',
					tickerPattern: { quoteCurrencyFirst: 'bad' },
				},
			},
		},
	});
	const { errors } = document.validateSync();
	expect(errors['com.api.websocket.pingFrequencyInSeconds']).toMatchObject({ kind: 'Number' });
	expect(errors['com.api.websocket.tickerPattern.quoteCurrencyFirst']).toMatchObject({
		kind: 'Boolean',
	});
});
