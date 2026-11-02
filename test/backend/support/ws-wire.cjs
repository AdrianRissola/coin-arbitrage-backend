const { once } = require('node:events');
const { loadHttpApp } = require('./http-app.cjs');
const {
	captureTimers,
	connection,
	deliver,
	exchangeMarket,
	exchangeTransport,
} = require('./ws-runtime.cjs');

const { server: WebSocketServer, client: WebSocketClient } = jest.requireActual('websocket');

const loadWire = async () => {
	const transport = exchangeTransport();
	const consumers = [];
	let server;
	let clock;
	const app = await loadHttpApp({
		origins: ['http://localhost:3000'],
		history: [],
		markets: ['Alpha', 'Beta', 'Gamma'].map(name => exchangeMarket(name)),
		createClient: () => jest.requireActual('../../../marketWebSocketClient'),
		load: () => ({ handler: jest.requireActual('../../../webSocketServerHandler') }),
		beforeClose: async () => {
			try {
				await Promise.all(
					consumers.map(async consumer => {
						if (consumer.socket?.connected) {
							const closed = once(consumer.socket, 'close');
							consumer.socket.close();
							await closed;
						} else consumer.client.abort();
					})
				);
				consumers.forEach(consumer => {
					expect(consumer.waiting).toEqual([]);
				});
				server?.shutDown();
				await app.client.close({ allMarkets: true });
			} finally {
				clock?.close();
			}
		},
	});
	app.manager.setAvailableTickers([{ name: 'BTC-USDT' }, { name: 'ETH-USD' }]);
	clock = captureTimers({ includeTimeouts: false });
	server = new WebSocketServer({
		httpServer: app.server,
		autoAcceptConnections: false,
		keepalive: false,
	});
	server.on('request', request => app.handler.onRequest(server, request));
	const address = app.server.address();
	const open = async (origin = 'http://localhost:3000') => {
		const client = new WebSocketClient();
		const consumer = { client, frames: [], waiting: [] };
		consumers.push(consumer);
		const connected = new Promise((resolve, reject) => {
			client.once('connectFailed', reject);
			client.once('connect', socket => {
				consumer.socket = socket;
				socket.on('message', message => {
					const frame = JSON.parse(message.utf8Data);
					if (consumer.waiting.length) consumer.waiting.shift()(frame);
					else consumer.frames.push(frame);
				});
				resolve(socket);
			});
		});
		client.connect(`ws://127.0.0.1:${address.port}/`, null, origin);
		await connected;
		return {
			...consumer,
			next: () =>
				consumer.frames.length
					? Promise.resolve(consumer.frames.shift())
					: new Promise(resolve => {
							consumer.waiting.push(resolve);
					  }),
			subscribe: async request => {
				const ready = clock.nextInterval(1000);
				consumer.socket.sendUTF(JSON.stringify(request));
				return ready;
			},
			observedMessage: () => {
				const sockets = server.connections.filter(socket => socket.connected);
				expect(sockets).toHaveLength(1);
				return once(sockets[0], 'message');
			},
		};
	};
	const feed = async () => {
		if (!transport.clients.length) throw new Error('No actual exchange open requested');
		const prices = {
			'alpha.invalid': { 'BTC-USDT': 80, 'ETH-USD': 80 },
			'beta.invalid': { 'BTC-USDT': 100, 'ETH-USD': 100 },
			'gamma.invalid': { 'BTC-USDT': 125, 'ETH-USD': 90 },
		};
		await Promise.all(
			transport.clients.map(async client => {
				const host = new URL(client.connect.mock.calls[0][0]).hostname;
				const socket = connection(host);
				client.emit('connect', socket);
				await Promise.all(
					Object.entries(prices[host]).map(([symbol, price]) =>
						deliver(socket, { symbol, price })
					)
				);
			})
		);
	};
	return { ...app, server, clock, open, feed, transport };
};

module.exports = { loadWire };
