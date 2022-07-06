const mongoose = require('mongoose')
const {model, Schema} = mongoose
const {transactionSchema} = require('./Transaction')

const userSchema = new mongoose.Schema({
    name : String
})

const arbitrageSchema = new mongoose.Schema({
    transactions : [transactionSchema],
    user : userSchema,
    date : Date
})

const Arbitrage = model('Arbitrage', arbitrageSchema)

module.exports = Arbitrage