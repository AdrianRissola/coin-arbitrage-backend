const WebSocketServer = require('websocket').server;
const { server } = require('./index');
const webSocketServerHandler = require('./webSocketServerHandler');

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

const wsServer = new WebSocketServer({
	httpServer: server,
	// You should not use autoAcceptConnections for production
	// applications, as it defeats all standard cross-origin protection
	// facilities built into the protocol and the browser.  You should
	// *always* verify the connection's origin and decide whether or not
	// to accept it.
	autoAcceptConnections: false,
});

wsServer.on('request', request => {
	webSocketServerHandler.onRequest(wsServer, request);
});
