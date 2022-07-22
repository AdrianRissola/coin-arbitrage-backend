//const dbCon = 
const mongo = require('./mongo')
const express = require('express')
const app = express()
const logger = require('./loggerMiddleware')
const router = require('./routes/arbitragesRouter')

mongo
//dbCon.connect()

app.use(express.json())
app.use(logger)
app.use(router)


// const PORT = process.env.PORT || 3001
// const server = app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`)
// })

module.exports = app

