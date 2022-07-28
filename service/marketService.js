const marketsDBmanager = require('../marketsDBmanager')
const marketRestClient = require('../marketRestClient')
const Market = require('../model/Market')




const getAllMarkets = async () => {
    return marketsDBmanager.getAllMarkets()
}

const getTickerByMarket = async (marketName, ticker) => {
    let market = marketsDBmanager.getMarketByName(marketName)
    let marketTickerName = marketsDBmanager.getMarketTickerName(marketName, ticker)
    result = await marketRestClient.getTickerByMarket(market, marketTickerName)
    console.log('getTickerByMarket: ', result.data)
    return result.data
}

const getAllPricesByTicker = async (ticker) => {
    let prices = []
    let markets = marketsDBmanager.getAllMarketsByTicker(ticker)
    for(let market of markets) {
        let marketPrice = await marketRestClient.getMarketPrice(market.name, market.availableTickersToMarketTickers[ticker.toUpperCase()])
        prices.push(marketPrice)
    }
    console.log('getAllPricesByTicker: ', prices)
    return prices.sort((e1, e2) => e1.price-e2.price)
}

const saveNewMarket = async (newMarket) => {
    const marketTickerNames = newMarket.availableTickersToMarketTickers
    for (let ticker in marketTickerNames) {
        result = await marketRestClient.getMarketPrice(newMarket, marketTickerNames[ticker])
        // .catch(err=>{
        //     console.error(err)
        //     throw err
        // })
    }

    const market = new Market(newMarket)
    return market.save()
    .then(result=>{
        marketsDBmanager.loadMarketsFromDB()
        console.log("saved: ", result)
        return result
    })
    .catch(err=>{
        console.error(err)
    })

}


module.exports = {
    getAllMarkets,
    getTickerByMarket,
    getAllPricesByTicker,
    saveNewMarket
};