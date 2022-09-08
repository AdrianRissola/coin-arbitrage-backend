const mongoose = require('mongoose');

const { model } = mongoose;

const availableTickersToMarketTickersSchema = new mongoose.Schema({
	'BTC-USD': String,
	'BTC-USDT': String,
	'ETH-USD': String,
	'ETH-USDT': String,
	'ETH-BTC': String,
	'ADA-USDT': String,
	'LTC-USDT': String,
	'XRP-USDT': String,
	'SOL-USDT': String,
	'DOGE-USDT': String,
	'TRX-USDT': String,
	'DOT-BTC': String,
	'ADA-BTC': String,
	'LTC-BTC': String,
	'XRP-BTC': String,
	'DOGE-BTC': String,
	'SOL-BTC': String,
	'TRX-BTC': String,
	'MATIC-USDT': String,
	'MATIC-BTC': String,
	'UNI-USDT': String,
	'UNI-BTC': String,
	'XMR-USDT': String,
	'XMR-BTC': String,
	'XLM-USDT': String,
	'XLM-BTC': String,
	'EOS-USDT': String,
	'EOS-BTC': String,
	'MIOTA-USDT': String,
	'MIOTA-BTC': String,
});

const websocketSchema = new mongoose.Schema({
	host: String,
	url: String,
	tickerRequest: String,
	unsubscribeTickerRequest: String,
	availableTickersToMarketTickers: availableTickersToMarketTickersSchema,
	pathToPrice: [],
	pathToChannelId: [],
	pingFrequencyInSeconds: Number,
});

const restSchema = new mongoose.Schema({
	base: String,
	tickerPath: String,
	pathToPrice: [],
});

const apiSchema = new mongoose.Schema({
	rest: restSchema,
	websocket: websocketSchema,
});

const comSchema = new mongoose.Schema({
	api: apiSchema,
});

const marketSchema = new mongoose.Schema({
	name: String,
	type: String,
	availableTickersToMarketTickers: availableTickersToMarketTickersSchema,
	com: comSchema,
});

const Market = model('Market', marketSchema);

module.exports = Market;
