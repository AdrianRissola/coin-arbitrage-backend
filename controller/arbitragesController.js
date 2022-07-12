const marketService = require('../service/marketService')
const arbitrageService = require('../service/arbitrageService')
const Arbitrage = require('../model/Arbitrage')
const marketsDBmanager = require('../marketsDBmanager')
const tickerConverter = require('../tickerConverter')



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

exports.getTickerByMarket = (request, response, next) => {
    console.log("request.params.market: ", request.params.market)
    console.log("request.params.ticker: ", request.params.ticker)
    let marketTicker = tickerConverter.MARKET_TO_TICKER[request.params.market.toUpperCase()][request.params.ticker.toUpperCase()]
    if(!!marketTicker) {
        marketService.getTickerByMarket(request.params.market, request.params.ticker).then(
            result => {
                console.log("ticker: ", result)
                response.json(result)
            }
        )
    } else {
        next()
    }
}

exports.getArbitrages = (request, response, next) => {
    console.log("request.query.markets: ", request.query.markets)
    console.log("request.query.ticker: ", request.query.ticker)
    console.log("request.query.minProfitPercentage: ", request.query.minProfitPercentage)
    console.log("request.query.top: ", request.query.top)
    let markets = null
    if(!!request.query.markets) {
        markets = request.query.markets.split(",")
        if(!!markets && markets.length===1)
            next()
    }
    if(!request.query.ticker)
        next()
    arbitrageService.getArbitrages(markets, request.query.ticker, Number(request.query.minProfitPercentage))
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

