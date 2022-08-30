const supertest = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const helper = require('./testHelper');
const Market = require('../model/Market');
const Ticker = require('../model/AvailableTicker');
const marketsDBmanager = require('../marketsDBmanager');

supertest(app);
const { env } = process;

beforeAll(async () => {
	await Market.deleteMany({});
	await Ticker.deleteMany({});

	console.log('dbUri: ', env.NODE_ENV);
	console.log('connecting db for test');
	const dbUri = env.NODE_ENV === 'test' ? env.MONGO_DB_URI_TEST : env.MONGO_DB_URI;
	await mongoose
		.connect(dbUri)
		.then(async () => {
			console.log('connected db for test');
			const savedMarkets = [];
			helper.MARKETS.forEach(market => {
				const marketToSave = new Market(market);
				const saved = marketToSave
					.save()
					.then(result => {
						console.log('TEST - saved market: ', result);
					})
					.catch(err => {
						console.error(err);
					});
				savedMarkets.push(saved);
			});
			await Promise.all(savedMarkets);

			await Market.find()
				.then(result => {
					marketsDBmanager.setMarketsFromDB(result);
				})
				.catch(err => {
					console.error(err);
				});

			const savedTickers = [];
			helper.TICKERS.forEach(ticker => {
				const tickerToSave = new Ticker(ticker);
				const saved = tickerToSave
					.save()
					.then(result => {
						console.log('TEST - ticker market: ', result);
						marketsDBmanager.setAvailableTickers(result);
					})
					.catch(err => {
						console.error(err);
					});
				savedTickers.push(saved);
			});
			await Promise.all(savedTickers);

			await Ticker.find()
				.then(result => {
					marketsDBmanager.setAvailableTickers(result);
				})
				.catch(err => {
					console.error(err);
				});
		})
		.catch(err => {
			console.error(err);
		});
});
