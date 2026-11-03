const unit = require('./jest.config.cjs');

module.exports = {
	...unit,
	testMatch: ['<rootDir>/test/backend/api/**/*.test.js'],
};
