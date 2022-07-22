const axios = require('axios');
const marketsDBmanager = require('./marketsDBmanager')
const marketRestClientResultHandler = require('./marketRestClientResultHandler')


const getTickerByMarket = async (marketName, ticker) => {
    let market = marketsDBmanager.getMarketByName(marketName)
    console.log("requesting market: ", market, ' with ticker: ', ticker)
    console.log("market.availableTickersToMarketTickers: ", market.availableTickersToMarketTickers)
    console.log("market.availableTickersToMarketTickers ticker: ", market.availableTickersToMarketTickers[ticker])
    let marketTickerName = marketsDBmanager.getMarketTickerName(marketName, ticker)
    let result = null
    console.log("marketTickerNameEEEEEEEEEEEE: ", marketTickerName)

    if(!!marketTickerName) {
        let url = market.baseUrl.replace('${ticker}', marketTickerName)
        console.log("url: ", url)
        result = await axios.get(url)
    }
    return result
}

const getMarketPrice = async (marketName, ticker) => {
    let marketPrice = null
    let result = await getTickerByMarket(marketName, ticker)
    if(!!result) {
        marketPrice = {
            platform: marketName,
            ticker: ticker,
            price: marketRestClientResultHandler.getPriceByMarketAndTicker(marketName, ticker, result)
        }
        console.log({marketPrice});
        marketPrice.price = Number(marketPrice.price)
    }
    return marketPrice
}



module.exports = {
    getMarketPrice,
    getTickerByMarket
};