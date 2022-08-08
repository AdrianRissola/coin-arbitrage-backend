var WebSocketClient = require('websocket').client;

let client = new WebSocketClient();

const binanceWebsocketUrl = "wss://stream.binance.com:9443/ws"//btcusdt@kline_1h"//wss://stream.binance.com:9443/ws"

let webSocketConnection = null


const binanceWebsocketSubscribeRequest = {
    "method": "SUBSCRIBE",
    "params":
    [ "btcusdt@ticker" ],
    "id": 1
}

const binanceWebsocketUnubscribeRequest = {
    "method": "UNSUBSCRIBE",
    "params":
    [ "btcusdt@ticker" ],
    "id": 312
}

let response = null

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
           
    console.log('WebSocket Client Connected');
    
    webSocketConnection = connection
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            response = JSON.parse(message.utf8Data)
            console.log("Received: '" + message.utf8Data + "'");
        }
    });
    
});

exports.getResponse = () => {
    if(response) return response
}

exports.send = (request) => {
    if (webSocketConnection.connected) {
        webSocketConnection.sendUTF(JSON.stringify(request));
        //setTimeout(sendNumber, 1000);
    }
}

client.connect(binanceWebsocketUrl)
exports.disconnect = () => webSocketConnection.close()


