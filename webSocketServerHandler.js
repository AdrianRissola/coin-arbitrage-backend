const webSocketServerService = require('./service/webSocketServerService');
const webSocketClientService = require('./service/webSocketClientService');
const arbitrageService = require('./service/arbitrageService');
const marketsDBmanager = require('./marketsDBmanager');

const { env } = process;
const allowedOrigins =
	env.NODE_ENV !== 'production'
		? JSON.parse(env.LOCAL_ALLOWED_ORIGINS)
		: JSON.parse(env.PROD_ALLOWED_ORIGINS);

function originIsAllowed(origin) {
	return allowedOrigins.includes(origin);
}

const validateRequest = request => {
	const result = {
		jsonData: null,
		isValid: true,
		errorMessages: [],
	};

	let jsonData = null;
	try {
		jsonData = JSON.parse(request);
		result.jsonData = jsonData;
	} catch (error) {
		const errorMessage = `invalid json: ${error.message}`;
		console.log(errorMessage);
		result.isValid = false;
		result.errorMessages.push(errorMessage);
	}

	if (!jsonData || !jsonData.channel || !jsonData.ticker) {
		result.errorMessages.push('invalid request: channel and ticker fields are mandatory');
	}

	return result;
};

const openAndConnected = connection => connection.state === 'open' && connection.connected;

let id = 0;
const connectionIdToSubscription = {};
exports.onRequest = (wsServer, request) => {
	if (!originIsAllowed(request.origin)) {
		request.reject();
		console.log(`${new Date()} Connection from origin ${request.origin} rejected.`);
		return;
	}

	const connection = request.accept(null, request.origin);
	connection.id = id;
	connectionIdToSubscription[connection.id] = null;
	id += 1;

	connection.sendUTF(
		JSON.stringify({
			response: `${request.origin} welcome to real-time monitor`,
			availableTickers: marketsDBmanager.getAllAvailableTickersByApi('websocket'),
		})
	);

	console.log(`${new Date()} ${request.origin} Connection accepted.`);

	connection.on('message', async message => {
		if (message.type === 'utf8') {
			console.log(
				`Received Message: ${message.utf8Data} from remote: ${connection.socket.remoteAddress} ${connection.socket.remoteFamily} ${connection.socket.remotePort}`
			);

			const validatedRequest = validateRequest(message.utf8Data);
			if (validatedRequest.isValid) {
				if (validatedRequest.jsonData.ticker) {
					const tickers =
						validatedRequest.jsonData.ticker.toUpperCase() === 'ALL'
							? marketsDBmanager.getAllAvailableTickerNamesByApi('websocket')
							: [validatedRequest.jsonData.ticker];
					await webSocketClientService.openAndSend({
						tickers,
					});
				}
				let subscriptionChanged = false;
				const subscription = `${validatedRequest.jsonData.channel}:${validatedRequest.jsonData.ticker}`;
				if (
					connectionIdToSubscription[connection.id] &&
					connectionIdToSubscription[connection.id] !== subscription
				) {
					subscriptionChanged = true;
					console.log(
						`clearing intervals for current: ${
							connectionIdToSubscription[connection.id]
						}`,
						`received: ${subscription}`
					);
					clearInterval(connection.arbitrageIntervalId);
					clearInterval(connection.priceIntervalId);
					clearInterval(connection.historicalIntervalId);
					clearInterval(connection.marketsIntervalId);
				}

				connectionIdToSubscription[connection.id] = subscription;

				if (validatedRequest.jsonData.channel === 'arbitrage') {
					connection.arbitrageIntervalId = setInterval(async () => {
						console.log('arbitrageIntervalId: ', connection.arbitrageIntervalId);
						try {
							const arbitrageChannelInfo =
								await webSocketServerService.getArbitrageChannelInfo(
									validatedRequest.jsonData.ticker
								);
							if (subscriptionChanged) {
								console.log('subscriptionChanged: ', arbitrageChannelInfo.ticker);
								clearInterval(connection.arbitrageIntervalId);
								subscriptionChanged = false;
							}
							if (!openAndConnected(connection))
								clearInterval(connection.arbitrageIntervalId);
							console.log('send arbitrage: ', arbitrageChannelInfo.ticker);
							connection.sendUTF(JSON.stringify(arbitrageChannelInfo));
						} catch (error) {
							console.log(
								`error in setInterval ${validatedRequest.jsonData.channel}: ${error}`
							);
							clearInterval(connection.arbitrageIntervalId);
							console.log('interval clean');
						}
					}, 1000);
				}

				if (validatedRequest.jsonData.channel === 'Historical') {
					connection.historicalIntervalId = setInterval(async () => {
						const response = {};
						response.channel = 'Historical';
						response.ticker = 'all';
						response.arbitrages =
							await arbitrageService.getAllOrderByProfitPercentageDesc();
						connection.sendUTF(JSON.stringify(response));
					}, 1000);
				}

				if (validatedRequest.jsonData.channel === 'Markets') {
					connection.marketsIntervalId = setInterval(async () => {
						const response = {};
						response.channel = 'Markets';
						response.markets = await webSocketServerService.getMarketsChannelInfo();
						connection.sendUTF(JSON.stringify(response));
					}, 1000);
				}
			} else {
				connection.sendUTF(JSON.stringify(validatedRequest.errorMessages));
			}
		}
	});

	connection.on('close', (reasonCode, description) => {
		console.log(`connectionIdToSubscription: ${JSON.stringify(connectionIdToSubscription)}`);
		console.log(
			`Peer ${connection.remoteAddress} connection.id: ${connection.id} disconnected. reasonCode: ${reasonCode} ${description}`
		);
		delete connectionIdToSubscription[connection.id];
		console.log(`connectionIdToSubscription: ${JSON.stringify(connectionIdToSubscription)}`);
		clearInterval(connection.priceIntervalId);
		clearInterval(connection.arbitrageIntervalId);
	});
};
