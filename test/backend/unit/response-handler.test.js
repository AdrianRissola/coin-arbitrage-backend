const { extractNumberFromTarget } = require('../../../marketApiResponseHandler');

test.each([
	[['data', 0, 'price'], { data: [{ price: '12.5' }] }, { valueType: 'number' }, 12.5],
	[
		[`\${ticker}`, 'last'],
		{ BTCUSDT: { last: '80' } },
		{ valueType: 'number', marketTickerName: 'BTCUSDT' },
		80,
	],
	[
		[`\${ticker}.0`, `\${ticker}.1`],
		{ BTC: { USDT: 125 } },
		{ valueType: 'number', marketTickerName: 'BTC-USDT', tickerSeparator: '-' },
		125,
	],
	[[], 'ticker', { valueType: 'string' }, 'ticker'],
	[[], { BTC: 80, ETH: 90 }, { valueType: 'number', tickerKeyIndex: 1 }, 'ETH'],
	[['price'], { price: -2 }, { valueType: 'number' }, -2],
	[['price'], { price: '0' }, {}, '0'],
	[['price'], { price: '12.5' }, {}, '12.5'],
])('extracts path %j with current conversion/key semantics', (fieldPath, target, config, value) => {
	expect(extractNumberFromTarget(fieldPath, target, config)).toBe(value);
});

test.each([
	[['data', 'price'], { data: null }, { valueType: 'number' }],
	[['price'], { price: 0 }, { valueType: 'number' }],
	[['price'], { price: '0' }, { valueType: 'number' }],
	[['price'], { price: '' }, { valueType: 'string' }],
	[['price'], { price: 'bad-number' }, { valueType: 'number' }],
	[['price'], { price: 80 }, { valueType: 'string' }],
	[['price'], null, { valueType: 'number' }],
])(
	'rejects falsey/invalid extraction at %j with the real error object',
	(fieldPath, target, config) => {
		expect(() => extractNumberFromTarget(fieldPath, target, config)).toThrow(
			expect.objectContaining({
				code: 400,
				message: 'BAD REQUEST',
				description: `Error when try to extract value from target using pathToValue: ${fieldPath}`,
			})
		);
	}
);

test('missing object during key-index extraction retains its native TypeError', () => {
	expect(() => extractNumberFromTarget(['absent'], {}, { tickerKeyIndex: 0 })).toThrow(TypeError);
});
