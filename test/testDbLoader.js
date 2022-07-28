const supertest = require("supertest")
const app = require("../index")
supertest(app)
const helper = require('./testHelper')
const mongoose = require('mongoose')
const Market = require('../model/Market')
const Ticker = require('../model/AvailableTicker')
const env = process.env
const marketsDBmanager = require('../marketsDBmanager')



beforeAll(async () => {
    await Market.deleteMany({})
    await Ticker.deleteMany({})

    console.log("dbUri: ", env.NODE_ENV)
    console.log("connecting db for test")
    const dbUri = env.NODE_ENV === 'test'? env.MONGO_DB_URI_TEST : env.MONGO_DB_URI
    await mongoose.connect(dbUri)
    .then( async ()=>{
        console.log("connected db for test")
        for(let market of helper.MARKETS){
            const marketToSave = new Market(market)
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
            const tickerToSave = new Ticker(ticker)
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