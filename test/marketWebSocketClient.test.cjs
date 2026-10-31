const test = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE_PATH = path.join(__dirname, '..', 'marketWebSocketClient.js');

const makeMarket = (name, host) => ({
	name,
	tickerRequest: 'BTC-USDT',
	connected: false,
	com: {
		api: {
			websocket: {
				host,
				url: `wss://${host}/ws`,
				tickerRequest: '{"symbol":"$'.concat('{ticker}"}'),
				tickers: ['BTC-USDT'],
				pathToPrice: [],
				pathToTicker: [],
				pathToSubscriptionId: [],
				tickerPattern: { currencies: [] },
			},
		},
	},
});

const makeConnection = host => {
	const connection = new EventEmitter();
	connection.socket = { servername: host };
	connection.connected = true;
	connection.state = 'open';
	connection.closeDescription = null;
	connection.closeReasonCode = null;
	connection.sent = [];
	connection.closeCalls = 0;
	connection.sendUTF = payload => connection.sent.push(payload);
	connection.sendBytes = payload => connection.sent.push(payload);
	connection.close = () => {
		connection.closeCalls += 1;
		connection.connected = false;
		connection.state = 'closed';
		connection.emit('close');
	};
	return connection;
};

const loadModule = () => {
	const clients = [];
	const pendingTimeouts = [];
	const pendingIntervals = [];
	const timeoutIds = new Set();
	const intervalIds = new Set();
	let timeoutId = 0;
	let intervalId = 0;

	class FakeWebSocketClient extends EventEmitter {
		constructor() {
			super();
			this.connectCalls = [];
			this.abortCalls = 0;
			clients.push(this);
		}

		connect(url) {
			this.connectCalls.push(url);
		}

		abort() {
			this.abortCalls += 1;
		}
	}

	const timers = {
		setTimeout(callback, delay) {
			const timer = { id: (timeoutId += 1), callback, delay };
			pendingTimeouts.push(timer);
			timeoutIds.add(timer.id);
			return timer;
		},
		clearTimeout(timer) {
			if (!timer) return;
			timeoutIds.delete(timer.id);
			const index = pendingTimeouts.indexOf(timer);
			if (index >= 0) pendingTimeouts.splice(index, 1);
		},
		setInterval(callback, delay) {
			const timer = { id: (intervalId += 1), callback, delay };
			pendingIntervals.push(timer);
			intervalIds.add(timer.id);
			return timer;
		},
		clearInterval(timer) {
			if (!timer) return;
			intervalIds.delete(timer.id);
			const index = pendingIntervals.indexOf(timer);
			if (index >= 0) pendingIntervals.splice(index, 1);
		},
	};

	const marketByHost = new Map();
	const mocks = {
		websocket: { client: FakeWebSocketClient },
		'./marketsDBmanager': {
			getMarketByWebsocketHost: host => marketByHost.get(host),
			getWebsocketHosts: () => [...marketByHost.keys()],
		},
		'./marketApiResponseHandler': {
			extractNumberFromTarget: () => 1,
		},
		'./dtoConverter': {
			toConnectionsDto: connections => connections,
		},
		'./logHelper': {
			logMarketTickerStream: () => {},
		},
		'./marketHelper': {
			getMarketPairCurrency: (market, api, ticker) => ticker,
			getAppTicker: (market, api, ticker) => ticker,
			isAvailablePairCurrencyByMarket: () => true,
		},
		'./logger': {
			logDataByHost: () => {},
		},
	};

	const mockRequire = specifier => {
		if (!Object.prototype.hasOwnProperty.call(mocks, specifier)) {
			throw new Error(`Unexpected require: ${specifier}`);
		}
		return mocks[specifier];
	};

	const source = fs.readFileSync(SOURCE_PATH, 'utf8');
	const wrapper = vm.runInNewContext(
		`(function (exports, require, module, console, Buffer, setTimeout, clearTimeout, setInterval, clearInterval) {${source}\n})`,
		{},
		{ filename: SOURCE_PATH }
	);
	const moduleObject = { exports: {} };
	wrapper(
		moduleObject.exports,
		mockRequire,
		moduleObject,
		{ log: () => {}, error: () => {} },
		Buffer,
		timers.setTimeout,
		timers.clearTimeout,
		timers.setInterval,
		timers.clearInterval
	);

	return {
		module: moduleObject.exports,
		clients,
		pendingTimeouts,
		pendingIntervals,
		marketByHost,
	};
};

test('starts all markets independently and retries only the failed market', async () => {
	const { module, clients, pendingTimeouts, marketByHost } = loadModule();
	const markets = [
		makeMarket('Broken', 'broken.example'),
		makeMarket('Healthy', 'healthy.example'),
	];
	markets.forEach(market => marketByHost.set(market.com.api.websocket.host, market));

	await module.connectAndSend(markets, ['BTC-USDT']);

	assert.equal(clients.length, 2);
	assert.deepEqual(
		clients.map(client => client.connectCalls),
		[['wss://broken.example/ws'], ['wss://healthy.example/ws']]
	);
	assert.equal(module.getWebSocketConnections()['healthy.example'].state, 'connecting');

	clients[0].emit('connectFailed', new Error('getaddrinfo ENOTFOUND broken.example'));

	const failedStatus = module.getWebSocketConnections()['broken.example'];
	assert.equal(failedStatus.connected, false);
	assert.equal(failedStatus.state, 'closed');
	assert.match(failedStatus.closeDescription, /ENOTFOUND/);
	assert.equal(module.getWebSocketConnections()['healthy.example'].state, 'connecting');
	assert.equal(pendingTimeouts.length, 1);
	assert.equal(pendingTimeouts[0].delay, 30000);

	pendingTimeouts.shift().callback();
	assert.equal(clients.length, 3);
	assert.deepEqual(clients[2].connectCalls, ['wss://broken.example/ws']);
});

test('reconnects after a disconnect and close-all cancels recovery', async () => {
	const { module, clients, pendingTimeouts, marketByHost } = loadModule();
	const markets = [
		makeMarket('Broken', 'broken.example'),
		makeMarket('Healthy', 'healthy.example'),
	];
	markets.forEach(market => marketByHost.set(market.com.api.websocket.host, market));

	await module.connectAndSend(markets, ['BTC-USDT']);
	const connection = makeConnection('healthy.example');
	clients[1].emit('connect', connection);
	assert.deepEqual(connection.sent, ['{"symbol":"BTC-USDT"}']);

	connection.connected = false;
	connection.state = 'closed';
	connection.closeDescription = 'lost';
	connection.emit('close');
	assert.equal(pendingTimeouts.length, 1);

	connection.connected = true;
	await module.close({ allMarkets: true });

	assert.equal(connection.closeCalls, 1);
	assert.equal(clients[0].abortCalls, 1);
	assert.equal(pendingTimeouts.length, 0);
});
