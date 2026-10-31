'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');
const vm = require('node:vm');

const SOURCE_PATH = path.join(__dirname, '..', 'mongo.js');
const SYNTHETIC_DB_URI = 'mongodb://synthetic-user:synthetic-pass@127.0.0.1:27017/synthetic_db';
const SYNTHETIC_TEST_DB_URI = 'mongodb://synthetic-user:synthetic-pass@127.0.0.1:27017/synthetic_test_db';
const PRIVATE_CANARY = 'SYNTHETIC_PRIVATE_CANARY_7f3a91c2';
const SENSITIVE_FRAGMENTS = [PRIVATE_CANARY, 'synthetic-pass', 'synthetic-user'];

const flushAsyncWork = async () => {
	for (let i = 0; i < 5; i += 1) {
		await new Promise(resolve => {
			setImmediate(resolve);
		});
	}
};

const loadMongoModule = async env => {
	const output = [];
	const connectCalls = [];
	const capture = (...args) => {
		output.push(args.map(arg => (typeof arg === 'string' ? arg : util.inspect(arg, { depth: null }))).join(' '));
	};
	const capturedConsole = {
		log: capture,
		info: capture,
		warn: capture,
		error: capture,
		debug: capture,
	};
	const mocks = {
		dotenv: { config: () => ({ parsed: {} }) },
		mongoose: {
			connect: uri => {
				connectCalls.push(uri);
				return Promise.resolve();
			},
		},
		'./model/Market': function Market() {},
		'./model/Currency': function Currency() {},
		'./marketsDBmanager': {},
		'./repository/marketRepository': {},
		'./repository/currencyRepository': {},
		'./test/testHelper': { MARKETS: [] },
	};
	const mockRequire = specifier => {
		if (!Object.prototype.hasOwnProperty.call(mocks, specifier)) {
			throw new Error(`Unexpected require: ${specifier}`);
		}
		return mocks[specifier];
	};

	const source = fs.readFileSync(SOURCE_PATH, 'utf8');
	const wrapper = vm.runInNewContext(`(function (exports, require, module, process, console) {${source}\n})`, {}, {
		filename: SOURCE_PATH,
	});
	const moduleObject = { exports: {} };
	wrapper(moduleObject.exports, mockRequire, moduleObject, { env }, capturedConsole);
	await flushAsyncWork();

	return { output: output.join('\n'), connectCalls };
};

const syntheticEnv = overrides => ({
	NODE_ENV: 'development',
	MONGO_DB_URI: SYNTHETIC_DB_URI,
	MONGO_DB_URI_TEST: SYNTHETIC_TEST_DB_URI,
	SYNTHETIC_PRIVATE_SETTING: PRIVATE_CANARY,
	...overrides,
});

test('mongo.js does not write environment values to the console', async () => {
	const { output } = await loadMongoModule(syntheticEnv());
	SENSITIVE_FRAGMENTS.forEach(fragment => {
		assert.ok(!output.includes(fragment), `console output contains a sensitive fragment (${fragment.length} chars)`);
	});
	assert.ok(!output.includes('ENV DATA'), 'console output contains an environment dump marker');
});

test('mongo.js connects only with the configured URI for the selected environment', async () => {
	const development = await loadMongoModule(syntheticEnv());
	assert.deepEqual(development.connectCalls, [SYNTHETIC_DB_URI]);

	const testing = await loadMongoModule(syntheticEnv({ NODE_ENV: 'test' }));
	assert.deepEqual(testing.connectCalls, [SYNTHETIC_TEST_DB_URI]);
	SENSITIVE_FRAGMENTS.forEach(fragment => {
		assert.ok(!testing.output.includes(fragment));
	});
});
