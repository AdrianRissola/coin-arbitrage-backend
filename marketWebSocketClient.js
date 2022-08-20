const WebSocketClient = require('websocket').client;
const marketsDBmanager = require('./marketsDBmanager');
const marketApiResponseHandler = require('./marketApiResponseHandler');
const dtoConverter = require('./dtoConverter');

const client = new WebSocketClient();
const webSocketConnections = {};
let marketTickerStream = null;

// const binanceWebsocketUnubscribeRequest = {
//     "method": "UNSUBSCRIBE",
//     "params":
//     [ "btcusdt@ticker" ],
//     "id": 312
// }

client.on('connectFailed', error => {
	console.log(`Connect Error for: ${client.socket.servername} ${error.toString()}`);
});

const connectedMarkets = [];

const onConnect = market =>
	new Promise((resolve, reject) => {
		client.on('connect', connection => {
			console.log(`Connection OK: ${connection.socket._host}`);
			connectedMarkets.push({
				marketName: market.name,
				websocketUrl: market.com.api.websocket.host,
				socketHost: connection.socket._host,
			});

			webSocketConnections[connection.socket._host] = connection;

			// console.log("webSocketConnections: ", Object.keys(webSocketConnections))

			resolve();
			onConnectPromiseResolved = true;

			connection.on('error', error => {
				console.log(`Connection Error: ${connection.socket._host} - ${error.toString()}`);
				reject();
			});

			connection.on('close', () => {
				// console.log("webSocketConnections: ", Object.keys(webSocketConnections))
				console.log('Connection Closed: ', connection.socket._host);
			});

			marketTickerStream = {};
			connection.on('message', message => {
				if (message.type === 'utf8') {
					let price = null;
					const tickerResult = JSON.parse(message.utf8Data);
					const market = marketsDBmanager.getMarketByWebsocketHost(
						connection.socket._host
					);

					try {
						price = marketApiResponseHandler.getPriceByMarketAndTicker(
							market.com.api.websocket.pathToPrice,
							null,
							tickerResult
						);
						marketTickerStream[connection.socket._host] = {};
						marketTickerStream[connection.socket._host].rawData = message.utf8Data;
						marketTickerStream[connection.socket._host].data = {};
						marketTickerStream[connection.socket._host].data.market = market;
						marketTickerStream[connection.socket._host].data.ticker = tickerResult;
						marketTickerStream[connection.socket._host].data.price = price;
					} catch (error) {
						// console.log(error.description)
					}

					// console.log("Received from:", connection.socket._host + " message: " + JSON.stringify(message));
					// console.log("marketTickerStream: ", marketTickerStream);
				}
			});
		});
	});

exports.getMarketTickerStream = () => marketTickerStream;

exports.send = (markets, websocketsActions) => {
	const ticker = websocketsActions.tickers[0];
	markets.forEach(market => {
		if (
			webSocketConnections[market.com.api.websocket.host].connected
			// && market.com.api.websocket.host==='ws.kraken.com'
		) {
			const tickerRequest = market.com.api.websocket.tickerRequest.replace(
				'${ticker}',
				market.com.api.websocket.availableTickersToMarketTickers[ticker.toUpperCase()]
			);
			webSocketConnections[market.com.api.websocket.host].sendUTF(tickerRequest);
		}
	});
};

exports.connect = async markets => {
	for (let i = 0; i < markets.length; i++) {
		const { host } = markets[i].com.api.websocket;
		client.connect(markets[i].com.api.websocket.url.replace('${host}', host));
		await onConnect(markets[i]);
	}
	return dtoConverter.toConnectionsDto(webSocketConnections);
};

exports.close = async websocketsActions => {
	if (websocketsActions.allMarkets) {
		for (const conn in webSocketConnections) {
			if (webSocketConnections[conn].connected) await webSocketConnections[conn].close();
		}
		marketTickerStream = null;
	}
	return dtoConverter.toConnectionsDto(webSocketConnections);
};
