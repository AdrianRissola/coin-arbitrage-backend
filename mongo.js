require('dotenv').config();
const mongoose = require('mongoose');
const Market = require('./model/Market');
const Currency = require('./model/Currency');
const marketsDBmanager = require('./marketsDBmanager');
const marketRepository = require('./repository/marketRepository');
const currencyRepository = require('./repository/currencyRepository');

const helper = require('./test/testHelper');

const { env } = process;
console.log('------------------BEGIN ENV DATA------------------');
console.log(env);
console.log('------------------END ENV DATA------------------');

const dbUri = env.NODE_ENV === 'test' ? env.MONGO_DB_URI_TEST : env.MONGO_DB_URI;
if (!dbUri) {
	console.error('.env file is mandatory');
}

const restoreDB = async () => {
	await Market.deleteMany({});

	await mongoose
		.connect(dbUri)
		.then(async () => {
			console.log('connected db for restore');
			const savedMarkets = [];
			helper.MARKETS.forEach(market => {
				const marketToSave = new Market(market);
				const saved = marketToSave
					.save()
					.then(result => {
						console.log('restoreDB - saved market: ', result);
					})
					.catch(err => {
						console.error(err);
					});
				savedMarkets.push(saved);
			});
			await Promise.all(savedMarkets);
		})
		.catch(err => {
			console.error(err);
		});
};
// restoreDB();

let isConnected = false;
const connect = (async () => {
	if (!isConnected) {
		console.log('connecting db...');
		return await mongoose
			.connect(dbUri)
			.then(async () => {
				console.log('database connected');
				isConnected = true;
				return true;
			})
			.catch(err => {
				console.log('error: ', err);
				console.error('error: ', err);
				return false;
			});
	}
})();

// const exec = (async () => {
// 	const connected = await connect();
// 	if (connected) {
// 		const markets = await marketRepository.getAll();
// 		marketsDBmanager.setMarketsFromDB(markets);
// 		const currencies = await currencyRepository.getAll();
// 		marketsDBmanager.setAvailableCurrencies(currencies);
// 		//currencyRepository.init(currencies);
// 	}
// })();

//module.exports = exec;

// exports.connect = async ()=>{
//     console.log('connecting db...')
//     const dbCon = await mongoose.connect(connectionMngoDB);
//     console.log(dbCon)
// }
// .then( ()=>{
//     console.log('database conected')
//     await Market.find({})
//     .then(result => {
//         console.log("markets from db: ", result)
//         marketsDBmanager.setMarketsFromDB(result)
//         //mongoose.connection.close()  // preg
//     })
//     await AvailableTicker.find({})
//     .then(result => {
//         console.log("Available Tickers from db: ", result)
//         marketsDBmanager.setAvailableTickers(result)
//         //mongoose.connection.close()
//     })
// })
// .catch(err=>{
//     console.log(err)
//     console.error(err)
// })

// module.exports = connectDatabase

// loadedMarkets.loadMarkets.then(response=> {
//     console.log("from mongo.js: ", loadedMarkets.getMarket('bifinex'))
// })

// const Market = model('Market', marketSchema)
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
