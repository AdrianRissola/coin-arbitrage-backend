const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { version: jestVersion } = require('jest/package.json');
const { createTestEnvironment } = require('../integration-contracts/context.cjs');
const { verifyCatalog } = require('../integration-contracts/catalog.cjs');
const { createDisposableMongo } = require('./support/disposable-mongo.cjs');
const { runAll } = require('./all.cjs');

const root = path.resolve(__dirname, '../..');
const guard = path.join(__dirname, 'support/offline-guard.cjs');
const SHUTDOWN_GRACE_MS = 1000;
const STAGE_TIMEOUT_MS = 90000;
const PROBE_TIMEOUT_MS = 30000;
const probes = [
	'passing',
	'failing',
	'empty',
	'skipped',
	'no-tests',
	'forced-success',
	'caught-network',
	'financial-oracle',
	'legacy-command',
	'currency-cache-init',
	'market-cache-init',
	'market-cache-refresh',
	'http-passing',
	'api-wrong-status',
	'api-market-map-failure',
	'api-history-failure',
	'api-current-error',
	'ws-wrong-send',
	'ws-exchange-json-failure',
	'ws-wire-passing',
	'ws-wrong-wire-profit',
	'ws-null-request-failure',
];
const options = { suite: 'offline', coverage: false, handles: false };
const args = process.argv.slice(2);
const main = async () => {
	while (args.length) {
		const flag = args.shift();
		if (['--suite', '--probe', '--report-dir', '--image'].includes(flag)) {
			const value = args.shift();
			if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
			const key = {
				'--suite': 'suite',
				'--probe': 'probe',
				'--report-dir': 'directory',
				'--image': 'image',
			}[flag];
			options[key] = value;
		} else if (flag === '--coverage') options.coverage = true;
		else if (flag === '--detect-open-handles') options.handles = true;
		else throw new Error(`Unknown runner option: ${flag}`);
	}
	if (
		![
			'unit',
			'offline',
			'services',
			'schema',
			'api',
			'websocket',
			'websocket-wire',
			'persistence',
			'all',
		].includes(options.suite)
	)
		throw new Error('Suite not implemented in this offline runner');
	if (['persistence', 'all'].includes(options.suite) && options.probe)
		throw new Error('Infrastructure profiles do not accept runner probes');
	if (
		options.image &&
		(!['persistence', 'all'].includes(options.suite) || options.image !== 'mongo:4.4.1')
	)
		throw new Error(
			'Only the fixed cached MongoDB 4.4.1 image is supported by infrastructure profiles'
		);
	if (options.probe && !probes.includes(options.probe)) throw new Error('Unknown runner probe');
	verifyCatalog(
		path.join(root, 'test/fixtures/contracts/v1'),
		path.join(root, 'test/integration-contracts')
	);
	if (options.suite === 'all') {
		await runAll(options);
		return;
	}
	const directory = options.directory
		? path.resolve(options.directory)
		: fs.mkdtempSync(path.join(os.tmpdir(), 'coin-arbitrage-be-'));
	if (options.directory) fs.mkdirSync(directory, { mode: 0o700 });
	['tmp', 'home', 'cache'].forEach(name => fs.mkdirSync(path.join(directory, name)));
	const env = {
		...createTestEnvironment(),
		PATH: process.env.PATH,
		HOME: path.join(directory, 'home'),
		TMPDIR: path.join(directory, 'tmp'),
		XDG_CACHE_HOME: path.join(directory, 'cache'),
		TEST_BOOTSTRAP_TMPDIR: path.join(directory, 'tmp'),
		BE_TEST_REPORT_ROOT: directory,
		NODE_OPTIONS: `--require ${JSON.stringify(guard)}`,
		TZ: 'UTC',
		CI: 'true',
		FORCE_COLOR: '0',
	};
	if (['api', 'websocket-wire'].includes(options.suite)) {
		const authorization = path.join(directory, 'http-authorization.json');
		fs.writeFileSync(
			authorization,
			JSON.stringify({
				version: 1,
				scope: 'owned-http',
				reportRoot: fs.realpathSync(directory),
				token: crypto.randomBytes(32).toString('hex'),
			}),
			{ mode: 0o600 }
		);
		env.BE_TEST_HTTP_AUTHORIZATION = authorization;
	}
	const children = new Set();
	const stopping = new Map();
	let interrupted = false;
	const stop = child => {
		if (!children.has(child) || !child.pid || stopping.has(child)) return;
		const signal = value => {
			try {
				if (process.platform === 'win32') child.kill(value);
				else process.kill(-child.pid, value);
			} catch (error) {
				if (error.code !== 'ESRCH') throw error;
			}
		};
		signal('SIGTERM');
		stopping.set(
			child,
			setTimeout(() => signal('SIGKILL'), SHUTDOWN_GRACE_MS)
		);
	};
	['SIGINT', 'SIGTERM'].forEach(signal => {
		process.once(signal, () => {
			interrupted = true;
			process.exitCode = signal === 'SIGINT' ? 130 : 143;
			children.forEach(stop);
		});
	});
	const execute = (name, commandArgs) =>
		new Promise(resolve => {
			const child = cp.spawn(process.execPath, commandArgs, {
				cwd: root,
				env,
				detached: process.platform !== 'win32',
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			children.add(child);
			let stdout = '';
			let stderr = '';
			let timedOut = false;
			child.stdout.on('data', data => {
				stdout += data;
			});
			child.stderr.on('data', data => {
				stderr += data;
			});
			const timeout = setTimeout(
				() => {
					timedOut = true;
					stop(child);
				},
				options.probe ? PROBE_TIMEOUT_MS : STAGE_TIMEOUT_MS
			);
			child.on('error', error => {
				stderr += error.message;
			});
			child.on('close', (code, signal) => {
				clearTimeout(timeout);
				clearTimeout(stopping.get(child));
				stopping.delete(child);
				children.delete(child);
				fs.writeFileSync(path.join(directory, `${name}.log`), stdout + stderr);
				process.stdout.write(stdout);
				process.stderr.write(stderr);
				resolve({ name, childCode: code, signal, timedOut, stdout });
			});
		});
	const mongo = options.suite === 'persistence' ? createDisposableMongo(directory) : null;
	try {
		if (mongo) {
			const authorization = await mongo.start();
			if (interrupted) throw new Error('Persistence startup interrupted');
			const file = path.join(directory, 'mongo-authorization.json');
			fs.writeFileSync(file, JSON.stringify(authorization), { mode: 0o600 });
			env.BE_TEST_MONGO_AUTHORIZATION = file;
		}
		let configuration = options.suite === 'api' ? 'api.config.cjs' : 'jest.config.cjs';
		if (options.suite === 'services') configuration = 'services.config.cjs';
		if (options.suite === 'schema') configuration = 'schema.config.cjs';
		if (options.suite === 'websocket') configuration = 'websocket.config.cjs';
		if (options.suite === 'websocket-wire') configuration = 'websocket-wire.config.cjs';
		if (options.suite === 'persistence') configuration = 'persistence.config.cjs';
		if (options.probe) configuration = 'probe.config.cjs';
		const jestArgs = [
			require.resolve('jest/bin/jest'),
			'--config',
			options.probe === 'legacy-command'
				? path.join(root, 'package.json')
				: path.join(__dirname, configuration),
			'--runInBand',
			'--verbose',
			'--json',
			'--outputFile',
			path.join(directory, 'jest-result.json'),
			'--cacheDirectory',
			path.join(directory, 'cache/jest'),
			'--coverageDirectory',
			path.join(directory, 'coverage'),
		];
		if (options.probe === 'no-tests') {
			jestArgs.push('--testPathPattern', 'no-matching-b1-control-files');
		} else if (options.probe) {
			jestArgs.push(
				'--runTestsByPath',
				path.join(
					__dirname,
					options.probe === 'legacy-command'
						? 'unit/dto-helper.test.js'
						: `harness/fixtures/${options.probe}.case.js`
				)
			);
		}
		if (options.coverage) jestArgs.push('--coverage');
		if (options.handles) jestArgs.push('--detectOpenHandles');
		const first = await execute('jest', jestArgs);
		let results;
		if (fs.existsSync(path.join(directory, 'jest-result.json'))) {
			results = JSON.parse(fs.readFileSync(path.join(directory, 'jest-result.json'), 'utf8'));
		}
		const stages = [
			{
				name: first.name,
				childCode: first.childCode,
				signal: first.signal,
				timedOut: first.timedOut,
				totalTests: results?.numTotalTests || 0,
				passedTests: results?.numPassedTests || 0,
				skippedTests: results?.numPendingTests || 0,
				failedTests: results?.numFailedTests || 0,
				reason: results ? 'jest-result' : 'missing-jest-result',
				success:
					first.childCode === 0 &&
					!first.timedOut &&
					results?.success === true &&
					results.numTotalTests > 0 &&
					results.numPassedTests > 0 &&
					results.numFailedTests === 0,
			},
		];
		if (
			!options.probe &&
			!interrupted &&
			['offline', 'api', 'websocket-wire', 'persistence'].includes(options.suite)
		) {
			const nativeFiles = {
				api: [
					'test/backend/harness/api-guard.test.cjs',
					'test/backend/harness/api-runner.test.cjs',
				],
				'websocket-wire': [
					'test/backend/harness/api-guard.test.cjs',
					'test/backend/harness/ws-wire-runner.test.cjs',
				],
				persistence: ['test/backend/harness/mongo-scope.test.cjs'],
				offline: [
					'test/integration-contracts/bootstrap.test.cjs',
					'test/security.test.cjs',
					'test/marketWebSocketClient.test.cjs',
					'test/backend/harness/guard.test.cjs',
					'test/backend/harness/runner.test.cjs',
					'test/backend/harness/ws-controlled-runner.test.cjs',
					'test/backend/harness/mongo-scope.test.cjs',
					'test/backend/harness/all-result.test.cjs',
				],
			}[options.suite];
			const native = await execute('node', ['--test', '--test-reporter=tap', ...nativeFiles]);
			const totalTests = Number(native.stdout.match(/# tests (\d+)/)?.[1] || 0);
			const passedTests = Number(native.stdout.match(/# pass (\d+)/)?.[1] || 0);
			stages.push({
				name: native.name,
				childCode: native.childCode,
				signal: native.signal,
				timedOut: native.timedOut,
				totalTests,
				passedTests,
				success:
					native.childCode === 0 &&
					!native.timedOut &&
					totalTests > 0 &&
					passedTests === totalTests,
			});
		}
		mongo?.close();
		const report = {
			version: 1,
			scope: options.probe ? `runner-control:${options.probe}` : options.suite,
			node: process.version,
			jest: jestVersion,
			stages,
			...(mongo ? { persistence: mongo.report() } : {}),
			success: !interrupted && stages.every(stage => stage.success),
		};
		const reportPath = path.join(directory, 'report.json');
		fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
		process.stdout.write(`Report: ${reportPath}\n`);
		if (!report.success) process.exitCode = process.exitCode || 1;
	} finally {
		mongo?.close();
	}
};

main().catch(error => {
	process.stderr.write(`Backend test runner failed: ${error.message}\n`);
	process.exitCode = process.exitCode || 1;
});
