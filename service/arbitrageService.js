const platforms = require('../marketRestClient')
const marketsDBmanager = require('../marketsDBmanager')
const constants = require('../tickerConverter')



const getArbitrages = async (marketNames, ticker, minProfitPercentage) => {
    minProfitPercentage = Number(minProfitPercentage)
    let marketPrices = []
    let markets = []
    
    if(!marketNames)
        markets = marketsDBmanager.getAllMarkets()
    else    
        markets = marketsDBmanager.getMarketsByNames(marketNames)
        
    for(let i=0 ; i<markets.length ; i++) {
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
            let profitPercentage = percentage(sortedList[i].price, sortedList[j].price)
            if(!minProfitPercentage || profitPercentage>=minProfitPercentage)
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
                        "profitPerUnit" : sortedList[j].price - sortedList[i].price,
                        "profitPercentage" : profitPercentage,
                        "date" : date
                    }
                )
        }
    }
    let arbitragesSortedByDiffPerUnit = arbitrages.sort((e1, e2) => e2.profitPerUnit-e1.profitPerUnit)
    console.log("arbitrages: ", JSON.stringify(arbitragesSortedByDiffPerUnit))
    return arbitragesSortedByDiffPerUnit;
}

percentage = (num1, num2) => {
    let temp
    if(num1<num2) {
        temp = num1
        num1 = num2
        num2 = temp
    }
    return 100*(num1 - num2) / num2
}

module.exports = {
    getArbitrages
};




