const cases = [
	['Bitfinex', 'BTC-USD', 'tBTCUSD', 'https://api-pub.bitfinex.com/v2/ticker/tBTCUSD'],
	['Coinbase', 'BTC-USD', 'BTC-USD', 'https://api.exchange.coinbase.com/products/BTC-USD/ticker'],
	['Bitstamp', 'BTC-USD', 'btcusd', 'https://www.bitstamp.net/api/v2/ticker/btcusd'],
	[
		'Binance',
		'BTC-USDT',
		'BTCUSDT',
		'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
	],
	['Poloniex', 'BTC-USDT', 'USDT_BTC', 'https://poloniex.com/public?command=returnTicker'],
	['Kraken', 'BTC-USDT', 'XBTUSDT', 'https://api.kraken.com/0/public/Ticker?pair=XBTUSDT'],
	[
		'Okex',
		'BTC-USDT',
		'BTC-USDT',
		'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT-SWAP',
	],
	['Bitstamp', 'BTC-USDT', 'btcusdt', 'https://www.bitstamp.net/api/v2/ticker/btcusdt'],
	['Bitfinex', 'ETH-USD', 'tETHUSD', 'https://api-pub.bitfinex.com/v2/ticker/tETHUSD'],
	['Coinbase', 'ETH-USD', 'ETH-USD', 'https://api.exchange.coinbase.com/products/ETH-USD/ticker'],
	['Bitstamp', 'ETH-USD', 'ethusd', 'https://www.bitstamp.net/api/v2/ticker/ethusd'],
	[
		'Binance',
		'ETH-USDT',
		'ETHUSDT',
		'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
	],
	['Poloniex', 'ETH-USDT', 'USDT_ETH', 'https://poloniex.com/public?command=returnTicker'],
	['Kraken', 'ETH-USDT', 'ETHUSDT', 'https://api.kraken.com/0/public/Ticker?pair=ETHUSDT'],
	[
		'Okex',
		'ETH-USDT',
		'ETH-USDT',
		'https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT-SWAP',
	],
	['Bitstamp', 'ETH-USDT', 'ethusdt', 'https://www.bitstamp.net/api/v2/ticker/ethusdt'],
];
const bodies = {
	Binance: { price: '80' },
	Bitfinex: [0, 0, 0, 0, 0, 0, '80'],
	Coinbase: { price: '80' },
	Bittrex: { lastTradeRate: '80' },
	Poloniex: { USDT_BTC: { last: '80' }, USDT_ETH: { last: '80' } },
	Kraken: { result: { XBTUSDT: { c: ['80'] }, ETHUSDT: { c: ['80'] } } },
	Okex: { data: [{ last: '80' }] },
	Bitstamp: { last: '80' },
};

module.exports = { cases, bodies };
