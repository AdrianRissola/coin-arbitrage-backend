const marketWebSocketClient = require('../marketWebSocketClient');
const dtoConverter = require('../dtoConverter');
const arbitrageService = require('./arbitrageService');
const marketsDBmanager = require('../marketsDBmanager');
const Arbitrage = require('../model/Arbitrage');

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

const getAllArbitrages = async filters => {
	const allMarketTickersStream = marketWebSocketClient.getAllMarketTickerStream();
	const marketPrices = [];
	let arbitrages = null;
	if (allMarketTickersStream) {
		Object.keys(allMarketTickersStream).forEach(host => {
			if (allMarketTickersStream[host].connected) {
				const price =
					allMarketTickersStream[host].data.tickerPrices[filters.ticker.toUpperCase()];
				if (price)
					marketPrices.push({
						platform: allMarketTickersStream[host].data.market.name,
						price,
						ticker: filters.ticker.toUpperCase(),
					});
			}
		});
		arbitrages = arbitrageService.calculateArbitrages(
			marketPrices,
			null,
			filters.top,
			filters.formatResponse,
			priceComparator
		);
	}
	return arbitrages;
};

const save = async arbitrage => {
	const maxProfitArbitrage = (await Arbitrage.find().sort({ profitPercentage: -1 }).limit(1))[0];
	if (!maxProfitArbitrage || maxProfitArbitrage.profitPercentage < arbitrage.profitPercentage) {
		const newArbitrage = new Arbitrage(arbitrage);
		newArbitrage
			.save()
			.then(arbit => {
				console.log('new arbitrage saved:', arbit);
			})
			.catch(err => {
				console.error(err);
			});
	}

	// await Arbitrage.find({}).then(result => {
	// 	if (!result.length || result.profitPercentage > arbitrage.profitPercentage) {
	// 		const newArbitrage = new Arbitrage(arbitrage);
	// 		newArbitrage
	// 			.save()
	// 			.then(arbit => {
	// 				console.log('new arbitrage saved:', arbit);
	// 			})
	// 			.catch(err => {
	// 				console.error(err);
	// 			});
	// 	}
	// });
};

exports.getArbitrageChannelInfo = async ticker => {
	const arbitrageChannelInfo = {};
	let arbitrages = null;
	let arbitragesList = [];
	if (ticker.toUpperCase() !== 'ALL') {
		arbitrages = getAllArbitrages({ ticker, formatResponse });
		arbitrageChannelInfo.ticker = ticker;
	} else {
		arbitrageChannelInfo.ticker = 'ALL';
		const availableTickers = marketsDBmanager.getAllAvailableTickersByApi('websocket');
		availableTickers.forEach(availableTicker => {
			arbitragesList.push(getAllArbitrages({ ticker: availableTicker.name, top: 1 }));
		});
		arbitragesList = await Promise.all(arbitragesList);
		if (arbitragesList && arbitragesList.length > 0) {
			arbitrages = arbitragesList
				.filter(rbtrgs => rbtrgs)
				.reduce((max, arbits) =>
					max[0].profitPercentage > arbits[0].profitPercentage ? max : arbits
				);
			save(arbitrages[0]);
		}
	}
	const marketStatus = this.getMarketStatus();
	const result = await Promise.all([arbitrages, marketStatus]);
	arbitrageChannelInfo.arbitrages = result[0];
	arbitrageChannelInfo.marketStatus = result[1];
	arbitrageChannelInfo.channel = 'arbitrages';
	if (!arbitrages) arbitrageChannelInfo.message = 'Arbitrage service is not available';
	return arbitrageChannelInfo;
};
