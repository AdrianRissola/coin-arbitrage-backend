module.exports = Object.freeze({
    MARKETS:
    [
        {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "baseUrl" : "https://api.binance.com/api/v3/ticker/price?symbol=${ticker}",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "BTCUSDT",
                "ETH-BTC" : "ETHBTC",
                "ETH-USDT" : "ETHUSDT"
            }
        },
        {
            "name" : "Bitfinex",
            "type" : "Exchange with order book",
            "baseUrl" : "https://api-pub.bitfinex.com/v2/ticker/${ticker}",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "tBTCUSD",
                "BTC-USDT" : "tBTCUST",
                "ETH-USD" : "tETHUSD",
                "ETH-USDT" : "tETHUST",
                "ETH-BTC" : "tETHBTC"
            }
        },
        {
            "name" : "Coinbase",
            "type" : "Exchange with order book",
            "baseUrl" : "https://api.exchange.coinbase.com/products/${ticker}/ticker",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "BTC-USD",
                "BTC-USDT" : "BTC-USDT",
                "ETH-USD" : "ETH-USD",
                "ETH-USDT" : "ETH-USDT",
                "ETH-BTC" : "ETH-BTC"
            }
        },
        {
            "name" : "Bittrex",
            "type" : "Exchange with order book",
            "baseUrl" : "https://api.bittrex.com/v3/markets/${ticker}/ticker",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "BTC-USD",
                "BTC-USDT" : "BTC-USDT",
                "ETH-USD" : "ETH-USD",
                "ETH-USDT" : "ETH-USDT",
                "ETH-BTC" : "ETH-BTC"
            }
        },
        {
            "name" : "Poloniex",
            "type" : "Exchange with order book",
            "baseUrl" : "https://poloniex.com/public?command=returnTicker",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "USDT_BTC",
                "ETH-USDT" : "USDT_ETH",
                "ETH-BTC" : "BTC_ETH"
            }
        },
        {
            "name" : "Kraken",
            "type" : "Exchange with order book",
            "baseUrl" : "https://api.kraken.com/0/public/Ticker?pair=${ticker}",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "XBTUSD",
                "BTC-USDT" : "XBTUSDT",
                "ETH-USD" : "ETHUSD",
                "ETH-USDT" : "ETHUSDT",
                "ETH-BTC" : "ETHXBT"
            }
        },
        {
            "name" : "Okex",
            "type" : "Exchange with order book",
            "baseUrl" : "https://www.okex.com/api/v5/market/ticker?instId=${ticker}-SWAP",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "BTC-USD",
                "BTC-USDT" : "BTC-USDT",
                "ETH-USD" : "ETH-USD",
                "ETH-USDT" : "ETH-USDT"
            }
        },
        {
            "name" : "Bitmex",
            "type" : "Exchange with order book",
            "baseUrl" : "https://www.bitmex.com/api/v1/trade?symbol=${ticker}&count=1&reverse=true",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "xbtusd",
                "BTC-USDT" : "xbtusdt",
                "ETH-USD" : "ethusd",
                "ETH-USDT" : "ethusdt",
                "ETH-BTC" : "ethxbt"
            }
        },
        {
            "name" : "Bitstamp",
            "type" : "Exchange with order book",
            "baseUrl" : "https://www.bitstamp.net/api/v2/ticker/${ticker}",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "btcusd",
                "BTC-USDT" : "btcusdt",
                "ETH-USD" : "ethusd",
                "ETH-USDT" : "ethusdt",
                "ETH-BTC" : "ethbtc"
            }
        },
        {
            "name" : "HitBTC",
            "type" : "Exchange with order book",
            "baseUrl" : "https://api.hitbtc.com/api/3/public/ticker?symbols=${ticker}",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "BTCUSDT",
                "ETH-USDT" : "ETHUSDT",
                "ETH-BTC" : "ETHBTC"
            }
        }

    ],
    TICKERS:
    [
        {
            "name" : "BTC-USD",
            "description" : "bitcoin - United States dollar",
            "type" : "crypto",
        },
        {
            "name" : "BTC-USDT",
            "description" : "bitcoin - USD Tether",
            "type" : "crypto"
        },
        {
            "name" : "ETH-USDT",
            "description" : "ether - USD Tether",
            "type" : "crypto"
        },
        {
            "name" : "ETH-USD",
            "description" : "ether- United States dollar",
            "type" : "crypto",
        },
        {
            "name" : "ETH-BTC",
            "description" : "ether- bitcoin",
            "type" : "crypto",
        }
    ]
})