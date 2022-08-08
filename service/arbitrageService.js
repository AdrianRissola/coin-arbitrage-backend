const platforms = require('../marketRestClient')
const marketsDBmanager = require('../marketsDBmanager')
const marketWebSocketClient = require('../marketWebSocketClient')



const getMarketPrices = async (marketNames, ticker) => {
    
    if(!marketNames)
        markets = marketsDBmanager.getAllMarkets()
    else    
        markets = marketsDBmanager.getMarketsByNames(marketNames)
        
    let marketPrices = []
    for(let i=0 ; i<markets.length ; i++) {
        console.log(markets[i].name + ' COMMMMMMM: ' + markets[i].com)
        let marketPrice = await platforms.getMarketPrice(markets[i], markets[i].availableTickersToMarketTickers[ticker.toUpperCase()])
        if(!!marketPrice) {
            console.log('adding to arbitrage list: ', markets[i].name, ' ', ticker)
            marketPrices.push(marketPrice)
        }
    }

    return marketPrices
}

const getArbitragesFromStreams = async (marketNames, ticker, minProfitPercentage, top) => {
    let marketPrices = marketWebSocketClient.getTicker()
    return calculateArbitrages(marketPrices, minProfitPercentage, top)
}

const getArbitrages = async (marketNames, ticker, minProfitPercentage, top) => {
    let marketPrices = await getMarketPrices(marketNames, ticker)
    return calculateArbitrages(marketPrices, minProfitPercentage, top)
}

const calculateArbitrages = (marketPrices, minProfitPercentage, top) => {
    minProfitPercentage = Number(minProfitPercentage)
    top = Number(top) 

    let sortedList = marketPrices.sort((e1, e2) => e1.price-e2.price)
    console.log("sorted list: ", sortedList)

    let arbitrages = []
    if(top===1) {
        arbitrages.push(buildArbitrage(sortedList[0], sortedList[sortedList.length - 1]))
    } else {
        for(i=0 ; i<sortedList.length ; i++){
            for(j=i+1 ; j<sortedList.length ; j++){
                let profitPercentage = percentage(sortedList[i].price, sortedList[j].price)
                if((!minProfitPercentage || profitPercentage>=minProfitPercentage) && sortedList[i].price<sortedList[j].price)
                    arbitrages.push(buildArbitrage(sortedList[i], sortedList[j]))
            }
        }
        arbitrages = arbitrages.sort((e1, e2) => e2.profitPerUnit-e1.profitPerUnit)
    }
    if(top>1) {
        arbitrages = arbitrages.slice(0, parseInt(top))
    }
    
    return arbitrages;
}

const buildArbitrage = (marketPriceI, marketPriceJ) => {
    return {
        "transactions" : [
            {
                "type" : "BUY",
                "market" : marketPriceI.platform,
                "pair" : marketPriceI.ticker,
                "price" : marketPriceI.price,
            },
            {
                "type" : "SELL",
                "market" : marketPriceJ.platform,
                "pair" : marketPriceJ.ticker,
                "price" : marketPriceJ.price,
            }
        ],
        "profitPerUnit" : marketPriceJ.price - marketPriceI.price,
        "profitPercentage" : percentage(marketPriceI.price, marketPriceJ.price),
        "date" : new Date()
    }
}

const percentage = (num1, num2) => {
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




