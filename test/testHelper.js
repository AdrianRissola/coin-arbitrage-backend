module.exports = Object.freeze({
	MARKETS: [
		{
			name: 'Binance',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USDT': 'BTCUSDT',
				'ETH-USDT': 'ETHUSDT',
				'ADA-USDT': 'ADAUSDT',
				'ETH-BTC': 'ETHBTC',
				'LTC-USDT': 'LTCUSDT',
				'XRP-USDT': 'XRPUSDT',
				'DOGE-USDT': 'DOGEUSDT',
				'SOL-USDT': 'SOLUSDT',
				'TRX-USDT': 'TRXUSDT',
				'DOT-BTC': 'DOTBTC',
				'ADA-BTC': 'ADABTC',
				'LTC-BTC': 'LTCBTC',
				'XRP-BTC': 'XRPBTC',
				'DOGE-BTC': 'DOGEBTC',
				'SOL-BTC': 'SOLBTC',
				'TRX-BTC': 'TRXBTC',
				'MATIC-USDT': 'MATICUSDT',
				'MATIC-BTC': 'MATICBTC',
				'UNI-USDT': 'UNIUSDT',
				'UNI-BTC': 'UNIBTC',
				'XMR-USDT': 'XMRUSDT',
				'XMR-BTC': 'XMRBTC',
				'XLM-USDT': 'XLMUSDT',
				'XLM-BTC': 'XLMBTC',
				'EOS-USDT': 'EOSUSDT',
				'EOS-BTC': 'EOSBTC',
				'MIOTA-USDT': 'IOTAUSDT',
				'MIOTA-BTC': 'IOTABTC',
				'ZEC-USDT': 'ZECUSDT',
				'ZEC-BTC': 'ZECBTC',
			},
			com: {
				api: {
					rest: {
						base: 'https://api.binance.com/api/v3',
						tickerPath: '/ticker/price?symbol=${ticker}',
						pathToPrice: ['data', 'price'],
					},
					'websocket-disabled': {
						host: 'stream.binance.com',
						url: 'wss://${host}:9443/ws',
						tickerRequest:
							'{"method":"SUBSCRIBE","params":["${ticker}@ticker"],"id":1}',
						availableTickersToMarketTickers: {
							'BTC-USDT': 'btcusdt',
							'ETH-USDT': 'ethusdt',
							'ADA-USDT': 'adausdt',
							'ETH-BTC': 'ethbtc',
							'LTC-USDT': 'ltcusdt',
							'XRP-USDT': 'xrpusdt',
							'DOGE-USDT': 'dogeusdt',
							'SOL-USDT': 'solusdt',
							'TRX-USDT': 'trxusdt',
							'DOT-BTC': 'dotbtc',
							'ADA-BTC': 'adabtc',
							'LTC-BTC': 'ltbbtc',
							'XRP-BTC': 'xrpbtc',
							'DOGE-BTC': 'dogebtc',
							'SOL-BTC': 'solbtc',
							'TRX-BTC': 'trxbtc',
							'MATIC-USDT': 'maticusdt',
							'MATIC-BTC': 'maticbtc',
							'UNI-USDT': 'uniusdt',
							'UNI-BTC': 'unibtc',
							'XMR-USDT': 'xmrusdt',
							'XMR-BTC': 'xmrbtc',
							'XLM-USDT': 'xlmusdt',
							'XLM-BTC': 'xlmbtc',
							'EOS-USDT': 'eosusdt',
							'EOS-BTC': 'eosbtc',
							'MIOTA-USDT': 'iotausdt',
							'MIOTA-BTC': 'iotabtc',
							'ZEC-USDT': 'zecusdt',
							'ZEC-BTC': 'zecbtc',
						},
						pathToPrice: ['c'],
						pathToTicker: ['s'],
					},
				},
			},
		},
		{
			name: 'Bitfinex',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USDT': 'tBTCUST',
				'ETH-USDT': 'tETHUST',
				'ADA-USDT': 'tADAUST',
				'BTC-USD': 'tBTCUSD',
				'ETH-USD': 'tETHUSD',
				'ETH-BTC': 'tETHBTC',
				'LTC-USDT': 'tLTCUST',
				'XRP-USDT': 'tXRPUST',
				'DOGE-USDT': 'tDOGEUST',
				'SOL-USDT': 'tSOLUST',
				'TRX-USDT': 'tTRXUST',
				'DOT-BTC': 'tDOTBTC',
				'ADA-BTC': 'tADABTC',
				'LTC-BTC': 'tLTCBTC',
				'XRP-BTC': 'tXRPBTC',
				'DOGE-BTC': 'tDOGEBTC',
				'SOL-BTC': 'tSOLBTC',
				'TRX-BTC': 'tTRXBTC',
				'MATIC-USDT': 'tMATICUST',
				'MATIC-BTC': 'tMATICBTC',
				'UNI-USDT': 'tUNIUST',
				'UNI-BTC': 'tUNIBTC',
				'XMR-USDT': 'tXMRUST',
				'XMR-BTC': 'tXMRBTC',
				'XLM-USDT': 'tXLMUST',
				'XLM-BTC': 'tXLMBTC',
				'EOS-USDT': 'tEOSUST',
				'EOS-BTC': 'tEOSBTC',
				'MIOTA-USDT': 'tIOTAUST',
				'MIOTA-BTC': 'tIOTABTC',
				'ZEC-USDT': 'tZECUST',
				'ZEC-BTC': 'tZECBTC',
			},
			com: {
				api: {
					rest: {
						base: 'https://api-pub.bitfinex.com/v2',
						tickerPath: '/ticker/${ticker}',
						pathToPrice: ['data', 6],
					},
					websocket: {
						host: 'api-pub.bitfinex.com',
						url: 'wss://${host}/ws/2',
						tickerRequest:
							'{"event":"subscribe","channel":"ticker","symbol":"${ticker}"}',
						availableTickersToMarketTickers: {
							'BTC-USD': 'tBTCUSD',
							'BTC-USDT': 'tBTCUST',
							'ETH-USDT': 'tETHUST',
							'ADA-USDT': 'ADAUST',
							'ETH-USD': 'tETHUSD',
							'ETH-BTC': 'tETHBTC',
							'LTC-USDT': 'tLTCUST',
							'XRP-USDT': 'tXRPUST',
							'DOGE-USDT-disabled': 'tDOGEUST',
							'SOL-USDT': 'tSOLUST',
							'TRX-USDT': 'tTRXUST',
							'DOT-BTC': 'tDOTBTC',
							'ADA-BTC': 'tADABTC',
							'LTC-BTC': 'tLTCBTC',
							'XRP-BTC': 'tXRPBTC',
							'DOGE-BTC': 'tDOGEBTC',
							'SOL-BTC': 'tSOLBTC',
							'TRX-BTC': 'tTRXBTC',
							'MATIC-USDT': 'tMATICUST',
							'MATIC-BTC': 'tMATICBTC',
							'UNI-USDT': 'tUNIUST',
							'UNI-BTC': 'tUNIBTC',
							'XMR-USDT': 'tXMRUST',
							'XMR-BTC': 'tXMRBTC',
							'XLM-USDT': 'tXLMUST',
							'XLM-BTC': 'tXLMBTC',
							'EOS-USDT': 'tEOSUST',
							'EOS-BTC': 'tEOSBTC',
							'MIOTA-USDT': 'tIOTAUST',
							'MIOTA-BTC': 'tIOTABTC',
							'ZEC-USDT': 'tZECUST',
							'ZEC-BTC': 'tZECBTC',
						},
						pathToPrice: [1, 0],
						pathToSubscriptionId: [0],
					},
				},
			},
		},
		{
			name: 'Coinbase',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USD': 'BTC-USD',
				'BTC-USDT': 'BTC-USDT',
				'ETH-USD': 'ETH-USD',
				'ADA-USDT': 'ADA-USDT',
				'ETH-USDT': 'ETH-USDT',
				'ETH-BTC': 'ETH-BTC',
				'LTC-USDT': 'LTC-USDT',
				'XRP-USDT': 'XRP-USDT',
				'DOGE-USDT': 'DOGE-USDT',
				'SOL-USDT': 'SOL-USDT',
				'TRX-USDT': 'TRX-USDT',
				'DOT-BTC': 'DOT-BTC',
				'ADA-BTC': 'ADA-BTC',
				'LTC-BTC': 'LTC-BTC',
				'XRP-BTC': 'XRP-BTC',
				'DOGE-BTC': 'DOGE-BTC',
				'SOL-BTC': 'SOL-BTC',
				'TRX-BTC': 'TRX-BTC',
				'MATIC-USDT': 'MATIC-USDT',
				'MATIC-BTC': 'MATIC-BTC',
				'UNI-USDT': 'UNI-USDT',
				'UNI-BTC': 'UNI-BTC',
				'XMR-USDT': 'XMR-USDT',
				'XMR-BTC': 'XMR-BTC',
				'XLM-USDT': 'XLM-USDT',
				'XLM-BTC': 'XLM-BTC',
				'EOS-USDT': 'EOS-USDT',
				'EOS-BTC': 'EOS-BTC',
				'MIOTA-USDT': 'IOTA-USDT',
				'MIOTA-BTC': 'IOTA-BTC',
				'ZEC-USDT': 'ZEC-USDT',
				'ZEC-BTC': 'ZEC-BTC',
			},
			com: {
				api: {
					rest: {
						base: 'https://api.exchange.coinbase.com',
						tickerPath: '/products/${ticker}/ticker',
						pathToPrice: ['data', 'price'],
					},
					websocket: {
						host: 'ws-feed.exchange.coinbase.com',
						url: 'wss://${host}',
						tickerRequest:
							'{"type": "subscribe","channels": [{"name": "ticker","product_ids": ["${ticker}"]}]}',
						availableTickersToMarketTickers: {
							'BTC-USD': 'BTC-USD',
							'BTC-USDT': 'BTC-USDT',
							'ETH-USD': 'ETH-USD',
							'ADA-USDT': 'ADA-USDT',
							'ETH-USDT': 'ETH-USDT',
							'ETH-BTC': 'ETH-BTC',
							'LTC-USDT-disabled': 'LTC-USDT',
							'XRP-USDT': 'XRP-USDT',
							'DOGE-USDT': 'DOGE-USDT',
							'SOL-USDT': 'SOL-USDT',
							'TRX-USDT': 'TRX-USDT',
							'DOT-BTC': 'DOT-BTC',
							'ADA-BTC': 'ADA-BTC',
							'LTC-BTC': 'LTC-BTC',
							'XRP-BTC': 'XRP-BTC',
							'DOGE-BTC': 'DOGE-BTC',
							'SOL-BTC': 'SOL-BTC',
							'TRX-BTC': 'TRX-BTC',
							'MATIC-USDT': 'MATIC-USDT',
							'MATIC-BTC': 'MATIC-BTC',
							'UNI-USDT': 'UNI-USDT',
							'UNI-BTC': 'UNI-BTC',
							'XMR-USDT': 'XMR-USDT',
							'XMR-BTC': 'XMR-BTC',
							'XLM-USDT': 'XLM-USDT',
							'XLM-BTC': 'XLM-BTC',
							'EOS-USDT': 'EOS-USDT',
							'EOS-BTC': 'EOS-BTC',
							'MIOTA-USDT': 'IOTA-USDT',
							'MIOTA-BTC': 'IOTA-BTC',
							'ZEC-USDT': 'ZEC-USDT',
							'ZEC-BTC': 'ZEC-BTC',
						},
						pathToPrice: ['price'],
						pathToTicker: ['product_id'],
					},
				},
			},
		},
		{
			name: 'Bittrex',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USD': 'BTC-USD',
				'BTC-USDT': 'BTC-USDT',
				'ADA-USDT': 'ADA-USDT',
				'ETH-USD': 'ETH-USD',
				'ETH-USDT': 'ETH-USDT',
				'ETH-BTC': 'ETH-BTC',
			},
			com: {
				api: {
					rest: {
						base: 'https://api.bittrex.com/v3',
						tickerPath: '/markets/${ticker}/ticker',
						pathToPrice: ['data', 'lastTradeRate'],
					},
				},
			},
		},
		{
			name: 'Poloniex',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USDT': 'USDT_BTC',
				'ETH-USDT': 'USDT_ETH',
				'ADA-USDT': 'USDT_ADA',
				'ETH-BTC': 'BTC_ETH',
			},
			com: {
				api: {
					rest: {
						base: 'https://poloniex.com/public',
						tickerPath: '?command=returnTicker',
						pathToPrice: ['data', '${ticker}', 'last'],
					},
					websocket: {
						host: 'ws.poloniex.com',
						url: 'wss://${host}/ws/public',
						tickerRequest:
							'{"event": "subscribe","channel": ["ticker"],"symbols": ["${ticker}"]}',
						availableTickersToMarketTickers: {
							'BTC-USDT': 'BTC_USDT',
							'ETH-USDT': 'ETH_USDT',
							'ADA-USDT': 'ADA_USDT',
							'ETH-BTC': 'ETH_BTC',
							'LTC-USDT': 'LTC_USDT',
							'XRP-USDT': 'XRP_USDT',
							'DOGE-USDT': 'DOGE_USDT',
							'SOL-USDT': 'SOL_USDT',
							'TRX-USDT': 'TRX_USDT',
							'DOT-BTC': 'DOT_BTC',
							'ADA-BTC': 'ADA_BTC',
							'LTC-BTC': 'LTC_BTC',
							'XRP-BTC': 'XRP_BTC',
							'DOGE-BTC': 'DOGE_BTC',
							'SOL-BTC': 'SOL_BTC',
							'TRX-BTC': 'TRX_BTC',
							'MATIC-USDT': 'MATIC_USDT',
							'MATIC-BTC': 'MATIC_BTC',
							'UNI-USDT': 'UNI_USDT',
							'UNI-BTC': 'UNI_BTC',
							'XMR-USDT': 'XMR_USDT',
							'XMR-BTC': 'XMR_BTC',
							'XLM-USDT': 'XLM_USDT',
							'XLM-BTC': 'XLM_BTC',
							'EOS-USDT': 'EOS_USDT',
							'EOS-BTC': 'EOS_BTC',
							'MIOTA-USDT': 'IOTA_USDT',
							'MIOTA-BTC': 'IOTA_BTC',
							'ZEC-USDT': 'ZEC_USDT',
							'ZEC-BTC': 'ZEC_BTC',
						},
						pathToPrice: ['data', 0, 'markPrice'],
						pathToTicker: ['data', 0, 'symbol'],
						pingFrequencyInSeconds: 30,
					},
				},
			},
		},
		{
			name: 'Kraken',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USD': 'XXBTZUSD',
				'BTC-USDT': 'XBTUSDT',
				'ETH-USD': 'XETHZUSD',
				'ETH-USDT': 'ETHUSDT',
				'ADA-USDT': 'ADAUSDT',
				'ETH-BTC': 'XETHXXBT',
			},
			com: {
				api: {
					rest: {
						base: 'https://api.kraken.com/0/public',
						tickerPath: '/Ticker?pair=${ticker}',
						pathToPrice: ['data', 'result', '${ticker}', 'c', 0],
					},
					websocket: {
						host: 'ws.kraken.com',
						url: 'wss://${host}',
						tickerRequest:
							'{"event": "subscribe","pair": ["${ticker}"],"subscription": {"name": "ticker"}}',
						availableTickersToMarketTickers: {
							'BTC-USD': 'XBT/USD',
							'BTC-USDT': 'XBT/USDT',
							'ETH-USD': 'ETH/USD',
							'ETH-USDT': 'ETH/USDT',
							'ADA-USDT': 'ADA/USDT',
							'ETH-BTC': 'ETH/XBT',
							'LTC-USDT': 'LTC/USDT',
							'XRP-USDT': 'XRP/USDT',
							'DOGE-USDT': 'DOGE/USDT',
							'SOL-USDT': 'SOL/USDT',
							'TRX-USDT': 'TRX/USDT',
							'DOT-BTC': 'DOT/XBT',
							'ADA-BTC': 'ADA/XBT',
							'LTC-BTC': 'LTC/XBT',
							'XRP-BTC': 'XRP/XBT',
							'DOGE-BTC': 'DOGE/XBT',
							'SOL-BTC': 'SOL/XBT',
							'TRX-BTC': 'TRX/XBT',
							'MATIC-USDT': 'MATIC/USDT',
							'MATIC-BTC': 'MATIC/XBT',
							'UNI-USDT': 'UNI/USDT',
							'UNI-BTC': 'UNI/XBT',
							'XMR-USDT': 'XMR/USDT',
							'XMR-BTC': 'XMR/XBT',
							'XLM-USDT': 'XLM/USDT',
							'XLM-BTC': 'XLM/XBT',
							'EOS-USDT': 'EOS/USDT',
							'EOS-BTC': 'EOS/XBT',
							'MIOTA-USDT': 'IOTA/USDT',
							'MIOTA-BTC': 'IOTA/XBT',
							'ZEC-USDT': 'ZEC/USDT',
							'ZEC-BTC': 'ZEC/XBT',
						},
						pathToPrice: [1, 'c', 0],
						pathToTicker: [3],
					},
				},
			},
		},
		{
			name: 'Okex',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USD': 'BTC-USD',
				'BTC-USDT': 'BTC-USDT',
				'ETH-USD': 'ETH-USD',
				'ETH-USDT': 'ETH-USDT',
				'ADA-USDT': 'ADA-USDT',
			},
			com: {
				api: {
					rest: {
						base: 'https://www.okex.com/api/v5',
						tickerPath: '/market/ticker?instId=${ticker}-SWAP',
						pathToPrice: ['data', 'data', 0, 'last'],
					},
					websocket: {
						host: 'ws.okx.com',
						url: 'wss://${host}:8443/ws/v5/public',
						tickerRequest:
							'{"op": "subscribe","args": [{"channel": "tickers","instId": "${ticker}"}]}',
						availableTickersToMarketTickers: {
							'BTC-USD': 'BTC-USD',
							'BTC-USDT': 'BTC-USDT',
							'ETH-USD': 'ETH-USD',
							'ETH-USDT': 'ETH-USDT',
							'ADA-USDT': 'ADA-USDT',
							'LTC-USDT': 'LTC-USDT',
							'XRP-USDT': 'XRP-USDT',
							'DOGE-USDT': 'DOGE-USDT',
							'SOL-USDT': 'SOL-USDT',
							'TRX-USDT': 'TRX-USDT',
							'DOT-BTC': 'DOT-BTC',
							'ADA-BTC': 'ADA-BTC',
							'LTC-BTC': 'LTC-BTC',
							'XRP-BTC': 'XRP-BTC',
							'DOGE-BTC': 'DOGE-BTC',
							'SOL-BTC': 'SOL-BTC',
							'TRX-BTC': 'TRX-BTC',
							'MATIC-USDT': 'MATIC-USDT',
							'MATIC-BTC': 'MATIC-BTC',
							'UNI-USDT': 'UNI-USDT',
							'UNI-BTC': 'UNI-BTC',
							'XMR-USDT': 'XMR-USDT',
							'XMR-BTC': 'XMR-BTC',
							'XLM-USDT': 'XLM-USDT',
							'XLM-BTC': 'XLM-BTC',
							'EOS-USDT': 'EOS-USDT',
							'EOS-BTC': 'EOS-BTC',
							'MIOTA-USDT': 'IOTA-USDT',
							'MIOTA-BTC': 'IOTA-BTC',
							'ZEC-USDT': 'ZEC-USDT',
							'ZEC-BTC': 'ZEC-BTC',
						},
						pathToPrice: ['data', 0, 'last'],
						pathToTicker: ['data', 0, 'instId'],
					},
				},
			},
		},
		{
			name: 'Bitmex',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USD': 'xbtusd',
				'BTC-USDT': 'xbtusdt',
				'ADA-USDT': 'adausdt',
				'ETH-USD': 'ethusd',
				'ETH-USDT': 'ethusdt',
				'ETH-BTC': 'ethxbt',
			},
			com: {
				api: {
					rest: {
						base: 'https://www.bitmex.com/api/v1',
						tickerPath: '/trade?symbol=${ticker}&count=1&reverse=true',
						pathToPrice: ['data', 0, 'price'],
					},
					websocket: {
						host: 'ws.bitmex.com',
						url: 'wss://${host}/realtime',
						tickerRequest: '{"op": "subscribe","args": ["instrument:${ticker}"]}',
						availableTickersToMarketTickers: {
							'BTC-USD': 'xbtusd',
							'BTC-USDT': 'xbtusdt',
							'ETH-USD': 'ethusd',
							'ETH-USDT': 'ethusdt',
							'ADA-USDT': 'adausdt',
							'LTC-USDT': 'ltcusdt',
							'XRP-USDT': 'xrpusdt',
							'DOGE-USDT': 'dogeusdt',
							'SOL-USDT': 'solusdt',
							'TRX-USDT': 'trxusdt',
							'ETH-BTC-disabled': 'ethxbt',
							'DOT-BTC': 'dotxbt',
							'ADA-BTC': 'adaxbt',
							'LTC-BTC': 'ltbxbt',
							'XRP-BTC': 'xrpxbt',
							'DOGE-BTC': 'dogexbt',
							'SOL-BTC': 'solxbt',
							'TRX-BTC': 'trxxbt',
							'MATIC-USDT': 'maticusdt',
							'MATIC-BTC': 'maticxbt',
							'UNI-USDT': 'uniusdt',
							'UNI-BTC': 'unixbt',
							'XMR-USDT': 'xmrusdt',
							'XMR-BTC': 'xmrxbt',
							'XLM-USDT': 'xlmusdt',
							'XLM-BTC': 'xlmxbt',
							'EOS-USDT': 'eosusdt',
							'EOS-BTC': 'eosxbt',
							'MIOTA-USDT': 'iotausdt',
							'MIOTA-BTC': 'iotaxbt',
							'ZEC-USDT': 'zecusdt',
							'ZEC-BTC': 'zecxbt',
						},
						pathToPrice: ['data', 0, 'lastPrice'],
						pathToTicker: ['data', 0, 'symbol'],
					},
				},
			},
		},
		{
			name: 'Bitstamp',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USD': 'btcusd',
				'BTC-USDT': 'btcusdt',
				'ETH-USD': 'ethusd',
				'ETH-USDT': 'ethusdt',
				'ETH-BTC': 'ethbtc',
				'ADA-USDT': 'adausdt',
			},
			com: {
				api: {
					rest: {
						base: 'https://www.bitstamp.net/api/v2',
						tickerPath: '/ticker/${ticker}',
						pathToPrice: ['data', 'last'],
					},
					websocket: {
						host: 'ws.bitstamp.net',
						url: 'wss://${host}',
						tickerRequest:
							'{"event": "bts:subscribe","data": {"channel": "live_trades_${ticker}"}}',
						availableTickersToMarketTickers: {
							'BTC-USD': 'btcusd',
							'BTC-USDT': 'btcusdt',
							'ETH-USD': 'ethusd',
							'ETH-USDT': 'ethusdt',
							'ADA-USDT': 'adausdt',
							'ETH-BTC': 'ethbtc',
							'LTC-USDT': 'ltcusdt',
							'XRP-USDT': 'xrpusdt',
							'DOGE-USDT': 'dogeusdt',
							'SOL-USDT': 'solusdt',
							'TRX-USDT': 'trxusdt',
							'DOT-BTC': 'dotbtc',
							'ADA-BTC': 'adabtc',
							'LTC-BTC': 'ltbbtc',
							'XRP-BTC': 'xrpbtc',
							'DOGE-BTC': 'dogebtc',
							'SOL-BTC': 'solbtc',
							'TRX-BTC': 'trxbtc',
							'MATIC-USDT': 'maticusdt',
							'MATIC-BTC': 'maticbtc',
							'UNI-USDT': 'uniusdt',
							'UNI-BTC': 'unibtc',
							'XMR-USDT': 'xmrusdt',
							'XMR-BTC': 'xmrbtc',
							'XLM-USDT': 'xlmusdt',
							'XLM-BTC': 'xlmbtc',
							'EOS-USDT': 'eosusdt',
							'EOS-BTC': 'eosbtc',
							'MIOTA-USDT': 'iotausdt',
							'MIOTA-BTC': 'iotabtc',
							'ZEC-USDT': 'zecusdt',
							'ZEC-BTC': 'zecbtc',
						},
						pathToPrice: ['data', 'price'],
						pathToTicker: ['channel'],
						// pathToSubscriptionId: ['channel'],
					},
				},
			},
		},
		{
			name: 'HitBTC',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USDT': 'BTCUSDT',
				'ETH-USDT': 'ETHUSDT',
				'ADA-USDT': 'ADAUSDT',
				'ETH-BTC': 'ETHBTC',
			},
			com: {
				api: {
					rest: {
						base: 'https://api.hitbtc.com/api/3/public',
						tickerPath: '/ticker?symbols=${ticker}',
						pathToPrice: ['data', '${ticker}', 'last'],
					},
					websocket: {
						host: 'api.hitbtc.com',
						url: 'wss://${host}/api/3/ws/public',
						tickerRequest:
							'{"method": "subscribe","ch": "ticker/1s","params": {"symbols": ["${ticker}"]}}',
						availableTickersToMarketTickers: {
							'BTC-USDT': 'BTCUSDT',
							'ETH-USDT': 'ETHUSDT',
							'ETH-BTC': 'ETHBTC',
							'ADA-USDT': 'ADAUSDT',
							'LTC-USDT': 'LTCUSDT',
							'XRP-USDT': 'XRPUSDT',
							'DOGE-USDT-disabled': 'DOGEUSDT',
							'SOL-USDT': 'SOLUSDT',
							'TRX-USDT': 'TRXUSDT',
							'DOT-BTC': 'DOTBTC',
							'ADA-BTC': 'ADABTC',
							'LTC-BTC': 'LTCBTC',
							'XRP-BTC': 'XRPBTC',
							'DOGE-BTC-disabled': 'DOGEBTC',
							'SOL-BTC': 'SOLBTC',
							'TRX-BTC': 'TRXBTC',
							'MATIC-USDT': 'MATICUSDT',
							'MATIC-BTC': 'MATICBTC',
							'UNI-USDT': 'UNIUSDT',
							'UNI-BTC': 'UNIBTC',
							'XMR-USDT': 'XMRUSDT',
							'XMR-BTC': 'XMRBTC',
							'XLM-USDT': 'XLMUSDT',
							'XLM-BTC': 'XLMBTC',
							'EOS-USDT': 'EOSUSDT',
							'EOS-BTC': 'EOSBTC',
							'MIOTA-USDT': 'IOTAUSDT',
							'MIOTA-BTC': 'IOTABTC',
							'ZEC-USDT': 'ZECUSDT',
							'ZEC-BTC': 'ZECBTC',
						},
						pathToPrice: ['data', '${ticker}', 'c'],
						pathToTicker: ['data'],
						tickerKeyIndex: 0,
					},
				},
			},
		},
		{
			name: 'Crypto.com',
			type: 'Exchange with order book',
			availableTickersToMarketTickers: {
				'BTC-USD': 'BTCUSD',
				'ETH-USD': 'ETHUSD',
				'ADA-USDT': 'ADAUSDT',
			},
			com: {
				api: {
					websocket: {
						host: 'stream.crypto.com',
						url: 'wss://${host}/v2/market',
						tickerRequest:
							'{"method": "subscribe","params": { "channels": ["ticker.${ticker}"]}}',
						availableTickersToMarketTickers: {
							'BTC-USD': 'BTC_USD',
							'BTC-USDT': 'BTC_USDT',
							'ETH-USDT': 'ETH_USDT',
							'ADA-USDT': 'ADA_USDT',
							'ETH-USD': 'ETH_USD',
							'ETH-BTC': 'ETH_BTC',
							'LTC-USDT': 'LTC_USDT',
							'XRP-USDT': 'XRP_USDT',
							'DOGE-USDT': 'DOGE_USDT',
							'SOL-USDT': 'SOL_USDT',
							'TRX-USDT': 'TRX_USDT',
							'DOT-BTC': 'DOT_BTC',
							'ADA-BTC': 'ADA_BTC',
							'LTC-BTC': 'LTC_BTC',
							'XRP-BTC': 'XRP_BTC',
							'DOGE-BTC': 'DOGE_BTC',
							'SOL-BTC': 'SOL_BTC',
							'TRX-BTC': 'TRX_BTC',
							'MATIC-USDT': 'MATIC_USDT',
							'MATIC-BTC': 'MATIC_BTC',
							'UNI-USDT': 'UNI_USDT',
							'UNI-BTC': 'UNI_BTC',
							'XMR-USDT': 'XMR_USDT',
							'XMR-BTC': 'XMR_BTC',
							'XLM-USDT': 'XLM_USDT',
							'XLM-BTC': 'XLM_BTC',
							'EOS-USDT': 'EOS_USDT',
							'EOS-BTC': 'EOS_BTC',
							'MIOTA-USDT': 'IOTA_USDT',
							'MIOTA-BTC': 'IOTA_BTC',
							'ZEC-USDT': 'ZEC_USDT',
							'ZEC-BTC': 'ZEC_BTC',
						},
						pathToPrice: ['result', 'data', 0, 'a'],
						pathToTicker: ['result', 'instrument_name'],
					},
				},
			},
		},
	],
	TICKERS: [
		{
			name: 'BTC-USD',
			description: 'Bitcoin - United States dollar',
			type: 'crypto',
			rest: true,
			websocket: false,
		},
		{
			name: 'BTC-USDT',
			description: 'Bitcoin - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'ETH-USDT',
			description: 'Ether (Ethereum) - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'ETH-USD',
			description: 'Ether (Ethereum) - United States dollar',
			type: 'crypto',
			rest: true,
			websocket: false,
		},
		{
			name: 'ETH-BTC',
			description: 'Ether (Ethereum) - Bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'ADA-USDT',
			description: 'Ada (Cardano) - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'LTC-USDT',
			description: 'Litecoin - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'XRP-USDT',
			description: 'ripple - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'DOGE-USDT',
			description: 'dogecoin - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'SOL-USDT',
			description: 'solana - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'TRX-USDT',
			description: 'tron - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'DOT-BTC',
			description: 'polkadot - bitocin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'ADA-BTC',
			description: 'cardano - bitocin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'LTC-BTC',
			description: 'litecoin - bitocin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'XRP-BTC',
			description: 'ripple - bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'DOGE-BTC',
			description: 'dogecoin - bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'SOL-BTC',
			description: 'solana - bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'TRX-BTC',
			description: 'tron - bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'MATIC-USDT',
			description: 'Polygon - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'MATIC-BTC',
			description: 'Polygon- bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'UNI-USDT',
			description: 'Uniswap - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'UNI-BTC',
			description: 'Uniswap - Bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'XMR-USDT',
			description: 'Monero - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'XMR-BTC',
			description: 'Monero - bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'XLM-USDT',
			description: 'Stellar - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'XLM-BTC',
			description: 'Stellar - bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'EOS-USDT',
			description: 'EOS - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'EOS-BTC',
			description: 'EOS - bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'MIOTA-USDT',
			description: 'IOTA - USD Tether',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'MIOTA-BTC',
			description: 'IOTA - bitcoin',
			type: 'crypto',
			rest: true,
			websocket: true,
		},
		{
			name: 'BTC-ARS',
			description: 'Bitcoin - argentine pesos',
			type: 'crypto',
			rest: true,
			websocket: false,
		},
		{
			name: 'ETH-ARS',
			description: 'Ethereum - argentine pesos',
			type: 'crypto',
			rest: true,
			websocket: false,
		},
		{
			name: 'ZEC-USDT',
			description: 'Zcash- USD Tether',
			type: 'crypto',
			rest: false,
			websocket: true,
		},
		{
			name: 'ZEC-BTC',
			description: 'Zcash- bitcoin',
			type: 'crypto',
			rest: false,
			websocket: true,
		},
	],
});
