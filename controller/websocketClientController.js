const marketWebSocketService = require('../service/webSocketClientService');

exports.connectWebsocketClient = async (request, response) => {
	const websocketsActions = request.body;
	let webSocketConnections;

	if (websocketsActions.action === 'open')
		webSocketConnections = await marketWebSocketService.openAndSend(websocketsActions);

	if (websocketsActions.action === 'close')
		webSocketConnections = await marketWebSocketService.close(websocketsActions);

	return response.json(webSocketConnections);
};

exports.getWebsocketClientStatus = async (request, response) =>
	response.json(marketWebSocketService.getStatus());
