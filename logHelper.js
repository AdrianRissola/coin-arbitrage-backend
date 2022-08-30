exports.logMarketTickerStream = marketTickerStream => {
	const markets = [];
	Object.keys(marketTickerStream).forEach(host => {
		markets.push({
			host,
			ticker: marketTickerStream[host].data.market.tickerRequest,
			price: marketTickerStream[host].data.price,
			date: marketTickerStream[host].data.timestamp,
			connected: marketTickerStream[host].connected,
		});
	});

	// console.table(markets);
};

exports.logArbitrage = arbitrage => {
	const txs = [];
	arbitrage.transactions.forEach(tx => {
		txs.push({
			type: tx.type,
			market: tx.market,
			ticker: tx.pair,
			price: tx.price,
			profitPerUnit: arbitrage.profitPerUnit,
			profitPercentage: arbitrage.profitPercentage,
			date: arbitrage.date,
		});
	});
	// console.table(txs);
};
