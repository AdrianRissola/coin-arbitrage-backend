const net = require('node:net');

test('caught network runner control', () => {
	expect(() => net.connect({ host: '127.0.0.1', port: 1 })).toThrow();
	expect(true).toBe(true);
});
