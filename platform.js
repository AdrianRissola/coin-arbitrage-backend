const axios = require('axios');

const getBitfinexPriceBTCUSD = async () => {
    result = await axios.get('https://api-pub.bitfinex.com/v2/ticker/tBTCUSD')
    let bitfinexPrice = {
        platform: "bitfinex",
        ticker: "BTCUSD",
        price: result.data[6]
    }
    console.log({bitfinexPrice});
    bitfinexPrice.price = Number(bitfinexPrice.price)
    return bitfinexPrice
}


const getBinancePriceBTCUSDT = async () => {
    result = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
    let binancePrice = {
        platform: "binance",
        ticker: "BTCUSDT",
        price: result.data.price
    }
    console.log({binancePrice});
    binancePrice.price = Number(binancePrice.price)
    return binancePrice
}

const getCoinbasePriceBTCUSD = async () => {
    result = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/buy')
    let coinbasePrice = {
        platform: "Coinbase",
        ticker: "BTCUSD",
        price: result.data.data.amount
    }
    console.log({coinbasePrice});
    coinbasePrice.price = Number(coinbasePrice.price)
    return coinbasePrice
}

const getBittrexPriceBTCUSDT = async () => {
    result = await axios.get('https://api.bittrex.com/v3/markets/BTC-USDT/ticker')
    let bittrexPrice = {
        platform: "Bittrex",
        ticker: "BTCUSDT",
        price: result.data.lastTradeRate
    }
    console.log({bittrexPrice});
    bittrexPrice.price = Number(bittrexPrice.price)
    return bittrexPrice
}



const getPoloniexPriceBTCUSDT = async () => {
    result = await axios.get('https://poloniex.com/public?command=returnTicker')
    let poloniexPrice = {
        platform: "poloniex",
        ticker: "BTCUSDT",
        price: result.data.USDT_BTC.last
    }
    console.log({poloniexPrice});
    poloniexPrice.price = Number(poloniexPrice.price)
    return poloniexPrice
}


const getKrakenPriceBTCUSD = async () => {
    result = await axios.get('https://api.kraken.com/0/public/Ticker?pair=XBTUSD')
    let krakenPrice = {
        platform: "kraken",
        ticker: "BTCUSD",
        price: result.data.result.XXBTZUSD.c[0]
    }
    console.log({krakenPrice});
    krakenPrice.price = Number(krakenPrice.price)
    return krakenPrice
}

const getOkexPriceBTCUSDT = async () => {
    result = await axios.get('https://www.okex.com/api/v5/market/ticker?instId=BTC-USDT-SWAP')
    let okexPrice = {
        platform: "okex",
        ticker: "BTCUSDT",
        price: result.data.data[0].last
    }
    console.log({okexPrice});
    okexPrice.price = Number(okexPrice.price)
    return okexPrice
}

const getBitmexPriceBTCUSDT = async () => {
    result = await axios.get('https://www.bitmex.com/api/v1/trade?symbol=xbtusd&count=1&reverse=true')
    let bitmexPrice = {
        platform: "Bitmex",
        ticker: "BTCUSDT",
        price: result.data[0].price
    }
    console.log({bitmexPrice});
    bitmexPrice.price = Number(bitmexPrice.price)
    return bitmexPrice
}

module.exports = {
    getBitfinexPriceBTCUSD,
    getBinancePriceBTCUSDT,
    getCoinbasePriceBTCUSD,
    getBittrexPriceBTCUSDT,
    getPoloniexPriceBTCUSDT,
    getKrakenPriceBTCUSD,
    getOkexPriceBTCUSDT,
    getBitmexPriceBTCUSDT
};