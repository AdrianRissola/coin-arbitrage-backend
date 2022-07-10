const marketService = require('../service/marketService')
const arbitrageService = require('../service/arbitrageService')
const Arbitrage = require('../model/Arbitrage')
const marketsDBmanager = require('../marketsDBmanager')



exports.getAllMarkets = (request, response) => {
    marketService.getAllMarkets()
    .then(markets => {
        console.log("markets: ", markets)
        response.json(markets)
    })
    .catch(err=>{
        console.error(err)
    })
}

exports.getAllTickers = (request, response) => {
    response.json(marketsDBmanager.getAllAvailableTickers())
}

exports.getArbitrages = (request, response, next) => {
    console.log("request.query.markets: ", request.query.markets)
    console.log("request.query.ticker: ", request.query.ticker)
    let markets = null
    if(!!request.query.markets) {
        markets = request.query.markets.split(",")
        if(!!markets && markets.length===1)
            next()
    }
    if(!request.query.ticker)
        next()
    arbitrageService.getArbitrages(markets, request.query.ticker)
    .then(result=>{
        let top = parseInt(request.query.top)
        if(top && top>0 && top<=result.length)
            result = result.slice(0, parseInt(request.query.top))
        console.log("arbitrageService.getArbitrages(): ", result)
        response.json(result)
    })
    .catch(err=>{
        console.error(err)
    })
}

exports.getAllHistoricalArbitrages = (request, response) => {
    console.log("finding all stored arbitrage: ")
    Arbitrage.find()
    .then(result=>{
        console.log("findAll: ", result)
        response.json(result)
    })
    .catch(err=>{
        console.error(err)
    })
}

exports.saveArbitrage = (request, response) => {
    if(!request.body) {
        return response.status(400).json({
            error: 'invalid request'
        })
    }
    const arbitrage = new Arbitrage(request.body)
    arbitrage.save()
    .then(result=>{
        console.log("saved: ", result)
        response.json(result)
    })
    .catch(err=>{
        console.error(err)
    })
}

