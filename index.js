require('./mongo')
const express = require('express')
const app = express()
const logger = require('./loggerMiddleware')
const router = require('./routes/arbitragesRouter')


app.use(express.json())
app.use(logger)
app.use(router)



const PORT = process.env.PORT
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})


