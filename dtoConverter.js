const toMarketPriceStreamDto = (marketTickerStream, ticker) => ({
	market: marketTickerStream.data.market.name,
	price: marketTickerStream.data.tickerPrices[ticker.toUpperCase()],
});

exports.toMarketPricesStreamDto = (marketTickersStream, ticker) => {
	const marketTickersStreamDto = [];
	Object.keys(marketTickersStream).forEach(key => {
		const { tickerPrices } = marketTickersStream[key].data;
		if (tickerPrices && tickerPrices[ticker.toUpperCase()])
			marketTickersStreamDto.push(toMarketPriceStreamDto(marketTickersStream[key], ticker));
	});
	return marketTickersStreamDto;
};

const toConnectionDto = connection => ({
	connected: connection.connected,
	closeDescription: connection.closeDescription,
	state: connection.state,
	// config: connection.config
});

exports.toConnectionsDto = connections => {
	const connectionDto = {};
	Object.keys(connections).forEach(key => {
		connectionDto[key] = toConnectionDto(connections[key]);
	});
	return connectionDto;
};

const getWebsocketTickers = market =>
	market?.com?.api?.websocket?.tickers ? market.com.api.websocket.tickers : [];

const getTickerRestEndpoint = market =>
	market &&
	market.com &&
	market.com.api &&
	market.com.api.rest &&
	market.com.api.rest.base &&
	market.com.api.rest.tickerPath
		? market.com.api.rest.base.concat(market.com.api.rest.tickerPath)
		: null;

const toMarketDto = market => ({
	name: market.name,
	website: market.website,
	tickers: {
		rest: Object.keys(market.availableTickersToMarketTickers.toObject()).filter(
			ticker => ticker !== '_id'
		),
		websocket: getWebsocketTickers(market),
	},
	tickerRestEndpoint: getTickerRestEndpoint(market),
	type: market.type,
});

exports.toMarketsDto = markets => {
	const marketsDto = [];
	markets.forEach(market => {
		marketsDto.push(toMarketDto(market));
	});
	return marketsDto;
};
