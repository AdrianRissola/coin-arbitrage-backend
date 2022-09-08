const arbitrageService = require('../service/arbitrageService');
const marketService = require('../service/marketService');
const Arbitrage = require('../model/Arbitrage');
const errorHelper = require('../errorHelper');

const validateArbitrageRequest = (request, next) => {
	let isValid = true;
	if (request.query.markets) {
		const markets = request.query.markets.split(',');
		if (!!markets && markets.length < 2) {
			isValid = false;
			next(errorHelper.errors.BAD_REQUEST('more than one market is mandatory'));
		}
	}
	if (!request.query.ticker) {
		next(errorHelper.errors.BAD_REQUEST('ticker is mandatory'));
		isValid = false;
	}
	return isValid;
};

exports.getArbitrages = async (request, response, next) => {
	if (validateArbitrageRequest(request, next)) {
		const markets = request.query.markets.split(',');
		const marketPrices = await marketService
			.getMarketPrices(markets, request.query.ticker)
			.catch(err => {
				console.error(err);
				next(err);
			});
		const arbitrages = arbitrageService.calculateArbitrages(
			marketPrices,
			Number(request.query.minProfitPercentage),
			Number(request.query.top)
		);
		response.json(arbitrages);
	}
};

exports.getAllHistoricalArbitrages = (request, response) => {
	console.log('finding all stored arbitrage: ');
	Arbitrage.find()
		.then(result => {
			console.log('findAll: ', result);
			response.json(result);
		})
		.catch(err => {
			console.error(err);
		});
};

exports.saveArbitrage = (request, response) => {
	if (!request.body) {
		response.status(400).json({
			error: 'invalid request',
		});
	}
	const arbitrage = new Arbitrage(request.body);
	arbitrage
		.save()
		.then(result => {
			console.log('saved: ', result);
			// loadMarketsFromDB()
			response.json(result);
		})
		.catch(err => {
			console.error(err);
		});
};
