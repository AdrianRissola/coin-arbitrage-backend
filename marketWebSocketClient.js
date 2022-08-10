let WebSocketClient = require('websocket').client;
const marketsDBmanager = require("./marketsDBmanager")
const marketApiResponseHandler = require("./marketApiResponseHandler")

let client = new WebSocketClient();

let webSocketConnections = {}
let marketTickerStream = {}


// const binanceWebsocketUnubscribeRequest = {
//     "method": "UNSUBSCRIBE",
//     "params":
//     [ "btcusdt@ticker" ],
//     "id": 312
// }

exports.resposne = null

client.on('connectFailed', function(error) {
    console.log('Connect Error for: ' + client.socket + ' ' + error.toString());
});

let connectedMarkets = []

let onConnectPromiseResolved = null

const onConnect = (market) => {
    return new Promise((resolve,reject)=>{

        client.on('connect', function(connection) {
            connectedMarkets.push({
                marketName: market.name,
                websocketUrl: market.com.api.websocket.host,
                socketHost: connection.socket._host
            })
            console.log("connectedMarkets: ", connectedMarkets)

            webSocketConnections[connection.socket._host] = connection

            console.log("webSocketConnections: ", Object.keys(webSocketConnections))

            resolve()
            onConnectPromiseResolved = true

            connection.on('error', function(error) {
                console.log("Connection Error: " + error.toString());
                reject()
            });
            
            connection.on('close', function() {
                console.log('Connection Closed: ', connection.socket._host);
            });
            
            connection.on('message', function(message) {
                if (message.type === 'utf8') {
                    
                    let price = null
                    let tickerResult = JSON.parse(message.utf8Data)
                    let market = marketsDBmanager.getMarketByWebsocketHost(connection.socket._host)
                    
                    try {
                        price = marketApiResponseHandler.getPriceByMarketAndTicker(market.com.api.websocket.pathToPrice, null, tickerResult)
                        marketTickerStream[connection.socket._host] = {}
                        marketTickerStream[connection.socket._host]["rawData"] = message.utf8Data
                        marketTickerStream[connection.socket._host]["data"] = {}
                        marketTickerStream[connection.socket._host]["data"]["market"] = market
                        marketTickerStream[connection.socket._host]["data"]["ticker"] = tickerResult
                        marketTickerStream[connection.socket._host]["data"]["price"] = price
                    } catch (error) {
                        console.log(error.description)
                    }

                    //console.log("Received from:", connection.socket._host + " message: " + JSON.stringify(message));
                    console.log("marketTickerStream: ", marketTickerStream);
                }
            });
            
        });
    })    
}


exports.getMarketTickerStream = () =>  marketTickerStream


exports.send = (markets, websocketsActions) => {
    let ticker = websocketsActions.tickers[0]
    markets.forEach(market=>{
        if (webSocketConnections[market.com.api.websocket.host].connected) {
            let tickerRequest = market.com.api.websocket.tickerRequest
            .replace("${ticker}", market.com.api.websocket.availableTickersToMarketTickers[ticker.toUpperCase()]) 
            webSocketConnections[market.com.api.websocket.host].sendUTF(tickerRequest);
        }
    })
}


exports.connect = async (markets) => {
    for(let i=0 ; i<markets.length ; i++) {
        let host = markets[i].com.api.websocket.host
        client.connect(markets[i].com.api.websocket.url.replace("${host}", host))
        await onConnect(markets[i])
    }
    return webSocketConnections
}

exports.close = async (websocketsActions) => {
    if(websocketsActions.allMarkets) {
        for(let conn in webSocketConnections) {
            if(webSocketConnections[conn].connected)
                await webSocketConnections[conn].close()
        }
    }
    return webSocketConnections
}

