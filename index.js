// const dbCon =
require('./mongo');
const express = require('express');
const logger = require('./loggerMiddleware');
const router = require('./routes/arbitragesRouter');

const app = express();

// mongo
// dbCon.connect()

app.use(express.json());
app.use(logger);
app.use(router);

module.exports = app;
