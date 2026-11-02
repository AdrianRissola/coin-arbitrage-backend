const unit = require('./jest.config.cjs');

module.exports = { ...unit, testMatch: ['<rootDir>/test/backend/unit/model-schemas.test.js'] };
