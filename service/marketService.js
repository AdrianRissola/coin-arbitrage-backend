const marketsDBmanager = require('../marketsDBmanager');
const marketRestClient = require('../marketRestClient');
const dtoConverter = require('../dtoConverter');
const Market = require('../model/Market');

const getAllMarkets = async () => dtoConverter.toMarketsDto(marketsDBmanager.getAllMarkets());

const getTickerByMarket = async (marketName, ticker) => {
	const market = marketsDBmanager.getMarketByName(marketName);
	const marketTickerName = marketsDBmanager.getMarketTickerName(marketName, ticker);
	const result = await marketRestClient.getTickerByMarket(market, marketTickerName);
	console.log('getTickerByMarket: ', result.data);
	return result.data;
};

const getAllMarketTickers = async ticker => {
	const markets = marketsDBmanager.getAllMarkets();
	let responses = [];
	markets.forEach(market => {
		const marketTickerName = marketsDBmanager.getMarketTickerName(market.name, ticker);
		const marketTickerResponse = marketRestClient.getTickerByMarket(market, marketTickerName);
		responses.push(marketTickerResponse);
	});
	responses = await Promise.all(responses);
	console.log('getAllMarketTickers: ', responses);

	const marketToTicker = {};
	responses.forEach(response => {
		marketToTicker[response.marketName] = response.data;
	});

	return marketToTicker;
};

const getAllPricesByTicker = async ticker => {
	const markets = marketsDBmanager.getAllMarketsByTicker(ticker);
	let marketPrices = [];
	markets.forEach(market => {
		const marketPrice = marketRestClient.getMarketPrice(
			market,
			market.availableTickersToMarketTickers[ticker.toUpperCase()]
		);
		marketPrices.push(marketPrice);
	});

	marketPrices = await Promise.all(marketPrices);

	console.log('getAllPricesByTicker: ', marketPrices);
	return marketPrices.sort((e1, e2) => e1.price - e2.price);
};

const saveNewMarket = async newMarket => {
	const marketTickerNames = newMarket.availableTickersToMarketTickers;

	const marketPrices = [];
	Object.keys(marketTickerNames).forEach(ticker => {
		marketPrices.push(
			marketPrices.push(marketRestClient.getMarketPrice(newMarket, marketTickerNames[ticker]))
		);
	});
	await Promise.all(marketPrices);

	const market = new Market(newMarket);
	return market
		.save()
		.then(result => {
			marketsDBmanager.loadMarketsFromDB();
			console.log('saved: ', result);
			return result;
		})
		.catch(err => {
			console.error(err);
		});
};

const getMarketPrices = async (marketNames, ticker) => {
	let markets = null;
	if (!marketNames) markets = marketsDBmanager.getAllMarkets('rest');
	else markets = await marketsDBmanager.getMarketsByNames(marketNames, 'rest');

	let marketPrices = [];

	markets.forEach(market => {
		const marketPrice = marketRestClient.getMarketPrice(
			market,
			market.availableTickersToMarketTickers[ticker.toUpperCase()]
		);
		if (marketPrice) marketPrices.push(marketPrice);
	});

	marketPrices = await Promise.all(marketPrices);
	marketPrices = marketPrices.filter(marketPrice => !!marketPrice);

	return marketPrices;
};

const getAllAvailableTickersByApi = api => marketsDBmanager.getAllAvailableTickersByApi(api);

module.exports = {
	getAllMarkets,
	getTickerByMarket,
	getAllPricesByTicker,
	saveNewMarket,
	getAllMarketTickers,
	getMarketPrices,
	getAllAvailableTickersByApi,
};
