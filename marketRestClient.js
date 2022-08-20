const axios = require('axios');
const marketRestClientResultHandler = require('./marketApiResponseHandler');
const errorHelper = require('./errorHelper');

const getTickerByMarket = async (market, marketTickerName) => {
	let result = null;
	let url = null;
	if (marketTickerName) {
		url = market.com.api.rest.base
			.concat(market.com.api.rest.tickerPath)
			.replace('${ticker}', marketTickerName);
		console.log('requesting url: ', url);
		result = await axios
			.get(url)
			.then(response => {
				console.log(response.data);
				return response;
			})
			.catch(error => {
				console.error(error.message);
				if (error.response) {
					// Request made and server responded
					throw errorHelper.errors.BAD_REQUEST(`${error.message} when: GET ${url}`);
				} else if (error.request) {
					// The request was made but no response was received
					throw errorHelper.errors.BAD_REQUEST(error.message);
				} else {
					// Something happened in setting up the request that triggered an Error
					console.log('Error', error.message);
					throw errorHelper.errors.INTERNAL_SERVER_ERROR(error.message);
				}
			});
	}
	return result;
};

const getMarketPrice = async (market, marketTickerName) => {
	let marketPrice = null;
	if (market && marketTickerName) {
		const result = await getTickerByMarket(market, marketTickerName);
		if (result) {
			marketPrice = {
				platform: market.name,
				ticker: marketTickerName,
				price: marketRestClientResultHandler.getPriceByMarketAndTicker(
					market.com.api.rest.pathToPrice,
					marketTickerName,
					result
				),
				date: new Date(),
			};
			console.log({ marketPrice });
		}
	}
	return marketPrice;
};

module.exports = {
	getMarketPrice,
	getTickerByMarket,
};
