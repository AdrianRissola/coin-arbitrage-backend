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

	// for (const key in marketTickersStream) {
	// 	if (marketTickersStream[key].connected)
	// 		marketPrices.push({
	// 			platform: marketTickersStream[key].data.market.name,
	// 			price: marketTickersStream[key].data.price,
	// 			ticker: marketTickersStream[key].data.market.tickerRequest,
	// 		});
	// }
	const arbitrages = arbitrageService.calculateArbitrages(marketPrices, null, 1);
	return arbitrages;
};
