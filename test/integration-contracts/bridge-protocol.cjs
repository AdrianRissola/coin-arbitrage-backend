const flows = Object.freeze([
	'rest',
	'arbitrage',
	'ticker',
	'best',
	'historical',
	'markets',
	'error',
]);
const actions = Object.freeze(['status', 'snapshot', 'feed', 'disconnect', 'close-browser']);
const selectFlows = value => {
	if (value === 'all') return flows.slice();
	const selected = typeof value === 'string' ? value.split(',') : [];
	if (
		!selected.length ||
		new Set(selected).size !== selected.length ||
		selected.some(flow => !flows.includes(flow))
	)
		throw new Error('Unknown, duplicate or empty INT flow selection');
	return flows.filter(flow => selected.includes(flow));
};
const validateControl = (value, token) => {
	if (
		!value ||
		Object.keys(value).sort().join(',') !== 'action,args,id,token,version' ||
		value.version !== 1 ||
		!/^[a-f0-9]{32}$/.test(value.id || '') ||
		!/^[a-f0-9]{64}$/.test(token || '') ||
		value.token !== token ||
		!actions.includes(value.action) ||
		!value.args ||
		typeof value.args !== 'object' ||
		Array.isArray(value.args) ||
		Buffer.byteLength(JSON.stringify(value)) > 65536
	)
		throw new Error('Invalid or non-owned INT control request');
	return value;
};

module.exports = { flows, actions, selectFlows, validateControl };
