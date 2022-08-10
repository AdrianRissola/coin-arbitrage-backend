
const errorHelper = require('./errorHelper')


exports.getPriceByMarketAndTicker = (pathToPrice, marketTickerName, marketPriceResult) => {
    
    let price = null
    if (!!marketPriceResult) {
        price = marketPriceResult
        for(field of pathToPrice) {
            if(!price)
                break
            if(field==='${ticker}')
                field = field.replace('${ticker}', marketTickerName)
            price = price[field]
        }
        console.log("PRICE: ", price)   
    }

    const priceNumber = Number(price)
   
    if (!price || !priceNumber)
        throw errorHelper.errors.BAD_REQUEST(`Error when try to extract price from: ${marketPriceResult} using: ${pathToPrice}`)

    return priceNumber
}


//     marketToPrice = {
//         BITFINEX: (marketPriceResult) => marketPriceResult.data[6],
//         BINANCE: (marketPriceResult) => marketPriceResult.data.price,
//         COINBASE: (marketPriceResult) => marketPriceResult.data.price,
//         BITTREX: (marketPriceResult) => marketPriceResult.data.lastTradeRate,
//         POLONIEX: (marketPriceResult) => marketPriceResult.data[marketTicker].last,
//         KRAKEN: (marketPriceResult) =>  marketPriceResult.data.result[marketTicker].c[0],
//         OKEX: (marketPriceResult) => marketPriceResult.data.data[0].last,
//         BITMEX: (marketPriceResult) => marketPriceResult.data[0].price,
//         BITSTAMP: (marketPriceResult) => marketPriceResult.data.last,
//         HITBTC: (marketPriceResult) => marketPriceResult.data[marketTicker].last
//     }