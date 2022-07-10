require('dotenv').config()
const mongoose = require('mongoose')
const Market = require('./model/Market')
const marketsDBmanager = require('./marketsDBmanager')
const AvailableTicker = require('./model/AvailableTicker')
const connectionMngoDB = process.env.MONGO_DB_URI

mongoose.connect(connectionMngoDB)
    .then(()=>{
        console.log('database conected')
        Market.find({})
        .then(result => {
            console.log("markets from db: ", result)
            marketsDBmanager.setMarketsFromDB(result)
            mongoose.connection.close
        })
        AvailableTicker.find({})
        .then(result => {
            console.log("Available Tickers from db: ", result)
            marketsDBmanager.setAvailableTickers(result)
            mongoose.connection.close
        })
    })
    .catch(err=>{
        console.error(err)
    })



// loadedMarkets.loadMarkets.then(response=> {
//     console.log("from mongo.js: ", loadedMarkets.getMarket('bifinex'))
// })


//const Market = model('Market', marketSchema)
// const bitfinex = new Market(
//     {
//         name : "Bitfinex",
//         type : "Exchange with order book",
//         baseUrl : "https://api-pub.bitfinex.com/v2/",
//         tickers: ["tBTCUSD"]
//     }
// )
// bitfinex.save()
//     .then(result=>{
//         console.log(result)
//         mongoose.connection.close
//     })
//     .catch(err=>{
//         console.error(err)
//     })

// const arbitrageTest = new Arbitrage(
//     {
//         transactions : [{
//             type: 'BUY',
//             market : 'bitfinex',
//             pair : 'BTCUSDT',
//             price : 20000.0
//         },
//         {
//             type: "SELL",
//             market : "coinbase",
//             pair : "BTCUSDT",
//             price : 21000.0
//         }],
//         user : {
//             name : "satoshi",
//         },
//         date : new Date()
//     }
// )

// arbitrageTest.save()
//     .then(result=>{
//         console.log(result)
//         mongoose.connection.close
//     })
//     .catch(err=>{
//         console.error(err)
//     })

// Arbitrage.find({})
//     .then(result => {
//         console.log(result)
//         mongoose.connection.close
//     })