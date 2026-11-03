const http = require('node:http');
const supertest = require('supertest');
const guard = require('../../support/offline-guard.cjs');

test('an explicitly leased HTTP server supports a real owned loopback round trip', async () => {
	const server = http.createServer((request, response) => response.end('B3 owned HTTP'));
	const lease = guard.http.lease(server);
	try {
		const address = await lease.listen();
		const response = await supertest(`http://127.0.0.1:${address.port}`).get('/');
		expect(response.text).toBe('B3 owned HTTP');
	} finally {
		await lease.close();
	}
	expect(guard.http.activeCount()).toBe(0);
});
