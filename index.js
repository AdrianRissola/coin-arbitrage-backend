//const http = require('http')
require('./mongo')
const express = require('express')
const app = express()
const logger = require('./loggerMiddleware')
const marketService = require('./service/marketService')
const cors = require('cors')
const Arbitrage = require('./model/Arbitrage')
const Market = require('./model/Market')

const arbitrageService = require('./service/arbitrageService')


app.use(express.json())
app.use(logger)

console.log('hello world')

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


app.post('/api/', (request, response) => {
    console.log("input: ", request.body)
    
    if(!request.body || !request.body.content) {
        return response.status(400).json({
            error: 'invalid request'
        })
    }

    const newRequest = request.body;
    response.json(newRequest)
})

app.get('/coin-arbitrage/crypto/markets', (request, response) => {
    marketService.getAllMarkets()
    .then(markets => {
        console.log("markets: ", markets)
        response.json(markets)
    })
    .catch(err=>{
        console.error(err)
    })
})

app.get('/coin-arbitrage/crypto/current-arbitrages', (request, response) => {
    console.log("request.query.markets: ", request.query.markets)
    let markets = null
    if(!!request.query.markets)
        markets = request.query.markets.split(",")
    arbitrageService.getArbitrages(markets)
    .then(result=>{
        let top = parseInt(request.query.top)
        if(top && top>0 && top<=result.length)
            result = result.slice(0, parseInt(request.query.top))
        console.log("arbitrageService.getArbitrages(): ", result)
        response.json(result)
    })
    .catch(err=>{
        console.error(err)
    })
})

app.get('/coin-arbitrage/crypto/historical-arbitrages', (request, response) => {
    console.log("finding all stored arbitrage: ")
    Arbitrage.find()
    .then(result=>{
        console.log("findAll: ", result)
        response.json(result)
    })
    .catch(err=>{
        console.error(err)
    })
})

app.post('/coin-arbitrage/crypto/arbitrage', (request, response) => {
    
    if(!request.body) {
        return response.status(400).json({
            error: 'invalid request'
        })
    }
    const arbitrage = new Arbitrage(request.body)
    arbitrage.save()
    .then(result=>{
        console.log("saved: ", result)
        response.json(result)
    })
    .catch(err=>{
        console.error(err)
    })

})

app.use((request, response) => {
    response.status(404).json({error: 'not found'})
})

// const app = http.createServer((request, response) =>{
//     response.writeHead(200, { 'Content-Type': 'application/json' })
//     response.end(JSON.stringify(dummy))
// })

const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})


