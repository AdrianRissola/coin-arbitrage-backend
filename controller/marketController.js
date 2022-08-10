const marketService = require('../service/marketService')
const marketsDBmanager = require('../marketsDBmanager')
const errorHelper = require('../errorHelper')
const availableTickers = require('../availableTickers')
const marketWebSocketClient = require('../marketWebSocketClient')
const dtoConverter = require('../dtoConverter')
const marketWebSocketService = require('../service/marketWebSocketService')




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
        next(errorHelper.errors.NOT_FOUND(`ticker ${ticker} not found`))
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
        next(error)
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
    !!market.availableTickersToMarketTickers && !!market.com && !!market.com.api && !!market.com.api.rest
    && !!market.com.api.rest.base && !!market.com.api.rest.base.startsWith("https://") 
    && !!market.com.api.rest.tickerPath && !!market.com.api.rest.pathToPrice && !!market.com.api.rest.pathToPrice.length>0
}


exports.connectWebsocket = async (request, response, next) => {

    let websocketsActions = request.body
    let webSocketConnections
    
    if(websocketsActions.action==="open")
        webSocketConnections = await marketWebSocketService.openAndSend(websocketsActions)

    if(websocketsActions.action==="close")
        webSocketConnections = await marketWebSocketService.close(websocketsActions)

    return response.json(dtoConverter.toConnectionsDto(webSocketConnections))
}