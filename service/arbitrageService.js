const platforms = require('../marketRestClient')
const marketsDBmanager = require('../marketsDBmanager')
const constants = require('../tickerConverter')


const marketToPrice = {
    BITFINEX: async ()=>{return await platforms.getMarketPrice('bitfinex')},
    BINANCE: async ()=>{return await platforms.getBinancePriceBTCUSDT()},
    COINBASE: async ()=>{return await platforms.getCoinbasePriceBTCUSD()},
    BITTREX: async ()=>{return await platforms.getBittrexPriceBTCUSDT()},
    POLONIEX: async ()=>{return await platforms.getPoloniexPriceBTCUSDT()},
    KRAKEN: async ()=>{return await platforms.getKrakenPriceBTCUSD()},
    OKEX: async ()=>{return await platforms.getOkexPriceBTCUSDT()},
    BITMEX: async ()=>{return await platforms.getBitmexPriceBTCUSDT()}
}


const getArbitrages = async (marketNames, ticker) => {
    
    let marketPrices = []
    let markets = []
    
    if(!marketNames)
        markets = marketsDBmanager.getAllMarkets()
    else    
        markets = marketsDBmanager.getMarketsByNames(marketNames)
        
    for(i=0 ; i<markets.length ; i++) {
        let marketTicker = constants.MARKET_TO_TICKER[markets[i].name.toUpperCase()][ticker.toUpperCase()]
        if(!!marketTicker) {
            console.log('retrieveing: ', markets[i].name, ' ', ticker, ' ', marketTicker)
            marketPrices.push(await platforms.getMarketPrice(markets[i].name, marketTicker))
        }
    }

    let sortedList = marketPrices.sort((e1, e2) => e1.price-e2.price)
    console.log("sorted list: ", sortedList)

    let arbitrages = []
    let date = new Date()
    for(i=0 ; i<sortedList.length ; i++){
        for(j=i+1 ; j<sortedList.length ; j++){
            arbitrages.push(
                {
                    "transactions" : [
                        {
                            "type" : "BUY",
                            "market" : sortedList[i].platform,
                            "pair" : sortedList[i].ticker,
                            "price" : sortedList[i].price,
                        },
                        {
                            "type" : "SELL",
                            "market" : sortedList[j].platform,
                            "pair" : sortedList[j].ticker,
                            "price" : sortedList[j].price,
                        }
                    ],
                    "diffPerUnit" : sortedList[j].price - sortedList[i].price,
                    "date" : date
                }
            )
        }
    }
    let arbitragesSortedByDiffPerUnit = arbitrages.sort((e1, e2) => e2.diffPerUnit-e1.diffPerUnit)
    console.log("arbitrages: ", JSON.stringify(arbitragesSortedByDiffPerUnit))
    return arbitragesSortedByDiffPerUnit;
}

module.exports = {
    getArbitrages
};




