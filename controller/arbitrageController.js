const arbitrageService = require('../service/arbitrageService');
const marketService = require('../service/marketService');
const Arbitrage = require('../model/Arbitrage');
const errorHelper = require('../errorHelper');

const validateArbitrageRequest = (request, next) => {
	if (request.query.markets && request.query.markets.split(',').length < 2) {
		next(errorHelper.errors.BAD_REQUEST('more than one market is mandatory'));
		return false;
	}
	if (!request.query.ticker) {
		next(errorHelper.errors.BAD_REQUEST('ticker is mandatory'));
		return false;
	}
	return true;
};

exports.getArbitrages = async (request, response, next) => {
	if (validateArbitrageRequest(request, next)) {
		const markets = request.query.markets ? request.query.markets.split(',') : null;
		try {
			const marketPrices = await marketService.getMarketPrices(markets, request.query.ticker);
			const arbitrages = arbitrageService.calculateArbitrages(
				marketPrices,
				Number(request.query.minProfitPercentage),
				Number(request.query.top)
			);
			response.json(arbitrages);
		} catch (err) {
			console.error(err);
			next(err);
		}
	}
};

exports.getAllHistoricalArbitrages = async (request, response) => {
	const { tickers } = request.query;
	const result = await arbitrageService.getByTickerOrderByDateDesc(tickers);
	response.json(result);
};

exports.saveArbitrage = (request, response, next) => {
	if (!request.body) {
		return response.status(400).json({
			error: 'invalid request',
		});
	}
	const arbitrage = new Arbitrage(request.body);
	return arbitrage
		.save()
		.then(result => {
			console.log('saved: ', result);
			// loadMarketsFromDB()
			response.json(result);
		})
		.catch(err => {
			console.error(err);
			next(err);
		});
};
