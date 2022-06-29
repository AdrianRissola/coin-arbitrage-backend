//const http = require('http')
const express = require('express')
const app = express()
const logger = require('./loggerMiddleware')
const cors = require('cors')

app.use(express.json())
app.use(logger)

console.log('hello world')

let  dummy = {
    string: "asda",
    numb: 99,
    numbAsString:'12313',
    object: {
        attribute: 'asasd'
    }
}

app.get('/', (request, response) => {
    response.send('<h1>Hello World</h1>')
})

app.get('/api/dummy', (request, response) => {
    response.json(dummy)
})

app.get('/api/hello/:name', (request, response) => {
    response.json('hello ' + request.params.name)
})

app.post('/api/', (request, response) => {
    console.log("input: ", request.body)
    
    if(!request.body || !request.body.content) {
        return response.status(400).json({
            error: 'invalid request'
        })
    }

    const newRequest = request.body;
    response.json(newRequest)
})

app.use((request, response) => {
    response.status(404).json({error: 'not found'})
})

// const app = http.createServer((request, response) =>{
//     response.writeHead(200, { 'Content-Type': 'application/json' })
//     response.end(JSON.stringify(dummy))
// })

const PORT = 3001
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})


