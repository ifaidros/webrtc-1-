require('dotenv').config()
const http = require('http')
const express = require('express')
const path = require('path')
const socketio = require('socket.io')
const helmet = require('helmet')

const app = express()
const server = http.createServer(app)
const io = socketio(server)
const port = process.env.PORT || 3000

const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN

app.use(helmet())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/token', (req, res) => {
  const client = require('twilio')(accountSid, authToken);
  client.tokens.create().then((token) => {
    console.log(token);
    res.setHeader('Content-Type', 'application/json')
    res.send(token)
  })
})


io.on('connection', (socket) => {
  console.log('New WebSocket connection with socket.id: ', socket.id)
  socket.emit('message', 'Welcome to our WebRTC! Socket id ' + socket.id)

  socket.on('onicecandidate', (message) => {
    socket.broadcast.emit('onicecandidate', message)
    //console.log('****From browser', message)
  })

  socket.on('offer', (message) => {
    socket.broadcast.emit('offer', message)
    //console.log('****From browser', message)
  })
  
  socket.on('answer', (message) => {
    socket.broadcast.emit('answer', message)
    //console.log('****From browser', message)
  })

  socket.on('config', (message) => {
    socket.broadcast.emit('config', message)
    //console.log('****From browser', message)
  })

})




server.listen(port, () => {
    console.log('Server is up on port ' + port)
})