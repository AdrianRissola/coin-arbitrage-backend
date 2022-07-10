exports.getPriceByMarket = (marketName, marketPriceResult) => {
    if(marketName.toUpperCase()==='COINBASE')
        console.log("result handler: ", marketName, '', marketPriceResult.data)
    let marketToPrice = null
    if (!!marketName && !!marketPriceResult) {
        marketToPrice = {
            BITFINEX: (marketPriceResult) => marketPriceResult.data[6],
            BINANCE: (marketPriceResult) => marketPriceResult.data.price,
            COINBASE: (marketPriceResult) => marketPriceResult.data.data.amount,
            BITTREX: (marketPriceResult) => marketPriceResult.data.lastTradeRate,
            POLONIEX: (marketPriceResult) => marketPriceResult.data.USDT_BTC.last,
            KRAKEN: (marketPriceResult) =>  marketPriceResult.data.result.XXBTZUSD.c[0],
            OKEX: (marketPriceResult) => marketPriceResult.data.data[0].last,
            BITMEX: (marketPriceResult) => marketPriceResult.data[0].price
        }
    }
    return marketToPrice[marketName.toUpperCase()](marketPriceResult)
}