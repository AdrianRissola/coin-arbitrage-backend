// TODO: move to MongoDB
const isEnabled = () => ({
	'stream.binance.com': false,
	'ws-feed.exchange.coinbase.com': false,
	'ws.poloniex.com': false,
	'ws.kraken.com': false,
	'ws.bitmex.com': false,
	'ws.bitstamp.net': false,
	'api.hitbtc.com': false,
	'stream.crypto.com': false,
	'api-pub.bitfinex.com': false,
	'ws.okx.com': false,
	'api.upbit.com': false,
});

exports.logDataByHost = (host, data) => {
	if (isEnabled()[host])
		console.log(`Received message from ${host}:`, JSON.stringify(data, null, 4));
};
