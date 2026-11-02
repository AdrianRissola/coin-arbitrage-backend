const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { createMongoResource } = require('./mongo-resource.cjs');
const { createContext } = require('./ownership.cjs');

const bounded = (promise, milliseconds, label) => {
	let timeout;
	return Promise.race([
		promise,
		new Promise((resolve, reject) => {
			timeout = setTimeout(() => reject(new Error(`INT deadline: ${label}`)), milliseconds);
		}),
	]).finally(() => clearTimeout(timeout));
};
const startProvider = async (pair, directory) => {
	['mongo', 'provider'].forEach(name =>
		fs.mkdirSync(path.join(directory, name), { mode: 0o700 })
	);
	const providerDirectory = path.join(directory, 'provider');
	const code = path.join(pair.backend.root, 'test/integration-contracts');
	const mongo = createMongoResource(path.join(directory, 'mongo'));
	const waiting = new Map();
	let child;
	let exited;
	let exitInfo;
	let closing;
	let cleanup;
	const close = () => {
		if (closing) return closing;
		closing = (async () => {
			const failures = [];
			try {
				if (child) {
					if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
					const kill = setTimeout(() => {
						if (child.exitCode === null && child.signalCode === null)
							child.kill('SIGKILL');
					}, 7000);
					try {
						exitInfo = await exited;
					} finally {
						clearTimeout(kill);
					}
					const filename = path.join(providerDirectory, 'provider-cleanup.json');
					cleanup = fs.existsSync(filename)
						? JSON.parse(fs.readFileSync(filename))
						: null;
					if (exitInfo.code !== 0 || exitInfo.signal || cleanup?.success !== true)
						throw new Error(
							'Owned INT provider did not close naturally with verified cleanup'
						);
				}
			} catch (error) {
				failures.push(error);
			}
			try {
				mongo.close();
			} catch (error) {
				failures.push(error);
			}
			waiting.forEach(entry => entry.reject(new Error('INT provider closed')));
			waiting.clear();
			if (failures.length) throw new AggregateError(failures, 'INT resource cleanup failed');
		})();
		return closing;
	};
	const control = (action, args = {}) => {
		if (!child?.connected || exitInfo)
			return Promise.reject(new Error('Owned INT IPC is not live'));
		const id = crypto.randomBytes(16).toString('hex');
		const operation = new Promise((resolve, reject) => {
			waiting.set(id, { resolve, reject });
			child.send({ version: 1, id, token: mongo.owner.token, action, args }, error => {
				if (error) reject(error);
			});
		});
		return bounded(operation, 10000, `provider control ${action}`).finally(() =>
			waiting.delete(id)
		);
	};
	try {
		await mongo.start();
		const authorization = {
			version: 1,
			scope: 'owned-int-provider',
			reportRoot: providerDirectory,
			runId: mongo.owner.runId,
			token: mongo.owner.token,
			containerId: mongo.owner.containerId,
			mongoPort: mongo.owner.mongoPort,
			mongoUri: mongo.owner.mongoUri,
		};
		const file = path.join(providerDirectory, 'int-authorization.json');
		const httpAuthorization = path.join(providerDirectory, 'http-authorization.json');
		fs.writeFileSync(file, JSON.stringify(authorization), { mode: 0o600 });
		fs.writeFileSync(
			httpAuthorization,
			JSON.stringify({
				version: 1,
				scope: 'owned-http',
				reportRoot: providerDirectory,
				token: mongo.owner.token,
			}),
			{ mode: 0o600 }
		);
		const coverage = path.join(providerDirectory, 'v8-coverage');
		fs.mkdirSync(coverage);
		child = cp.fork(path.join(code, 'provider.cjs'), [], {
			cwd: pair.backend.root,
			silent: true,
			env: {
				PATH: process.env.PATH || '',
				HOME: path.join(directory, 'mongo/home'),
				TMPDIR: providerDirectory,
				NODE_ENV: 'test',
				TZ: 'UTC',
				LOCAL_ALLOWED_ORIGINS: '["http://localhost:3000"]',
				PROD_ALLOWED_ORIGINS: '[]',
				MONGO_DB_URI: '',
				MONGO_DB_URI_TEST: '',
				BE_TEST_REPORT_ROOT: providerDirectory,
				BE_TEST_HTTP_AUTHORIZATION: httpAuthorization,
				INT_TEST_AUTHORIZATION: file,
				NODE_V8_COVERAGE: coverage,
				NODE_OPTIONS: `--require=${path.join(
					code,
					'../backend/support/offline-guard.cjs'
				)} --require=${path.join(code, 'provider-preload.cjs')}`,
			},
		});
		mongo.owner.pid = child.pid;
		exited = new Promise(resolve => {
			child.once('close', (exitCode, signal) => {
				exitInfo = { code: exitCode, signal };
				waiting.forEach(entry =>
					entry.reject(new Error('INT provider exited during control'))
				);
				resolve(exitInfo);
			});
		});
		child.stdout.on('data', data =>
			fs.appendFileSync(path.join(providerDirectory, 'stdout.log'), data)
		);
		child.stderr.on('data', data =>
			fs.appendFileSync(path.join(providerDirectory, 'stderr.log'), data)
		);
		const ready = await bounded(
			new Promise((resolve, reject) => {
				child.once('error', reject);
				child.once('exit', (exitCode, signal) =>
					reject(new Error(`INT provider startup exit: ${exitCode}/${signal}`))
				);
				child.on('message', message => {
					if (message.version !== 1) {
						reject(new Error('Invalid INT provider IPC version'));
						return;
					}
					if (message.ready === true) {
						resolve(message.binding);
						return;
					}
					const entry = waiting.get(message.id);
					if (!entry) return;
					if (message.ok === true) entry.resolve(message.value);
					else
						entry.reject(
							new Error(message.error || 'Invalid INT provider control reply')
						);
				});
			}),
			40000,
			'real seed/cache/listener readiness'
		);
		const verifiedContext = createContext(mongo.inspect(), mongo.owner, ready, pair);
		const binding = Object.fromEntries(
			['restEndpoint', 'websocketEndpoint', 'origin'].map(key => [key, verifiedContext[key]])
		);
		return {
			control,
			close,
			token: mongo.owner.token,
			context: async () =>
				createContext(mongo.inspect(), mongo.owner, await control('status'), pair),
			report: () => ({
				mongo: mongo.report(),
				provider: {
					pid: child.pid,
					binding,
					exit: exitInfo,
					cleanup,
					directory: providerDirectory,
				},
			}),
		};
	} catch (error) {
		try {
			await close();
		} catch (release) {
			fs.writeFileSync(
				path.join(directory, 'startup-cleanup-error.json'),
				JSON.stringify({
					error: release.message,
					causes: release.errors?.map(value => value.message),
				})
			);
		}
		throw error;
	}
};

module.exports = { bounded, startProvider };
