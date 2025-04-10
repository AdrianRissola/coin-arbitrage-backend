const Currency = require('../model/Currency');
const NodeCache = require('node-cache');
const marketsDBmanager = require('../marketsDBmanager');

const currencyCache = new NodeCache();

const getAll = () => {
	return currencyCache.get('currencies');
};

const save = async currency => {
	return await new Currency(currency)
		.save()
		.then(currency => {
			console.log('new currency saved:', currency);
			return currency;
		})
		.catch(err => {
			console.error(err);
		});
};

const init = (async () => {
	console.log(`Retrieving currencies...`);
	return await Currency.find({}).then(currencies => {
		console.log(
			`Retrieved currencies(${currencies.length}): `,
			currencies.map(c => `${c.symbol}(${c.name})`)
		);
		marketsDBmanager.setAvailableCurrencies(currencies);
		saveInCahce(currencies);
		return currencies;
	});
})();

const saveInCahce = currencies => {
	console.log('Saving currencies in currencyCache');
	const saved = currencyCache.set(
		'currencies',
		currencies.map(c => c.toObject())
	);
	console.log(`Currencies Saved in currencyCache`, saved);
};

module.exports = {
	getAll,
	save,
};
