const dto = require('../../../dtoConverter');
const { isString } = require('../../../helper');

test.each([
	['', true],
	['BTC-USDT', true],
	[Object('BTC'), false],
	[0, false],
	[null, false],
	[undefined, false],
	[[], false],
	[{}, false],
])('primitive string predicate for %j', (value, expected) => {
	expect(isString(value)).toBe(expected);
});

test('stream DTO projects market/price and uppercases lookup keys', () => {
	expect(
		dto.toMarketPricesStreamDto(
			{
				a: {
					connected: false,
					data: { market: { name: 'Alpha' }, tickerPrices: { 'BTC-USDT': 80 } },
				},
				b: { data: { market: { name: 'Beta' }, tickerPrices: { 'ETH-USDT': 90 } } },
			},
			'btc-usdt'
		)
	).toEqual([{ market: 'Alpha', price: 80 }]);
});

test('stream DTO omits numeric zero but retains string zero', () => {
	expect(
		dto.toMarketPricesStreamDto(
			{
				a: { data: { market: { name: 'Alpha' }, tickerPrices: { 'BTC-USDT': 0 } } },
				b: { data: { market: { name: 'Beta' }, tickerPrices: { 'BTC-USDT': '0' } } },
				c: { data: { market: { name: 'Gamma' } } },
			},
			'BTC-USDT'
		)
	).toEqual([{ market: 'Beta', price: '0' }]);
});

test('connection DTO removes configuration but preserves false/closed state', () => {
	expect(
		dto.toConnectionsDto({
			alpha: {
				connected: false,
				closeDescription: 'synthetic close',
				state: 'closed',
				config: { private: 'synthetic' },
				extra: 1,
			},
		})
	).toEqual({
		alpha: { connected: false, closeDescription: 'synthetic close', state: 'closed' },
	});
});

test('market DTO keeps REST ticker arrays empty and joins literal endpoint strings', () => {
	expect(
		dto.toMarketsDto([
			{
				name: 'Alpha',
				website: 'https://alpha.invalid',
				type: 'centralized',
				com: {
					api: {
						rest: { base: 'https://alpha.invalid/', tickerPath: '/ticker' },
						websocket: { tickers: ['BTC-USDT'] },
					},
				},
			},
		])
	).toEqual([
		{
			name: 'Alpha',
			website: 'https://alpha.invalid',
			type: 'centralized',
			tickers: { rest: [], websocket: ['BTC-USDT'] },
			tickerRestEndpoint: 'https://alpha.invalid//ticker',
		},
	]);
});

test('missing market transport data produces empty tickers and a null endpoint', () => {
	expect(JSON.parse(JSON.stringify(dto.toMarketsDto([{ name: 'Alpha' }])))).toEqual([
		{ name: 'Alpha', tickers: { rest: [], websocket: [] }, tickerRestEndpoint: null },
	]);
});

test.each([[[]], [{}]])('empty collection produces an empty projection', value => {
	expect(Array.isArray(value) ? dto.toMarketsDto(value) : dto.toConnectionsDto(value)).toEqual(
		value
	);
});
