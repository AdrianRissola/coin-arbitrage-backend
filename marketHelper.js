const reversePairCurrency = (pairCurrency, isQuoteCurrencyFirst) =>
	isQuoteCurrencyFirst ? pairCurrency.split('-').reverse().join('-') : pairCurrency;

exports.getAppTicker = (market, api, marketTickerInfo) => {
	const { tickerTextPattern } = market.com.api[api];
	let marketTicker = tickerTextPattern
		? marketTickerInfo.replace(tickerTextPattern.replace('${ticker}', ''), '')
		: marketTickerInfo;

	const isQuoteCurrencyFirst = market.com.api[api].tickerPattern.quoteCurrencyFirst;
	marketTicker = reversePairCurrency(marketTicker, isQuoteCurrencyFirst);

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
		[pair] = market.com.api[api].tickers.filter(
			t => t.replace('-', '') === marketTickerUpperCase
		);
	}
	return pair;
};

exports.getMarketPairCurrency = (market, api, pairCurrency) => {
	const isQuoteCurrencyFirst = market.com.api[api].tickerPattern.quoteCurrencyFirst;
	const fixedPairCurrency = reversePairCurrency(pairCurrency, isQuoteCurrencyFirst);
	let [base, quote] = fixedPairCurrency.split('-');
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

exports.isAvailablePairCurrencyByMarket = (parsedMessage, market) => {
	let isAvailablePairCurrencyByMarket = true;

	if (
		market.com.api.websocket.isAvailablePairCurrencyFn &&
		market.com.api.websocket.isAvailablePairCurrencyFn.code
	) {
		const isAvailablePairCurrencyFn = eval(
			`(${market.com.api.websocket.isAvailablePairCurrencyFn.code})`
		);
		isAvailablePairCurrencyByMarket = isAvailablePairCurrencyFn(parsedMessage);
		if (!isAvailablePairCurrencyByMarket) {
			console.log(
				`Pair currency from ${market.name} in ${JSON.stringify(
					parsedMessage
				)} is not available`
			);
			throw new Error(
				`Error: Pair currency from ${market.name} in ${JSON.stringify(
					parsedMessage
				)} is not available`
			);
		}
	}

	return isAvailablePairCurrencyByMarket;
};
