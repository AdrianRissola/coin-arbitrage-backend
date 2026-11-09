const logHelper = require('../logHelper');
const Arbitrage = require('../model/Arbitrage');

const percentage = (num1, num2) => {
	const dif = num1 > num2 ? num1 - num2 : num2 - num1;
	return (100 * dif) / num2;
};

const buyPrice = marketPrice =>
	marketPrice.ask === null || marketPrice.ask === undefined
		? marketPrice.price
		: marketPrice.ask;
const sellPrice = marketPrice =>
	marketPrice.bid === null || marketPrice.bid === undefined
		? marketPrice.price
		: marketPrice.bid;

const buildArbitrage = (marketPriceI, marketPriceJ) => ({
	transactions: [
		{
			type: 'BUY',
			market: marketPriceI.platform,
			pair: marketPriceI.ticker,
			price: buyPrice(marketPriceI),
		},
		{
			type: 'SELL',
			market: marketPriceJ.platform,
			pair: marketPriceJ.ticker,
			price: sellPrice(marketPriceJ),
		},
	],
	profitPerUnit: sellPrice(marketPriceJ) - buyPrice(marketPriceI),
	profitPercentage: percentage(buyPrice(marketPriceI), sellPrice(marketPriceJ)),
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
		const sortedList = marketPrices.sort((e1, e2) => buyPrice(e1) - buyPrice(e2));

		arbitrages = [];
		if (top === 1) {
			let best = null;
			for (let i = 0; i < sortedList.length; i += 1) {
				for (let j = i + 1; j < sortedList.length; j += 1) {
					const profit = sellPrice(sortedList[j]) - buyPrice(sortedList[i]);
					if (profit > 0 && (!best || profit > best.profitPerUnit))
						best = buildArbitrage(sortedList[i], sortedList[j]);
				}
			}
			arbitrages.push(best || buildArbitrage(sortedList[0], sortedList[sortedList.length - 1]));
			logHelper.logArbitrage(arbitrages[0]);
		} else {
			for (let i = 0; i < sortedList.length; i += 1) {
				for (let j = i + 1; j < sortedList.length; j += 1) {
					const profitPercentage = percentage(
						buyPrice(sortedList[i]),
						sellPrice(sortedList[j])
					);
					if (
						(!minProfitPercentage || profitPercentage >= minProfitPercentage) &&
						currentPriceComparator(buyPrice(sortedList[i]), sellPrice(sortedList[j]))
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

const save = async arbitrage => {
	const newArbitrage = new Arbitrage(arbitrage);
	const newArbitrageSaved = await newArbitrage
		.save()
		.then(arbit => arbit)
		.catch(err => {
			console.error(err);
			throw err;
		});
	return newArbitrageSaved;
};

const saveMaxProfitArbitrageByTicker = async arbitrage => {
	const findArbitrageByPairAndMarketsQuery = {
		'transactions.0.pair': arbitrage.transactions[0].pair,
		'transactions.0.market': arbitrage.transactions[0].market,
		'transactions.1.market': arbitrage.transactions[1].market,
	};
	const maxProfitArbitrageList = await Arbitrage.find(findArbitrageByPairAndMarketsQuery)
		.sort({ profitPercentage: -1 })
		.limit(1);
	const maxProfitArbitrage = maxProfitArbitrageList[0];
	let newArbitrageSaved = null;
	if (!maxProfitArbitrage || maxProfitArbitrage.profitPercentage < arbitrage.profitPercentage) {
		newArbitrageSaved = await save(arbitrage);
		console.log('new arbitrage saved:', newArbitrageSaved);
	}
	return newArbitrageSaved;
};

const getByTickerOrderByDateDesc = async tickers => {
	const findArbitrageByPair = {
		'transactions.0.pair': { $in: tickers },
	};
	const arbitrageList = await Arbitrage.find(findArbitrageByPair).sort({ date: -1 });
	console.log(
		`arbitrageService.getByTickerOrderByDateDesc(${tickers}) length:`,
		arbitrageList.length
	);
	return arbitrageList;
};

module.exports = {
	calculateArbitrages,
	saveMaxProfitArbitrageByTicker,
	getByTickerOrderByDateDesc,
};
