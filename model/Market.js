const mongoose = require('mongoose')
const {model} = mongoose

const marketSchema = new mongoose.Schema({
    name: String,
    type : String,
    baseUrl: String, 
    tickers : [String]
})

const Market = model('Market', marketSchema)

module.exports =  Market