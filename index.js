require('./mongo');
const express = require('express');

const app = express();
const server = require('http').Server(app);
const loggerMiddleware = require('./loggerMiddleware');
const router = require('./routes/arbitragesRouter');

app.use(express.json());
app.use(loggerMiddleware);
app.use(router);

module.exports = { app, server };
