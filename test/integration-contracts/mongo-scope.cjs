const createMongoScope = (authorization, deny) => {
	const sockets = new Set();
	return Object.freeze({
		authorization,
		validateUri: uri => {
			if (uri !== authorization.mongoUri) throw deny('non-owned INT MongoDB namespace');
			return uri;
		},
		permitConnect: (args, socket) => {
			const options = (Array.isArray(args[0]) ? args[0] : args)[0];
			if (
				!options ||
				typeof options !== 'object' ||
				options.path ||
				options.socketPath ||
				options.host !== '127.0.0.1' ||
				Number(options.port) !== authorization.mongoPort ||
				(options.family && options.family !== 4) ||
				typeof options.lookup === 'function'
			)
				return false;
			sockets.add(socket);
			socket.once('close', () => sockets.delete(socket));
			return true;
		},
		handleLookup: args => {
			if (args[0] !== '127.0.0.1' || typeof args[args.length - 1] !== 'function')
				return false;
			process.nextTick(() =>
				args[args.length - 1](
					null,
					args[1]?.all ? [{ address: '127.0.0.1', family: 4 }] : '127.0.0.1',
					4
				)
			);
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

module.exports = { createMongoScope };
