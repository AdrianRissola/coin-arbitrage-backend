const clone = value => JSON.parse(JSON.stringify(value));
const now = '2024-01-02T03:04:05.000Z';
const deferred = () => {
	let resolve;
	let reject;
	const promise = new Promise((complete, fail) => {
		resolve = complete;
		reject = fail;
	});
	return { promise, resolve, reject };
};
const controlledSave = () => {
	let resolve;
	let reject;
	let completion;
	class OwnedSavePromise extends Promise {
		catch(handler) {
			completion = super.catch(handler);
			return completion;
		}
	}
	const promise = new OwnedSavePromise((complete, fail) => {
		resolve = complete;
		reject = fail;
	});
	return { promise, resolve, reject, completion: () => completion };
};
const market = (name = 'Alpha') => ({
	name,
	website: `https://${name.toLowerCase()}.invalid`,
	type: 'synthetic exchange',
	com: {
		api: {
			rest: {
				base: `https://${name.toLowerCase()}.invalid/`,
				tickerPath: `ticker/\${ticker}`,
				pathToPrice: ['data', 'price'],
				tickerPattern: {
					separator: '-',
					baseCurrencyCaseFunction: 'toUpperCase',
					quoteCurrencyCaseFunction: 'toUpperCase',
				},
				tickers: ['BTC-USDT'],
			},
			websocket: {
				host: `${name.toLowerCase()}.invalid`,
				url: `wss://${name.toLowerCase()}.invalid`,
				tickerRequest: `\${ticker}`,
				pathToPrice: ['price'],
				tickers: ['BTC-USDT'],
			},
		},
	},
});
const controlAxios = (axios, expected) => {
	const { defaults } = axios;
	const original = defaults.adapter;
	const plans = expected.slice();
	const calls = [];
	const responses = [];
	const unexpected = [];
	let active = 0;
	defaults.adapter = async config => {
		calls.push({ method: config.method, url: config.url });
		const plan = plans.shift();
		if (!plan) {
			unexpected.push(config.url);
			throw new Error('Unexpected controlled Axios request');
		}
		active += 1;
		try {
			if (plan.error) throw plan.error;
			const data = plan.deferred ? await plan.deferred.promise : plan.data;
			const response = {
				data: JSON.stringify(data),
				status: 200,
				statusText: 'OK',
				headers: { 'content-type': 'application/json' },
				config,
				request: { testOwned: true },
			};
			responses.push(response);
			return response;
		} finally {
			active -= 1;
		}
	};
	return {
		calls,
		responses,
		close: () => {
			try {
				expect(plans).toEqual([]);
				expect(unexpected).toEqual([]);
				expect(active).toBe(0);
			} finally {
				defaults.adapter = original;
			}
		},
	};
};

module.exports = { clone, now, deferred, controlledSave, market, controlAxios };
