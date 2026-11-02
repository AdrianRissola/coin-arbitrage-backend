const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { checkPair, pins } = require('./pair.cjs');
const { layout, verifyPair } = require('./catalog.cjs');
const { createTestEnvironment } = require('./context.cjs');
const { verifyContainer, createContext } = require('./ownership.cjs');
const { parse } = require('./preflight.cjs');

const backendDir = path.resolve(__dirname, '../..');
const frontendDir = path.resolve(backendDir, '../frontend');
const currentHead = directory =>
	cp
		.execFileSync('/usr/bin/git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' })
		.trim();
const options = {
	backendDir,
	frontendDir,
	backendRevision: currentHead(backendDir),
	frontendRevision: currentHead(frontendDir),
};
const owner = {
	runId: 'int_owned_example',
	token: '1'.repeat(64),
	containerId: '2'.repeat(64),
	imageId: `sha256:${'3'.repeat(64)}`,
	imageTag: 'mongo:4.4.1',
	reportRoot: '/owned/report',
	name: 'new-owned-int-mongo',
	pid: 1234,
};
const metadata = () => ({
	id: owner.containerId,
	name: owner.name,
	imageId: owner.imageId,
	running: true,
	readOnly: true,
	labels: {
		'coin-arbitrage-test.owner': owner.token,
		'coin-arbitrage-test.root': owner.reportRoot,
		'coin-arbitrage-test.scope': 'backend-persistence',
		'ai.devin.testfoundation.run': owner.runId,
	},
	mounts: [],
	tmpfs: { '/data/db': 'rw', '/data/configdb': 'rw', '/tmp': 'rw' },
	bindings: { '27017/tcp': [{ HostIp: '127.0.0.1', HostPort: '' }] },
	ports: { '27017/tcp': [{ HostIp: '127.0.0.1', HostPort: '49152' }] },
});
const binding = () => ({
	runId: owner.runId,
	token: owner.token,
	pid: owner.pid,
	address: '127.0.0.1',
	port: 49153,
	family: 'IPv4',
	listening: true,
});
const pair = () => ({
	fixtureDigest: 'f49812d1adc8d6e7efd83620db6f63d08c9b35884a217bbcb4189b31f2009e28',
	backend: { head: pins.backend.revision },
	frontend: { head: pins.frontend.revision },
});
test('I0 validates the actual accepted pair and unchanged C0 catalog without infrastructure', () => {
	const result = checkPair(options);
	assert.equal(result.backend.frozenCoreVerified && result.frontend.frozenCoreVerified, true);
	assert.equal(result.fixtureDigest, pair().fixtureDigest);
	assert.equal(result.backend.cleanCommitValidation, false);
	assert.equal(result.frontend.lockfile, result.frontend.lockfileHead);
});
test('I0 rejects abbreviated and incorrect expected source revisions before resources', () => {
	assert.throws(
		() => checkPair({ ...options, backendRevision: pins.backend.revision.slice(0, 7) }),
		/full expected revision/
	);
	assert.throws(
		() => checkPair({ ...options, backendRevision: '0'.repeat(40) }),
		/Actual revision/
	);
});
test('I0 rejects missing/wrong-role frontend checkouts', () => {
	assert.throws(() => checkPair({ ...options, frontendDir: backendDir }), /role mismatch/);
	assert.throws(() =>
		checkPair({ ...options, frontendDir: path.join(backendDir, 'no-owned-peer') })
	);
});
test('I0 parser requires an explicit peer and rejects unknown/empty arguments', () => {
	assert.throws(() => parse([]), /explicit pinned frontend/);
	assert.throws(() => parse(['--frontend-dir']), /Invalid/);
	assert.throws(() => parse(['--mongo-uri', 'mongodb://127.0.0.1:27017/existing']), /Invalid/);
});
test('I0 mismatch control changes only a new fixture copy and fails actual pair verification', () => {
	const temporary = fs.mkdtempSync(
		path.join(process.env.TEST_BOOTSTRAP_TMPDIR || os.tmpdir(), 'int-parity-negative-')
	);
	const copy = path.join(temporary, 'fixtures');
	const peer = layout(frontendDir);
	const local = layout(backendDir);
	fs.cpSync(peer.fixtures, copy, { recursive: true });
	assert.doesNotThrow(() => verifyPair(local, { ...peer, fixtures: copy }));
	fs.appendFileSync(path.join(copy, 'available-tickers.json'), '\n');
	assert.throws(() => verifyPair(local, { ...peer, fixtures: copy }), /Checksum mismatch/);
	assert.doesNotThrow(() => verifyPair(local, peer));
});
test('I0 ownership controls accept only the exact live synthetic receipt shape', () => {
	assert.equal(verifyContainer(metadata(), owner), 49152);
	const context = createContext(metadata(), owner, binding(), pair());
	assert.equal(context.mongoUri, 'mongodb://127.0.0.1:49152/testfoundation_int_owned_example');
	assert.equal(context.ownerLabel, owner.runId);
	assert.equal(
		createTestEnvironment({ mode: 'real-loopback', context, expected: { ...context } })
			.TEST_TRANSPORT_MODE,
		'real-loopback'
	);
});
[
	[
		'container ID',
		value => {
			Object.assign(value, { id: '4'.repeat(64) });
		},
	],
	[
		'image ID',
		value => {
			Object.assign(value, { imageId: `sha256:${'4'.repeat(64)}` });
		},
	],
	[
		'owner nonce',
		value => {
			Object.assign(value.labels, { 'coin-arbitrage-test.owner': '4'.repeat(64) });
		},
	],
	[
		'C0 run label',
		value => {
			Object.assign(value.labels, { 'ai.devin.testfoundation.run': 'other' });
		},
	],
	[
		'read-only root',
		value => {
			Object.assign(value, { readOnly: false });
		},
	],
	[
		'persistent mount',
		value => {
			Object.assign(value, { mounts: [{ Type: 'volume' }] });
		},
	],
	[
		'not running',
		value => {
			Object.assign(value, { running: false });
		},
	],
	[
		'wildcard publish',
		value => {
			Object.assign(value.ports['27017/tcp'][0], { HostIp: '0.0.0.0' });
		},
	],
	[
		'existing/default port',
		value => {
			Object.assign(value.ports['27017/tcp'][0], { HostPort: '27017' });
		},
	],
].forEach(([name, change]) => {
	test(`I0 rejects ${name} instead of trusting context self-assertions`, () => {
		const value = metadata();
		change(value);
		assert.throws(() => verifyContainer(value, owner), /ownership|binding/);
	});
});
[
	[
		'foreign process',
		value => {
			Object.assign(value, { pid: value.pid + 1 });
		},
	],
	[
		'closed listener',
		value => {
			Object.assign(value, { listening: false });
		},
	],
	[
		'wildcard listener',
		value => {
			Object.assign(value, { address: '0.0.0.0' });
		},
	],
	[
		'Mongo endpoint reused for HTTP',
		value => {
			Object.assign(value, { port: 49152 });
		},
	],
].forEach(([name, change]) => {
	test(`I0 rejects ${name} in the provider binding receipt`, () => {
		const value = binding();
		change(value);
		assert.throws(() => createContext(metadata(), owner, value, pair()), /listener|endpoint/);
	});
});
