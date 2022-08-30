// const webSocketClientService = require('./service/webSocketClientService')
const webSocketServerService = require('./service/webSocketServerService');

let refreshIntervalId = null;

const originToConnection = {};

function originIsAllowed(origin) {
	// put logic here to detect whether the specified origin is allowed.
	let isAllowed = true;
	// if (requests[origin]) {
	// 	console.log(`${origin} is already connected. Rejecting...`);
	// 	isAllowed = false;
	// }
	return isAllowed;
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
	// if (originToConnection[request.origin]) connection = originToConnection[request.origin];
	// else {
	// 	connection = request.accept(null, request.origin);
	// 	originToConnection[request.origin] = connection;
	// }

	connection.sendUTF(JSON.stringify({ response: `Hello ${request.origin}` }));

	console.log(`${new Date()} ${request.origin} Connection accepted.`);

	connection.on('message', async message => {
		clearInterval(refreshIntervalId);
		if (message.type === 'utf8') {
			console.log(`Received Message: ${message.utf8Data}`);

			const result = validateRequest(message.utf8Data);
			if (result.isValid) {
				if (result.jsonData.channel === 'prices' || result.jsonData.channel === 'all') {
					refreshIntervalId = setInterval(async () => {
						const marketPricesDto = await webSocketServerService.streamMarketPrices(
							result.jsonData.markets,
							result.jsonData.ticker
						);
						const resonse = {
							channel: 'prices',
							marketPrices: marketPricesDto,
						};
						connection.sendUTF(JSON.stringify(resonse));
					}, 1000);
				}

				if (result.jsonData.channel === 'arbitrages' || result.jsonData.channel === 'all') {
					refreshIntervalId = setInterval(async () => {
						const response = await webSocketServerService.streamArbitrages(
							result.jsonData.markets,
							result.jsonData.ticker
						);
						if (!response.arbitrage) {
							response.arbitrage =
								'No possible arbitrage for selected markets and ticker';
							clearInterval(refreshIntervalId);
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
		clearInterval(refreshIntervalId);
		console.log(
			` Peer ${connection.remoteAddress} disconnected. reasonCode: ${reasonCode} ${description}`
		);
	});
};
