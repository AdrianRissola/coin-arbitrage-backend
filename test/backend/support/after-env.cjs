const guard = require('./offline-guard.cjs');

let observed = 0;
const check = () => {
	const violations = guard.violations.slice(observed);
	observed = guard.violations.length;
	if (violations.length) {
		throw new Error(`Unexpected offline operations: ${violations.join(', ')}`);
	}
};

afterEach(check);
afterAll(check);
