// const mongoose = require('mongoose')
const Market = require('./model/Market');

let marketsFromDB = null;
let availableTickers = null;

exports.setMarketsFromDB = markets => {
	marketsFromDB = markets;
};

const getMarketByName = name => {
	let marketFound = null;
	for (let i = 0; i < marketsFromDB.length; i += 1) {
		if (marketsFromDB[i].name.toUpperCase() === name.toUpperCase()) {
			marketFound = marketsFromDB[i];
			break;
		}
	}
	return marketFound;
};

const supports = (market, api) => {
	let result = false;
	if (api === 'rest')
		result =
			market.com &&
			market.com.api &&
			market.com.api.rest &&
			market.com.api.rest.base &&
			market.com.api.rest.tickerPath &&
			market.com.api.rest.pathToPrice;
	if (api === 'websocket')
		result =
			market.com &&
			market.com.api &&
			market.com.api.websocket &&
			market.com.api.websocket.host &&
			market.com.api.websocket.url &&
			market.com.api.websocket.tickerRequest &&
			market.com.api.websocket.availableTickersToMarketTickers &&
			market.com.api.websocket.pathToPrice;
	return result;
};

exports.getMarketsByNames = async (names, api) => {
	const markets = [];
	for (let i = 0; i < names.length; i += 1) {
		const foundMarket = getMarketByName(names[i]);
		if (foundMarket && (supports(foundMarket, api) || !api)) markets.push(foundMarket);
	}
	return markets;
};

exports.getMarketByWebsocketHost = websocketHost => {
	let marketFound = null;
	for (let i = 0; i < marketsFromDB.length; i += 1) {
		if (
			marketsFromDB[i].com.api.websocket &&
			marketsFromDB[i].com.api.websocket.host &&
			marketsFromDB[i].com.api.websocket.host.toUpperCase() === websocketHost.toUpperCase()
		) {
			marketFound = marketsFromDB[i];
			break;
		}
	}
	return marketFound;
};

exports.getWebsocketHosts = (marketsNames, ticker) => {
	const markets = this.getMarketsWithWebsocket(ticker, marketsNames);

	const websocketHosts = [];
	markets.forEach(market => {
		websocketHosts.push(market.com.api.websocket.host);
	});

	return websocketHosts;
};

exports.getMarketByName = name => {
	let markets = null;
	if (!marketsFromDB) {
		Market.find({}).then(result => {
			console.log('no markets from db, reloaded: ', result);
			// mongoose.connection.close
			markets = getMarketByName(name);
		});
	} else {
		markets = getMarketByName(name);
	}
	return markets;
};

exports.loadMarketsFromDB = async () => {
	await Market.find({}).then(result => {
		this.setMarketsFromDB(result);
		console.log('reloading markets from db: ', result);
		// mongoose.connection.close
		return result;
	});
};

exports.getMarketTickerName = (marketName, ticker) => {
	let markets = null;
	if (!marketsFromDB) {
		Market.find({}).then(result => {
			console.log('no markets from db, reloaded: ', result);
			// mongoose.connection.close
			markets =
				getMarketByName(marketName).availableTickersToMarketTickers[ticker.toUpperCase()];
		});
	} else {
		markets = getMarketByName(marketName).availableTickersToMarketTickers[ticker.toUpperCase()];
	}
	return markets;
};

exports.getAllMarkets = api => marketsFromDB.filter(market => supports(market, api) || !api);

exports.getAllMarketsByTicker = ticker => {
	const markets = [];
	for (let i = 0; i < marketsFromDB.length; i += 1) {
		if (marketsFromDB[i].availableTickersToMarketTickers[ticker.toUpperCase()])
			markets.push(marketsFromDB[i]);
	}
	console.log('getAllMarketsByTicker ', ticker, markets);
	return markets;
};

exports.setAvailableTickers = tickers => {
	availableTickers = tickers;
};

exports.getAllAvailableTickers = () => availableTickers;

exports.getAllAvailableTickersByApi = api =>
	availableTickers ? availableTickers.filter(at => at[api]) : null;

exports.getAllAvailableTickerNamesByApi = api => {
	const tickerNames = [];
	if (availableTickers) {
		availableTickers.forEach(at => {
			if (at[api]) tickerNames.push(at.name);
		});
	}
	return tickerNames;
};

const hasAtLeastOneTicker = (market, api, tickers) =>
	tickers.some(
		ticker => market.com.api[api].availableTickersToMarketTickers[ticker.toUpperCase()]
	);

const hasWebsocket = (market, tickers) =>
	!!(
		market.com &&
		market.com.api &&
		market.com.api.websocket &&
		market.com.api.websocket.availableTickersToMarketTickers &&
		hasAtLeastOneTicker(market, 'websocket', tickers) &&
		market.com.api.websocket.host &&
		market.com.api.websocket.url &&
		market.com.api.websocket.tickerRequest
	);

exports.getMarketsWithWebsocket = (tickers, marketNames) => {
	let marketsWithWebsockets = null;
	if (marketsFromDB)
		marketsWithWebsockets = marketsFromDB.filter(market => {
			let marketNameFound = null;
			if (marketNames)
				marketNameFound = marketNames.find(
					marketName => marketName.toUpperCase() === market.name.toUpperCase()
				);
			return hasWebsocket(market, tickers) && (marketNameFound || !marketNames);
		});
	return marketsWithWebsockets;
};

// const getMarketByKeyValue = (key, value) => {
// 	let marketFound = null
// 	for (let i = 0; i < marketsFromDB.length; i++) {
// 		if (marketsFromDB[i][key].toUpperCase() === value.toUpperCase()) {
// 			marketFound = marketsFromDB[i]
// 			break
// 		}
// 	}
// 	return marketFound
// }
