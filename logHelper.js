exports.logMarketTickerStream = marketTickerStream => {
	const markets = [];
	for (const host in marketTickerStream) {
		markets.push({
			host,
			ticker: marketTickerStream[host].data.market.tickerRequest,
			price: marketTickerStream[host].data.price,
			date: marketTickerStream[host].data.timestamp,
			connected: marketTickerStream[host].connected,
		});
	}
	console.table(markets);
};

exports.logArbitrage = arbitrage => {
	const txs = [];
	for (const tx of arbitrage.transactions) {
		txs.push({
			type: tx.type,
			market: tx.market,
			ticker: tx.pair,
			price: tx.price,
			profitPerUnit: arbitrage.profitPerUnit,
			profitPercentage: arbitrage.profitPercentage,
			date: arbitrage.date,
		});
	}
	console.table(txs);
};
