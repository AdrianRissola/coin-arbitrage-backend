// const mongoose = require('mongoose')
const Market = require('./model/Market');

let marketsFromDB = null;
let availableTickers = null;

exports.setMarketsFromDB = markets => {
	marketsFromDB = markets;
};

const getMarketByName = name => {
	let marketFound = null;
	for (let i = 0; i < marketsFromDB.length; i++) {
		if (marketsFromDB[i].name.toUpperCase() === name.toUpperCase()) {
			marketFound = marketsFromDB[i];
			break;
		}
	}
	return marketFound;
};

exports.getMarketsByNames = names => {
	const markets = [];
	for (let i = 0; i < names.length; i++) {
		const foundMarket = getMarketByName(names[i]);
		if (foundMarket) markets.push(foundMarket);
	}
	return markets;
};

exports.getMarketByWebsocketHost = websocketHost => {
	let marketFound = null;
	for (let i = 0; i < marketsFromDB.length; i++) {
		if (marketsFromDB[i].com.api.websocket.host.toUpperCase() === websocketHost.toUpperCase()) {
			marketFound = marketsFromDB[i];
			break;
		}
	}
	return marketFound;
};

exports.getWebsocketHosts = (marketsNames, ticker) => {
	const markets = this.getMarketsWithWebsocket(ticker, marketsNames);

	const websocketHosts = [];
	for (const market of markets) {
		websocketHosts.push(market.com.api.websocket.host);
	}

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

exports.getAllMarkets = () => marketsFromDB;

exports.getAllMarketsByTicker = ticker => {
	const markets = [];
	for (let i = 0; i < marketsFromDB.length; i++) {
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

const hasWebsocket = (market, ticker) =>
	!!(
		market.com &&
		market.com.api &&
		market.com.api.websocket &&
		market.com.api.websocket.availableTickersToMarketTickers[ticker.toUpperCase()] &&
		market.com.api.websocket.host &&
		market.com.api.websocket.url &&
		market.com.api.websocket.tickerRequest
	);

exports.getMarketsWithWebsocket = (ticker, marketNames) => {
	const marketsWithWebsockets = marketsFromDB.filter(market => {
		let marketNameFound = null;
		if (marketNames)
			marketNameFound = marketNames.find(
				marketName => marketName.toUpperCase() === market.name.toUpperCase()
			);
		return hasWebsocket(market, ticker) && (marketNameFound || !marketNames);
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
