module.exports = () => {
	throw new Error(
		'Direct legacy Jest invocation is disabled. Use npm test or npm run test:unit.'
	);
};
