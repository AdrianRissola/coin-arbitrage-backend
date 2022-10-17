const WebSocketClient = require('websocket').client;
const marketsDBmanager = require('./marketsDBmanager');
const marketApiResponseHandler = require('./marketApiResponseHandler');
const dtoConverter = require('./dtoConverter');
const logHelper = require('./logHelper');
const marketHelper = require('./marketHelper');

const client = new WebSocketClient();
const webSocketConnections = {};
const marketHostToMessage = {};
const marketHostToSubscriptionId = {};
let marketsToConnect = null;
const marketToSyncSubscription = {};

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

const subscribe = async market => {
	const ticker = market.tickerRequest.toUpperCase();
	const tickerToSubscribe = market.com.api.websocket.availableTickersToMarketTickers[ticker];

	if (tickerToSubscribe) {
		const tickerRequest = market.com.api.websocket.tickerRequest.replace(
			'${ticker}',
			tickerToSubscribe
		);
		const connection = webSocketConnections[market.com.api.websocket.host];
		if (connection) {
			console.log(`SUBSCRIBING ${market.com.api.websocket.host}: ${tickerRequest}`);
			connection.sendUTF(tickerRequest);
			connection.currentTickerSubscription = ticker;
		} else {
			console.log(
				`there is no connection for: ${market.com.api.websocket.host} when trying to subscribe: ${tickerRequest}`
			);
		}
	} else {
		console.log(`${market.com.api.websocket.host} is not supporting ${ticker}`);
	}
};

const getSubscriptionId = (market, messageResponse) => {
	let subscriptionId = null;
	const { pathToSubscriptionId } = market.com.api.websocket;
	if (pathToSubscriptionId && pathToSubscriptionId.length > 0)
		subscriptionId = marketApiResponseHandler.extractNumberFromTarget(
			market.com.api.websocket.pathToSubscriptionId,
			messageResponse,
			{ valueType: 'number' }
		);
	return subscriptionId;
};

const putSubscriptionId = async (connection, market, messageResponse) => {
	if (
		market.com.api.websocket.pathToSubscriptionId &&
		market.com.api.websocket.pathToSubscriptionId.length > 0
	) {
		const subscriptionId = getSubscriptionId(market, messageResponse);
		if (subscriptionId) {
			if (!marketHostToSubscriptionId[connection.socket.servername])
				marketHostToSubscriptionId[connection.socket.servername] = {};
			if (!marketHostToSubscriptionId[connection.socket.servername][subscriptionId])
				marketHostToSubscriptionId[connection.socket.servername][subscriptionId] =
					connection.currentTickerSubscription;
		}
	}
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
			valueType: 'number',
		}
	);

const getAppTicker = (market, messageResponse) => {
	let appTicker = null;
	const { pathToTicker } = market.com.api.websocket;
	if (pathToTicker && pathToTicker.length > 0) {
		const marketTicker = marketApiResponseHandler.extractNumberFromTarget(
			pathToTicker,
			messageResponse,
			{
				valueType: 'string',
				tickerKeyIndex: market.com.api.websocket.tickerKeyIndex,
			}
		);
		appTicker = marketHelper.getAppTicker(market, 'websocket', marketTicker);
	} else if (market.com.api.websocket.pathToSubscriptionId)
		appTicker =
			marketHostToSubscriptionId[market.com.api.websocket.host][
				getSubscriptionId(market, messageResponse)
			];
	return appTicker;
};

const putMessage = (connection, rawMessage, parsedMessage, market) => {
	const price = getPrice(market, parsedMessage);
	const appTicker = getAppTicker(market, parsedMessage);
	const subscriptionId = getSubscriptionId(market, parsedMessage);
	if (price) {
		if (!marketHostToMessage[connection.socket.servername])
			marketHostToMessage[connection.socket.servername] = {};
		marketHostToMessage[connection.socket.servername].connected = connection.connected;
		marketHostToMessage[connection.socket.servername].rawData = rawMessage.utf8Data;
		if (!marketHostToMessage[connection.socket.servername].data)
			marketHostToMessage[connection.socket.servername].data = {};
		marketHostToMessage[connection.socket.servername].data.market = market;
		if (!marketHostToMessage[connection.socket.servername].data.subscriptionId)
			marketHostToMessage[connection.socket.servername].data.subscriptionId = {};
		marketHostToMessage[connection.socket.servername].data.subscriptionId[subscriptionId] =
			connection.currentTickerSubscription;
		const { tickerPrices } = marketHostToMessage[connection.socket.servername].data;
		if (!tickerPrices) marketHostToMessage[connection.socket.servername].data.tickerPrices = {};
		marketHostToMessage[connection.socket.servername].data.tickerPrices[appTicker] = price;
		marketHostToMessage[connection.socket.servername].data.ticker =
			connection.currentTickerSubscription;
		marketHostToMessage[connection.socket.servername].data.marketTicker = parsedMessage;
		marketHostToMessage[connection.socket.servername].data.price = price;
		marketHostToMessage[connection.socket.servername].data.timestamp = new Date();
	}
};

