
const marketsDBmanager = require('./marketsDBmanager')


exports.getPriceByMarketAndTicker = (marketName, ticker, marketPriceResult) => {
    let marketTicker = marketsDBmanager.getMarketTickerName(marketName, ticker)
    let marketToPrice = null
    let price = null
    if (!!marketName && !!marketPriceResult) {
        marketToPrice = {
            BITFINEX: (marketPriceResult) => marketPriceResult.data[6],
            BINANCE: (marketPriceResult) => marketPriceResult.data.price,
            COINBASE: (marketPriceResult) => marketPriceResult.data.price,
            BITTREX: (marketPriceResult) => marketPriceResult.data.lastTradeRate,
            POLONIEX: (marketPriceResult) => marketPriceResult.data[marketTicker].last,
            KRAKEN: (marketPriceResult) =>  marketPriceResult.data.result[marketTicker].c[0],
            OKEX: (marketPriceResult) => marketPriceResult.data.data[0].last,
            BITMEX: (marketPriceResult) => marketPriceResult.data[0].price,
            BITSTAMP: (marketPriceResult) => marketPriceResult.data.last,
            HITBTC: (marketPriceResult) => marketPriceResult.data[marketTicker].last
        }
        price = marketToPrice[marketName.toUpperCase()](marketPriceResult)
    }
    return price
}