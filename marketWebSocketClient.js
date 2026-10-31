const WebSocketClient = require('websocket').client;
const marketsDBmanager = require('./marketsDBmanager');
const marketApiResponseHandler = require('./marketApiResponseHandler');
const dtoConverter = require('./dtoConverter');
const logHelper = require('./logHelper');
const marketHelper = require('./marketHelper');
const logger = require('./logger');

const RECONNECT_DELAY_IN_MS = 30000;
const HOST_PLACEHOLDER = '$'.concat('{host}');
const TICKER_PLACEHOLDER = '$'.concat('{ticker}');
const webSocketClients = {};
const connectionToPingInterval = new WeakMap();
const webSocketConnections = {};
const marketHostToMessage = {};
const marketHostToSubscriptionId = {};
const reconnectTimeouts = {};
const marketConnectionRequested = {};
let marketsToConnect = null;
const marketToSyncSubscription = {};
let connectMarket;

const sendPing = connection => {
	const market = marketsDBmanager.getMarketByWebsocketHost(connection.socket.servername);
	console.log(
		'connection.socket.servername: ',
		JSON.stringify(connection.socket.servername, null, 4)
	);
	console.log('sending ping to: ', JSON.stringify(market.name, null, 4));
	const { pingFrequencyInSeconds } = market.com.api.websocket;
	if (pingFrequencyInSeconds) {
		connectionToPingInterval.set(
			connection,
			setInterval(() => {
				if (connection.connected) connection.sendUTF('ping');
				else clearInterval(connectionToPingInterval.get(connection));
			}, (pingFrequencyInSeconds - 1) * 1000)
		);
	}
};

const sendWsMessage = (connection, sendFunction, payload) => {
	const sendWsFunction = !sendFunction ? 'sendUTF' : sendFunction;
	const message = sendWsFunction === 'sendUTF' ? payload : Buffer.from(payload, 'utf8');
	connection[sendWsFunction](message);
};

