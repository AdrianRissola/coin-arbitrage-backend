const toMarketPriceStreamDto = marketTickerStream => ({
	market: marketTickerStream.data.market.name,
	price: marketTickerStream.data.price,
});

exports.toMarketPricesStreamDto = marketTickersStream => {
	const marketTickersStreamDto = [];
	Object.keys(marketTickersStream).forEach(key => {
		marketTickersStreamDto.push(toMarketPriceStreamDto(marketTickersStream[key]));
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
