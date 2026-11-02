const fs = require('node:fs');
const path = require('node:path');

const validateAuthorization = (root, value) => {
	if (
		value?.version !== 1 ||
		value.scope !== 'owned-disposable-mongo' ||
		value.reportRoot !== root ||
		!/^[a-f0-9]{64}$/.test(value.token) ||
		!/^[a-f0-9]{64}$/.test(value.containerId) ||
		!/^sha256:[a-f0-9]{64}$/.test(value.imageId) ||
		!/^be_test_[a-f0-9]{16}$/.test(value.databasePrefix) ||
		value.host !== '127.0.0.1' ||
		!Number.isInteger(value.port) ||
		value.port < 1 ||
		value.port > 65535 ||
		value.uri !== `mongodb://127.0.0.1:${value.port}/${value.databasePrefix}`
	)
		throw new Error('Invalid owned MongoDB authorization');
	return Object.freeze({ ...value });
};
const createMongoScope = (root, deny, file = process.env.BE_TEST_MONGO_AUTHORIZATION) => {
	if (!file) return null;
	if (
		!path.isAbsolute(file) ||
		path.basename(file) !== 'mongo-authorization.json' ||
		fs.realpathSync(path.dirname(file)) !== root ||
		!fs.lstatSync(file).isFile() ||
		fs.statSync(file).mode % 0o100 !== 0
	)
		throw deny('invalid MongoDB authorization location');
	let authorization;
	try {
		authorization = validateAuthorization(root, JSON.parse(fs.readFileSync(file, 'utf8')));
	} catch {
		throw deny('invalid MongoDB authorization record');
	}
	const sockets = new Set();
	return Object.freeze({
		authorization,
		validateUri: uri => {
			try {
				const parsed = new URL(uri);
				if (
					parsed.protocol !== 'mongodb:' ||
					parsed.hostname !== authorization.host ||
					Number(parsed.port) !== authorization.port ||
					parsed.username ||
					parsed.password ||
					parsed.search ||
					parsed.hash ||
					!new RegExp(`^/${authorization.databasePrefix}(?:_[a-f0-9]{8})?$`).test(
						parsed.pathname
					)
				)
					throw new Error('not owned');
			} catch {
				throw deny('non-owned MongoDB URI');
			}
			return uri;
		},
		permitConnect: (args, socket) => {
			const options = (Array.isArray(args[0]) ? args[0] : args)[0];
			if (
				!options ||
				typeof options !== 'object' ||
				options.path ||
				options.socketPath ||
				options.host !== authorization.host ||
				Number(options.port) !== authorization.port ||
				(options.family && options.family !== 4) ||
				typeof options.lookup === 'function'
			)
				return false;
			sockets.add(socket);
			socket.once('close', () => sockets.delete(socket));
			return true;
		},
		handleLookup: args => {
			if (args[0] !== '127.0.0.1') return false;
			const callback = args[args.length - 1];
			if (typeof callback !== 'function') return false;
			process.nextTick(() => {
				if (args[1]?.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
				else callback(null, '127.0.0.1', 4);
			});
			return true;
		},
		activeCount: () => sockets.size,
		whenIdle: async () => {
			await Promise.all(
				Array.from(sockets, socket =>
					socket.closed
						? Promise.resolve()
						: new Promise(resolve => {
								socket.once('close', resolve);
						  })
				)
			);
			sockets.forEach(socket => {
				if (socket.closed) sockets.delete(socket);
			});
		},
	});
};

module.exports = { validateAuthorization, createMongoScope };
