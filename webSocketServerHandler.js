const webSocketServerService = require('./service/webSocketServerService');
const webSocketClientService = require('./service/webSocketClientService');
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

	if (
		!jsonData ||
		typeof jsonData !== 'object' ||
		Array.isArray(jsonData) ||
		typeof jsonData.channel !== 'string' ||
		!jsonData.channel.trim() ||
		((jsonData.channel !== 'Markets' || jsonData.ticker !== undefined) &&
			(typeof jsonData.ticker !== 'string' || !jsonData.ticker.trim()))
	) {
		result.isValid = false;
		result.errorMessages.push('invalid request: channel and ticker fields are mandatory');
	}

	return result;
};

const openAndConnected = connection => connection.state === 'open' && connection.connected;
const clearIntervals = connection => {
	['arbitrageIntervalId', 'priceIntervalId', 'historicalIntervalId', 'marketsIntervalId'].forEach(
		field => {
			clearInterval(connection[field]);
			Object.assign(connection, { [field]: null });
		}
	);
};

let id = 0;
const connectionIdToSubscription = {};
exports.onRequest = (wsServer, request) => {
	if (!originIsAllowed(request.origin)) {
		request.reject();
		console.log(`${new Date()} Connection from origin ${request.origin} rejected.`);
		return;
	}

	const connection = request.accept(null, request.origin);
	let subscriptionVersion = 0;
	connection.id = id;
	connectionIdToSubscription[connection.id] = null;
	id += 1;

	connection.sendUTF(
		JSON.stringify({
			response: `${request.origin} welcome to real-time monitor`,
		})
	);

	console.log(`${new Date()} ${request.origin} Connection accepted.`);

	connection.on('message', async message => {
		if (message.type === 'utf8' && openAndConnected(connection)) {
			console.log(
				`Received Message: ${message.utf8Data} from remote: ${connection.socket.remoteAddress} ${connection.socket.remoteFamily} ${connection.socket.remotePort}`
			);

			const validatedRequest = validateRequest(message.utf8Data);
			if (validatedRequest.isValid) {
				const subscription = `${validatedRequest.jsonData.channel}:${validatedRequest.jsonData.ticker}`;
				subscriptionVersion += 1;
				const version = subscriptionVersion;
				if (connectionIdToSubscription[connection.id]) {
					console.log(
						`clearing intervals for current: ${
							connectionIdToSubscription[connection.id]
						}`,
						`received: ${subscription}`
					);
				}
				clearIntervals(connection);
				connectionIdToSubscription[connection.id] = subscription;
				if (validatedRequest.jsonData.ticker) {
					const tickers =
						validatedRequest.jsonData.ticker.toUpperCase() === 'ALL'
							? marketsDBmanager
									.getAllAvailableTickers()
									.map(pairCurrecy => pairCurrecy.name)
							: [validatedRequest.jsonData.ticker];
					console.log('openAndSend', validatedRequest.jsonData.ticker, tickers);
					await webSocketClientService.openAndSend({
						tickers,
					});
				}
				const isCurrent = () =>
					version === subscriptionVersion && openAndConnected(connection);
				if (!isCurrent()) return;
				const { channel, ticker } = validatedRequest.jsonData;
				if (['arbitrage', 'bestArbitrage', 'Markets'].includes(channel)) {
					const intervalField =
						channel === 'Markets' ? 'marketsIntervalId' : 'arbitrageIntervalId';
					connection[intervalField] = setInterval(async () => {
						if (!isCurrent()) {
							if (version === subscriptionVersion) clearIntervals(connection);
							return;
						}
						try {
							const response =
								channel === 'Markets'
									? {
											channel: 'markets',
											markets:
												await webSocketServerService.getMarketsChannelInfo(),
									  }
									: await webSocketServerService.getArbitrageChannelInfo(ticker);
							if (isCurrent()) connection.sendUTF(JSON.stringify(response));
						} catch (error) {
							console.log(`error in setInterval ${channel}: ${error}`);
							if (version === subscriptionVersion) clearIntervals(connection);
						}
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
		subscriptionVersion += 1;
		delete connectionIdToSubscription[connection.id];
		console.log(`connectionIdToSubscription: ${JSON.stringify(connectionIdToSubscription)}`);
		clearIntervals(connection);
	});
};
