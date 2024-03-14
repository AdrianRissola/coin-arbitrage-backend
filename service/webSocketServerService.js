const marketWebSocketClient = require('../marketWebSocketClient');
const dtoConverter = require('../dtoConverter');
const arbitrageService = require('./arbitrageService');
const marketsDBmanager = require('../marketsDBmanager');

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
			// if (
			// 	allMarketTickersStream[host].connected &&
			// 	filters.top === 1 &&
			// 	filters.ticker === 'BTC-TUSD'
			// )
			if (allMarketTickersStream[host].connected) {
				// console.log(
				// 	'filters.ticker.toUpperCase(): ',
				// 	host,
				// 	filters.ticker.toUpperCase(),
				// 	JSON.stringify(
				// 		allMarketTickersStream[host].data.tickerPrices[filters.ticker.toUpperCase()]
				// 	)
				// );
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

exports.getMarketsChannelInfo = async () => this.getMarketStatus();

const getArbitrageByTicker = async ticker => {
	const arbitrages = await getAllArbitrages({ ticker, formatResponse });
	if (arbitrages && Object.keys(arbitrages[ticker.toUpperCase()])[0]) {
		const tickerArbitrage = arbitrages[ticker.toUpperCase()];
		const bestTickerArbitrage = tickerArbitrage[Object.keys(tickerArbitrage)[0]];
		await arbitrageService.saveMaxProfitArbitrageByTicker(bestTickerArbitrage);
	}
	return arbitrages;
};

const getBestArbitrage = async () => {
	const availableTickers = marketsDBmanager.getAllAvailableTickers();
	//console.log('availableTickers: ', availableTickers);
	let arbitragesList = [];
	availableTickers.forEach(availableTicker => {
		arbitragesList.push(getAllArbitrages({ ticker: availableTicker.name, top: 1 }));
	});

	arbitragesList = await Promise.all(arbitragesList);

	arbitragesList = arbitragesList.filter(arbit => arbit).map(arbits => arbits[0]);
	let quoteCurrencyBestArbitrageList = null;
	if (arbitragesList && arbitragesList.length > 0) {
		const quoteCurrencies = marketsDBmanager.getAvailableCurrenciesByType('quote');
		//console.log('quoteCurrencies: ', quoteCurrencies);
		const tusd = arbitragesList.filter(a => a.transactions[0].pair.split('-')[1] === 'USDT');
		//console.log('tusdddd: ', JSON.stringify(tusd));
		quoteCurrencyBestArbitrageList = quoteCurrencies
			.map(qc => {
				return arbitragesList
					.filter(arbit => arbit.transactions[0].pair.split('-')[1] === qc.symbol)
					.reduce(
						(max, arbit) =>
							max.profitPercentage > arbit.profitPercentage ? max : arbit,
						0
					);
			})
			.filter(arbit => arbit != 0)
			.sort((arbit, arbit2) => arbit.transactions[0].pair < arbit2.transactions[0].pair);

		quoteCurrencyBestArbitrageList.forEach(arbit =>
			arbitrageService.saveMaxProfitArbitrageByTicker(arbit)
		);
	}
	return quoteCurrencyBestArbitrageList;
};

exports.getArbitrageChannelInfo = async ticker => {
	const arbitrageChannelInfo = {};
	const bestArbitrages = {};
	let arbitrages = null;
	let currentTicker = null;
	if (ticker.toUpperCase() !== 'ALL') {
		arbitrages = await getArbitrageByTicker(ticker);
		arbitrageChannelInfo.ticker = ticker;
		currentTicker = ticker;
		arbitrageChannelInfo.channel = 'arbitrage';
		arbitrageChannelInfo.marketPrices = await this.streamAllMarketPrices(currentTicker);
		arbitrageChannelInfo.arbitrages = arbitrages;
	} else {
		arbitrages = await getBestArbitrage();
		arbitrageChannelInfo.ticker = 'ALL';
		//currentTicker = arbitrages[0].transactions[0].pair;
		arbitrageChannelInfo.channel = 'bestArbitrage';

		let prices = [];
		let arbitragesData = [];
		arbitrages.forEach(bestArbits => {
			prices.push(this.streamAllMarketPrices(bestArbits.transactions[0].pair));
		});
		prices = await Promise.all(prices);
		arbitrages.forEach(bestArbit => {
			arbitragesData.push({
				arbitrage: bestArbit,
				marketPrices: prices.filter(price => price[bestArbit.transactions[0].pair])[0],
			});
		});

		bestArbitrages.arbitragesData = arbitragesData;
		arbitrageChannelInfo.bestArbitrages = bestArbitrages;
	}

	if (!arbitrages) arbitrageChannelInfo.message = `No arbitrage available for: ${ticker}`;
	return arbitrageChannelInfo;
};
