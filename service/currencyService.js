const Currency = require('../model/Currency');
const Market = require('../model/Market');
const marketsDBmanager = require('../marketsDBmanager');

const saveCurrency = async currency => {
	const newCurrency = new Currency(currency);
	await newCurrency
		.save()
		.then(currency => console.log('new currency saved:', currency))
		.catch(err => {
			console.error(err);
		});

	const pairCurrencies = marketsDBmanager.getAllAvailableTickersByCurrency(currency);
	marketsDBmanager.getAllMarkets().forEach(async market => {
		if (market.com.api.websocket) {
			const tickersSet = new Set(
				market.com.api.websocket.tickers.concat(pairCurrencies.map(pc => pc.name))
			);
			market.com.api.websocket.tickers = Array.from(tickersSet);
			console.log(`New pair currencies saved for ${market.name}:`, pairCurrencies);
			await market.save();
		}
	});

	return currency;
};

module.exports = {
	saveCurrency,
};
