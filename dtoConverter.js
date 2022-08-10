
exports.toMarketTickersStreamDto = (marketTickersStream) => {
    let marketTickersStreamDto = []
    for(let key in marketTickersStream) {
        marketTickersStreamDto.push(toMarketTickerStreamDto(marketTickersStream[key]))
    }
    return marketTickersStreamDto
}

const toMarketTickerStreamDto = (marketTickerStream) => {
    return {
        market: marketTickerStream.data.market.name,    
        price: marketTickerStream.data.price
    }
}


exports.toConnectionsDto = (connections) => {
    let connectionDto = {}
    for(let key in connections) {
        connectionDto[key] = toConnectionDto(connections[key])
    }
    return connectionDto
}

const toConnectionDto = (connection) => {
    return {
        connected: connection.connected,    
        closeDescription: connection.closeDescription,
        state: connection.state,
        config: connection.config
    }
}

