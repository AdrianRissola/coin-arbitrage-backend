const NodeCache = require('node-cache');
const Market = require('../model/Market');
const marketsDBmanager = require('../marketsDBmanager');

const marketCache = new NodeCache();

const getAll = async () => {
	console.log(`Retrieving markets...`);
	return Market.find({}).then(markets => {
		console.log(
			`Retrieved markets(${markets.length}) from db: `,
			markets.map(m => m.name)
		);
		return markets;
	});
};

const updateCache = async () => {
	console.log('Saving markets in marketCache...');
	const markets = await getAll();
	const isSaved = marketCache.set(
		'markets',
		markets.map(m => m.toObject())
	);
	console.log(`Markets Saved in marketCache:`, isSaved);
};

const init = (async () => {
	console.log(`Retrieving markets...`);
	const markets = await getAll();
	marketsDBmanager.setMarketsFromDB(markets);
	updateCache();
})();

const save = market =>
	market
		.save()
		.then(marketSaved => {
			console.log('Saved market:', marketSaved.name);
			return marketSaved;
		})
		.catch(e => {
			console.log('Error when saving market:', market.name, e);
		});

const saveAll = markets => {
	const savedMarkets = [];
	markets.forEach(async market => {
		savedMarkets.push(await save(market));
	});
	updateCache();
	marketsDBmanager.setMarketsFromDB(savedMarkets);
	return savedMarkets;
};

module.exports = {
	getAll,
	saveAll,
};
