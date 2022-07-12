module.exports = Object.freeze({
    MARKET_TO_TICKER: {
        BITFINEX: {
            "BTC-USD": "tBTCUSD",  // from app ticker to market symbol
            "TBTCUSD": "BTC-USD",  // from market symbol (in mayus) to app ticker
        },
        BINANCE: {
            "BTC-USDT": "BTCUSDT",
            "BTCUSDT": "BTC-USDT",
        },
        COINBASE: {
            "BTC-USD": "BTC-USD",
        },
        BITTREX: {
            "BTC-USDT": "BTC-USDT",
        },
        POLONIEX: {
            "BTC-USDT": "USDT_BTC",
            "USDT_BTC": "BTC-USDT",
        },
        KRAKEN: {
            "BTC-USD": "XXBTZUSD",
            "XXBTZUSD": "BTC-USD",
        },
        OKEX: {
            "BTC-USDT": "BTC-USDT",
        },
        BITMEX: {
            "BTC-USD": "xbtusd",
            "XBTUSD": "BTC-USD"
        },
        BITSTAMP: {
            "BTC-USD": "btcusd",
            "BTCUSD": "BTC-USD",
            "BTC-USDT": "btcusdt",
            "BTCUSDT": "BTC-USDT"
        }
    },
    BTC_USD_AND_STABLECOINS: ["BTC-USD", "BTC-USDT"]
});
