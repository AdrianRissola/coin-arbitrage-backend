const mockCurrency = jest.requireActual('../../../model/Currency');
const mockMarket = jest.requireActual('../../../model/Market');
const mockManager = jest.requireActual('../../../marketsDBmanager');
const mockCaches = [];

jest.mock('../../../model/Currency', () => mockCurrency);
jest.mock('../../../model/Market', () => mockMarket);
jest.mock('../../../marketsDBmanager', () => mockManager);
jest.mock('node-cache', () => {
	const NativeCache = jest.requireActual('node-cache');
	return class OwnedCache extends NativeCache {
		constructor(...args) {
			super(...args);
			mockCaches.push(this);
		}
	};
});

const { setImmediate } = require('node:timers');
const { deferred } = require('../support/b2-fixtures.cjs');

const Currency = mockCurrency;
const Market = mockMarket;
let log;
let errorLog;

const load = name => {
	let repository;
	jest.isolateModules(() => {
		repository = jest.requireActual(`../../../repository/${name}`);
	});
	const cache = mockCaches[mockCaches.length - 1];
	return { repository, cache };
};
const nextCacheSet = cache =>
	new Promise(resolve => {
		cache.once('set', (key, data) => resolve({ key, data }));
	});

beforeEach(() => {
	mockCaches.length = 0;
	log = jest.spyOn(console, 'log').mockImplementation(() => {});
	errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
	jest.spyOn(mockCurrency, 'find').mockImplementation(() => {
		throw new Error('Unexpected currency query');
	});
	jest.spyOn(mockMarket, 'find').mockImplementation(() => {
		throw new Error('Unexpected market query');
	});
	jest.spyOn(mockCurrency.prototype, 'save').mockImplementation(() => {
		throw new Error('Unexpected currency save');
	});
	mockManager.setMarketsFromDB([]);
	mockManager.setAvailableCurrencies([]);
	mockManager.setAvailableTickers([]);
});
afterEach(() => {
	mockCaches.forEach(cache => cache.close());
	expect(mockCurrency.db.readyState).toBe(0);
	expect(mockMarket.db.readyState).toBe(0);
});

test('Currency import waits for its controlled query then seeds actual manager and real cloned cache', async () => {
	const pending = deferred();
	mockCurrency.find.mockReturnValue(pending.promise);
	const { repository, cache } = load('currencyRepository');
	expect(repository.getAll()).toBeUndefined();
	expect(mockManager.getAvailableCurrencies()).toEqual([]);
	const ready = nextCacheSet(cache);
	const records = [
		new Currency({
			_id: '64b000000000000000000001',
			symbol: 'BTC',
			name: 'Bitcoin',
			base: true,
		}),
	];
	pending.resolve(records);
	await expect(ready).resolves.toMatchObject({ key: 'currencies' });
	expect(mockCurrency.find).toHaveBeenCalledWith({});
	expect(mockManager.getAvailableCurrencies()).toBe(records);
	expect(repository.getAll()).toEqual(records.map(value => value.toObject()));
	const copied = repository.getAll();
	copied[0].symbol = 'CHANGED';
	expect(repository.getAll()[0].symbol).toBe('BTC');
});

test('Currency save returns its real saved document without refreshing the import cache or manager', async () => {
	const old = [new Currency({ symbol: 'BTC' })];
	mockCurrency.find.mockResolvedValue(old);
	const { repository, cache } = load('currencyRepository');
	await nextCacheSet(cache);
	mockCurrency.prototype.save.mockImplementation(function saveDocument() {
		return Promise.resolve(this);
	});
	const saved = await repository.save({ symbol: 'ETH', base: 'true' });
	expect(saved).toBeInstanceOf(mockCurrency);
	expect(saved.toObject()).toMatchObject({ symbol: 'ETH', base: true });
	expect(repository.getAll().map(value => value.symbol)).toEqual(['BTC']);
	expect(mockManager.getAvailableCurrencies()).toBe(old);
	expect(mockCurrency.find).toHaveBeenCalledTimes(1);
});

