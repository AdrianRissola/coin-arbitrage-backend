const marketService = require('../service/marketService')
const marketsDBmanager = require('../marketsDBmanager')
const errorHelper = require('../errorHelper')
const availableTickers = require('../availableTickers')



exports.getAllTickers = (request, response) => {
    response.json(marketsDBmanager.getAllAvailableTickers())
}

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

exports.getAllPricesByTicker = (request, response, next) => {
    console.log("request.params.ticker: ", request.params.ticker)
    marketService.getAllPricesByTicker(request.params.ticker).then(
        result => {
            console.log("getAllPricesByTicker: ", result)
            response.json(result)
        }
    )
}

exports.getTickerByMarket = (request, response, next) => {
    console.log("request.params.market: ", request.params.market)
    console.log("request.params.ticker: ", request.params.ticker)
    let ticker = request.params.ticker.toUpperCase()

    let market = marketsDBmanager.getMarketByName(request.params.market)
    if(!market) {
        response.locals.error = errorHelper.errors.NOT_FOUND(`market ${request.params.market} not found`)
        next()
    }

    let marketTicker = market.availableTickersToMarketTickers[ticker]
    if(!marketTicker) {
        response.locals.error = errorHelper.errors.NOT_FOUND(`ticker ${ticker} not found`)
        next() 
    }

    if(!response.locals.error) {
        marketService.getTickerByMarket(request.params.market, ticker).then(
            result => {
                console.log("ticker: ", result)
                response.json(result)
            }
        )
    } else {
        next()
    }
}

exports.saveMarket = async (request, response, next) => {
    let newMarket = request.body
    if(!isValidMarketRequest(newMarket)) {
        return response.status(400).json({
            error: 'invalid request'
        })
    }

    try {
        const savedMarket = await marketService.saveNewMarket(newMarket)
        response.json(savedMarket)
    } catch (error) {
        response.locals.error = error
        next()
    }
    
}

const isValidMarketRequest = (market) => {
    
    let isValidTicker = true;
    let marketTickers = null
    
    if(!!market.availableTickersToMarketTickers) {
        marketTickers = Object.keys(market.availableTickersToMarketTickers)
        for(let ticker of marketTickers) {
            if(!availableTickers.TICKERS[ticker]) {
                isValidTicker = false;
                break
            }
        }
    }

    return !!market && !!marketTickers && !!marketTickers.length>0 && !!isValidTicker && !!market.name && 
    !!market.url && !!market.availableTickersToMarketTickers &&
    !!market.url.base && market.url.base.startsWith("https://") &&
    !!market.url.tickerPath && !!market.url.pathToPrice && market.url.pathToPrice.length>0
}