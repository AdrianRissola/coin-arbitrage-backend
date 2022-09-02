const marketWebSocketClient = require('../marketWebSocketClient2');
const dtoConverter = require('../dtoConverter');
const arbitrageService = require('./arbitrageService');

exports.streamMarketPrices = async (markets, ticker) => {
	const marketTickersStream = marketWebSocketClient.getMarketTickerStream(markets, ticker);
	const marketPricesStreamDto = dtoConverter.toMarketPricesStreamDto(marketTickersStream);
	const tickerToMarketPrices = {};
	tickerToMarketPrices[ticker.toUpperCase()] = marketPricesStreamDto;
	return tickerToMarketPrices;
};

exports.streamArbitrages = async (markets, ticker) => {
	const marketTickersStream = marketWebSocketClient.getMarketTickerStream(markets, ticker);
	const marketPrices = [];
	let arbitrages = null;
	if (marketTickersStream) {
		Object.keys(marketTickersStream).forEach(host => {
			if (marketTickersStream[host].connected)
				marketPrices.push({
					platform: marketTickersStream[host].data.market.name,
					price: marketTickersStream[host].data.price,
					ticker: marketTickersStream[host].data.market.tickerRequest,
				});
		});
		arbitrages = arbitrageService.calculateArbitrages(marketPrices, null, null, arbits => {
			const ticketToArbitrages = {};
			const arbitragesMap = {};
			arbits.forEach(arbit => {
				const marketName1 = arbit.transactions[0].market;
				const marketName2 = arbit.transactions[1].market;
				const marketNames =
					marketName1 < marketName2
						? [marketName1, marketName2]
						: [marketName2, marketName1];
				arbitragesMap[`${marketNames[0]}-${marketNames[1]}`] = arbit;
			});
			ticketToArbitrages[ticker.toUpperCase()] = arbitragesMap;
			return ticketToArbitrages;
		});
	}

	const websocketConnections = marketWebSocketClient.getWebSocketConnections();
	const connectedMarkets = [];
	const disconnectedMarkets = [];
	Object.keys(websocketConnections).forEach(host => {
		if (websocketConnections[host].connected) connectedMarkets.push(host);
		else disconnectedMarkets.push(`${host} - ${websocketConnections[host].closeDescription}`);
	});

	return { arbitrages, connectedMarkets, disconnectedMarkets };
};
