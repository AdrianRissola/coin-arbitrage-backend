const marketService = require('../service/marketService');
const currencyService = require('../service/currencyService');
const marketsDBmanager = require('../marketsDBmanager');
const errorHelper = require('../errorHelper');

exports.getAllAvailableTickers = (request, response) => {
	response.json(marketsDBmanager.getAllAvailableTickers());
};

exports.getAllMarkets = (request, response) => {
	marketService
		.getAllMarkets()
		.then(markets => {
			console.log('markets: ', markets);
			response.json(markets);
		})
		.catch(err => {
			console.error(err);
		});
};

exports.getAllMarketTickers = (request, response) => {
	marketService
		.getAllMarketTickers(request.params.ticker)
		.then(marketTickers => {
			console.log('marketTickers: ', marketTickers);
			response.json(marketTickers);
		})
		.catch(err => {
			console.error(err);
		});
};

exports.getAllPricesByTicker = (request, response) => {
	console.log('request.params.ticker: ', request.params.ticker);
	marketService.getAllPricesByTicker(request.params.ticker).then(result => {
		console.log('getAllPricesByTicker: ', result);
		response.json(result);
	});
};

const isValidMarketAndTicker = (market, ticker, next) => {
	const marketFound = marketsDBmanager.getMarketByName(market);
	if (!marketFound) {
		next(errorHelper.errors.NOT_FOUND(`market ${market} not found`));
	}

	const marketTicker = marketFound.availableTickersToMarketTickers[ticker.toUpperCase()];
	if (!marketTicker) {
		next(errorHelper.errors.NOT_FOUND(`ticker ${ticker} not found`));
	}
	return marketFound && marketTicker;
};

exports.getTickerByMarket = (request, response, next) => {
	console.log('request.params.market: ', request.params.market);
	console.log('request.params.ticker: ', request.params.ticker);

	if (isValidMarketAndTicker(request.params.market, request.params.ticker, next)) {
		marketService
			.getTickerByMarket(request.params.market, request.params.ticker.toUpperCase())
			.then(result => {
				console.log('ticker: ', result);
				response.json(result);
			})
			.catch(error => {
				next(error);
			});
	}
};

const isValidMarketRequest = market => {
	const availableRestTickers = marketsDBmanager.getAllAvailableTickerNamesByApi('rest');
	const availableTickersToMarketTickers = Object.keys(market.availableTickersToMarketTickers);
	const tickerNotFound = availableTickersToMarketTickers.some(
		incomingTicker => !availableRestTickers.includes(incomingTicker)
	);
	return (
		market &&
		!tickerNotFound &&
		market.name &&
		market.availableTickersToMarketTickers &&
		Object.keys(market.availableTickersToMarketTickers).length > 0 &&
		market.com &&
		market.com.api &&
		market.com.api.rest &&
		market.com.api.rest.base &&
		market.com.api.rest.base.startsWith('https://') &&
		market.com.api.rest.tickerPath &&
		market.com.api.rest.pathToPrice &&
		market.com.api.rest.pathToPrice.length > 0
	);
};

exports.saveMarket = async (request, response, next) => {
	let result = null;
	const newMarket = request.body;
	if (!isValidMarketRequest(newMarket)) next(errorHelper.errors.BAD_REQUEST(`invalid request`));
	else {
		try {
			const savedMarket = await marketService.saveNewMarket(newMarket);
			result = response.json(savedMarket);
		} catch (error) {
			next(error);
		}
	}
	return result;
};

exports.saveCurrency = async (request, response, next) => {
	let result = null;
	const newCurrency = request.body;
	if (!isValidCurrency(newCurrency, next))
		next(errorHelper.errors.BAD_REQUEST('Currency is invalid'));
	else {
		try {
			const savedCurrency = await currencyService.saveCurrency(newCurrency);
			result = response.json(savedCurrency);
		} catch (error) {
			next(error);
		}
	}
	return result;
};

const isValidCurrency = (currency, next) => {
	let alreadyExists = false;
	if (marketsDBmanager.getAvailableCurrencies().some(ac => ac.symbol === currency.symbol)) {
		alreadyExists = true;
		next(
			errorHelper.errors.BAD_REQUEST('Currency symbol ' + currency.symbol + ' already exists')
		);
	}
	return (
		!alreadyExists &&
		currency.symbol.length >= 3 &&
		currency.symbol.length <= 5 &&
		currency.symbol.toUpperCase() !== currency.symbol.toLowerCase() &&
		currency.symbol === currency.symbol.toUpperCase() &&
		(currency.base || currency.quote) &&
		currency.name
	);
};
