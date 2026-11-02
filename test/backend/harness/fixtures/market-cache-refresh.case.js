require('../../support/cache-probe.cjs');

jest.mock('../../../../model/Market', () => {
	let queries = 0;
	return {
		find: jest.fn(() => {
			queries += 1;
			return queries === 1
				? Promise.resolve([])
				: Promise.reject(new Error('B2 controlled market refresh failure'));
		}),
	};
});

test('actual Market repository cache-refresh rejection remains unhandled', () => {
	const repository = jest.requireActual('../../../../repository/marketRepository');
	expect(typeof repository.getAll).toBe('function');
});
