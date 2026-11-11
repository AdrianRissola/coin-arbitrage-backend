const { EventEmitter } = require('node:events');

const captureTimers = ({ includeTimeouts = true } = {}) => {
	const intervals = new Map();
	const timeouts = new Map();
	const spies = [];
	const waiters = [];
	[
		['Interval', intervals],
		['Timeout', timeouts],
	]
		.filter(([type]) => includeTimeouts || type === 'Interval')
		.forEach(([type, pending]) => {
			spies.push(
				jest.spyOn(global, `set${type}`).mockImplementation((callback, delay) => {
					const handle = { callback, delay };
					pending.set(handle, handle);
					if (type === 'Interval') {
						const waiting = waiters.splice(0);
						waiting.forEach(waiter => {
							if (waiter.delay === delay) waiter.resolve(handle);
							else waiters.push(waiter);
						});
					}
					return handle;
				})
			);
			spies.push(
				jest
					.spyOn(global, `clear${type}`)
					.mockImplementation(handle => pending.delete(handle))
			);
		});
	return {
		intervals,
		timeouts,
		nextInterval: delay =>
			new Promise(resolve => {
				waiters.push({ delay, resolve });
			}),
		run: async handle => {
			if (!intervals.has(handle) && !timeouts.has(handle))
				throw new Error('Unowned or cleared timer');
			timeouts.delete(handle);
			await handle.callback();
		},
		close: () => {
			try {
				expect(waiters).toEqual([]);
			} finally {
				intervals.clear();
				timeouts.clear();
				spies.forEach(spy => spy.mockRestore());
			}
		},
	};
};

const connection = host => {
	const socket = new EventEmitter();
	socket.socket = {
		servername: host,
		remoteAddress: '127.0.0.1',
		remoteFamily: 'IPv4',
		remotePort: 12345,
	};
	socket.state = 'open';
	socket.connected = true;
	socket.sent = [];
	socket.sendUTF = jest.fn(value => socket.sent.push(value));
	socket.sendBytes = jest.fn(value => socket.sent.push(value));
	socket.close = jest.fn(() => {
		socket.connected = false;
		socket.state = 'closed';
		socket.emit('close', 1000, 'test-owned close');
	});
	return socket;
};
const deliver = async (socket, value, type = 'utf8') => {
	const message =
		type === 'binary'
			? {
					type,
					binaryData: Buffer.from(
						typeof value === 'string' ? value : JSON.stringify(value)
					),
			  }
			: { type, utf8Data: typeof value === 'string' ? value : JSON.stringify(value) };
	await Promise.all(socket.listeners('message').map(listener => listener(message)));
};
const exchangeMarket = (name = 'Alpha', overrides = {}) => ({
	name,
	availableTickersToMarketTickers: { 'BTC-USDT': 'BTC-USDT', 'ETH-USD': 'ETH-USD' },
	com: {
		api: {
			websocket: {
				host: `${name.toLowerCase()}.invalid`,
				url: `wss://\${host}/feed`,
				tickerRequest: `{"symbol":"\${ticker}"}`,
				tickers: ['BTC-USDT', 'ETH-USD'],
				pathToPrice: ['price'],
				pathToBidPrice: ['bid'],
				pathToAskPrice: ['ask'],
				pathToTicker: ['symbol'],
				pathToSubscriptionId: [],
				tickerPattern: {
					separator: '-',
					prefix: '',
					baseCurrencyCaseFunction: 'toUpperCase',
					quoteCurrencyCaseFunction: 'toUpperCase',
					currencies: [],
				},
				...overrides,
			},
		},
	},
});
const exchangeTransport = () => {
	const clients = [];
	let nextConnectFailure;
	class FakeExchange extends EventEmitter {
		constructor() {
			super();
			clients.push(this);
			this.connect = jest.fn(() => {
				if (!nextConnectFailure) return;
				const error = nextConnectFailure;
				nextConnectFailure = null;
				throw error;
			});
			this.abort = jest.fn();
		}
	}
	jest.doMock('websocket', () => ({ client: FakeExchange }));
	return {
		clients,
		failNextConnect: error => {
			nextConnectFailure = error;
		},
	};
};
const loadExchange = () => {
	const transport = exchangeTransport();
	let module;
	let manager;
	jest.isolateModules(() => {
		manager = jest.requireActual('../../../marketsDBmanager');
		module = jest.requireActual('../../../marketWebSocketClient');
	});
	return { module, manager, ...transport };
};

module.exports = {
	captureTimers,
	connection,
	deliver,
	exchangeMarket,
	exchangeTransport,
	loadExchange,
};
