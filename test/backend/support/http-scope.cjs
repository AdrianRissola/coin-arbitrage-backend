const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');

const createHttpScope = (root, deny) => {
	const file = process.env.BE_TEST_HTTP_AUTHORIZATION;
	if (!file) return null;
	if (
		!path.isAbsolute(file) ||
		path.basename(file) !== 'http-authorization.json' ||
		fs.realpathSync(path.dirname(file)) !== root ||
		!fs.lstatSync(file).isFile()
	)
		throw deny('invalid HTTP authorization location');
	const authorization = JSON.parse(fs.readFileSync(file, 'utf8'));
	if (
		authorization.version !== 1 ||
		authorization.scope !== 'owned-http' ||
		authorization.reportRoot !== root ||
		!/^[a-f0-9]{64}$/.test(authorization.token)
	)
		throw deny('invalid HTTP authorization record');
	const entries = new Map();
	let binding = false;
	const lease = server => {
		if (
			!(server instanceof http.Server) ||
			server.listening ||
			server.address() ||
			entries.has(server)
		)
			throw deny('HTTP server must be newly owned and unbound');
		const entry = { server, started: false, closing: false, sockets: new Set() };
		const track = socket => {
			entry.sockets.add(socket);
			socket.once('close', () => entry.sockets.delete(socket));
		};
		server.on('connection', track);
		entries.set(server, entry);
		return Object.freeze({
			listen: async () => {
				const ready = once(server, 'listening');
				binding = true;
				try {
					server.listen({ port: 0, host: '127.0.0.1', exclusive: true });
				} finally {
					binding = false;
				}
				await ready;
				return server.address();
			},
			close: async () => {
				if (!entries.has(server)) return;
				entry.closing = true;
				const closed = server.listening
					? new Promise((resolve, reject) => {
							server.close(error => (error ? reject(error) : resolve()));
					  })
					: Promise.resolve();
				entry.sockets.forEach(socket => socket.destroy());
				await closed;
				server.removeListener('connection', track);
				entries.delete(server);
			},
		});
	};
	const permitListen = (args, server) => {
		const entry = entries.get(server);
		const options = args[0];
		if (
			!entry ||
			entry.started ||
			entry.closing ||
			args.length !== 1 ||
			!options ||
			options.port !== 0 ||
			options.host !== '127.0.0.1' ||
			options.exclusive !== true ||
			Object.keys(options).some(key => !['port', 'host', 'exclusive'].includes(key))
		)
			return false;
		entry.started = true;
		return true;
	};
	const permitConnect = (args, socket) => {
		const normalized = Array.isArray(args[0]) ? args[0] : args;
		const options = normalized[0];
		if (
			!options ||
			typeof options !== 'object' ||
			options.path ||
			options.socketPath ||
			options.host !== '127.0.0.1' ||
			(options.family && options.family !== 4)
		)
			return false;
		const port = Number(options.port);
		if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
		const entry = Array.from(entries.values()).find(value => {
			const address = value.server.address();
			return (
				value.started &&
				!value.closing &&
				value.server.listening &&
				address?.address === '127.0.0.1' &&
				address.port === port
			);
		});
		if (!entry) return false;
		entry.sockets.add(socket);
		socket.once('close', () => entry.sockets.delete(socket));
		return true;
	};
	const handleBindLookup = args => {
		if (!binding || args[0] !== '127.0.0.1') return false;
		const callback = args[args.length - 1];
		if (typeof callback !== 'function') return false;
		process.nextTick(() => {
			if (args[1]?.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
			else callback(null, '127.0.0.1', 4);
		});
		return true;
	};
	return Object.freeze({
		lease,
		permitListen,
		permitConnect,
		handleBindLookup,
		activeCount: () => entries.size,
	});
};

module.exports = { createHttpScope };
