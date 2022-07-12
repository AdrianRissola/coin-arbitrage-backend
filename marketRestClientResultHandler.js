exports.getPriceByMarketAndTicker = (marketName, marketTicker, marketPriceResult) => {
    let marketToPrice = null
    if (!!marketName && !!marketPriceResult) {
        marketToPrice = {
            BITFINEX: (marketPriceResult) => marketPriceResult.data[6],
            BINANCE: (marketPriceResult) => marketPriceResult.data.price,
            COINBASE: (marketPriceResult) => marketPriceResult.data.data.amount,
            BITTREX: (marketPriceResult) => marketPriceResult.data.lastTradeRate,
            POLONIEX: (marketPriceResult) => marketPriceResult.data[marketTicker].last,
            KRAKEN: (marketPriceResult) =>  marketPriceResult.data.result[marketTicker].c[0],
            OKEX: (marketPriceResult) => marketPriceResult.data.data[0].last,
            BITMEX: (marketPriceResult) => marketPriceResult.data[0].price,
            BITSTAMP: (marketPriceResult) => marketPriceResult.data.last
        }
    }
    return marketToPrice[marketName.toUpperCase()](marketPriceResult)
}