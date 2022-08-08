

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
        state: connection.state,
        config: connection.config
    }
}