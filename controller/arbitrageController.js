const arbitrageService = require('../service/arbitrageService');
const Arbitrage = require('../model/Arbitrage');
const errorHelper = require('../errorHelper');

exports.getArbitrages = (request, response, next) => {
	console.log('request.query: ', request.query);
	let markets = null;

	if (request.query.markets) {
		markets = request.query.markets.split(',');
		if (!!markets && markets.length === 1) {
			next(errorHelper.errors.BAD_REQUEST('more than one market is mandatory'));
		}
	}

	if (!request.query.ticker) {
		next(errorHelper.errors.BAD_REQUEST('ticker is mandatory'));
	}

	arbitrageService
		.getArbitrages(
			markets,
			request.query.ticker,
			Number(request.query.minProfitPercentage),
			request.query.top
		)
		.then(result => {
			console.log('arbitrageService.getArbitrages(): ', result);
			response.json(result);
		})
		.catch(err => {
			console.error(err);
			next(err);
		});
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
