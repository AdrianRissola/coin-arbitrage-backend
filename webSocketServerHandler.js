const marketWebSocketClient = require("./marketWebSocketClient")
const dtoConverter = require("./dtoConverter")
const marketWebSocketService = require("./service/marketWebSocketService")

let refreshIntervalId = null
exports.onRequest = (request) => {

    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept(null, request.origin);
    console.log((new Date()) + ` ${request.origin} Connection accepted.`);
    
    connection.on('message', async function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            
            let jsonData = null
            try {
                jsonData = JSON.parse(message.utf8Data);
            } catch (error) {
                console.log('invalid json: ' + message);
                connection.sendUTF(error.message);
            }
            

            
            if(jsonData && jsonData.ticker) {
                await marketWebSocketService.openAndSend({
                    tickers: [jsonData.ticker]
                })
    
                refreshIntervalId = setInterval(
                    () => {
                        let marketTickersStream = marketWebSocketClient.getMarketTickerStream()
                        console.log('marketTickerStream: ' + JSON.stringify(marketTickersStream));
                        let marketTickersStreamDto = dtoConverter.toMarketTickersStreamDto(marketTickersStream)
                        connection.sendUTF(JSON.stringify(marketTickersStreamDto));
                    },
                    1000
                );
            }   
        }

        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }

    });

    connection.on('close', function(reasonCode, description) {
        clearInterval(refreshIntervalId);
        marketWebSocketService.close({allMarkets: true})
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
    

}


function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}
