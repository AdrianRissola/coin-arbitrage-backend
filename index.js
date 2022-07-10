require('./mongo')
const express = require('express')
const app = express()
const logger = require('./loggerMiddleware')
const router = require('./routes/arbitragesRouter')


app.use(express.json())
app.use(logger)
app.use(router)

app.get('/', (request, response) => {
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
                '<td>/coin-arbitrage/crypto/current-arbitrages</td>'+
                '<td style=\'text-align:center\'>markets=binance,coinbase (optional) <br> top=5 (optional)</td>'+
                '<td>Show all possible current arbitrages for available markets ordered by best opportunities</td>'+
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


const PORT = process.env.PORT
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})


