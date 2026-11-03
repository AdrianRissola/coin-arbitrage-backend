const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { EventEmitter } = require('node:events');
const { validateAuthorization, createMongoScope } = require('../support/mongo-scope.cjs');
const { verifyOwnedContainer } = require('../support/disposable-mongo.cjs');

const authorization = root => ({
	version: 1,
	scope: 'owned-disposable-mongo',
	reportRoot: root,
	token: 'a'.repeat(64),
	containerId: 'b'.repeat(64),
	imageId: `sha256:${'c'.repeat(64)}`,
	host: '127.0.0.1',
	port: 19701,
	databasePrefix: 'be_test_0123456789abcdef',
	uri: 'mongodb://127.0.0.1:19701/be_test_0123456789abcdef',
});
[
	{ host: 'localhost' },
	{ host: 'database.invalid' },
	{ port: 0 },
	{ port: 65536 },
	{ token: '' },
	{ containerId: 'not owned' },
	{ imageId: 'latest' },
	{ databasePrefix: 'existing_database' },
	{ reportRoot: '/different' },
	{ uri: 'mongodb://fake-user:fake-password@127.0.0.1:19701/existing' },
	{ uri: 'mongodb+srv://database.invalid/test' },
].forEach((change, index) => {
	test(`unsafe MongoDB capability ${index + 1} is rejected without echoing URI values`, () => {
		assert.throws(
			() => validateAuthorization('/owned', { ...authorization('/owned'), ...change }),
			error => error.message === 'Invalid owned MongoDB authorization'
		);
	});
});
test('a valid run-issued MongoDB capability is immutable', () => {
	assert.equal(Object.isFrozen(validateAuthorization('/owned', authorization('/owned'))), true);
});
test('MongoDB socket fixture supports a symlinked temporary directory', () => {
	const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'be-mongo-symlink-'));
	try {
		const target = path.join(root, 'actual');
		const alias = path.join(root, 'alias');
		fs.mkdirSync(target);
		fs.symlinkSync(target, alias, 'dir');
		const child = cp.spawnSync(
			process.execPath,
			[
				'--test',
				'--test-reporter=tap',
				'--test-name-pattern=^MongoDB socket permission is exact',
				__filename,
			],
			{
				env: {
					PATH: process.env.PATH,
					BE_TEST_REPORT_ROOT: process.env.BE_TEST_REPORT_ROOT,
					NODE_OPTIONS: process.env.NODE_OPTIONS,
					TMPDIR: alias,
				},
				encoding: 'utf8',
				timeout: 30000,
			}
		);
		assert.deepEqual(
			{
				status: child.status,
				signal: child.signal,
				tests: Number(child.stdout?.match(/^# tests (\d+)$/m)?.[1]),
				passed: Number(child.stdout?.match(/^# pass (\d+)$/m)?.[1]),
			},
			{ status: 0, signal: null, tests: 1, passed: 1 },
			child.stdout + child.stderr
		);
	} finally {
		fs.rmSync(root, { recursive: true });
	}
});
test('MongoDB socket permission is exact, tracks close and refuses alternate hosts/ports/lookups', async () => {
	const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'be-mongo-scope-')));
	try {
		const file = path.join(root, 'mongo-authorization.json');
		fs.writeFileSync(file, JSON.stringify(authorization(root)), { mode: 0o600 });
		const scope = createMongoScope(root, operation => new Error(operation), file);
		const socket = new EventEmitter();
		assert.equal(
			scope.permitConnect([{ host: '127.0.0.1', port: 19701, family: 4 }], socket),
			true
		);
		assert.equal(scope.activeCount(), 1);
		let closed = false;
		const idle = scope.whenIdle().then(() => {
			closed = true;
		});
		await new Promise(resolve => {
			setImmediate(resolve);
		});
		assert.equal(closed, false);
		socket.emit('close');
		await idle;
		assert.equal(scope.activeCount(), 0);
		[
			{ host: 'localhost', port: 19701 },
			{ host: '127.0.0.1', port: 19702 },
			{ path: '/tmp/mongo.sock' },
			{ host: '127.0.0.1', port: 19701, lookup: () => {} },
		].forEach(options => assert.equal(scope.permitConnect([options], socket), false));
		assert.equal(
			scope.validateUri(`${authorization(root).uri}_0123abcd`),
			`${authorization(root).uri}_0123abcd`
		);
		assert.throws(() => scope.validateUri('mongodb://127.0.0.1:19701/admin'), /non-owned/);
	} finally {
		fs.rmSync(root, { recursive: true });
	}
});
test('no MongoDB authorization means no MongoDB scope', () => {
	assert.equal(
		createMongoScope('/owned', () => {}, ''),
		null
	);
});
const owner = {
	containerId: 'b'.repeat(64),
	imageId: `sha256:${'c'.repeat(64)}`,
	name: 'coin-arb-b5-owned',
	reportRoot: '/owned',
	token: 'a'.repeat(64),
};
const metadata = () => ({
	id: owner.containerId,
	name: owner.name,
	imageId: owner.imageId,
	labels: {
		'coin-arbitrage-test.owner': owner.token,
		'coin-arbitrage-test.root': owner.reportRoot,
		'coin-arbitrage-test.scope': 'backend-persistence',
	},
	readOnly: true,
	mounts: [],
	tmpfs: { '/data/db': 'rw', '/data/configdb': 'rw', '/tmp': 'rw' },
	bindings: { '27017/tcp': [{ HostIp: '127.0.0.1', HostPort: '' }] },
});
test('exact ID/image/nonce/path/loopback/tmpfs proof is required before resource actions', () => {
	assert.equal(verifyOwnedContainer(metadata(), owner).id, owner.containerId);
});
[
	{ id: 'd'.repeat(64) },
	{ imageId: `sha256:${'d'.repeat(64)}` },
	{ name: 'existing' },
	{ labels: {} },
	{ readOnly: false },
	{ mounts: [{ Type: 'bind' }] },
	{ tmpfs: {} },
	{ bindings: { '27017/tcp': [{ HostIp: '0.0.0.0' }] } },
].forEach((change, index) => {
	test(`ownership mismatch ${
		index + 1
	} refuses cleanup rather than matching a broad name`, () => {
		assert.throws(
			() => verifyOwnedContainer({ ...metadata(), ...change }, owner),
			/refusing resource action/
		);
	});
});
