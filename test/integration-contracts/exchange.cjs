const { EventEmitter } = require('node:events');
const prices = require('../fixtures/contracts/v1/market-prices.json');

const clients = [];
const pending = new Set();
const failures = [];
const rawFrames = [];
const subscriptions = [];
const observe = promise => {
	pending.add(promise);
	promise.then(
		() => pending.delete(promise),
		error => {
			pending.delete(promise);
			failures.push(error);
		}
	);
	return promise;
};
const deliver = async (socket, symbol) => {
	const row = prices[symbol]?.find(
		price => `${price.platform.toLowerCase()}.invalid` === socket.socket.servername
	);
	if (!row) throw new Error('Unknown controlled raw exchange pair');
	const message = { type: 'utf8', utf8Data: JSON.stringify({ symbol, price: row.price }) };
	rawFrames.push({ host: socket.socket.servername, ...message });
	await Promise.all(socket.listeners('message').map(listener => listener.call(socket, message)));
};
class ExchangeClient extends EventEmitter {
	connect(url) {
		const host = new URL(url).hostname;
		if (!['alpha.invalid', 'beta.invalid', 'gamma.invalid'].includes(host))
			throw new Error('External exchange transport is outside the synthetic feed catalog');
		this.host = host;
		clients.push(this);
		this.ready = observe(
			new Promise((resolve, reject) => {
				queueMicrotask(async () => {
					if (this.aborted) {
						resolve();
						return;
					}
					const socket = new EventEmitter();
					socket.socket = {
						servername: host,
						remoteAddress: '127.0.0.1',
						remoteFamily: 'IPv4',
						remotePort: 1,
					};
					socket.connected = true;
					socket.state = 'open';
					socket.sendUTF = value => {
						subscriptions.push({ host, raw: value });
						if (!value.startsWith('{')) return;
						const { symbol } = JSON.parse(value);
						if (prices[symbol]) queueMicrotask(() => observe(deliver(socket, symbol)));
					};
					socket.sendBytes = value => socket.sendUTF(value.toString('utf8'));
					socket.close = (code = 1000, description = 'controlled close') => {
						if (!socket.connected) return;
						socket.connected = false;
						socket.state = 'closed';
						socket.closeDescription = description;
						socket.emit('close', code, socket.closeDescription);
					};
					this.connection = socket;
					try {
						this.emit('connect', socket);
						await Promise.all(
							Object.keys(prices).map(symbol => deliver(socket, symbol))
						);
						resolve();
					} catch (error) {
						reject(error);
					}
				});
			})
		);
	}

	abort() {
		this.aborted = true;
	}
}
const settled = () =>
	Promise.all(Array.from(pending)).then(() => {
		if (failures.length) throw failures[0];
		return pending.size ? settled() : undefined;
	});

module.exports = { ExchangeClient, clients, rawFrames, subscriptions, settled };
