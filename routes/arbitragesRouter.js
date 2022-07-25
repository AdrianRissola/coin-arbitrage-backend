const express = require('express')
const router = express.Router()
const arbitragesController = require('../controller/arbitragesController')
const summary = require('../summary')

router.get('/coin-arbitrage/crypto/markets', arbitragesController.getAllMarkets)

router.get('/coin-arbitrage/crypto/markets/tickers/:ticker/prices', arbitragesController.getAllPricesByTicker)

router.get('/coin-arbitrage/crypto/markets/:market/tickers/:ticker', arbitragesController.getTickerByMarket)

router.get('/coin-arbitrage/crypto/available-tickers', arbitragesController.getAllTickers)

router.get('/coin-arbitrage/crypto/current-arbitrages', arbitragesController.getArbitrages)

router.get('/coin-arbitrage/crypto/historical-arbitrages', arbitragesController.getAllHistoricalArbitrages)

router.post('/coin-arbitrage/crypto/arbitrages', arbitragesController.saveArbitrage)

router.get('/', (request, response) => { response.send(summary) })


router.use((request, response, next) => {
    response.status(response.locals.error.code).json({error: response.locals.error})
})

module.exports = router;