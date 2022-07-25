const mongoose = require('mongoose')
const {model} = mongoose


const availableTickersToMarketTickersSchema = new mongoose.Schema({
    'BTC-USD': String,
    'BTC-USDT': String,
    'ETH-USD': String,
    'ETH-USDT': String,
    'ETH-BTC': String
})

const uslSchema = new mongoose.Schema({
    base: String,
    tickerPath: String,
    'pathToPrice': []
})

const marketSchema = new mongoose.Schema({
    name: String,
    type : String,
    url: uslSchema,
    availableTickersToMarketTickers: availableTickersToMarketTickersSchema
})

const Market = model('Market', marketSchema)

module.exports =  Market