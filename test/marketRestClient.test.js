const supertest = require("supertest")
const app = require("../index")
supertest(app)
const helper = require('./helper')
const mongoose = require('mongoose')
const Market = require('../model/Market')
const Ticker = require('../model/AvailableTicker')
const env = process.env
const marketRestClient = require('../marketRestClient')
const marketsDBmanager = require('../marketsDBmanager')


beforeAll(async () => {
    await Market.deleteMany({})
    await Ticker.deleteMany({})

    console.log("dbUri: ", env.NODE_ENV)
    console.log("connecting db for test")
    let dbUri = env.NODE_ENV === 'test'? env.MONGO_DB_URI_TEST : env.MONGO_DB_URI
    await mongoose.connect(dbUri)
    .then( async ()=>{
        console.log("connected db for test")
        for(let market of helper.MARKETS){
            let marketToSave = new Market(market)
            await marketToSave.save()
            .then(result=>{
                console.log('TEST - saved market: ', result)
            })
            .catch(err=>{
                console.error(err)
            })
        }
        await Market.find()
            .then(result=>{
                marketsDBmanager.setMarketsFromDB(result)
            })
            .catch(err=>{
                console.error(err)
            })
        for(let ticker of helper.TICKERS){
            let tickerToSave = new Ticker(ticker)
            await tickerToSave.save()
            .then(result=>{
                console.log('TEST - ticker market: ', result)
                marketsDBmanager.setAvailableTickers(result)
            })
            .catch(err=>{
                console.error(err)
            })
        }
        await Ticker.find()
            .then(result=>{
                marketsDBmanager.setAvailableTickers(result)
            })
            .catch(err=>{
                console.error(err)
            })
    })
    .catch(err=>{
        console.error(err)
    })
})

describe('test getMarketPrice BTC-USD', () => {

    const BTC_USD = "BTC-USD"

    test('marketRestClient.getMarketPrice bitfinex BTC-USD', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("bitfinex", BTC_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice COINBASE BTC-USD', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("COINBASE", BTC_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice bitmex BTC-USD', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("bitmex", BTC_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice bitstamp BTC-USD', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("bitstamp", BTC_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

}, 30000)

describe('test getMarketPrice BTC-USDT', () => {

    const BTC_USDT = "BTC-USDT"

    test('marketRestClient.getMarketPrice binance BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("binance", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice BITTREX BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("BITTREX", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice POLONIEX BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("POLONIEX", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice kraken BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("kraken", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice okex BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("okex", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice bitstamp BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("bitstamp", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

})

describe('test getTickerByMarket BTC-USD', () => {

    const BTC_USD = "BTC-USD"

    test('marketRestClient.getTickerByMarket bitfinex BTC-USD', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("bitfinex", BTC_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket COINBASE BTC-USD', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("COINBASE", BTC_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket bitmex BTC-USD', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("bitmex", BTC_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket bitstamp BTC-USD', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("bitstamp", BTC_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

})

describe('test getTickerByMarket BTC-USDT', () => {

    const BTC_USDT = "BTC-USDT"

    test('marketRestClient.getTickerByMarket binance BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("binance", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket BITTREX BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("BITTREX", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket POLONIEX BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("POLONIEX", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket kraken BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("kraken", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket okex BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("okex", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket bitstamp BTC-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("bitstamp", BTC_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

})



describe('test getMarketPrice ETH-USD', () => {

    const ETH_USD = "ETH-USD"

    test('marketRestClient.getMarketPrice bitfinex ETH-USD', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("bitfinex", ETH_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice COINBASE ETH-USD', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("COINBASE", ETH_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice bitmex ETH-USD', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("bitmex", ETH_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice bitstamp ETH-USD', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("bitstamp", ETH_USD)
        console.log(marketPrice)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

})

describe('test getMarketPrice ETH-USDT', () => {

    const ETH_USDT = "ETH-USDT"

    test('marketRestClient.getMarketPrice binance ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("binance", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice BITTREX ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("BITTREX", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice POLONIEX ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("POLONIEX", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice kraken ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("kraken", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice okex ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("okex", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

    test('marketRestClient.getMarketPrice bitstamp ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getMarketPrice("bitstamp", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
        expect(!!marketPrice.price).toBe(true)
    }, 30000)

})

describe('test getTickerByMarket ETH-USD', () => {

    const ETH_USD = "ETH-USD"

    test('marketRestClient.getTickerByMarket bitfinex ETH-USD', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("bitfinex", ETH_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket COINBASE ETH-USD', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("COINBASE", ETH_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket bitmex ETH-USD', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("bitmex", ETH_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket bitstamp ETH-USD', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("bitstamp", ETH_USD)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

})

describe('test getTickerByMarket ETH-USDT', () => {
    
    const ETH_USDT = "ETH-USDT"

    test('marketRestClient.getTickerByMarket binance ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("binance", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket BITTREX ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("BITTREX", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket POLONIEX ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("POLONIEX", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket kraken ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("kraken", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket okex ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("okex", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

    test('marketRestClient.getTickerByMarket bitstamp ETH-USDT', async () => {
        let marketPrice = await marketRestClient.getTickerByMarket("bitstamp", ETH_USDT)
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.data).toBe(true)
    }, 30000)

})

afterAll(()=>{
    mongoose.connection.close()
    //server.close()
})