const marketsDBmanager = require('../marketsDBmanager')
const marketRestClient = require('../marketRestClient')



const getAllMarkets = async () => {
    return marketsDBmanager.getAllMarkets()
}

const getTickerByMarket = async (marketName, ticker) => {
    result = await marketRestClient.getTickerByMarket(marketName, ticker)
    console.log('getTickerByMarket: ', result.data)
    return result.data
}

const getAllPricesByTicker = async (ticker) => {
    let prices = []
    let markets = marketsDBmanager.getAllMarketsByTicker(ticker)
    for(let market of markets) {
        let marketPrice = await marketRestClient.getMarketPrice(market.name, ticker)
        prices.push(marketPrice)
    }
    console.log('getAllPricesByTicker: ', prices)
    return prices.sort((e1, e2) => e1.price-e2.price)
}


module.exports = {
    getAllMarkets,
    getTickerByMarket,
    getAllPricesByTicker
};