const helper = require('../../../marketHelper');

const market = (changes = {}, apiChanges = {}) => {
	const pattern = {
		separator: '-',
		prefix: '',
		currencies: [],
		quoteCurrencyFirst: false,
		baseCurrencyCaseFunction: 'toUpperCase',
		quoteCurrencyCaseFunction: 'toUpperCase',
		...changes,
	};
	const config = { tickerPattern: pattern, tickers: ['BTC-USDT', 'ETH-USDT'], ...apiChanges };
	return { name: 'Alpha', com: { api: { rest: config, websocket: config } } };
};

test.each([
	[{}, {}, 'BTC-USDT', 'BTC-USDT'],
	[{ separator: '_' }, {}, 'BTC_USDT', 'BTC-USDT'],
	[{ prefix: 't' }, {}, 'tBTC-USDT', 'BTC-USDT'],
	[{}, { tickerTextPattern: `ticker.\${ticker}` }, 'ticker.BTC-USDT', 'BTC-USDT'],
	[{ quoteCurrencyFirst: true }, {}, 'USDT-BTC', 'BTC-USDT'],
	[{ currencies: [{ symbol: 'BTC', marketSymbol: 'XBT' }] }, {}, 'XBT-USDT', 'BTC-USDT'],
	[{ separator: '' }, {}, 'btcusdt', 'BTC-USDT'],
	[{ separator: '', prefix: 'T' }, {}, 'tBTCUSDT', 'BTC-USDT'],
	[
		{ separator: '', currencies: [{ symbol: 'BTC', marketSymbol: 'XBT' }] },
		{},
		'xbtusdt',
		'BTC-USDT',
	],
	[{ separator: '' }, {}, 'unknown', undefined],
])(
	'converts native ticker %s with current pattern semantics',
	(changes, apiChanges, ticker, expected) => {
		expect(helper.getAppTicker(market(changes, apiChanges), 'websocket', ticker)).toBe(
			expected
		);
	}
);

test.each([
	[{}, 'BTC-USDT'],
	[
		{
			separator: '',
			baseCurrencyCaseFunction: 'toLowerCase',
			quoteCurrencyCaseFunction: 'toLowerCase',
		},
		'btcusdt',
	],
	[{ quoteCurrencyFirst: true }, 'USDT-BTC'],
	[{ prefix: 't' }, 'tBTC-USDT'],
	[{ currencies: [{ symbol: 'BTC', marketSymbol: 'XBT' }] }, 'XBT-USDT'],
])('builds native pair using current aliases/case/reversal %j', (changes, expected) => {
	expect(helper.getMarketPairCurrency(market(changes), 'websocket', 'BTC-USDT')).toBe(expected);
});

test('REST conversion reads symbol aliases from the REST configuration', () => {
	const input = market();
	input.com.api.rest = {
		...input.com.api.rest,
		tickerPattern: {
			...input.com.api.rest.tickerPattern,
			currencies: [{ symbol: 'BTC', marketSymbol: 'RESTBTC' }],
		},
	};
	input.com.api.websocket = {
		...input.com.api.websocket,
		tickerPattern: {
			...input.com.api.websocket.tickerPattern,
			currencies: [{ symbol: 'BTC', marketSymbol: 'XBT' }],
		},
	};
	expect(helper.getMarketPairCurrency(input, 'rest', 'BTC-USDT')).toBe('RESTBTC-USDT');
});

test('quote-first conversion precedes separator normalization', () => {
	expect(
		helper.getAppTicker(
			market({ quoteCurrencyFirst: true, separator: '_' }),
			'websocket',
			'USDT_BTC'
		)
	).toBe('USDT-BTC');
});

test('no availability callback accepts the message', () => {
	expect(helper.isAvailablePairCurrencyByMarket({}, market())).toBe(true);
});

test('a configured availability function can accept a message', () => {
	const input = market(
		{},
		{ isAvailablePairCurrencyFn: { code: 'message => message.type === "ticker"' } }
	);
	expect(helper.isAvailablePairCurrencyByMarket({ type: 'ticker' }, input)).toBe(true);
});

test('a rejecting availability callback retains the log and thrown error', () => {
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const input = market(
		{},
		{ isAvailablePairCurrencyFn: { code: 'message => message.type === "ticker"' } }
	);
	expect(() => helper.isAvailablePairCurrencyByMarket({ type: 'ping' }, input)).toThrow(
		'Pair currency from Alpha'
	);
	expect(log).toHaveBeenCalledTimes(1);
});

test('invalid configured callback syntax retains a SyntaxError', () => {
	expect(() =>
		helper.isAvailablePairCurrencyByMarket(
			{},
			market({}, { isAvailablePairCurrencyFn: { code: '(' } })
		)
	).toThrow(SyntaxError);
});
