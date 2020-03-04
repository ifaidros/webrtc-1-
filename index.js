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
const videoSid = process.env.VIDEO_SID
const videoSecret = process.env.VIDEO_SECRET


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

app.get('/twilio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public') + '/twilio.html')
})

app.get('/twilio/token', (req, res) => {
  const token = createToken()
  console.log('the token is ' + token.token)
  // res.set({'Access-Control-Allow-Origin': '*'})
  res.setHeader('Content-Type', 'application/json')
  res.send(token)
})

//"Token Server" 
function createToken() {    
  const AccessToken = require('twilio').jwt.AccessToken
  const VideoGrant  = AccessToken.VideoGrant
  const twilioAccountSid = process.env.ACCOUNT_SID
  const twilioApiKey = process.env.VIDEO_SID
  const twilioApiSecret = process.env.VIDEO_SECRET
  // Create an Access Token
  const token = new AccessToken(
    twilioAccountSid,
    twilioApiKey,
    twilioApiSecret,
    ttl=300
  )
  // Set the Identity of this token
  token.identity = 'video-user-1'
  // Grant access to Video
  const grant = new VideoGrant()
  grant.room = 'test_room_1'
  token.addGrant(grant)

  return {
      identity: token.identity,
      token: token.toJwt()
  }
}


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