const unit = require('./jest.config.cjs');

module.exports = {
	...unit,
	testMatch: ['<rootDir>/test/backend/persistence/**/*.test.js'],
	testTimeout: 15000,
};
