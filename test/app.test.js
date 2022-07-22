const helper = require('./helper')
const mongoose = require('mongoose')
const Market = require('../model/Market')
const Ticker = require('../model/AvailableTicker')
const supertest = require("supertest")
const app = require("../index")
const api = supertest(app)
//const server = require("../server")

const env = process.env
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

describe('test App/index.js', () => {

    test('GET markets with status 200', async () => { //preg cuando me doy cuenta q es async
        const response = await api.get('/coin-arbitrage/crypto/markets')
            .expect(200)
            //.expect('Content-Type', '/application\/json/')
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
        expect(response.body.length).toBeTruthy();
    })

    test('GET tickers with status 200', async () => { //preg cuando me doy cuenta q es async
        const response = await api.get('/coin-arbitrage/crypto/available-tickers')
            .expect(200)
        console.log('GET tickers with status 200: ', response.body)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
        expect(response.body.length).toBeTruthy();
    })
})

    
describe('test GET /coin-arbitrage/crypto/:market/tickers/:ticker', () => {

    test('GET binance btc-usdt ticker - with status 200', async () => {
        const response = await api.get('/coin-arbitrage/crypto/markets/binance/tickers/btc-usdt')
            .expect(200)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

    test('GET market ticker with invalid market - status 404', async () => {
        const response = await api.get('/coin-arbitrage/crypto/markets/xxxxx/tickers/btc-usdt')
            .expect(404)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

    test('GET market ticker with invalid ticker - status 404', async () => {
        const response = await api.get('/coin-arbitrage/crypto/markets/binance/tickers/xxx-yyy')
            .expect(404)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

})
    
describe('test GET /coin-arbitrage/crypto/current-arbitrages', () => {

    test('GET top 3 current-arbitrages for all available markets - with status 200', async () => {
        const top = 3
        const response = await api.get(`/coin-arbitrage/crypto/current-arbitrages?ticker=btc-usdt&top=${top}`)
            .expect(200)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
        expect(response.body.length).toBeTruthy();
        expect(response.body.length).toBe(top)
    }, 10000)
    
    test('GET current-arbitrages for only one market return status 400', async () => {
        const response = await api.get(`/coin-arbitrage/crypto/current-arbitrages?ticker=btc-usdt&markets=binance`)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

    test('GET current-arbitrages without ticker return status 400', async () => {
        const response = await api.get(`/coin-arbitrage/crypto/current-arbitrages`)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

}, 30000)



afterAll(()=>{
    mongoose.connection.close()
    //server.close()
})