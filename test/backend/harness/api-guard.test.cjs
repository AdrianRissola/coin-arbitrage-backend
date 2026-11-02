const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const guard = path.resolve(__dirname, '../support/offline-guard.cjs');
const probe = (source, mode = 'valid') => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'be-http-guard-'));
	const env = {
		PATH: process.env.PATH,
		BE_TEST_REPORT_ROOT: directory,
		NODE_OPTIONS: `--require ${JSON.stringify(guard)}`,
	};
	if (mode !== 'offline') {
		const file = path.join(directory, 'http-authorization.json');
		fs.writeFileSync(
			file,
			JSON.stringify({
				version: 1,
				scope: 'owned-http',
				reportRoot:
					mode === 'wrong-root' ? `${directory}-other` : fs.realpathSync(directory),
				token: 'a'.repeat(64),
			}),
			{ mode: 0o600 }
		);
		env.BE_TEST_HTTP_AUTHORIZATION = file;
	}
	const observed = `${source};process.once('exit',()=>{require('node:fs').writeSync(2,JSON.stringify(require('node:net')[Symbol.for('coin-arbitrage.offline-test-guard')].violations))});`;
	return cp.spawnSync(process.execPath, ['-e', observed], {
		env,
		encoding: 'utf8',
		timeout: 10000,
	});
};
const setup = `const http=require('node:http'),net=require('node:net');const scope=net[Symbol.for('coin-arbitrage.offline-test-guard')].http;`;
const withLease = body =>
	`${setup}(async()=>{const server=http.createServer((q,s)=>s.end('owned'));const lease=scope.lease(server);try{${body}}finally{await lease.close()}})().catch(e=>{console.error(e);process.exitCode=1});`;

test('actual leased ephemeral loopback completes and cleanup removes its capability', () => {
	const result = probe(
		withLease(
			`const address=await lease.listen();await new Promise((resolve,reject)=>http.get({host:'127.0.0.1',port:address.port,path:'/'},response=>{let text='';response.on('data',d=>text+=d);response.on('end',()=>text==='owned'?resolve():reject(Error('wrong body')))}).on('error',reject));await lease.close();if(scope.activeCount()!==0)throw Error('leak');`
		)
	);
	assert.equal(result.status, 0, result.stderr);
});

[
	['unregistered listener', `${setup}try{http.createServer().listen(0,'127.0.0.1')}catch{}`],
	['unowned loopback', `${setup}try{net.connect({host:'127.0.0.1',port:1})}catch{}`],
	['remote connect', `${setup}try{net.connect({host:'synthetic.invalid',port:443})}catch{}`],
	['localhost alias', `${setup}try{net.connect({host:'localhost',port:1})}catch{}`],
	['TLS', `try{require('node:tls').connect({host:'127.0.0.1',port:1})}catch{}`],
	['DNS', `try{require('node:dns').lookup('synthetic.invalid',()=>{})}catch{}`],
	['numeric DNS outside bind', `try{require('node:dns').lookup('127.0.0.1',()=>{})}catch{}`],
	[
		'fixed port',
		withLease(`try{server.listen({host:'127.0.0.1',port:1,exclusive:true})}catch{}`),
	],
	[
		'wildcard host',
		withLease(`try{server.listen({host:'0.0.0.0',port:0,exclusive:true})}catch{}`),
	],
	[
		'expired capability',
		withLease(
			`const address=await lease.listen();await lease.close();try{net.connect({host:'127.0.0.1',port:address.port})}catch{}`
		),
	],
].forEach(([name, source]) => {
	test(`API permission does not permit caught ${name}`, () => {
		const result = probe(source);
		assert.equal(result.status, 1, result.stderr);
		assert.match(result.stderr, /BE_TEST_GUARD_BLOCKED/);
	});
});

test('wrong-root authorization fails before a listener can be registered', () => {
	const result = probe('', 'wrong-root');
	assert.equal(result.status, 1);
	assert.match(result.stderr, /invalid HTTP authorization/);
});

test('absent authorization keeps the default listener prohibition', () => {
	const result = probe(
		`${setup}try{http.createServer().listen(0,'127.0.0.1')}catch{}`,
		'offline'
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /network listener/);
});

test('forced success cannot hide a leaked owned HTTP lease', () => {
	const result = probe(withLease(`await lease.listen();process.exit(0);`));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /HTTP lease leak/);
});
