const Currency = require('../model/Currency');
const marketsDBmanager = require('../marketsDBmanager');
const axios = require('axios');
const errorHelper = require('../errorHelper');
const currencyRepository = require('../repository/currencyRepository');
const marketRepository = require('../repository/marketRepository');

const maxMarketCapRank = 66;

const saveCurrency = async currencyRqst => {
	const currencyFound = await getCurrency(currencyRqst);
	validateCurrency(currencyFound);
	currencyRqst.name = currencyFound.name;
	currencyRqst.base = true;
	currencyRqst.quote = false;
	await currencyRepository.save(currencyRqst);

	const pairCurrencies = marketsDBmanager.getAllAvailableTickersByCurrency(currencyRqst);
	// marketsDBmanager.getAllMarkets().forEach(async market => {
	// 	if (market.com.api.websocket) {
	// 		const tickersSet = new Set(
	// 			market.com.api.websocket.tickers.concat(pairCurrencies.map(pc => pc.name))
	// 		);
	// 		market.com.api.websocket.tickers = Array.from(tickersSet);
	// 		console.log(`New pair currencies saved for ${market.name}:`, pairCurrencies);
	// 		await market.save();
	// 	}
	// });
	const updatedMarkets = marketsDBmanager
		.getAllMarkets()
		.filter(market => market.com.api.websocket)
		.map(market => {
			const tickersSet = new Set(
				market.com.api.websocket.tickers.concat(pairCurrencies.map(pc => pc.name))
			);
			market.com.api.websocket.tickers = Array.from(tickersSet);
			console.log(`New pair currencies saved for ${market.name}:`, pairCurrencies);
			return market;
		});
	marketRepository.saveAll(updatedMarkets);

	return currencyRqst;
};

const validateCurrency = currency => {
	if (!currency) {
		throw errorHelper.errors.NOT_FOUND(`currency not found`);
	}
	if (!currency.market_cap_rank) {
		throw errorHelper.errors.BAD_REQUEST(
			`${currency.symbol} has no market_cap_rank, market_cap_rank_allowed <= ${maxMarketCapRank}`
		);
	}
	if (currency.market_cap_rank > maxMarketCapRank) {
		throw errorHelper.errors.BAD_REQUEST(
			`${currency.symbol} market_cap_rank = ${currency.market_cap_rank}, allowed <= ${maxMarketCapRank}`
		);
	}
};

const getCurrency = async currency => {
	console.log(`Requesting new currency:`, currency);
	return (result = await axios
		.get(`https://api.coingecko.com/api/v3/search?query=${currency.symbol}`)
		.then(response => {
			const coin = response.data.coins.filter(coin => coin.symbol === currency.symbol)[0];
			console.log(`Requested new currency is:`, coin);
			return coin;
		})
		.catch(error => {
			console.error(error.message);
			if (error.response) {
				// Request made and server responded
				throw errorHelper.errors.BAD_REQUEST(`${error.message} when: GET ${url}`);
			} else if (error.request) {
				// The request was made but no response was received
				console.log(`${error.message} when: GET ${url}`);
				throw errorHelper.errors.BAD_REQUEST(error.message);
			} else {
				// Something happened in setting up the request that triggered an Error
				console.log('Error', error.message);
				throw errorHelper.errors.INTERNAL_SERVER_ERROR(error.message);
			}
		}));
};

module.exports = {
	saveCurrency,
};
