const platforms = require('../marketRestClient')


const getPriceByMarket = async (market) => {
    let marketPrice = undefined
    switch (market) {
        case 'BITFINEX':
            marketPrice = await platforms.getBitfinexPriceBTCUSD()
            break;
        case 'BINANCE':
            marketPrice = await platforms.getBinancePriceBTCUSDT()
            break;
        case 'COINBASE':
            marketPrice = await platforms.getCoinbasePriceBTCUSD()
            break;
        case 'BITTREX':
            marketPrice = await platforms.getBittrexPriceBTCUSDT()
            break;
        case 'POLONIEX':
            marketPrice = await platforms.getPoloniexPriceBTCUSDT()
            break;
        case 'KRAKEN':
            marketPrice = await platforms.getKrakenPriceBTCUSD()
            break;
        case 'OKEX':
            marketPrice = await platforms.getOkexPriceBTCUSDT()
            break;
        case 'BITMEX':
            marketPrice = await platforms.getBitmexPriceBTCUSDT()
            break;
        default:
            marketPrice = null
    }
    return marketPrice;
}

const getArbitrages = async (markets) => {
    let list = []
    if(!markets)
        list = [
            await platforms.getBitfinexPriceBTCUSD(),
            await platforms.getBinancePriceBTCUSDT(),
            await platforms.getCoinbasePriceBTCUSD(),
            await platforms.getBittrexPriceBTCUSDT(),
            await platforms.getPoloniexPriceBTCUSDT(),
            await platforms.getKrakenPriceBTCUSD(),
            await platforms.getOkexPriceBTCUSDT(),
            await platforms.getBitmexPriceBTCUSDT()
        ]
    else {
        // await markets.map(async market=> {
        //     let marketPrice = await getPriceByMarket(market.toUpperCase())
        //     list.push(marketPrice)
        //     console.log("markets to calculate arbitrages: ", list)
        // })
        for(i=0 ; i<markets.length ; i++) {
            let marketPrice = await getPriceByMarket(markets[i].toUpperCase())
            list.push(marketPrice)
        }
    }

    console.log("markets to calculate arbitrages: ", list)
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




