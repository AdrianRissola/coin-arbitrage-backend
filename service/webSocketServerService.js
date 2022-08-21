const marketWebSocketClient = require('../marketWebSocketClient2');
const dtoConverter = require('../dtoConverter');
const arbitrageService = require('./arbitrageService');

exports.streamMarketPrices = async () => {
	const marketTickersStream = marketWebSocketClient.getMarketTickerStream();
	const marketPricesStreamDto = dtoConverter.toMarketPricesStreamDto(marketTickersStream);
	return marketPricesStreamDto;
};

exports.streamArbitrages = async (markets, ticker) => {
	const marketTickersStream = marketWebSocketClient.getMarketTickerStream(markets, ticker);
	const marketPrices = [];
	Object.keys(marketTickersStream).forEach(host => {
		if (marketTickersStream[host].connected)
			marketPrices.push({
				platform: marketTickersStream[host].data.market.name,
				price: marketTickersStream[host].data.price,
				ticker: marketTickersStream[host].data.market.tickerRequest,
			});
	});

	const websocketConnections = marketWebSocketClient.getWebSocketConnections();
	const connectedMarkets = [];
	const disconnectedMarkets = [];
	Object.keys(websocketConnections).forEach(host => {
		if (websocketConnections[host].connected) connectedMarkets.push(host);
		else disconnectedMarkets.push(host);
	});

	const arbitrage = arbitrageService.calculateArbitrages(marketPrices, null, 1);
	return { arbitrage, connectedMarkets, disconnectedMarkets };
};
