// const webSocketClientService = require('./service/webSocketClientService')
const webSocketServerService = require('./service/webSocketServerService');

let refreshIntervalId = null;

function originIsAllowed(origin) {
	// put logic here to detect whether the specified origin is allowed.
	return true;
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
		// Make sure we only accept requests from an allowed origin
		request.reject();
		console.log(`${new Date()} Connection from origin ${request.origin} rejected.`);
		return;
	}

	const connection = request.accept(null, request.origin);
	connection.sendUTF(`Hello ${request.origin}`);

	console.log(`${new Date()} ${request.origin} Connection accepted.`);

	connection.on('message', async message => {
		if (message.type === 'utf8') {
			console.log(`Received Message: ${message.utf8Data}`);

			const result = validateRequest(message.utf8Data);
			if (result.isValid) {
				if (result.jsonData.channel === 'prices') {
					// await webSocketClientService.openAndSend({
					//     tickers: [result.jsonData.ticker],
					//     markets: result.jsonData.markets
					// })
					refreshIntervalId = setInterval(async () => {
						const marketPricesDto = await webSocketServerService.streamMarketPrices(
							result.jsonData.markets,
							result.jsonData.ticker
						);
						connection.sendUTF(JSON.stringify(marketPricesDto));
					}, 2000);
				}

				if (result.jsonData.channel === 'arbitrages') {
					// await webSocketClientService.openAndSend({
					//     tickers: [result.jsonData.ticker],
					//     markets: result.jsonData.markets
					// })
					refreshIntervalId = setInterval(async () => {
						const arbitrages = await webSocketServerService.streamArbitrages(
							result.jsonData.markets,
							result.jsonData.ticker
						);
						connection.sendUTF(JSON.stringify(arbitrages));
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
		clearInterval(refreshIntervalId);
		// webSocketClientService.close({allMarkets: true})
		console.log(
			` Peer ${connection.remoteAddress} disconnected. reasonCode: ${reasonCode} ${description}`
		);
	});
};
