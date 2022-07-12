const axios = require('axios');
const marketsDBmanager = require('./marketsDBmanager')
const marketRestClientResultHandler = require('./marketRestClientResultHandler')
const tickerConverter = require('./tickerConverter')


const getTickerByMarket = async (marketName, marketTicker) => {
    let market = marketsDBmanager.getMarketByName(marketName)
    console.log("requesting market: ", market, ' with ticker: ', marketTicker)
    let url = market.baseUrl.replace('${ticker}', marketTicker)
    console.log("url: ", url)
    result = await axios.get(url)
    return result
}

const getMarketPrice = async (marketName, marketTicker) => {
    let result = await getTickerByMarket(marketName, marketTicker)
    let marketPrice = {
        platform: marketName,
        ticker: tickerConverter.MARKET_TO_TICKER[marketName.toUpperCase()][marketTicker.toUpperCase()],
        price: marketRestClientResultHandler.getPriceByMarketAndTicker(marketName, marketTicker, result)
    }
    console.log({marketPrice});
    marketPrice.price = Number(marketPrice.price)
    return marketPrice
}



module.exports = {
    getMarketPrice,
    getTickerByMarket
};