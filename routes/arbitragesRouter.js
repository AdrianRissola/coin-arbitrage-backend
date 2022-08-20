const express = require('express');

const router = express.Router();
const arbitragesController = require('../controller/arbitrageController');
const marketController = require('../controller/marketController');
const websocketClientController = require('../controller/websocketClientController');
const summary = require('../summary');

router.get('/coin-arbitrage/crypto/markets', marketController.getAllMarkets);

router.get(
	'/coin-arbitrage/crypto/markets/tickers/:ticker/prices',
	marketController.getAllPricesByTicker
);

router.get(
	'/coin-arbitrage/crypto/markets/:market/tickers/:ticker',
	marketController.getTickerByMarket
);

router.get('/coin-arbitrage/crypto/available-tickers', marketController.getAllTickers);

router.post('/coin-arbitrage/crypto/markets', marketController.saveMarket);

router.get('/coin-arbitrage/crypto/current-arbitrages', arbitragesController.getArbitrages);

router.get(
	'/coin-arbitrage/crypto/historical-arbitrages',
	arbitragesController.getAllHistoricalArbitrages
);

router.post('/coin-arbitrage/crypto/arbitrages', arbitragesController.saveArbitrage);

router.post(
	'/coin-arbitrage/crypto/markets/tickers/websockets',
	websocketClientController.connectWebsocketClient
);

router.get(
	'/coin-arbitrage/crypto/markets/tickers/websockets',
	websocketClientController.getWebsocketClientStatus
);

router.get('/', (request, response) => {
	response.send(summary);
});

router.use((error, request, response, next) => {
	if (error.code) response.status(error.code).json({ error });
	else response.status(500).json(error);
	next();
});

module.exports = router;
