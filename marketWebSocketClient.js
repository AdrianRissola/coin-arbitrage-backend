const WebSocketClient = require('websocket').client;
const marketsDBmanager = require('./marketsDBmanager');
const marketApiResponseHandler = require('./marketApiResponseHandler');
const dtoConverter = require('./dtoConverter');
const logHelper = require('./logHelper');

const client = new WebSocketClient();
const webSocketConnections = {};
const servernameMessage = {};
const hostToChannelId = {};
let marketsToConnect = null;
let currentTickerSubscription = null;

client.on('connectFailed', error => {
	console.log(`Connect Error for: ${client.socket.servername} ${error.toString()}`);
});

const sendPing = connection => {
	const market = marketsDBmanager.getMarketByWebsocketHost(connection.socket.servername);
	const { pingFrequencyInSeconds } = market.com.api.websocket;
	if (pingFrequencyInSeconds) {
		let refreshIntervalId;
		if (connection.connected) {
			refreshIntervalId = setInterval(async () => {
				connection.sendUTF('ping');
			}, (pingFrequencyInSeconds - 1) * 1000);
		} else if (!connection.connected) {
			clearInterval(refreshIntervalId);
		}
	}
};

const isConnected = market =>
	webSocketConnections[market.com.api.websocket.host]
		? webSocketConnections[market.com.api.websocket.host].connected
		: false;

const updateMarketsToConnect = connection => {
	const market = marketsToConnect.find(
		marketToConnect => marketToConnect.com.api.websocket.host === connection.socket.servername
	);
	market.connected = true;
	return market;
};

const clearPrice = async market => {
	const connection = webSocketConnections[market.com.api.websocket.host];
	if (connection && servernameMessage[connection.socket.servername]) {
		console.log(
			`CLEARING PRICE FROM ${market.com.api.websocket.host}: ${
				servernameMessage[connection.socket.servername].data.price
			}`
		);
		servernameMessage[connection.socket.servername].data.price = null;
	}
};

const subscribe = async market => {
	await clearPrice(market);
	const ticker = market.tickerRequest.toUpperCase();
	const tickerToSubscribe = market.com.api.websocket.availableTickersToMarketTickers[ticker];

	if (tickerToSubscribe) {
		const tickerRequest = market.com.api.websocket.tickerRequest.replace(
			'${ticker}',
			tickerToSubscribe
		);
		const connection = webSocketConnections[market.com.api.websocket.host];
		console.log(`SUBSCRIBING ${market.com.api.websocket.host}: ${tickerRequest}`);
		connection.sendUTF(tickerRequest);
		connection.currentTickerSubscription = ticker;
	} else {
		console.log(`${market.com.api.websocket.host} not supports ${ticker}`);
	}
};

const putChannelId = (connection, market, messageResponse) => {
	if (
		market.com.api.websocket.pathToChannelId &&
		market.com.api.websocket.pathToChannelId.length > 0
	)
		hostToChannelId[connection.socket.servername] =
			marketApiResponseHandler.extractNumberFromTarget(
				market.com.api.websocket.pathToChannelId,
				messageResponse
			);
};

const getPrice = (market, messageResponse) =>
	marketApiResponseHandler.extractNumberFromTarget(
		market.com.api.websocket.pathToPrice,
		messageResponse,
		{
			marketTickerName:
				market.com.api.websocket.availableTickersToMarketTickers[
					market.tickerRequest.toUpperCase()
				],
		}
	);

const putMessage = (connection, rawMessage, parsedMessage, market) => {
	const price = getPrice(market, parsedMessage);
	if (price) {
		servernameMessage[connection.socket.servername] = {};
		servernameMessage[connection.socket.servername].connected = connection.connected;
		servernameMessage[connection.socket.servername].rawData = rawMessage.utf8Data;
		servernameMessage[connection.socket.servername].data = {};
		servernameMessage[connection.socket.servername].data.market = market;
		servernameMessage[connection.socket.servername].data.ticker =
			connection.currentTickerSubscription;
		servernameMessage[connection.socket.servername].data.marketTicker = parsedMessage;
		servernameMessage[connection.socket.servername].data.price = price;
		servernameMessage[connection.socket.servername].data.timestamp = new Date();
	}
};

client.on('connect', connection => {
	webSocketConnections[connection.socket.servername] = connection;

	sendPing(connection);

	console.log(`Connection OK: ${connection.socket.servername}`);

	const market = updateMarketsToConnect(connection);
	const unconnectedMarket = marketsToConnect.find(
		marketToConnect => !isConnected(marketToConnect)
	);
	if (unconnectedMarket) {
		const { host } = unconnectedMarket.com.api.websocket;
		client.connect(unconnectedMarket.com.api.websocket.url.replace('${host}', host));
	}

	connection.on('error', error => {
		if (servernameMessage[connection.socket.servername])
			servernameMessage[connection.socket.servername].connected = connection.connected;
		console.log(`Connection Error: ${connection.socket.servername} - ${JSON.stringify(error)}`);
	});

	connection.on('close', () => {
		if (servernameMessage[connection.socket.servername])
			servernameMessage[connection.socket.servername].connected = connection.connected;
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
			const parsedMessage = JSON.parse(message.utf8Data);
			const foundMmarket = marketsDBmanager.getMarketByWebsocketHost(
				connection.socket.servername
			);

			try {
				putChannelId(connection, foundMmarket, parsedMessage);

				putMessage(connection, message, parsedMessage, market);

				logHelper.logMarketTickerStream(servernameMessage);
			} catch (error) {
				// console.log(error.description);
			}
		}
	});

	subscribe(market, connection);
});

exports.getMarketTickerStream = (marketsNames, ticker) => {
	const result = {};

	let websocketHosts = null;
	if (marketsNames) websocketHosts = marketsDBmanager.getWebsocketHosts(marketsNames, ticker);

	Object.keys(servernameMessage).forEach(host => {
		if (
			(!websocketHosts || websocketHosts.includes(host)) &&
			servernameMessage[host].data.ticker.toUpperCase() === ticker.toUpperCase() &&
			servernameMessage[host].data.price &&
			servernameMessage[host].connected
		)
			result[host] = servernameMessage[host];
	});

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

const changeTickerSubscription = async (markets, tickers) => {
	marketsToConnect.forEach(market => {
		console.log(market.name);
		const tickerToUnsubscribe =
			market.com.api.websocket.availableTickersToMarketTickers[
				currentTickerSubscription.toUpperCase()
			];
		if (tickerToUnsubscribe) {
			const unsubscribeRequest = market.com.api.websocket.unsubscribeTickerRequest
				.replace('${ticker}', tickerToUnsubscribe)
				.replace('${channelId}', hostToChannelId[market.com.api.websocket.host]);
			console.log(`UNSUBSCRIBING ${market.com.api.websocket.host}: ${unsubscribeRequest}`);
			const connection = webSocketConnections[market.com.api.websocket.host];
			connection.sendUTF(unsubscribeRequest);
		}
		market.tickerRequest = tickers[0];
		subscribe(market);
	});
};

exports.connectAndSend = async (markets, tickers) => {
	if (
		currentTickerSubscription &&
		currentTickerSubscription.toUpperCase() !== tickers[0].toUpperCase()
	) {
		await changeTickerSubscription(markets, tickers);
	}
	currentTickerSubscription = tickers[0];
	marketsToConnect = markets;
	marketsToConnect.forEach(marketToConnect => {
		const market = marketToConnect;
		market.connected = false;
		market.tickerRequest = tickers[0];
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