const subscribe = async market => {
	let tickerToSubscribe = null;
	const ticker = market.tickerRequest.toUpperCase();
	const availableTicker = market.com.api.websocket.tickers.filter(t => t === ticker)[0];

	if (availableTicker) {
		tickerToSubscribe = marketHelper.getMarketPairCurrency(market, 'websocket', ticker);
	}

	if (tickerToSubscribe) {
		const tickerRequest = market.com.api.websocket.tickerRequest.replace(
			TICKER_PLACEHOLDER,
			tickerToSubscribe
		);
		const connection = webSocketConnections[market.com.api.websocket.host];
		if (connection && connection.connected) {
			console.log(
				`SUBSCRIBING ${market.com.api.websocket.url.replace(
					HOST_PLACEHOLDER,
					market.com.api.websocket.host
				)}: ${tickerRequest}`
			);
			sendWsMessage(connection, market.com.api.websocket.sendFunction, tickerRequest);
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

const getPrice = (market, messageResponse, appTicker) =>
	marketApiResponseHandler.extractNumberFromTarget(
		market.com.api.websocket.pathToPrice,
		messageResponse,
		{
			marketTickerName: marketHelper.getMarketPairCurrency(
				market,
				'websocket',
				appTicker || market.tickerRequest.toUpperCase()
			),
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
	// if (!appTicker) console.log('appTicker not found:', market.name, messageResponse);
	return appTicker;
};

const putMessage = (connection, rawMessage, parsedMessage, market) => {
	const appTicker = getAppTicker(market, parsedMessage);
	const price = getPrice(market, parsedMessage, appTicker);
	const subscriptionId = getSubscriptionId(market, parsedMessage);

	if (price && marketHelper.isAvailablePairCurrencyByMarket(parsedMessage, market)) {
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

const clearReconnectTimeout = host => {
	if (reconnectTimeouts[host]) {
		clearTimeout(reconnectTimeouts[host]);
		delete reconnectTimeouts[host];
	}
};

const scheduleReconnect = market => {
	const { host } = market.com.api.websocket;
	if (!marketConnectionRequested[host] || reconnectTimeouts[host]) return;

	reconnectTimeouts[host] = setTimeout(() => {
		delete reconnectTimeouts[host];
		connectMarket(market);
	}, RECONNECT_DELAY_IN_MS);
};

const handleConnection = (connection, market) => {
	sendPing(connection);
	console.log(`Connection OK: ${connection.socket.servername}`);

	connection.on('error', error => {
		if (marketHostToMessage[connection.socket.servername]) {
			marketHostToMessage[connection.socket.servername].connected = connection.connected;
			if (marketHostToMessage[connection.socket.servername].data)
				marketHostToMessage[connection.socket.servername].data.price = null;
		}
		console.log(`Connection Error: ${connection.socket.servername} - ${JSON.stringify(error)}`);
	});

	connection.on('close', () => {
		Object.assign(market, { connected: false });
		clearInterval(connectionToPingInterval.get(connection));
		connectionToPingInterval.delete(connection);
		if (marketHostToMessage[connection.socket.servername]) {
			marketHostToMessage[connection.socket.servername].connected = connection.connected;
			marketHostToMessage[connection.socket.servername].data.price = null;
			marketHostToMessage[connection.socket.servername].data.tickerPrices = null;
		}
		console.log(
			'Connection Closed:',
			connection.socket.servername,
			'. closeDescription:',
			connection.closeDescription,
			'. closeReasonCode:',
			connection.closeReasonCode
		);
		scheduleReconnect(market);
	});

	connection.on('message', async message => {
		if (message.type === 'utf8' || message.type === 'binary') {
			let parsedMessage = null;

			if (message.type === 'utf8') {
				parsedMessage = JSON.parse(message.utf8Data);
			}

			if (message.type === 'binary') {
				const buffer = Buffer.from(message.binaryData);
				parsedMessage = JSON.parse(buffer.toString());
			}

			const foundMmarket = marketsDBmanager.getMarketByWebsocketHost(
				connection.socket.servername
			);

			logger.logDataByHost(connection.socket.servername, parsedMessage);

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

	subscribe(market);
};

connectMarket = market => {
	const { host } = market.com.api.websocket;
	const currentConnection = webSocketConnections[host];
	if (
		currentConnection &&
		(currentConnection.connected || currentConnection.state === 'connecting')
	)
		return false;

	clearReconnectTimeout(host);
	marketConnectionRequested[host] = true;
	webSocketConnections[host] = {
		connected: false,
		closeDescription: 'connecting',
		state: 'connecting',
	};

	const marketClient = new WebSocketClient();
	webSocketClients[host] = marketClient;

	const handleConnectFailed = error => {
		console.log(`connectFailed for: ${host} ${error.toString()}`);
		Object.assign(market, { connected: false });
		if (webSocketClients[host] === marketClient) delete webSocketClients[host];
		webSocketConnections[host] = {
			connected: false,
			closeDescription: error.toString(),
			state: 'closed',
		};
		scheduleReconnect(market);
	};

	marketClient.on('connectFailed', handleConnectFailed);
	marketClient.on('connect', connection => {
		if (webSocketClients[host] === marketClient) delete webSocketClients[host];
		webSocketConnections[host] = connection;
		Object.assign(market, { connected: true });
		handleConnection(connection, market);
	});

	const url = market.com.api.websocket.url.replace(HOST_PLACEHOLDER, host);
	console.log(`connecting to: ${market.name} with url: ${url}`);
	try {
		marketClient.connect(url);
	} catch (error) {
		handleConnectFailed(error);
	}
	return true;
};

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

const stopMarketConnection = host => {
	marketConnectionRequested[host] = false;
	clearReconnectTimeout(host);
	if (webSocketClients[host]) {
		webSocketClients[host].abort();
		delete webSocketClients[host];
	}
};

// const changeTickerSubscription = async (markets, tickers) => {
// 	marketsToConnect.forEach(market => {
// 		const tickerToUnsubscribe =
// 			market.com.api.websocket.availableTickersToMarketTickers[
// 				currentTickerSubscription.toUpperCase()
// 			];
// 		if (tickerToUnsubscribe) {
// 			const unsubscribeRequest = market.com.api.websocket.unsubscribeTickerRequest
// 				.replace(TICKER_PLACEHOLDER, tickerToUnsubscribe)
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
			Object.assign(market, { tickerRequest: ticker });
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
				subscribe(market);
			}
		});
		if (
			market.com.api.websocket.pathToSubscriptionId &&
			market.com.api.websocket.pathToSubscriptionId.length > 0
		) {
			Object.assign(market, {
				tickerRequest:
					marketToSyncSubscription[market.com.api.websocket.host].tickers.pop(),
			});
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

	marketsToConnect.forEach(market => {
		Object.assign(market, { connected: false, tickerRequest: tickers[0] });
	});

	markets.forEach(market => connectMarket(market));

	return Object.keys(webSocketConnections).length > 0
		? dtoConverter.toConnectionsDto(webSocketConnections)
		: 'connecting';
};

exports.close = async websocketsActions => {
	if (websocketsActions.allMarkets) {
		Object.keys(webSocketConnections).forEach(host => {
			stopMarketConnection(host);
			if (webSocketConnections[host] && webSocketConnections[host].connected)
				webSocketConnections[host].close();
		});
	}
	return dtoConverter.toConnectionsDto(webSocketConnections);
};
