# Coin Arbitrage Backend

Node.js/Express service that collects cryptocurrency prices from several exchanges, compares them and reports price differences ("arbitrage opportunities") over REST and WebSocket. It is the backend of [coin-arbitrage-frontend](https://github.com/AdrianRissola/coin-arbitrage-frontend).

This is a personal project. It reports price differences only: it does not place orders and does not guarantee that any reported difference is profitable.

## Architecture

- `server.js` starts the HTTP server (`PORT`, default `3001`) and attaches the WebSocket server.
- `index.js` builds the Express app and loads `mongo.js`, which connects to MongoDB with Mongoose.
- `routes/arbitragesRouter.js`, `controller/` and `service/` implement the REST API.
- `webSocketServerHandler.js` accepts browser connections whose `Origin` is listed in the allowed-origins environment variable and streams data to them every second.
- `marketWebSocketClient.js` and `service/webSocketClientService.js` keep the WebSocket connections to the exchanges. Which exchanges, URLs, subscription messages and symbol formats are used comes from `Market` documents stored in MongoDB (`model/Market.js`).
- `Currency` documents (`model/Currency.js`) define the base and quote currencies from which the available pairs (for example `BTC-USDT`) are generated.
- `repository/` and `marketsDBmanager.js` read and cache markets and currencies; `model/Arbitrage.js` stores recorded opportunities.

### Arbitrage model

For a ticker, the latest price of each connected exchange is collected. Each pair of exchanges is compared: the lower price is the buy side and the higher price is the sell side, and the reported profit is the price difference per unit and as a percentage of the sell price. The calculation (`service/arbitrageService.js`) does not include trading or withdrawal fees, slippage, order-book depth or liquidity, transfer times or exchange limits. Treat results as an indication of price differences, not as achievable profit.

## REST API

Defined in `routes/arbitragesRouter.js` (the root path `/` returns an HTML summary):

| Method | Path |
|---|---|
| GET | `/coin-arbitrage/crypto/markets` |
| GET | `/coin-arbitrage/crypto/markets/:ticker` |
| GET | `/coin-arbitrage/crypto/markets/tickers/:ticker/prices` |
| GET | `/coin-arbitrage/crypto/markets/:market/tickers/:ticker` |
| GET | `/coin-arbitrage/crypto/available-tickers` |
| POST | `/coin-arbitrage/crypto/markets` |
| POST | `/coin-arbitrage/crypto/currency` |
| GET | `/coin-arbitrage/crypto/current-arbitrages` (query: `ticker`, optional `markets`, `minProfitPercentage`, `top`) |
| GET | `/coin-arbitrage/crypto/historical-arbitrages` (query: `tickers` array, for example `?tickers[]=BTC-USDT&tickers[]=ETH-USDT`) |
| POST | `/coin-arbitrage/crypto/arbitrages` |
| POST, GET | `/coin-arbitrage/crypto/markets/tickers/websockets` |

Several POST endpoints write to the database; `POST .../markets/tickers/websockets` opens exchange connections. The endpoints have no authentication in this repository. Do not expose them publicly as they are. `POST .../currency` also queries the CoinGecko search API to validate a currency.

## WebSocket protocol

Clients send JSON text messages with a `channel` and a `ticker`:

```json
{ "channel": "arbitrage", "ticker": "BTC-USDT" }
```

| Channel | Ticker | Behaviour |
|---|---|---|
| `arbitrage` | a pair such as `BTC-USDT` | current arbitrage opportunities for that pair, sent every second |
| `bestArbitrage` | `ALL` | best opportunities across all available pairs, sent every second |
| `Markets` | not needed (the frontend sends none) | market connection status, sent every second as a message with `channel: "markets"` |

Channel names are case sensitive (note `Markets`). Messages that are not valid JSON get a list of error messages back; the handler does not otherwise reject messages with missing fields. Connections from origins that are not allowed are rejected.

## Local setup

Requirements: Node.js and npm (no supported version range is declared in `package.json`), and a MongoDB instance you can freely use for local development.

```sh
npm ci
cp .env.example .env
```

`.env.example` contains only loopback placeholders. Edit the copy (`.env`) if your MongoDB is elsewhere; never commit it. `.gitignore` excludes `.env` and every `.env.*` file except `.env.example`.

| Variable | Used for |
|---|---|
| `MONGO_DB_URI` | database used when `NODE_ENV` is not `test` |
| `MONGO_DB_URI_TEST` | database used when `NODE_ENV=test` (keep it different from the development database) |
| `LOCAL_ALLOWED_ORIGINS` | JSON array of allowed WebSocket origins when `NODE_ENV` is not `production` |
| `PROD_ALLOWED_ORIGINS` | JSON array of allowed WebSocket origins when `NODE_ENV=production` |
| `PORT` | optional HTTP port, default `3001` |

### Database prerequisites

An empty database is not enough to get prices. The service builds its list of exchanges and pairs from the `Market` and `Currency` collections, so documents following `model/Market.js` and `model/Currency.js` must exist (they can be created with `POST /coin-arbitrage/crypto/markets` and `POST /coin-arbitrage/crypto/currency`, or inserted directly). This repository does not provide a supported seed command. `test/testHelper.js` contains legacy fixtures and `mongo.js` contains a `restoreDB` helper that calls `deleteMany`; do not copy or run that code against a database you care about.

Creating database documents does not by itself open exchange connections. Outbound WebSocket connections to the public price feeds of the configured exchanges are triggered by client subscriptions or by `POST /coin-arbitrage/crypto/markets/tickers/websockets`.

### Run

```sh
npm run dev     # NODE_ENV=development, restarts with nodemon
npm start       # NODE_ENV=production; requires PROD_ALLOWED_ORIGINS
```

`npm start` is what the `Procfile` runs.

## Tests

```sh
npm run test:security
```

`test:security` uses only Node's built-in test runner (`node --test`), which requires Node 18 or newer. It was verified with Node v25.2.1 and npm 11.6.2; that is the tested environment, not a supported-version guarantee, and the legacy dependencies may not support every Node version. It loads `mongo.js` in an isolated VM with mocked dependencies, makes no network or database calls, and checks that a successful mocked startup does not dump environment variables or synthetic credentials. It does not prove that every error message is free of sensitive data.

`npm test` and `npm run test2` run the legacy Jest suite. Those tests import the application, connect to the configured MongoDB and delete documents from the `Market` and `AvailableTicker` collections during setup, so do not use them as routine verification and never point them at data you want to keep.

## Known limitations

- Dependencies are old (for example `nodemon` 1.x, Jest 28, Mongoose 6) and were not updated; no `npm audit` review has been done.
- The legacy tests are destructive and depend on a live database.
- Production hardening has not been completed: there is no authentication or rate limiting on the REST API, and CORS is only applied through the allowed-origin variables. Review before exposing it.
- There is no lint or build script, although ESLint and Prettier configuration files exist.

## Project milestones

A selection of existing commits (see the full history on GitHub; this list is not a complete changelog):

| Commit | Change |
|---|---|
| [`4f68a6c`](https://github.com/AdrianRissola/coin-arbitrage-backend/commit/4f68a6c) | first REST endpoints with Express, MongoDB and Axios |
| [`0595ff5`](https://github.com/AdrianRissola/coin-arbitrage-backend/commit/0595ff5) | multiple tickers with multiple connections |
| [`253415c`](https://github.com/AdrianRissola/coin-arbitrage-backend/commit/253415c) | endpoint to register a new currency |
| [`caa6494`](https://github.com/AdrianRissola/coin-arbitrage-backend/commit/caa6494) | binary WebSocket payload support |

The related frontend repository is [coin-arbitrage-frontend](https://github.com/AdrianRissola/coin-arbitrage-frontend).
