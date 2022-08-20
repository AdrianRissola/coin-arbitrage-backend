exports.toMarketPricesStreamDto = marketTickersStream => {
	const marketTickersStreamDto = [];
	for (const key in marketTickersStream) {
		marketTickersStreamDto.push(toMarketPriceStreamDto(marketTickersStream[key]));
	}
	return marketTickersStreamDto;
};

const toMarketPriceStreamDto = marketTickerStream => ({
	market: marketTickerStream.data.market.name,
	price: marketTickerStream.data.price,
});

exports.toConnectionsDto = connections => {
	const connectionDto = {};
	for (const key in connections) {
		connectionDto[key] = toConnectionDto(connections[key]);
	}
	return connectionDto;
};

const toConnectionDto = connection => ({
	connected: connection.connected,
	closeDescription: connection.closeDescription,
	state: connection.state,
	// config: connection.config
});
