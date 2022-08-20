require('dotenv').config();
const mongoose = require('mongoose');
const Market = require('./model/Market');
const marketsDBmanager = require('./marketsDBmanager');
const AvailableTicker = require('./model/AvailableTicker');

const { env } = process;

const dbUri = env.NODE_ENV === 'test' ? env.MONGO_DB_URI_TEST : env.MONGO_DB_URI;
if (!dbUri) {
	console.error('.env file is mandatory');
}

const connect = async function () {
	console.log('connecting db...');
	const dbCon = await mongoose
		.connect(dbUri)
		.then(async () => {
			console.log('database conected');
			await Market.find({}).then(result => {
				console.log(`loading markets(${result.length}) from db...`);
				marketsDBmanager.setMarketsFromDB(result);
				console.log(
					`loaded markets(${result.length}) from db: `,
					marketsDBmanager.getAllMarkets()
				);
			});
			await AvailableTicker.find({}).then(result => {
				console.log(`loading available Tickers(${result.length}) from db...`);
				marketsDBmanager.setAvailableTickers(result);
				console.log(
					`loaded available Tickers(${result.length}) from db: `,
					marketsDBmanager.getAllAvailableTickers()
				);
				// mongoose.connection.close()  ???
			});
		})
		.catch(err => {
			console.log('error: ', err);
			console.error('error: ', err);
		});
};

const exec = (async function () {
	await connect();
})();

module.exports = exec;

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
