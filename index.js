//const dbCon = 
require('./mongo')
const express = require('express')
const app = express()
const logger = require('./loggerMiddleware')
const router = require('./routes/arbitragesRouter')

//mongo
//dbCon.connect()

app.use(express.json())
app.use(logger)
app.use(router)


module.exports = app

