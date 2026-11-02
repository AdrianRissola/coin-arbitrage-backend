const unit = require('./jest.config.cjs');

module.exports = {
	...unit,
	testMatch: [
		'<rootDir>/test/backend/unit/{arbitrageService,arbitrage-query,currency-service,market-service,rest-client,stream-services,repository-cache}.test.js',
	],
};
