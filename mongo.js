require('dotenv').config()
const mongoose = require('mongoose')
const {model} = mongoose

const connectionMngoDB = process.env.MONGO_DB_URI

mongoose.connect(connectionMngoDB)
    .then(()=>{
        console.log('database conected')
    })
    .catch(err=>{
        console.error(err)
    })

const marketSchema = new mongoose.Schema({
    name: String,
    type : String,
    baseUrl: String, 
    tickers : [String]
})

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