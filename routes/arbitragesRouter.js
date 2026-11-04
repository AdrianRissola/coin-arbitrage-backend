const express = require('express');

const router = express.Router();
const arbitragesController = require('../controller/arbitrageController');
const marketController = require('../controller/marketController');
const websocketClientController = require('../controller/websocketClientController');
const summary = require('../summary');

const handle = handler => (request, response, next) =>
	Promise.resolve()
		.then(() => handler(request, response, next))
		.catch(next);

router.get('/coin-arbitrage/crypto/markets', handle(marketController.getAllMarkets));

router.get('/coin-arbitrage/crypto/markets/:ticker', handle(marketController.getAllMarketTickers));

router.get(
	'/coin-arbitrage/crypto/markets/tickers/:ticker/prices',
	handle(marketController.getAllPricesByTicker)
);

router.get(
	'/coin-arbitrage/crypto/markets/:market/tickers/:ticker',
	handle(marketController.getTickerByMarket)
);

router.get(
	'/coin-arbitrage/crypto/available-tickers',
	handle(marketController.getAllAvailableTickers)
);

router.post('/coin-arbitrage/crypto/markets', handle(marketController.saveMarket));

router.post('/coin-arbitrage/crypto/currency', handle(marketController.saveCurrency));

router.get('/coin-arbitrage/crypto/current-arbitrages', handle(arbitragesController.getArbitrages));

router.get(
	'/coin-arbitrage/crypto/historical-arbitrages',
	handle(arbitragesController.getAllHistoricalArbitrages)
);

router.post('/coin-arbitrage/crypto/arbitrages', handle(arbitragesController.saveArbitrage));

router.post(
	'/coin-arbitrage/crypto/markets/tickers/websockets',
	handle(websocketClientController.connectWebsocketClient)
);

router.get(
	'/coin-arbitrage/crypto/markets/tickers/websockets',
	handle(websocketClientController.getWebsocketClientStatus)
);

router.get('/', (request, response) => {
	response.send(summary);
});

// const { env } = process;
// const allowedOrigins =
// 	env.NODE_ENV !== 'production'
// 		? JSON.parse(env.LOCAL_ALLOWED_ORIGINS)
// 		: JSON.parse(env.PROD_ALLOWED_ORIGINS);

router.use((error, request, response, next) => {
	// Website you wish to allow to connect
	// response.setHeader('Access-Control-Allow-Origin', allowedOrigins);

	// // Request methods you wish to allow
	// response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

	// // Request headers you wish to allow
	// response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	// // Set to true if you need the website to include cookies in the requests sent
	// // to the API (e.g. in case you use sessions)
	// response.setHeader('Access-Control-Allow-Credentials', true);

	if (response.headersSent) {
		next(error);
		return;
	}
	if (Number.isInteger(error.code) && error.code >= 400 && error.code <= 599)
		response.status(error.code).json({ error });
	else response.status(500).json(error);
});

module.exports = router;
