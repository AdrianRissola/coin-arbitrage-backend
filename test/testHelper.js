module.exports = Object.freeze({
    MARKETS:
    [
        {
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
                            "price"
                        ]
                    },
                    "websocket" : {
                        "host" : "stream.binance.com",
                        "url" : "wss://${host}:9443/ws",
                        "tickerRequest" : "{\"method\":\"SUBSCRIBE\",\"params\":[\"btcusdt@ticker\"],\"id\":1}"
                    }
                }
            }
        },
        {
            "name" : "Bitfinex",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "tBTCUSD",
                "BTC-USDT" : "tBTCUST",
                "ETH-USD" : "tETHUSD",
                "ETH-USDT" : "tETHUST",
                "ETH-BTC" : "tETHBTC"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api-pub.bitfinex.com/v2",
                        "tickerPath" : "/ticker/${ticker}",
                        "pathToPrice" : [
                            "data",
                            6
                        ]
                    },
                    "websocket" : {
                        "host" : "api-pub.bitfinex.com",
                        "url" : "wss://${host}/ws/2",
                        "tickerRequest" : "{\"event\":\"subscribe\",\"channel\":\"ticker\",\"symbol\":\"tBTCUSD\"}"
                    }
                }
            }
        },
        {
            "name" : "Coinbase",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "BTC-USD",
                "BTC-USDT" : "BTC-USDT",
                "ETH-USD" : "ETH-USD",
                "ETH-USDT" : "ETH-USDT",
                "ETH-BTC" : "ETH-BTC"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.exchange.coinbase.com",
                        "tickerPath" : "/products/${ticker}/ticker",
                        "pathToPrice" : [
                            "data",
                            "price"
                        ]
                    }
                }
            }
        },
        {
            "name" : "Bittrex",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "BTC-USD",
                "BTC-USDT" : "BTC-USDT",
                "ETH-USD" : "ETH-USD",
                "ETH-USDT" : "ETH-USDT",
                "ETH-BTC" : "ETH-BTC"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.bittrex.com/v3",
                        "tickerPath" : "/markets/${ticker}/ticker",
                        "pathToPrice" : [
                            "data",
                            "lastTradeRate"
                        ]
                    }
                }
            }
        },
        {
            "name" : "Poloniex",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "USDT_BTC",
                "ETH-USDT" : "USDT_ETH",
                "ETH-BTC" : "BTC_ETH"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://poloniex.com/public",
                        "tickerPath" : "?command=returnTicker",
                        "pathToPrice" : [
                            "data",
                            "${ticker}",
                            "last"
                        ]
                    }
                }
            }
        },
        {
            "name" : "Kraken",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "XXBTZUSD",
                "BTC-USDT" : "XBTUSDT",
                "ETH-USD" : "XETHZUSD",
                "ETH-USDT" : "ETHUSDT",
                "ETH-BTC" : "XETHXXBT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.kraken.com/0/public",
                        "tickerPath" : "/Ticker?pair=${ticker}",
                        "pathToPrice" : [
                            "data",
                            "result",
                            "${ticker}",
                            "c",
                            0
                        ]
                    }
                }
            }
        },
        {
            "name" : "Okex",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "BTC-USD",
                "BTC-USDT" : "BTC-USDT",
                "ETH-USD" : "ETH-USD",
                "ETH-USDT" : "ETH-USDT"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://www.okex.com/api/v5",
                        "tickerPath" : "/market/ticker?instId=${ticker}-SWAP",
                        "pathToPrice" : [
                            "data",
                            "data",
                            0,
                            "last"
                        ]
                    }
                }
            }
        },
        {
            "name" : "Bitmex",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "xbtusd",
                "BTC-USDT" : "xbtusdt",
                "ETH-USD" : "ethusd",
                "ETH-USDT" : "ethusdt",
                "ETH-BTC" : "ethxbt"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://www.bitmex.com/api/v1",
                        "tickerPath" : "/trade?symbol=${ticker}&count=1&reverse=true",
                        "pathToPrice" : [
                            "data",
                            0,
                            "price"
                        ]
                    }
                }
            }
        },
        {
            "name" : "Bitstamp",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USD" : "btcusd",
                "BTC-USDT" : "btcusdt",
                "ETH-USD" : "ethusd",
                "ETH-USDT" : "ethusdt",
                "ETH-BTC" : "ethbtc"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://www.bitstamp.net/api/v2",
                        "tickerPath" : "/ticker/${ticker}",
                        "pathToPrice" : [
                            "data",
                            "last"
                        ]
                    }
                }
            }
        },
        {
            "name" : "HitBTC",
            "type" : "Exchange with order book",
            "availableTickersToMarketTickers" : {
                "BTC-USDT" : "BTCUSDT",
                "ETH-USDT" : "ETHUSDT",
                "ETH-BTC" : "ETHBTC"
            },
            "com" : {
                "api" : {
                    "rest" : {
                        "base" : "https://api.hitbtc.com/api/3/public",
                        "tickerPath" : "/ticker?symbols=${ticker}",
                        "pathToPrice" : [
                            "data",
                            "${ticker}",
                            "last"
                        ]
                    }
                }
            }
        }
    ],
    TICKERS:
    [
        {
            "name" : "BTC-USD",
            "description" : "bitcoin - United States dollar",
            "type" : "crypto",
        },
        {
            "name" : "BTC-USDT",
            "description" : "bitcoin - USD Tether",
            "type" : "crypto"
        },
        {
            "name" : "ETH-USDT",
            "description" : "ether - USD Tether",
            "type" : "crypto"
        },
        {
            "name" : "ETH-USD",
            "description" : "ether- United States dollar",
            "type" : "crypto",
        },
        {
            "name" : "ETH-BTC",
            "description" : "ether- bitcoin",
            "type" : "crypto",
        }
    ]
})