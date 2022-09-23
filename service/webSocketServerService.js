const marketWebSocketClient = require('../marketWebSocketClient');
const dtoConverter = require('../dtoConverter');
const arbitrageService = require('./arbitrageService');

exports.streamAllMarketPrices = async ticker => {
	const marketTickersStream = marketWebSocketClient.getAllMarketTickerStream();
	const marketPricesStreamDto = dtoConverter.toMarketPricesStreamDto(marketTickersStream, ticker);
	const tickerToMarketPrices = {};
	tickerToMarketPrices[ticker.toUpperCase()] = marketPricesStreamDto;
	return tickerToMarketPrices;
};

const formatResponse = (arbitrages, ticker) => {
	const ticketToArbitrages = {};
	const arbitragesMap = {};
	arbitrages.forEach(arbit => {
		const marketName1 = arbit.transactions[0].market;
		const marketName2 = arbit.transactions[1].market;
		const marketNames =
			marketName1 < marketName2 ? [marketName1, marketName2] : [marketName2, marketName1];
		arbitragesMap[`${marketNames[0]}-${marketNames[1]}`] = arbit;
	});
	ticketToArbitrages[ticker.toUpperCase()] = arbitragesMap;
	return ticketToArbitrages;
};

const priceComparator = (priceA, priceB) => priceA <= priceB;

exports.getMarketStatus = async () => {
	const websocketConnections = marketWebSocketClient.getWebSocketConnections();
	const connectedMarkets = [];
	const disconnectedMarkets = [];
	Object.keys(websocketConnections).forEach(host => {
		if (websocketConnections[host].connected) connectedMarkets.push(host);
		else disconnectedMarkets.push(`${host} - ${websocketConnections[host].closeDescription}`);
	});
	return { connectedMarkets, disconnectedMarkets };
};

const getAllArbitrages = async ticker => {
	const allMarketTickersStream = marketWebSocketClient.getAllMarketTickerStream();
	const marketPrices = [];
	let arbitrages = null;
	if (allMarketTickersStream) {
		Object.keys(allMarketTickersStream).forEach(host => {
			if (allMarketTickersStream[host].connected) {
				const price = allMarketTickersStream[host].data.tickerPrices[ticker.toUpperCase()];
				marketPrices.push({
					platform: allMarketTickersStream[host].data.market.name,
					price,
					ticker: ticker.toUpperCase(),
				});
			}
		});
		arbitrages = arbitrageService.calculateArbitrages(
			marketPrices,
			null,
			null,
			formatResponse,
			priceComparator
		);
	}
	return arbitrages;
};

exports.getArbitrageChannelInfo = async ticker => {
	const arbitrages = getAllArbitrages(ticker);
	const marketStatus = this.getMarketStatus();
	const result = await Promise.all([arbitrages, marketStatus]);
	const arbitrageChannelInfo = {
		arbitrages: result[0],
		marketStatus: result[1],
	};
	arbitrageChannelInfo.channel = 'arbitrages';
	if (!arbitrages) arbitrageChannelInfo.message = 'Arbitrage service is not available';
	return arbitrageChannelInfo;
};
