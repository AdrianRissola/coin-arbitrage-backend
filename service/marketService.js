const marketsDBmanager = require('../marketsDBmanager')
const tickerConverter = require('../tickerConverter')
const marketRestClient = require('../marketRestClient')



const getAllMarkets = async () => {
    let markets = marketsDBmanager.getAllMarkets()
    for(i=0 ; i<markets.length ; i++){
        for(j=0 ; j<markets[i].tickers.length ; j++){
            console.log(markets[i].name.toUpperCase())
            markets[i].tickers[j] = tickerConverter.MARKET_TO_TICKER[markets[i].name.toUpperCase()][markets[i].tickers[j].toUpperCase()]
        }
    }
    return markets
}

const getTickerByMarket = async (marketName, ticker) => {
    let marketTicker = tickerConverter.MARKET_TO_TICKER[marketName.toUpperCase()][ticker.toUpperCase()]
    let reponse = null
    if(!!marketTicker) {
        result = await marketRestClient.getTickerByMarket(marketName, marketTicker)
        console.log('getTickerByMarket: ', result.data)
        reponse = result.data
    }
    return reponse
}


module.exports = {
    getAllMarkets,
    getTickerByMarket
};