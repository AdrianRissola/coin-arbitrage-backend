exports.getAppTicker = (market, api, marketTickerInfo) => {
	const { tickerTextPattern } = market.com.api[api];
	const marketTicker = tickerTextPattern
		? marketTickerInfo.replace(tickerTextPattern.replace('${ticker}', ''), '')
		: marketTickerInfo;

	let pair = null;
	if (market.com.api[api].tickerPattern.separator) {
		pair = marketTicker.replace(market.com.api[api].tickerPattern.separator, '-');
		pair = pair.replace(market.com.api[api].tickerPattern.prefix, '');
		const [base, quote] = pair.split('-');
		const baseSymbol = market.com.api[api].tickerPattern.currencies.filter(
			c => c.marketSymbol === base
		)[0]?.symbol;
		const quoteSymbol = market.com.api[api].tickerPattern.currencies.filter(
			c => c.marketSymbol === quote
		)[0]?.symbol;
		pair = baseSymbol ? pair.replace(base, baseSymbol) : pair;
		pair = quoteSymbol ? pair.replace(quote, quoteSymbol) : pair;
	} else {
		let marketTickerUpperCase = marketTicker.toUpperCase();
		const currency = market.com.api[api].tickerPattern.currencies.filter(c =>
			marketTickerUpperCase.includes(c.marketSymbol.toUpperCase())
		)[0];
		if (currency)
			marketTickerUpperCase = marketTickerUpperCase.replace(
				currency.marketSymbol.toUpperCase(),
				currency.symbol
			);
		marketTickerUpperCase = marketTickerUpperCase.replace(
			market.com.api[api].tickerPattern.prefix,
			''
		);
		pair = market.com.api[api].tickers.filter(
			t => t.replace('-', '') === marketTickerUpperCase
		);
	}
	return pair;
};

exports.getMarketPairCurrency = (market, api, pairCurrency) => {
	let [base, quote] = pairCurrency.split('-');
	const baseMarketSymbol = market.com.api.websocket.tickerPattern.currencies?.filter(
		currency => currency.symbol === base
	)[0]?.marketSymbol;

	const quoteMarketSymbol = market.com.api.websocket.tickerPattern.currencies?.filter(
		currency => currency.symbol === quote
	)[0]?.marketSymbol;

	base = baseMarketSymbol || base[market.com.api[api].tickerPattern.baseCurrencyCaseFunction]();
	quote =
		quoteMarketSymbol || quote[market.com.api[api].tickerPattern.quoteCurrencyCaseFunction]();
	base = market.com.api[api].tickerPattern.prefix
		? market.com.api[api].tickerPattern.prefix?.concat(base)
		: base;
	return base.concat(market.com.api[api].tickerPattern.separator).concat(quote);
};
