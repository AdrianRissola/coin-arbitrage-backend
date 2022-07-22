const mongoose = require('mongoose')
const {model} = mongoose


const availableTickersToMarketTickersSchema = new mongoose.Schema({
    'BTC-USD': String,
    'BTC-USDT': String,
    'ETH-USD': String,
    'ETH-USDT': String,
    'ETH-BTC': String
})

const marketSchema = new mongoose.Schema({
    name: String,
    type : String,
    baseUrl: String, 
    tickers : [String],
    availableTickersToMarketTickers: availableTickersToMarketTickersSchema
})

const Market = model('Market', marketSchema)

module.exports =  Market