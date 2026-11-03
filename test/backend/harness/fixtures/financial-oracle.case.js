jest.mock('../../../../model/Arbitrage', () => jest.fn());

const { calculateArbitrages } = require('../../../../service/arbitrageService');

test('deliberately wrong financial oracle is rejected', () => {
	const results = calculateArbitrages([
		{ platform: 'Alpha', ticker: 'BTC-USDT', price: 80 },
		{ platform: 'Gamma', ticker: 'BTC-USDT', price: 125 },
	]);
	expect(results[0].profitPercentage).toBe(999);
});