test('Currency save failures are logged and propagated unchanged', async () => {
	mockCurrency.find.mockResolvedValue([]);
	const { repository, cache } = load('currencyRepository');
	await nextCacheSet(cache);
	const error = new Error('controlled currency save failure');
	mockCurrency.prototype.save.mockRejectedValue(error);
	await expect(repository.save({ symbol: 'ETH' })).rejects.toBe(error);
	expect(errorLog).toHaveBeenCalledWith(error);
});

test('Market import queries twice, seeds actual manager and caches plain cloned documents', async () => {
	const records = [new Market({ name: 'Alpha' })];
	mockMarket.find.mockResolvedValue(records);
	const { repository, cache } = load('marketRepository');
	await nextCacheSet(cache);
	expect(mockMarket.find).toHaveBeenCalledTimes(2);
	expect(mockMarket.find).toHaveBeenNthCalledWith(1, {});
	expect(mockMarket.find).toHaveBeenNthCalledWith(2, {});
	expect(mockManager.getAllMarkets()).toEqual(records);
	expect(cache.get('markets')).toEqual(records.map(value => value.toObject()));
	await expect(repository.getAll()).resolves.toBe(records);
	expect(mockMarket.find).toHaveBeenCalledTimes(3);
});

test('saveAll awaits every write and refresh, preserves input order and retains existing markets', async () => {
	const old = new Market({ name: 'Old' });
	mockMarket.find.mockResolvedValue([old]);
	const { repository, cache } = load('marketRepository');
	await nextCacheSet(cache);
	const first = new Market({ name: 'First' });
	const second = new Market({ name: 'Second' });
	const savedFirst = deferred();
	const savedSecond = deferred();
	const refreshed = deferred();
	jest.spyOn(first, 'save').mockReturnValue(savedFirst.promise);
	jest.spyOn(second, 'save').mockReturnValue(savedSecond.promise);
	mockMarket.find.mockReturnValue(refreshed.promise);
	let settled = false;
	const result = Promise.resolve(repository.saveAll([first, second])).then(records => {
		settled = true;
		return records;
	});
	savedSecond.resolve(second);
	await new Promise(resolve => {
		setImmediate(resolve);
	});
	expect(settled).toBe(false);
	expect(mockMarket.find).toHaveBeenCalledTimes(2);
	expect(mockManager.getAllMarkets()).toEqual([old]);
	savedFirst.resolve(first);
	await new Promise(resolve => {
		setImmediate(resolve);
	});
	expect(settled).toBe(false);
	refreshed.resolve([old, first, second]);
	await expect(result).resolves.toEqual([first, second]);
	expect(cache.get('markets').map(value => value.name)).toEqual(['Old', 'First', 'Second']);
	expect(mockManager.getAllMarkets()).toEqual([old, first, second]);
});

test('saveAll propagates write errors without publishing a partial manager or cache', async () => {
	const old = new Market({ name: 'Old' });
	mockMarket.find.mockResolvedValue([old]);
	const { repository, cache } = load('marketRepository');
	await nextCacheSet(cache);
	const failed = new Market({ name: 'Failed' });
	const error = new Error('controlled individual market failure');
	jest.spyOn(failed, 'save').mockRejectedValue(error);
	await expect(Promise.resolve(repository.saveAll([failed]))).rejects.toBe(error);
	expect(mockMarket.find).toHaveBeenCalledTimes(2);
	expect(mockManager.getAllMarkets()).toEqual([old]);
	expect(cache.get('markets').map(value => value.name)).toEqual(['Old']);
	expect(log).toHaveBeenCalledWith('Error when saving market:', 'Failed', error);
});

test('saveAll propagates refresh failure without replacing manager state', async () => {
	const old = new Market({ name: 'Old' });
	mockMarket.find.mockResolvedValue([old]);
	const { repository, cache } = load('marketRepository');
	await nextCacheSet(cache);
	const error = new Error('controlled refresh failure');
	mockMarket.find.mockRejectedValue(error);
	await expect(Promise.resolve(repository.saveAll([]))).rejects.toBe(error);
	expect(mockManager.getAllMarkets()).toEqual([old]);
	expect(cache.get('markets').map(value => value.name)).toEqual(['Old']);
});
