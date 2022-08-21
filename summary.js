module.exports = Object.freeze(
	'<h1>Coin Arbitrage</h1>' +
		'<h2>REST API</h2>' +
		'<table>' +
		'<tr>' +
		'<td><strong>Method</strong></td>' +
		'<td><strong>Endpoint</strong></td>' +
		'<td><strong>Query params</strong></td>' +
		'<td><strong>Description</strong></td>' +
		'</tr>' +
		'<tr>' +
		'<td>GET</td>' +
		'<td>/coin-arbitrage/crypto/markets</td>' +
		"<td style='text-align:center'>-</td>" +
		'<td>Show all available markets</td>' +
		'</tr>' +
		'<tr>' +
		'<td>GET</td>' +
		'<td>/coin-arbitrage/crypto/markets/tickers/:ticker/prices</td>' +
		"<td style='text-align:center'>-</td>" +
		'<td>Show all prices from available markets by ticker</td>' +
		'</tr>' +
		'<tr>' +
		'<td>GET</td>' +
		'<td>/coin-arbitrage/crypto/available-tickers</td>' +
		"<td style='text-align:center'>-</td>" +
		'<td>Show all available tickers</td>' +
		'</tr>' +
		'<tr>' +
		'<td>GET</td>' +
		'<td>/coin-arbitrage/crypto/markets/:market/tickers/:ticker</td>' +
		"<td style='text-align:center'>-</td>" +
		'<td>Show all data ticker provided by market</td>' +
		'</tr>' +
		'<tr>' +
		'<td>GET</td>' +
		'<td>/coin-arbitrage/crypto/current-arbitrages?ticker=btc-usdt</td>' +
		"<td style='text-align:center'>ticker=BTC-USD (mandatory)<br> markets=binance,coinbase (optional)" +
		'<br> top=5 (optional)' +
		'<br> minProfitPercentage=0.1 (optional)</td>' +
		'<td>Show all possible current arbitrages for available markets ordered by best profit</td>' +
		'</tr>' +
		'<tr>' +
		'<td>GET</td>' +
		'<td>/coin-arbitrage/crypto/historical-arbitrages</td>' +
		"<td style='text-align:center'>-</td>" +
		'<td>Show all historical stored arbitrages</td>' +
		'</tr>' +
		'<tr>' +
		'<td>Host</td>' +
		'<td>/coin-arbitrage/crypto/historical-arbitrages</td>' +
		"<td style='text-align:center'>-</td>" +
		'<td>Show all historical stored arbitrages</td>' +
		'</tr>' +
		'</table>' +
		'<h2>Websocket API</h2>' +
		'<table>' +
		'<tr>' +
		'<td><strong>Host</strong></td>' +
		'<td><strong>Request</strong></td>' +
		'<td><strong>Description</strong></td>' +
		'</tr>' +
		'<tr>' +
		'<td>wss://arcane-refuge-64485.herokuapp.com/</td>' +
		'<td>{ "channel":"arbitrages", "ticker":"btc-usdt"}</td>' +
		'<td>Show best ticker arbitrage for connected markets in real-time</td>' +
		'</tr>' +
		'<td>wss://arcane-refuge-64485.herokuapp.com/</td>' +
		'<td>{ "channel":"prices", "ticker":"btc-usdt"}</td>' +
		'<td>Show ticker prices for connected markets in real-time</td>' +
		'</tr>' +
		'</table>'
);
