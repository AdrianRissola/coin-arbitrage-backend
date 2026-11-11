jest.mock('../../../model/Arbitrage', () => jest.fn());

const { calculateArbitrages } = require('../../../service/arbitrageService');
const prices = require('../../fixtures/contracts/v1/market-prices.json');
const expected = require('../../fixtures/contracts/v1/arbitrages.json');

const inputs = () =>
	prices['BTC-USDT'].map(marketPrice => ({
		...marketPrice,
		bid: marketPrice.price,
		ask: marketPrice.price,
	}));
const pair = (buy, sell) => [
	{ platform: 'Alpha', ticker: 'BTC-USDT', price: buy, bid: buy, ask: buy },
	{ platform: 'Beta', ticker: 'BTC-USDT', price: sell, bid: sell, ask: sell },
];

beforeEach(() => {
	jest.useFakeTimers({ doNotFake: ['performance'] });
	jest.setSystemTime(new Date('2024-01-02T03:04:05.000Z'));
});

afterEach(() => {
	expect(jest.getTimerCount()).toBe(0);
	jest.useRealTimers();
});

test('real calculation matches independently authored complete transaction literals', () => {
	const result = calculateArbitrages(inputs());
	expect(JSON.parse(JSON.stringify(result))).toEqual(expected);
	expect(result.every(arbitrage => arbitrage.date instanceof Date)).toBe(true);
});

test.each([[undefined], [null], [[]], [[prices['BTC-USDT'][0]]]])(
	'insufficient input %j returns null without invoking the formatter',
	input => {
		const formatter = jest.fn();
		expect(calculateArbitrages(input, undefined, undefined, formatter)).toBeNull();
		expect(formatter).not.toHaveBeenCalled();
	}
);

test.each([
	[undefined, [45, 25, 20]],
	[0, [45, 25, 20]],
	[25, [45, 25, 20]],
	[25.001, [45]],
	[56.25, [45]],
	[56.251, []],
])('minimum percentage %s keeps exact inclusive boundaries', (minimum, profits) => {
	expect(calculateArbitrages(inputs(), minimum).map(value => value.profitPerUnit)).toEqual(
		profits
	);
});

test.each([
	[undefined, [45, 25, 20]],
	[0, [45, 25, 20]],
	[-1, [45, 25, 20]],
	[1, [45]],
	[2, [45, 25]],
	[9, [45, 25, 20]],
	['1', [45, 25, 20]],
	['2', [45, 25]],
	[1.5, [45]],
])('top %s preserves current strict comparison and slice coercion', (top, profits) => {
	expect(calculateArbitrages(inputs(), undefined, top).map(value => value.profitPerUnit)).toEqual(
		profits
	);
});

test('top exactly one bypasses minimum and comparator checks', () => {
	const comparator = jest.fn(() => false);
	const result = calculateArbitrages(inputs(), 1000, 1, undefined, comparator);
	expect(JSON.parse(JSON.stringify(result))).toEqual([expected[0]]);
	expect(comparator).not.toHaveBeenCalled();
});

test('the default comparator excludes equal prices', () => {
	expect(calculateArbitrages(pair(100, 100))).toEqual([]);
});

test('equal Ask and Bid prices are never an arbitrage, even if a comparator allows equality', () => {
	const result = calculateArbitrages(pair(100, 100), 0, undefined, undefined, (a, b) => a <= b);
	expect(result).toEqual([]);
});

test('last-only quotes cannot create arbitrage', () => {
	expect(
		calculateArbitrages([
			{ platform: 'Alpha', ticker: 'BTC-USDT', price: 80, last: 80 },
			{ platform: 'Beta', ticker: 'BTC-USDT', price: 100, last: 100 },
		])
	).toEqual([]);
});

test('a missing bid cannot fall back to Last for a sell transaction', () => {
	expect(
		calculateArbitrages([
			{ platform: 'Alpha', ticker: 'BTC-USDT', ask: 100, last: 99, price: 99 },
			{ platform: 'Beta', ticker: 'BTC-USDT', ask: 101, last: 110, price: 110 },
		])
	).toEqual([]);
});

test('one-sided quotes use Ask to buy and Bid to sell, with profit relative to the Ask', () => {
	const [result] = calculateArbitrages(
		[
			{ platform: 'Alpha', ticker: 'BTC-USDT', ask: 100, last: 75, price: 75 },
			{ platform: 'Beta', ticker: 'BTC-USDT', bid: 105, last: 130, price: 130 },
		],
		undefined,
		1
	);
	expect(result.transactions.map(({ type, market, price }) => [type, market, price])).toEqual([
		['BUY', 'Alpha', 100],
		['SELL', 'Beta', 105],
	]);
	expect([result.profitPerUnit, result.profitPercentage]).toEqual([5, 5]);
});

test('the formatter receives actual results and the input ticker', () => {
	const formatter = jest.fn((arbitrages, ticker) => ({ ticker, count: arbitrages.length }));
	expect(calculateArbitrages(inputs(), 36, undefined, formatter)).toEqual({
		ticker: 'BTC-USDT',
		count: 1,
	});
	expect(JSON.parse(JSON.stringify(formatter.mock.calls[0][0]))).toEqual([expected[0]]);
});

test('an empty computed array still reaches the formatter', () => {
	const formatter = jest.fn((arbitrages, ticker) => ({ arbitrages, ticker }));
	expect(calculateArbitrages(inputs(), 1000, undefined, formatter)).toEqual({
		arbitrages: [],
		ticker: 'BTC-USDT',
	});
});

test('a supplied comparator can exclude every pair', () => {
	expect(calculateArbitrages(inputs(), 0, undefined, undefined, () => false)).toEqual([]);
});

test('calculation currently sorts the caller input in place', () => {
	const input = inputs().reverse();
	calculateArbitrages(input);
	expect(input.map(value => value.price)).toEqual([80, 100, 125]);
});

test('zero is not accepted as a valid Ask or Bid', () => {
	expect(calculateArbitrages(pair(0, 100))).toEqual([]);
});

test('top one emits nothing when no profitable pair exists', () => {
	expect(calculateArbitrages(pair(0, 0), undefined, 1)).toEqual([]);
	expect(calculateArbitrages(pair(100, 100), undefined, 1)).toEqual([]);
});

test('negative Ask and Bid prices are rejected as invalid quotes', () => {
	expect(calculateArbitrages(pair(-100, -80))).toEqual([]);
});

test('string prices still encounter the current lexicographic comparator', () => {
	expect(calculateArbitrages(pair('80', '100'))).toEqual([]);
});
