const config = require('./jest.config.cjs');

module.exports = {
	...config,
	testMatch: ['<rootDir>/test/backend/harness/fixtures/*.case.js'],
};
