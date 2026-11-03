const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { once } = require('node:events');
const { Socket } = require('node:net');
const { createMongoScope } = require('./mongo-scope.cjs');

const authorization = {
	mongoUri: 'mongodb://127.0.0.1:49152/testfoundation_int_owned',
	mongoPort: 49152,
};
const create = () => createMongoScope(authorization, value => new Error(value));
test('INT Mongo ownership waits while the native stream has not closed', async () => {
	const scope = create();
	const socket = new Socket();
	assert.equal(scope.permitConnect([{ host: '127.0.0.1', port: 49152 }], socket), true);
	let complete = false;
	const idle = scope.whenIdle().then(() => {
		complete = true;
	});
	await Promise.resolve();
	await Promise.resolve();
	assert.equal(complete, false);
	socket.destroy();
	await idle;
	assert.equal(scope.activeCount(), 0);
});
test('INT Mongo prunes a native closed stream after the driver removes early close observers', async () => {
	const scope = create();
	const socket = new Socket();
	scope.permitConnect([{ host: '127.0.0.1', port: 49152 }], socket);
	socket.removeAllListeners('close');
	const closed = once(socket, 'close');
	socket.destroy();
	await closed;
	assert.equal(socket.closed, true);
	assert.equal(scope.activeCount(), 1);
	let complete = false;
	const idle = scope.whenIdle().then(() => {
		complete = true;
	});
	await new Promise(resolve => {
		setImmediate(resolve);
	});
	assert.equal(complete, true);
	await idle;
	assert.equal(scope.activeCount(), 0);
});
test('INT Mongo namespace grants only its exact newly issued URI', () => {
	const scope = create();
	assert.equal(scope.validateUri(authorization.mongoUri), authorization.mongoUri);
	assert.throws(() => scope.validateUri('mongodb://127.0.0.1:49152/existing'), /non-owned/);
	assert.throws(() => scope.validateUri(`${authorization.mongoUri}?tls=true`), /non-owned/);
});
[
	{ host: 'localhost', port: 49152 },
	{ host: '127.0.0.1', port: 27017 },
	{ path: '/unowned/socket' },
	{ host: '127.0.0.1', port: 49152, family: 6 },
	{ host: '127.0.0.1', port: 49152, lookup: () => {} },
].forEach(options => {
	test(`INT Mongo denies foreign connection options ${JSON.stringify(options)}`, () => {
		assert.equal(create().permitConnect([options], new EventEmitter()), false);
	});
});
