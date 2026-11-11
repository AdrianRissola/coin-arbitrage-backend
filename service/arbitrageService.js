const logHelper = require('../logHelper');
const Arbitrage = require('../model/Arbitrage');

const isValidQuotePrice = price => typeof price === 'number' && Number.isFinite(price) && price > 0;
const buyPrice = marketPrice =>
	isValidQuotePrice(marketPrice.ask) ? marketPrice.ask : null;
const sellPrice = marketPrice =>
	isValidQuotePrice(marketPrice.bid) ? marketPrice.bid : null;
const percentage = (buyAsk, sellBid) => (100 * (sellBid - buyAsk)) / buyAsk;

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

const priceComparator = (buyAsk, sellBid) => buyAsk < sellBid;

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
		const sortedList = marketPrices.sort(
			(e1, e2) => (buyPrice(e1) ?? Infinity) - (buyPrice(e2) ?? Infinity)
		);
		const buyMarkets = sortedList.filter(marketPrice => buyPrice(marketPrice) !== null);
		const sellMarkets = sortedList.filter(marketPrice => sellPrice(marketPrice) !== null);

		arbitrages = [];
		if (top === 1) {
			let best = null;
			buyMarkets.forEach(buyMarket => {
				sellMarkets.forEach(sellMarket => {
					if (buyMarket.platform === sellMarket.platform) return;
					const buyAsk = buyPrice(buyMarket);
					const sellBid = sellPrice(sellMarket);
					const profit = sellBid - buyAsk;
					if (profit > 0 && (!best || profit > best.profitPerUnit))
						best = buildArbitrage(buyMarket, sellMarket);
				});
			});
			if (best) {
				arbitrages.push(best);
				logHelper.logArbitrage(arbitrages[0]);
			}
		} else {
			buyMarkets.forEach(buyMarket => {
				sellMarkets.forEach(sellMarket => {
					if (buyMarket.platform === sellMarket.platform) return;
					const buyAsk = buyPrice(buyMarket);
					const sellBid = sellPrice(sellMarket);
					if (sellBid <= buyAsk || !currentPriceComparator(buyAsk, sellBid)) return;
					const profitPercentage = percentage(buyAsk, sellBid);
					if (
						!minProfitPercentage || profitPercentage >= minProfitPercentage
					)
						arbitrages.push(buildArbitrage(buyMarket, sellMarket));
				});
			});
			arbitrages = arbitrages.sort((e1, e2) => e2.profitPerUnit - e1.profitPerUnit);
		}
		if (top > 1) arbitrages = arbitrages.slice(0, top);
	}
	if (formatResponseCb && arbitrages) arbitrages = formatResponseCb(arbitrages, ticker);

	return arbitrages;
};

const save = async arbitrage => {
	const newArbitrage = new Arbitrage({ ...arbitrage, priceBasis: 'bidAsk' });
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
		priceBasis: 'bidAsk',
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
		priceBasis: 'bidAsk',
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
