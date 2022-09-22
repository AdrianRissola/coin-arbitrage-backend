const { isString } = require('./helper');

exports.getAppTicker = (market, api, marketTickerInfo) => {
	const { tickerTextPattern } = market.com.api[api];
	const marketTicker = tickerTextPattern
		? marketTickerInfo.replace(tickerTextPattern.replace('${ticker}', ''), '')
		: marketTickerInfo;
	const appTickerToMarketTicker = market.com.api[api].availableTickersToMarketTickers;
	const appTickers = Object.keys(appTickerToMarketTicker.toObject());
	return appTickers.filter(appTicker => {
		const mrkTckr = appTickerToMarketTicker[appTicker];
		return mrkTckr && isString(mrkTckr) && mrkTckr.toUpperCase() === marketTicker.toUpperCase();
	})[0];
};
