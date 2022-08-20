const WebSocketClient = require('websocket').client;
const marketsDBmanager = require('./marketsDBmanager');
const marketApiResponseHandler = require('./marketApiResponseHandler');
const dtoConverter = require('./dtoConverter');
const logHelper = require('./logHelper');

const client = new WebSocketClient();
const webSocketConnections = {};
const marketTickerStream = {};
let marketsToConnect = null;

// const binanceWebsocketUnubscribeRequest = {
//     "method": "UNSUBSCRIBE",
//     "params":
//     [ "btcusdt@ticker" ],
//     "id": 312
// }

client.on('connectFailed', error => {
	console.log(`Connect Error for: ${client.socket.servername} ${error.toString()}`);
});

client.on('connect', connection => {
	console.log(`Connection OK: ${connection.socket.servername}`);

	const market = marketsToConnect.find(
		marketToConnect => marketToConnect.com.api.websocket.host === connection.socket.servername
	);
	market.connected = true;
	const unconnectedMarket = marketsToConnect.find(marketToConnect => !marketToConnect.connected);
	if (unconnectedMarket) {
		const { host } = unconnectedMarket.com.api.websocket;
		client.connect(unconnectedMarket.com.api.websocket.url.replace('${host}', host));
	}

	webSocketConnections[connection.socket.servername] = connection;

	connection.on('error', error => {
		if (marketTickerStream[connection.socket.servername])
			marketTickerStream[connection.socket.servername].connected = connection.connected;
		console.log(`Connection Error: ${connection.socket.servername} - ${JSON.stringify(error)}`);
	});

	connection.on('close', () => {
		if (marketTickerStream[connection.socket.servername])
			marketTickerStream[connection.socket.servername].connected = connection.connected;
		console.log(
			'Connection Closed:',
			connection.socket.servername,
			'. closeDescription:',
			connection.closeDescription,
			'. closeReasonCode:',
			connection.closeReasonCode
		);
	});

	connection.on('message', message => {
		if (message.type === 'utf8') {
			let price = null;
			const tickerResult = JSON.parse(message.utf8Data);
			const foundMmarket = marketsDBmanager.getMarketByWebsocketHost(
				connection.socket.servername
			);

			try {
				price = marketApiResponseHandler.getPriceByMarketAndTicker(
					foundMmarket.com.api.websocket.pathToPrice,
					foundMmarket.com.api.websocket.availableTickersToMarketTickers[
						foundMmarket.tickerRequest.toUpperCase()
					],
					tickerResult
				);

				marketTickerStream[connection.socket.servername] = {};
				marketTickerStream[connection.socket.servername].connected = connection.connected;
				marketTickerStream[connection.socket.servername].rawData = message.utf8Data;
				marketTickerStream[connection.socket.servername].data = {};
				marketTickerStream[connection.socket.servername].data.market = foundMmarket;
				marketTickerStream[connection.socket.servername].data.ticker = tickerResult;
				marketTickerStream[connection.socket.servername].data.price = price;
				marketTickerStream[connection.socket.servername].data.timestamp = new Date();

				logHelper.logMarketTickerStream(marketTickerStream);
			} catch (error) {
				// console.log(error.description)
			}
		}
	});

	const ticker = market.tickerRequest.toUpperCase();
	const tickerRequest = market.com.api.websocket.tickerRequest.replace(
		'${ticker}',
		market.com.api.websocket.availableTickersToMarketTickers[ticker]
	);
	connection.sendUTF(tickerRequest);
});

exports.getMarketTickerStream = (marketsNames, ticker) => {
	let result = marketTickerStream;
	if (marketsNames && ticker) {
		result = {};
		const websocketHosts = marketsDBmanager.getWebsocketHosts(marketsNames, ticker);
		Object.keys(marketTickerStream).forEach(host => {
			if (websocketHosts.includes(host)) result[host] = marketTickerStream[host];
		});
	}
	return result;
};

exports.getWebSocketConnections = () => dtoConverter.toConnectionsDto(webSocketConnections);

const isConnecting = market => {
	const { host } = market.com.api.websocket;
	let connecting = false;
	if (!webSocketConnections[host] || !webSocketConnections[host].connected) {
		client.connect(market.com.api.websocket.url.replace('${host}', host));
		connecting = true;
	}
	return connecting;
};

exports.connectAndSend = async (markets, ticker) => {
	marketsToConnect = markets;
	marketsToConnect.forEach(marketToConnect => {
		const market = marketToConnect;
		market.connected = false;
		market.tickerRequest = ticker;
		return market;
	});

	markets.some(market => isConnecting(market));

	return Object.keys(webSocketConnections).length > 0
		? dtoConverter.toConnectionsDto(webSocketConnections)
		: 'connecting';
};

exports.close = async websocketsActions => {
	if (websocketsActions.allMarkets) {
		Object.keys(webSocketConnections).forEach(host => {
			if (webSocketConnections[host] && webSocketConnections[host].connected)
				webSocketConnections[host].close();
		});
	}
	return dtoConverter.toConnectionsDto(webSocketConnections);
};
