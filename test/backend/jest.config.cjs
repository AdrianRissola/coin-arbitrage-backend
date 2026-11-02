const path = require('node:path');

module.exports = {
	rootDir: path.resolve(__dirname, '../..'),
	testEnvironment: 'node',
	watchman: false,
	testMatch: ['<rootDir>/test/backend/{unit,websocket}/**/*.test.js'],
	setupFiles: ['<rootDir>/test/backend/support/offline-guard.cjs'],
	setupFilesAfterEnv: ['<rootDir>/test/backend/support/after-env.cjs'],
	clearMocks: true,
	restoreMocks: true,
	testTimeout: 5000,
	collectCoverageFrom: [
		'*.js',
		'controller/**/*.js',
		'service/**/*.js',
		'model/**/*.js',
		'repository/**/*.js',
		'!test-teardown-globals.js',
		'!test.js',
	],
	coverageReporters: ['json', 'json-summary', 'lcov', 'text-summary'],
};
