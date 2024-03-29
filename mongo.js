require('dotenv').config();
const mongoose = require('mongoose');
const Market = require('./model/Market');
const AvailableTicker = require('./model/AvailableTicker');
const Currency = require('./model/Currency');
const marketsDBmanager = require('./marketsDBmanager');

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

const connect = async () => {
	console.log('connecting db...');
	await mongoose
		.connect(dbUri)
		.then(async () => {
			console.log('database conected');
			await Market.find({}).then(result => {
				console.log(`loading markets(${result.length}) from db...`);
				marketsDBmanager.setMarketsFromDB(result);
				console.log(
					`loaded markets(${result.length}) from db: `,
					JSON.stringify(marketsDBmanager.getAllMarkets(), null, 4)
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
			await Currency.find({}).then(result => {
				console.log(`loading available currencies(${result.length}) from db...`);
				marketsDBmanager.setAvailableCurrencies(result);
				console.log(
					`loaded available currencies(${result.length}) from db: `,
					marketsDBmanager.getAvailableCurrencies()
				);
				console.log(
					`available pair currencies(${result.length}): `,
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

const exec = (async () => {
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
