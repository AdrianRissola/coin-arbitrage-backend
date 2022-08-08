const supertest = require("supertest")
const app = require("../index")
supertest(app)
const helper = require('./testHelper')
const marketRestClient = require('../marketRestClient')
const axios = require('axios');

jest.mock("axios");


describe('test marketRestClient.getMarketPrice  BTC-USDT with mocked axios', () => {
    test('marketRestClient.getMarketPrice  BTC-USDT - return 200 OK', async () => {

        // given
        const BTC_USDT = "BTC-USDT"
        const marketTickerBTCUSDT = {
            data: {
                symbol: "BTCUSDT",
                price: "21612.48000000"
            }
        }
        axios.get.mockResolvedValueOnce(marketTickerBTCUSDT)

        // when 
        const market = helper.MARKETS[0]
        const marketTickerName = market.availableTickersToMarketTickers[BTC_USDT]
        const marketPrice = await marketRestClient.getMarketPrice(market, marketTickerName)

        // expect
        const url = market.com.api.rest.base.concat(market.com.api.rest.tickerPath).replace('${ticker}', marketTickerBTCUSDT.data.symbol)
        expect(axios.get).toHaveBeenCalledWith(url);
        expect(marketPrice.price).toEqual(Number(marketTickerBTCUSDT.data.price));
        expect(!!marketPrice).toBe(true)
        expect(!!marketPrice.platform).toBe(true)
        expect(!!marketPrice.ticker).toBe(true)
    }, 30000)
})

describe('test marketRestClient.getTickerByMarket  BTC-USDT with mocked axios', () => {
    test('marketRestClient.getTickerByMarket BTC-USDT - return 200 OK', async () => {

        // given
        const BTC_USDT = "BTC-USDT"
        const marketTickerBTCUSDT = {
            data: {
                symbol: "BTCUSDT",
                price: "21612.48000000"
            }
        }
        axios.get.mockResolvedValueOnce(marketTickerBTCUSDT)

        // when 
        const market = helper.MARKETS[0]
        const marketTickerName = market.availableTickersToMarketTickers[BTC_USDT]
        const marketTicker = await marketRestClient.getTickerByMarket(market, marketTickerName)

        // expect
        const url = market.com.api.rest.base.concat(market.com.api.rest.tickerPath).replace('${ticker}', marketTickerBTCUSDT.data.symbol)
        expect(axios.get).toHaveBeenCalledWith(url);
        expect(marketTicker).toEqual(marketTickerBTCUSDT);
    }, 30000)
})