const mongoose = require('mongoose');

const { model } = mongoose;

const currencySchema = new mongoose.Schema({
	symbol: String,
	quote: Boolean,
	base: Boolean,
	description: String,
});

const Currency = model('Currency', currencySchema);

module.exports = Currency;
