const platforms = require('../marketRestClient');
const marketsDBmanager = require('../marketsDBmanager');
const logHelper = require('../logHelper');

const getMarketPrices = async (marketNames, ticker) => {
	let markets = null;
	if (!marketNames) markets = marketsDBmanager.getAllMarkets();
	else markets = marketsDBmanager.getMarketsByNames(marketNames);

	let marketPrices = [];

	markets.forEach(market => {
		const marketPrice = platforms.getMarketPrice(
			market,
			market.availableTickersToMarketTickers[ticker.toUpperCase()]
		);
		marketPrices.push(marketPrice);
	});

	marketPrices = await Promise.all(marketPrices);
	marketPrices = marketPrices.filter(marketPrice => !!marketPrice);

	// for (let i = 0; i < markets.length; i += 1) {
	// 	const marketPrice = await platforms.getMarketPrice(
	// 		markets[i],
	// 		markets[i].availableTickersToMarketTickers[ticker.toUpperCase()]
	// 	);
	// 	if (marketPrice) {
	// 		console.log('adding to arbitrage list: ', markets[i].name, ' ', ticker);
	// 		marketPrices.push(marketPrice);
	// 	}
	// }

	return marketPrices;
};

const percentage = (num1, num2) => {
	const dif = num1 > num2 ? num1 - num2 : num2 - num1;
	return (100 * dif) / num2;
};

const buildArbitrage = (marketPriceI, marketPriceJ) => ({
	transactions: [
		{
			type: 'BUY',
			market: marketPriceI.platform,
			pair: marketPriceI.ticker,
			price: marketPriceI.price,
		},
		{
			type: 'SELL',
			market: marketPriceJ.platform,
			pair: marketPriceJ.ticker,
			price: marketPriceJ.price,
		},
	],
	profitPerUnit: marketPriceJ.price - marketPriceI.price,
	profitPercentage: percentage(marketPriceI.price, marketPriceJ.price),
	date: new Date(),
});

const calculateArbitrages = (marketPrices, minProfitPercentage, top) => {
	let arbitrages = null;
	if (marketPrices.length > 1) {
		const sortedList = marketPrices.sort((e1, e2) => e1.price - e2.price);
		console.log('sorted list: ', sortedList);

		arbitrages = [];
		if (top === 1) {
			arbitrages.push(buildArbitrage(sortedList[0], sortedList[sortedList.length - 1]));
			logHelper.logArbitrage(arbitrages[0]);
		} else {
			for (let i = 0; i < sortedList.length; i += 1) {
				for (let j = i + 1; j < sortedList.length; j += 1) {
					const profitPercentage = percentage(sortedList[i].price, sortedList[j].price);
					if (
						(!minProfitPercentage || profitPercentage >= minProfitPercentage) &&
						sortedList[i].price < sortedList[j].price
					)
						arbitrages.push(buildArbitrage(sortedList[i], sortedList[j]));
				}
			}
			arbitrages = arbitrages.sort((e1, e2) => e2.profitPerUnit - e1.profitPerUnit);
		}
		if (top > 1) {
			arbitrages = arbitrages.slice(0, top);
		}
	}

	return arbitrages;
};

const getArbitrages = async (marketNames, ticker, minProfitPercentage, top) => {
	const marketPrices = await getMarketPrices(marketNames, ticker);
	return calculateArbitrages(marketPrices, Number(minProfitPercentage), Number(top));
};

module.exports = {
	getArbitrages,
	calculateArbitrages,
};
