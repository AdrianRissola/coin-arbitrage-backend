const helper = require('./testHelper')
require('./testDbLoader')
const mongoose = require('mongoose')
const supertest = require("supertest")
const app = require("../index")
const api = supertest(app)
//const jest = require("jest")

jest.setTimeout(90000)

describe('test App/index.js', () => {

    test('GET markets with status 200', async () => { 
        const response = await api.get('/coin-arbitrage/crypto/markets')
            .expect(200)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
        expect(response.body.length).toBeTruthy();
    })

    test('GET tickers with status 200', async () => {
        const response = await api.get('/coin-arbitrage/crypto/available-tickers')
            .expect(200)
        console.log('GET tickers with status 200: ', response.body)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
        expect(response.body.length).toBeTruthy();
    })
})

    
describe('test GET /coin-arbitrage/crypto/markets/:market/tickers/:ticker', () => {

    test('GET binance btc-usdt ticker - with status 200', async () => {
        const response = await api.get('/coin-arbitrage/crypto/markets/binance/tickers/btc-usdt')
            .expect(200)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

    test('GET market ticker with invalid market - status 404', async () => {
        const response = await api.get('/coin-arbitrage/crypto/markets/xxxxx/tickers/btc-usdt')
            .expect(404)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

    test('GET market ticker with invalid ticker - status 404', async () => {
        const response = await api.get('/coin-arbitrage/crypto/markets/binance/tickers/xxx-yyy')
            .expect(404)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

})
    
describe('test GET /coin-arbitrage/crypto/current-arbitrages', () => {

    test('GET top 3 current-arbitrages for all available markets - with status 200', async () => {
        const top = 3
        const response = await api.get(`/coin-arbitrage/crypto/current-arbitrages?ticker=btc-usdt&top=${top}`)
            .expect(200)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
        expect(response.body.length).toBeTruthy();
        expect(response.body.length).toBe(top)
    }, 20000)
    
    test('GET current-arbitrages for only one market return status 400', async () => {
        const response = await api.get(`/coin-arbitrage/crypto/current-arbitrages?ticker=btc-usdt&markets=binance`)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

    test('GET current-arbitrages without ticker return status 400', async () => {
        const response = await api.get(`/coin-arbitrage/crypto/current-arbitrages`)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    })

}, 30000)


describe('test POST /coin-arbitrage/crypto/markets', () => {

    test('test POST /coin-arbitrage/crypto/markets - with status 200', async () => {
        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(helper.MARKETS[0])
            .expect(200)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_without_name', async () => {

        const payload_without_name = {
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT": "BTCUSDT",
                "ETH-BTC": "ETHBTC",
                "ETH-USDT": "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "http://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_without_name)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_with_empty_name', async () => {

        const payload_with_empty_name = {
            "name": "",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT": "BTCUSDT",
                "ETH-BTC": "ETHBTC",
                "ETH-USDT": "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "http://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_with_empty_name)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_without_api-rest_data', async () => {

        const payload_without_url = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT": "BTCUSDT",
                "ETH-BTC": "ETHBTC",
                "ETH-USDT": "ETHUSDT"
            },
            "com" : {
                "api" : {
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_without_url)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)
    
    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_without_https', async () => {

        const payload_without_https = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT": "BTCUSDT",
                "ETH-BTC": "ETHBTC",
                "ETH-USDT": "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "http://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_without_https)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_invalid_host', async () => {

        const payload_invalid_host = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT": "BTCUSDT",
                "ETH-BTC": "ETHBTC",
                "ETH-USDT": "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.binanceeee.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_invalid_host)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_invalid_market_path', async () => {

        const payload_invalid_market_path = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT": "BTCUSDT",
                "ETH-BTC": "ETHBTC",
                "ETH-USDT": "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.binance.com/apiiii/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_invalid_market_path)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_without_tickers', async () => {

        const payload_without_tickers = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_without_tickers)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_with_invalid_ticker', async () => {

        const payload_with_invalid_ticker = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT": "BTCUSDT",
                "ETH-BTCXXXXXX": "ETHBTC",
                "ETH-USDT": "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_with_invalid_ticker)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_with_invalid_Market_ticker', async () => {

        const payload_with_invalid_Market_ticker = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "BTCUSDT",
                "ETH-BTC" : "ETHBTCXXXXX",
                "ETH-USDT" : "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_with_invalid_Market_ticker)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_with_empty_pathToPrice', async () => {

        const payload_with_empty_pathToPrice = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "BTCUSDT",
                "ETH-BTC" : "ETHBTC",
                "ETH-USDT" : "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice": [
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_with_empty_pathToPrice)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_without_pathToPrice', async () => {
        
        const payload_without_pathToPrice = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "BTCUSDT",
                "ETH-BTC" : "ETHBTC",
                "ETH-USDT" : "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_without_pathToPrice)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

    test('test POST /coin-arbitrage/crypto/markets - with status 400 - payload_invalid_pathToPrice', async () => {
        
        const payload_invalid_pathToPrice = {
            "name" : "Binance",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "BTCUSDT",
                "ETH-BTC" : "ETHBTC",
                "ETH-USDT" : "ETHUSDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.binance.com/api/v3",
                        "tickerPath" : "/ticker/price?symbol=${ticker}",
                        "pathToPrice" : [
                            "data",
                            "XXXX"
                        ]
                    }
                }
            }
        }

        const response = await api.post(`/coin-arbitrage/crypto/markets`).send(payload_invalid_pathToPrice)
            .expect(400)
        expect(response).not.toBe(null)
        expect(response.body).not.toBe(null)
        expect(response).toBeTruthy();
        expect(response.body).toBeTruthy();
    }, 10000)

}, 30000)



afterAll(()=>{
    mongoose.connection.close()
})