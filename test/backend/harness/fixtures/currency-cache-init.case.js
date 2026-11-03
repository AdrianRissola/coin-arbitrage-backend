require('../../support/cache-probe.cjs');

jest.mock('../../../../model/Currency', () => ({
	find: jest.fn(() => Promise.reject(new Error('B2 controlled currency import failure'))),
}));

test('actual Currency repository import retains its unhandled query rejection', () => {
	const repository = jest.requireActual('../../../../repository/currencyRepository');
	expect(repository.getAll()).toBeUndefined();
});
