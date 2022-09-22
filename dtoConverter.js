const toMarketPriceStreamDto = (marketTickerStream, ticker) => ({
	market: marketTickerStream.data.market.name,
	// price: marketTickerStream.data.price,
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
