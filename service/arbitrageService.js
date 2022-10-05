const logHelper = require('../logHelper');
const Arbitrage = require('../model/Arbitrage');

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

const priceComparator = (priceA, priceB) => priceA < priceB;

const calculateArbitrages = (
	marketPrices,
	minProfitPercentage,
	top,
	formatResponseCb,
	priceComparatorCb
) => {
	const currentPriceComparator = priceComparatorCb || priceComparator;
	let arbitrages = null;
	const ticker = marketPrices && marketPrices[0] ? marketPrices[0].ticker : null;
	if (marketPrices && marketPrices.length > 1) {
		const sortedList = marketPrices.sort((e1, e2) => e1.price - e2.price);

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
						currentPriceComparator(sortedList[i].price, sortedList[j].price)
					)
						arbitrages.push(buildArbitrage(sortedList[i], sortedList[j]));
				}
			}
			arbitrages = arbitrages.sort((e1, e2) => e2.profitPerUnit - e1.profitPerUnit);
		}
		if (top > 1) arbitrages = arbitrages.slice(0, top);
	}
	if (formatResponseCb && arbitrages) arbitrages = formatResponseCb(arbitrages, ticker);

	return arbitrages;
};

const save = arbitrage => {
	const newArbitrage = new Arbitrage(arbitrage);
	return newArbitrage
		.save()
		.then(arbit => arbit)
		.catch(err => {
			console.error(err);
		});
};

module.exports = {
	calculateArbitrages,
	save,
};
