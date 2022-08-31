const webSocketServerService = require('./service/webSocketServerService');

let refreshPriceMarketChannelIntervalId = null;
let refreshArbitrageChannelIntervalId = null;

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

exports.onRequest = request => {
	if (!originIsAllowed(request.origin)) {
		request.reject();
		console.log(`${new Date()} Connection from origin ${request.origin} rejected.`);
		return;
	}

	const connection = request.accept(null, request.origin);

	connection.sendUTF(JSON.stringify({ response: `Hello ${request.origin}` }));

	console.log(`${new Date()} ${request.origin} Connection accepted.`);

	connection.on('message', async message => {
		clearInterval(refreshPriceMarketChannelIntervalId);
		clearInterval(refreshArbitrageChannelIntervalId);
		if (message.type === 'utf8') {
			console.log(`Received Message: ${message.utf8Data}`);

			const result = validateRequest(message.utf8Data);
			if (result.isValid) {
				if (result.jsonData.channel === 'prices' || result.jsonData.channel === 'all') {
					refreshPriceMarketChannelIntervalId = setInterval(async () => {
						const marketPricesDto = await webSocketServerService.streamMarketPrices(
							result.jsonData.markets,
							result.jsonData.ticker
						);
						const response = {
							channel: 'prices',
							marketPrices: marketPricesDto,
						};
						if (!response.marketPrices || response.marketPrices.length === 0) {
							response.message = 'Market price service is not available';
							clearInterval(refreshPriceMarketChannelIntervalId);
						}
						connection.sendUTF(JSON.stringify(response));
					}, 1000);
				}

				if (result.jsonData.channel === 'arbitrages' || result.jsonData.channel === 'all') {
					refreshArbitrageChannelIntervalId = setInterval(async () => {
						const response = await webSocketServerService.streamArbitrages(
							result.jsonData.markets,
							result.jsonData.ticker
						);
						if (!response.arbitrage) {
							response.message = 'Arbitrage service is not available';
							clearInterval(refreshArbitrageChannelIntervalId);
						}
						response.channel = 'arbitrages';
						connection.sendUTF(JSON.stringify(response));
					}, 1000);
				}
			} else {
				connection.sendUTF(JSON.stringify(result.errorMessages));
			}
		} else if (message.type === 'binary') {
			console.log(`Received Binary Message of ${message.binaryData.length} bytes`);
			// connection.sendBytes(message.binaryData);
		}
	});

	connection.on('close', (reasonCode, description) => {
		clearInterval(refreshPriceMarketChannelIntervalId);
		clearInterval(refreshArbitrageChannelIntervalId);
		console.log(
			` Peer ${connection.remoteAddress} disconnected. reasonCode: ${reasonCode} ${description}`
		);
	});
};