const existSyncSubscriptions = connection =>
	marketToSyncSubscription[connection.socket.servername] &&
	marketToSyncSubscription[connection.socket.servername].tikcers &&
	marketToSyncSubscription[connection.socket.servername].length > 0;

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
		if (marketHostToMessage[connection.socket.servername])
			marketHostToMessage[connection.socket.servername].connected = connection.connected;
		console.log(`Connection Error: ${connection.socket.servername} - ${JSON.stringify(error)}`);
	});

	connection.on('close', () => {
		if (marketHostToMessage[connection.socket.servername])
			marketHostToMessage[connection.socket.servername].connected = connection.connected;
		console.log(
			'Connection Closed:',
			connection.socket.servername,
			'. closeDescription:',
			connection.closeDescription,
			'. closeReasonCode:',
			connection.closeReasonCode
		);
	});

	connection.on('message', async message => {
		if (message.type === 'utf8') {
			const parsedMessage = JSON.parse(message.utf8Data);
			const foundMmarket = marketsDBmanager.getMarketByWebsocketHost(
				connection.socket.servername
			);

			try {
				await putSubscriptionId(connection, foundMmarket, parsedMessage);

				if (existSyncSubscriptions(connection)) {
					const marketToSubscribe = marketsDBmanager.getMarketByWebsocketHost(
						connection.socket.servername
					);
					marketToSubscribe.tickerRequest =
						marketToSyncSubscription[connection.socket.servername].tikcers.pop();
					subscribe(marketToSubscribe);
				}

				putMessage(connection, message, parsedMessage, market);

				logHelper.logMarketTickerStream(marketHostToMessage);
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

	Object.keys(marketHostToMessage).forEach(host => {
		if (
			(!websocketHosts || websocketHosts.includes(host)) &&
			marketHostToMessage[host].data.ticker.toUpperCase() === ticker.toUpperCase() &&
			marketHostToMessage[host].data.price &&
			marketHostToMessage[host].connected
		)
			result[host] = marketHostToMessage[host];
	});

	return result;
};

exports.getAllMarketTickerStream = () => marketHostToMessage;

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

// const changeTickerSubscription = async (markets, tickers) => {
// 	marketsToConnect.forEach(market => {
// 		const tickerToUnsubscribe =
// 			market.com.api.websocket.availableTickersToMarketTickers[
// 				currentTickerSubscription.toUpperCase()
// 			];
// 		if (tickerToUnsubscribe) {
// 			const unsubscribeRequest = market.com.api.websocket.unsubscribeTickerRequest
// 				.replace('${ticker}', tickerToUnsubscribe)
// 				.replace('${channelId}', marketHostToSubscriptionId[market.com.api.websocket.host]);
// 			console.log(`UNSUBSCRIBING ${market.com.api.websocket.host}: ${unsubscribeRequest}`);
// 			const connection = webSocketConnections[market.com.api.websocket.host];
// 			if (connection) connection.sendUTF(unsubscribeRequest);
// 		}
// 		market.tickerRequest = tickers[0];
// 		subscribe(market);
// 	});
// };

const addTickerSubscription = async tickers => {
	marketsToConnect.forEach(market => {
		tickers.forEach(ticker => {
			market.tickerRequest = ticker;
			if (
				market.com.api.websocket.pathToSubscriptionId &&
				market.com.api.websocket.pathToSubscriptionId.length > 0
			) {
				if (!marketToSyncSubscription[market.com.api.websocket.host]) {
					marketToSyncSubscription[market.com.api.websocket.host] = {};
					marketToSyncSubscription[market.com.api.websocket.host].tickers = [];
				}
				marketToSyncSubscription[market.com.api.websocket.host].tickers.push(ticker);
			} else {
				market.tickerRequest = ticker;
				subscribe(market);
			}
		});
		if (
			market.com.api.websocket.pathToSubscriptionId &&
			market.com.api.websocket.pathToSubscriptionId.length > 0
		) {
			market.tickerRequest =
				marketToSyncSubscription[market.com.api.websocket.host].tickers.pop();
			subscribe(market);
		}
	});

	// tickers.forEach(ticker => {
	// 	marketsToConnect.forEach(market => {
	// 		market.tickerRequest = ticker;
	// 		subscribe(market);
	// 	});
	// });
};

exports.connectAndSend = async (markets, tickers) => {
	marketsToConnect = markets;
	await addTickerSubscription(tickers);

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
