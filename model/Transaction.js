const mongoose = require('mongoose')
const {model} = mongoose

const transactionSchema = new mongoose.Schema({
    type: String,         // BUY or SELL
    market : String,
    pair : String,
    price : Number
})

const Transaction = model('Transaction', transactionSchema)

module.exports = {transactionSchema, Transaction}