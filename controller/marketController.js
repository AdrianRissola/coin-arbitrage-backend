const marketService = require('../service/marketService');
const marketsDBmanager = require('../marketsDBmanager');
const errorHelper = require('../errorHelper');
const availableTickers = require('../availableTickers');

exports.getAllTickers = (request, response) => {
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

// exports.getAllMarketTickers = (request, response, next) => {
// 	console.log('request.params.market: ', request.params.market);
// 	console.log('request.params.ticker: ', request.params.ticker);

// 	if (isValidMarketAndTicker(request.params.market, request.params.ticker, next)) {
// 		marketService
// 			.getTickerByMarket(request.params.market, request.params.ticker.toUpperCase())
// 			.then(result => {
// 				console.log('ticker: ', result);
// 				response.json(result);
// 			})
// 			.catch(error => {
// 				next(error);
// 			});
// 	}
// };

const isValidMarketRequest = market =>
	!!market &&
	// !!marketTickers &&
	// !!marketTickers.length > 0 &&
	// !!isValidTicker &&
	!!market.name &&
	!!market.availableTickersToMarketTickers &&
	!!market.com &&
	!!market.com.api &&
	!!market.com.api.rest &&
	!!market.com.api.rest.base &&
	!!market.com.api.rest.base.startsWith('https://') &&
	!!market.com.api.rest.tickerPath &&
	!!market.com.api.rest.pathToPrice &&
	!!market.com.api.rest.pathToPrice.length > 0;

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
