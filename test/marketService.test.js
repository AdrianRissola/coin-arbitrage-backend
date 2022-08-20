const supertest = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
require('./testDbLoader');
const marketService = require('../service/marketService');

supertest(app);

describe('test getTickerByMarket BTC-USD', () => {
	const BTC_USD = 'BTC-USD';

	test('marketService.getTickerByMarket bitfinex BTC-USD', async () => {
		const ticker = await marketService.getTickerByMarket('bitfinex', BTC_USD);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket COINBASE BTC-USD', async () => {
		const ticker = await marketService.getTickerByMarket('COINBASE', BTC_USD);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket bitmex BTC-USD', async () => {
		const ticker = await marketService.getTickerByMarket('bitmex', BTC_USD);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket bitstamp BTC-USD', async () => {
		const ticker = await marketService.getTickerByMarket('bitstamp', BTC_USD);
		expect(!!ticker).toBe(true);
	}, 30000);
});

describe('test getTickerByMarket BTC-USDT', () => {
	const BTC_USDT = 'BTC-USDT';

	test('marketService.getTickerByMarket binance BTC-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('binance', BTC_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket BITTREX BTC-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('BITTREX', BTC_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket POLONIEX BTC-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('POLONIEX', BTC_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket kraken BTC-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('kraken', BTC_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket okex BTC-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('okex', BTC_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket bitstamp BTC-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('bitstamp', BTC_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);
});

describe('test getTickerByMarket ETH-USD', () => {
	const ETH_USD = 'ETH-USD';

	test('marketService.getTickerByMarket bitfinex ETH-USD', async () => {
		const ticker = await marketService.getTickerByMarket('bitfinex', ETH_USD);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket COINBASE ETH-USD', async () => {
		const ticker = await marketService.getTickerByMarket('COINBASE', ETH_USD);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket bitmex ETH-USD', async () => {
		const ticker = await marketService.getTickerByMarket('bitmex', ETH_USD);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket bitstamp ETH-USD', async () => {
		const ticker = await marketService.getTickerByMarket('bitstamp', ETH_USD);
		expect(!!ticker).toBe(true);
	}, 30000);
});

describe('test getTickerByMarket ETH-USDT', () => {
	const ETH_USDT = 'ETH-USDT';

	test('marketService.getTickerByMarket binance ETH-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('binance', ETH_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket BITTREX ETH-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('BITTREX', ETH_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket POLONIEX ETH-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('POLONIEX', ETH_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket kraken ETH-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('kraken', ETH_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket okex ETH-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('okex', ETH_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);

	test('marketService.getTickerByMarket bitstamp ETH-USDT', async () => {
		const ticker = await marketService.getTickerByMarket('bitstamp', ETH_USDT);
		expect(!!ticker).toBe(true);
	}, 30000);
});

afterAll(() => {
	mongoose.connection.close();
});
