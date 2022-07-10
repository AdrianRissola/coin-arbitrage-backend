const axios = require('axios');
const marketsDBmanager = require('./marketsDBmanager')
const constants = require('./tickerConverter')
const marketRestClientResultHandler = require('./marketRestClientResultHandler')

const getMarketPriceBTCUSD = async (marketName, marketTicker) => {
    let market = marketsDBmanager.getMarketByName(marketName)
    console.log("requesting market: ", market, ' with ticker: ', marketTicker)
    let url = market.baseUrl.replace('${ticker}', marketTicker)
    console.log("url: ", url)
    result = await axios.get(url)
    let marketPrice = {
        platform: marketName,
        ticker: marketTicker,
        price: marketRestClientResultHandler.getPriceByMarket(marketName, result)
    }
    console.log({marketPrice});
    marketPrice.price = Number(marketPrice.price)
    return marketPrice
}

// const getBitfinexPriceBTCUSD = async () => {
//     let market = marketsDBmanager.getMarketByName('bitfinex')
//     let url = market.baseUrl.replace('${ticker}', constants.MARKET_TO_TICKER['biTfinex'.toUpperCase()]["BTC-USD"])
//     console.log("bitfinex url: ", url);
//     result = await axios.get(url)
//     let bitfinexPrice = {
//         platform: "bitfinex",
//         ticker: "BTCUSD",
//         price: marketRestClientResultHandler.getPriceByMarket('bitfinex', result)
//     }
//     console.log({bitfinexPrice});
//     bitfinexPrice.price = Number(bitfinexPrice.price)
//     return bitfinexPrice
// }

// const getBinancePriceBTCUSDT = async () => {
//     result = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
//     let binancePrice = {
//         platform: "binance",
//         ticker: "BTCUSDT",
//         price: marketRestClientResultHandler.getPriceByMarket('binance', result)
//     }
//     console.log({binancePrice});
//     binancePrice.price = Number(binancePrice.price)
//     return binancePrice
// }

// const getCoinbasePriceBTCUSD = async () => {
//     result = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/buy')
//     let coinbasePrice = {
//         platform: "Coinbase",
//         ticker: "BTCUSD",
//         price: marketRestClientResultHandler.getPriceByMarket('Coinbase', result)
//     }
//     console.log({coinbasePrice});
//     coinbasePrice.price = Number(coinbasePrice.price)
//     return coinbasePrice
// }

// const getBittrexPriceBTCUSDT = async () => {
//     result = await axios.get('https://api.bittrex.com/v3/markets/BTC-USDT/ticker')
//     let bittrexPrice = {
//         platform: "Bittrex",
//         ticker: "BTCUSDT",
//         price: marketRestClientResultHandler.getPriceByMarket('Bittrex', result)
//     }
//     console.log({bittrexPrice});
//     bittrexPrice.price = Number(bittrexPrice.price)
//     return bittrexPrice
// }



// const getPoloniexPriceBTCUSDT = async () => {
//     result = await axios.get('https://poloniex.com/public?command=returnTicker')
//     let poloniexPrice = {
//         platform: "poloniex",
//         ticker: "BTCUSDT",
//         price: marketRestClientResultHandler.getPriceByMarket('poloniex', result)
//     }
//     console.log({poloniexPrice});
//     poloniexPrice.price = Number(poloniexPrice.price)
//     return poloniexPrice
// }


// const getKrakenPriceBTCUSD = async () => {
//     result = await axios.get('https://api.kraken.com/0/public/Ticker?pair=XBTUSD')
//     let krakenPrice = {
//         platform: "kraken",
//         ticker: "BTCUSD",
//         price: marketRestClientResultHandler.getPriceByMarket('kraken', result)
//     }
//     console.log({krakenPrice});
//     krakenPrice.price = Number(krakenPrice.price)
//     return krakenPrice
// }

// const getOkexPriceBTCUSDT = async () => {
//     result = await axios.get('https://www.okex.com/api/v5/market/ticker?instId=BTC-USDT-SWAP')
//     let okexPrice = {
//         platform: "okex",
//         ticker: "BTCUSDT",
//         price: marketRestClientResultHandler.getPriceByMarket('okex', result)
//     }
//     console.log({okexPrice});
//     okexPrice.price = Number(okexPrice.price)
//     return okexPrice
// }

// const getBitmexPriceBTCUSDT = async () => {
//     result = await axios.get('https://www.bitmex.com/api/v1/trade?symbol=xbtusd&count=1&reverse=true')
//     let bitmexPrice = {
//         platform: "Bitmex",
//         ticker: "BTCUSDT",
//         price: marketRestClientResultHandler.getPriceByMarket('Bitmex', result)
//     }
//     console.log({bitmexPrice});
//     bitmexPrice.price = Number(bitmexPrice.price)
//     return bitmexPrice
// }

module.exports = {
    // getBitfinexPriceBTCUSD,
    // getBinancePriceBTCUSDT,
    // getCoinbasePriceBTCUSD,
    // getBittrexPriceBTCUSDT,
    // getPoloniexPriceBTCUSDT,
    // getKrakenPriceBTCUSD,
    // getOkexPriceBTCUSDT,
    // getBitmexPriceBTCUSDT,
    getMarketPriceBTCUSD
};