const mongoose = require('mongoose');

const { model } = mongoose;

const transactionSchema = new mongoose.Schema({
	type: String, // BUY or SELL
	market: String,
	pair: String,
	price: Number,
});

const arbitrageSchema = new mongoose.Schema({
	transactions: [transactionSchema],
	profitPercentage: Number,
	profitPerUnit: Number,
	date: Date,
});

const Arbitrage = model('Arbitrage', arbitrageSchema);

module.exports = Arbitrage;
