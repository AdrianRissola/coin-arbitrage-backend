const mongoose = require('mongoose');

const { model } = mongoose;

const availableTickerSchema = new mongoose.Schema({
	name: String,
	description: String,
	type: String,
	rest: Boolean,
	websocket: Boolean,
});

const AvailableTicker = model('AvailableTicker', availableTickerSchema);

module.exports = AvailableTicker;
