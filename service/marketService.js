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


module.exports = {
    getAllMarkets,
    getTickerByMarket
};