const Market = require('../model/Market')




const getAllMarkets = async () => {
    let markets = await Market.find()
    .then(markets=>{
        for(i=0 ; i<markets.length ; i++){
            for(j=0 ; j<markets[i].tickers.length ; j++){
                markets[i].tickers[j] = tickerConverter(markets[i].tickers[j])
            }
        }
        console.log("findAll dto markets: ", markets)
        return markets
    })
    .catch(err=>{
        console.error(err)
    })
    return markets
}

const tickerConverter = (ticker) => {
    let finalTicker = ticker
    if(
        ticker.toUpperCase()==='tBTCUSD' ||
        ticker.toUpperCase()==='XBTUSD' ||
        ticker.toUpperCase()==='BTC-USD' ||
        ticker.toUpperCase()==='TBTCUSD'
    ) finalTicker = "BTC-USD"
    if(
        ticker.toUpperCase()==='BTCUSDT' ||
        ticker.toUpperCase()==='BTC-USDT' ||
        ticker.toUpperCase()==='USDT_BTC'
    ) finalTicker = "BTC-USDT"
    return finalTicker
}

module.exports = {
    getAllMarkets
};