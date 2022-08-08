let WebSocketClient = require('websocket').client;

let client = new WebSocketClient();

let webSocketConnections = {}
let ticker = null
let marketPriceStram = {}


const binanceWebsocketUnubscribeRequest = {
    "method": "UNSUBSCRIBE",
    "params":
    [ "btcusdt@ticker" ],
    "id": 312
}

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
                    ticker = message.utf8Data
                    marketPriceStram[connection.socket._host] = ticker
                    console.log("Received from:", connection.socket._host + " message: " + JSON.stringify(message));
                    console.log("////");
                }
            });
            
        });
    })    
}

exports.getwebSocketConnections = async () =>  webSocketConnections

exports.getTicker = () => { ticker }

exports.getTickerPrice = () => { ticker.c }

exports.send = (markets) => {
    markets.forEach(market=>{
        if (webSocketConnections[market.com.api.websocket.host].connected) {
            webSocketConnections[market.com.api.websocket.host].sendUTF(market.com.api.websocket.tickerRequest);
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

