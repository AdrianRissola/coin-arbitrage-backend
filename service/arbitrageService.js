const platforms = require('../marketRestClient')
const marketsDBmanager = require('../marketsDBmanager')
const constants = require('../tickerConverter')


const marketToPrice = {
    BITFINEX: async ()=>{return await platforms.getMarketPriceBTCUSD('bitfinex')},
    BINANCE: async ()=>{return await platforms.getBinancePriceBTCUSDT()},
    COINBASE: async ()=>{return await platforms.getCoinbasePriceBTCUSD()},
    BITTREX: async ()=>{return await platforms.getBittrexPriceBTCUSDT()},
    POLONIEX: async ()=>{return await platforms.getPoloniexPriceBTCUSDT()},
    KRAKEN: async ()=>{return await platforms.getKrakenPriceBTCUSD()},
    OKEX: async ()=>{return await platforms.getOkexPriceBTCUSDT()},
    BITMEX: async ()=>{return await platforms.getBitmexPriceBTCUSDT()}
}


const getArbitrages = async (markets, ticker) => {
    console.log("ticker: ", ticker)
    let list = []
    if(!markets) {
        let allMarkets = marketsDBmanager.getAllMarkets()
        console.log("allMarkets.length: ", allMarkets.length)
        for(i=0 ; i<allMarkets.length ; i++) {
            let marketTicker = constants.MARKET_TO_TICKER[allMarkets[i].name.toUpperCase()][ticker.toUpperCase()]
            if(!!marketTicker) {
                console.log(allMarkets[i].name, ' ', ticker, ' ', marketTicker)
                list.push(await platforms.getMarketPriceBTCUSD(allMarkets[i].name, marketTicker))
            }
        }
            
        
        // list = [
        //     await platforms.getMarketPriceBTCUSD('bitfinex'),
        //     await platforms.getBinancePriceBTCUSDT(),
        //     await platforms.getCoinbasePriceBTCUSD(),
        //     await platforms.getBittrexPriceBTCUSDT(),
        //     await platforms.getPoloniexPriceBTCUSDT(),
        //     await platforms.getKrakenPriceBTCUSD(),
        //     await platforms.getOkexPriceBTCUSDT(),
        //     await platforms.getBitmexPriceBTCUSDT()
        // ]
    }
        
    else {
        for(i=0 ; i<markets.length ; i++) {
            let marketPrice = await marketToPrice[markets[i].toUpperCase()]()
            list.push(marketPrice)
        }
    }

    let sortedList = list.sort((e1, e2) => e1.price-e2.price)
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




