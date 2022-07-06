const platforms = require('../platform')




const getArbitrages = async () => {
    const list = [
        await platforms.getBitfinexPriceBTCUSD(),
        await platforms.getBinancePriceBTCUSDT(),
        await platforms.getCoinbasePriceBTCUSD(),
        await platforms.getBittrexPriceBTCUSDT(),
        await platforms.getPoloniexPriceBTCUSDT(),
        await platforms.getKrakenPriceBTCUSD(),
        await platforms.getOkexPriceBTCUSDT(),
        await platforms.getBitmexPriceBTCUSDT()
    ]
    console.log("list: ", list)
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




