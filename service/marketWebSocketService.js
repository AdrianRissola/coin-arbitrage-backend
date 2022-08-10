const marketsDBmanager = require('../marketsDBmanager')
const marketWebSocketClient = require('../marketWebSocketClient')



exports.openAndSend = async (websocketsActions) => {
    let marketsWithWebsockets = marketsDBmanager.getAllMarketsWithWebsocketsByTicker(websocketsActions.tickers[0])
    webSocketConnections = await marketWebSocketClient.connect(marketsWithWebsockets)
    marketWebSocketClient.send(marketsWithWebsockets, websocketsActions)
    let marketTickerStram = marketWebSocketClient.getMarketTickerStream()
    console.log("marketTickerStram: ", marketTickerStram)
    return webSocketConnections
}

exports.close = async (websocketsActions) => {
    webSocketConnections = await marketWebSocketClient.close(websocketsActions)
    return webSocketConnections
}