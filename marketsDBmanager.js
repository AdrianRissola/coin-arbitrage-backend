const Market = require('./model/Market')
const mongoose = require('mongoose')

let marketsFromDB = null
let availableTickers = null

exports.setMarketsFromDB = (markets) => {
    marketsFromDB = markets
}

exports.getMarketsByNames = (names) => {
    let markets = []
    for(let i=0 ; i<names.length ; i++){
        let foundMarket = getMarketByName(names[i])
        if (!!foundMarket)
            markets.push(foundMarket)
    }
    return markets;
} 

exports.getMarketByName = (name) => {
    if(!marketsFromDB) {
        Market.find({})
        .then(result => {
            console.log("no markets from db, reloaded: ", result)
            mongoose.connection.close
            return getMarketByName(name)
        })
    } else {
        return getMarketByName(name)
    } 
}

exports.loadMarketsFromDB = async () => {
    await Market.find({})
        .then(result => {
            this.setMarketsFromDB(result)
            console.log("reloading markets from db: ", result)
            mongoose.connection.close
            return result
        })
}

exports.getMarketTickerName = (marketName, ticker) => {
    ticker = ticker.toUpperCase()
    if(!marketsFromDB) {
        Market.find({})
        .then(result => {
            console.log("no markets from db, reloaded: ", result)
            mongoose.connection.close
            return getMarketByName(marketName).availableTickersToMarketTickers[ticker]
        })
    } else {
        return getMarketByName(marketName).availableTickersToMarketTickers[ticker]
    } 
} 

exports.getAllMarkets = () => {
    return marketsFromDB 
}

exports.getAllMarketsByTicker = (ticker) => {
    let markets = []
    for(let i=0 ;i<marketsFromDB.length ; i++) {
        if(!!marketsFromDB[i].availableTickersToMarketTickers[ticker.toUpperCase()])
            markets.push(marketsFromDB[i])
    }
    console.log("getAllMarketsByTicker ", ticker, markets)
    return markets 
}

exports.setAvailableTickers = (tickers) => {
    availableTickers = tickers
}

exports.getAllAvailableTickers = () => {
    return availableTickers
}

exports.getAllMarketsWithWebsockets = () => {
    let marketsWithWebsockets = []
    for(let i=0 ;i<marketsFromDB.length ; i++) {
        if(marketsFromDB[i].com && 
            marketsFromDB[i].com.api &&
            marketsFromDB[i].com.api.websocket &&
            marketsFromDB[i].com.api.websocket.host &&
            marketsFromDB[i].com.api.websocket.url &&
            marketsFromDB[i].com.api.websocket.tickerRequest)
            marketsWithWebsockets.push(marketsFromDB[i])
    }
    return marketsWithWebsockets
}

const getMarketByName = (name) => {
    let marketFound = null
    for(let i=0 ; i<marketsFromDB.length ; i++){
        if(marketsFromDB[i].name.toUpperCase()===name.toUpperCase()) {
            marketFound = marketsFromDB[i]
            break
        }
    }
    return marketFound
}

