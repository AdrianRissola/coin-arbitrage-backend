jest.mock('../../../model/Arbitrage', () => jest.fn());

const { calculateArbitrages } = require('../../../service/arbitrageService');
const prices = require('../../fixtures/contracts/v1/market-prices.json');
const expected = require('../../fixtures/contracts/v1/arbitrages.json');

const inputs = () => prices['BTC-USDT'].map(price => ({ ...price }));
const pair = (buy, sell) => [
	{ platform: 'Alpha', ticker: 'BTC-USDT', price: buy },
	{ platform: 'Beta', ticker: 'BTC-USDT', price: sell },
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
	[20, [45, 25, 20]],
	[20.001, [45]],
	[36, [45]],
	[36.001, []],
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

test('a stream-style comparator includes equal-price zero-profit transactions', () => {
	const result = calculateArbitrages(pair(100, 100), 0, undefined, undefined, (a, b) => a <= b);
	expect(result.map(value => [value.profitPerUnit, value.profitPercentage])).toEqual([[0, 0]]);
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

test('a zero buy price is not rejected as invalid financial input', () => {
	const [result] = calculateArbitrages(pair(0, 100));
	expect([result.profitPerUnit, result.profitPercentage]).toEqual([100, 100]);
});

test('top one emits nothing when no profitable pair exists', () => {
	expect(calculateArbitrages(pair(0, 0), undefined, 1)).toEqual([]);
	expect(calculateArbitrages(pair(100, 100), undefined, 1)).toEqual([]);
});

test('negative sell prices retain their negative percentage denominator', () => {
	const [result] = calculateArbitrages(pair(-100, -80));
	expect([result.profitPerUnit, result.profitPercentage]).toEqual([20, -25]);
});

test('string prices still encounter the current lexicographic comparator', () => {
	expect(calculateArbitrages(pair('80', '100'))).toEqual([]);
});
