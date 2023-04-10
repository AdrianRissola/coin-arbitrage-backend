const marketsDBmanager = require('../marketsDBmanager');
const marketWebSocketClient = require('../marketWebSocketClient');

exports.openAndSend = async websocketsActions => {
	const marketsWithWebsockets = marketsDBmanager.getMarketsWithWebsocket(
		websocketsActions.tickers,
		websocketsActions.markets
	);
	console.log(
		marketsWithWebsockets.markets
			? `Available markets with WebSockets for ${
					websocketsActions.tickers
			  }: ${marketsWithWebsockets?.map(m => m.name)}`
			: `There are no available markets with WebSockets for: ${websocketsActions.tickers}`
	);

	let webSocketConnections = null;
	if (marketsWithWebsockets)
		webSocketConnections = await marketWebSocketClient.connectAndSend(
			marketsWithWebsockets,
			websocketsActions.tickers
		);

	return webSocketConnections;
};

exports.close = async websocketsActions => {
	const webSocketConnections = await marketWebSocketClient.close(websocketsActions);
	return webSocketConnections;
};

exports.getStatus = () => marketWebSocketClient.getWebSocketConnections();
