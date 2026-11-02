require('../../support/cache-probe.cjs');

jest.mock('../../../../model/Market', () => ({
	find: jest.fn(() => Promise.reject(new Error('B2 controlled market import failure'))),
}));

test('actual Market repository import retains its unhandled query rejection', () => {
	const repository = jest.requireActual('../../../../repository/marketRepository');
	expect(typeof repository.getAll).toBe('function');
});
