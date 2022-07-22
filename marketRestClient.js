const axios = require('axios');
const marketsDBmanager = require('./marketsDBmanager')
const marketRestClientResultHandler = require('./marketRestClientResultHandler')


const getTickerByMarket = async (marketName, ticker) => {
    let market = marketsDBmanager.getMarketByName(marketName)
    console.log("requesting market: ", market, ' with ticker: ', ticker)
    console.log("market.availableTickersToMarketTickers: ", market.availableTickersToMarketTickers)
    console.log("market.availableTickersToMarketTickers ticker: ", market.availableTickersToMarketTickers[ticker])
    let url = market.baseUrl.replace('${ticker}', marketsDBmanager.getMarketTickerName(marketName, ticker))
    console.log("url: ", url)
    result = await axios.get(url)
    return result
}

const getMarketPrice = async (marketName, ticker) => {
    let result = await getTickerByMarket(marketName, ticker)
    let marketPrice = {
        platform: marketName,
        ticker: ticker,
        price: marketRestClientResultHandler.getPriceByMarketAndTicker(marketName, ticker, result)
    }
    console.log({marketPrice});
    marketPrice.price = Number(marketPrice.price)
    return marketPrice
}



module.exports = {
    getMarketPrice,
    getTickerByMarket
};