const marketsDBmanager = require('../marketsDBmanager');
const marketWebSocketClient = require('../marketWebSocketClient2');

exports.openAndSend = async websocketsActions => {
	const marketsWithWebsockets = marketsDBmanager.getMarketsWithWebsocket(
		websocketsActions.tickers[0],
		websocketsActions.markets
	);

	const webSocketConnections = await marketWebSocketClient.connectAndSend(
		marketsWithWebsockets,
		websocketsActions.tickers[0]
	);

	return webSocketConnections;
};

exports.close = async websocketsActions => {
	const webSocketConnections = await marketWebSocketClient.close(websocketsActions);
	return webSocketConnections;
};

exports.getStatus = () => marketWebSocketClient.getWebSocketConnections();
