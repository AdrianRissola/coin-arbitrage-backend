const express = require('express')
const router = express.Router()
const arbitragesController = require('../controller/arbitragesController')

router.get('/coin-arbitrage/crypto/markets', arbitragesController.getAllMarkets)

router.get('/coin-arbitrage/crypto/tickers', arbitragesController.getAllTickers)

router.get('/coin-arbitrage/crypto/current-arbitrages', arbitragesController.getArbitrages)

router.get('/coin-arbitrage/crypto/historical-arbitrages', arbitragesController.getAllHistoricalArbitrages)

router.post('/coin-arbitrage/crypto/arbitrages', arbitragesController.saveArbitrage)

router.get('/', (request, response) => {
    response.send(
        '<h1>Coin Arbitrage</h1>'+
        '<h2>Available Endpoints</h2>'+
        '<table>'+
            '<tr>'+
                '<td><strong>Method</strong></td>'+
                '<td><strong>Endpoint</strong></td>'+
                '<td><strong>Query params</strong></td>'+
                '<td><strong>Description</strong></td>'+
            '</tr>'+
            '<tr>'+
                '<td>GET</td>'+   
                '<td>/coin-arbitrage/crypto/markets</td>'+
                '<td style=\'text-align:center\'>-</td>'+
                '<td>Show all available markets</td>'+
            '</tr>'+
            '<tr>'+
                '<td>GET</td>'+
                '<td>/coin-arbitrage/crypto/tickers</td>'+
                '<td style=\'text-align:center\'>-</td>'+
                '<td>Show all available tickers</td>'+
            '</tr>'+
            '<tr>'+
                '<td>GET</td>'+   
                '<td>/coin-arbitrage/crypto/current-arbitrages</td>'+
                '<td style=\'text-align:center\'>ticker=BTC-USD (mandatory)<br> markets=binance,coinbase (optional) <br> top=5 (optional)</td>'+
                '<td>Show all possible current arbitrages for available markets ordered by best profit</td>'+
            '</tr>'+
            '<tr>'+
                '<td>GET</td>'+
                '<td>/coin-arbitrage/crypto/historical-arbitrages</td>'+
                '<td style=\'text-align:center\'>-</td>'+
                '<td>Show all historical stored arbitrages</td>'+
            '</tr>'+
        '</table>'
    )
})


router.use((request, response) => {
    response.status(404).json({error: 'not found'})
})

module.exports = router;