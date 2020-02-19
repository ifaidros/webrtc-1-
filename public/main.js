'use strict';

const socket = io()

let localStream = '';
let myPeerConnection = '';

socket.on('onicecandidate', handIncoming)

function handIncoming(message) {
  console.log('****Received from server onicecandidate', message) 

  let newcandidate = new RTCIceCandidate(message);
  console.log('*************newcandidate ', newcandidate)

  myPeerConnection.addIceCandidate(newcandidate)
    .catch((reportError) => {
      console.log('Error', reportError)
    });
}


socket.on('offer', handOffer)
//************************************************* */
function handOffer(message) {
  console.log('****Received from server', message.sdp) 

  let localStream = ''

  let config = {
    iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
  }

  const mediaConstraints = {
    audio: true, 
    video: true 
  };

  createPeerConnection();

  let desc = new RTCSessionDescription(message);

  myPeerConnection.setRemoteDescription(desc).then(() => {
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  })
  .then((stream) => {
    localStream = stream;
    document.querySelector('#localVideo').srcObject = localStream;

    localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
  })
  .then(function() {
    return myPeerConnection.createAnswer();
  })
  .then(function(answer) {
    return myPeerConnection.setLocalDescription(answer);
  })
  .then(function() {

    socket.emit('answer', myPeerConnection.localDescription) 

  })
  .catch(handleGetUserMediaError);
}

socket.on('answer', handAnswer)

function handAnswer(message) {
  console.log('****Received answer', message) 
}




const startButton = document.querySelector('#startButton');
startButton.addEventListener('click', startButtonAction);

const callButton = document.querySelector('#callButton');
callButton.addEventListener('click', callButtonAction);

function startButtonAction() {
  
  createPeerConnection();

  const mediaConstraints = {
    audio: true, 
    video: true 
  };

  navigator.mediaDevices.getUserMedia(mediaConstraints)
  .then((localStream) => {
    document.querySelector('#localVideo').srcObject = localStream;
    console.log('****localstream is ', localStream.getTracks());
    localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    console.log('****myPeerConnection ', myPeerConnection);
  })
  .catch(handleGetUserMediaError);
}

function handleGetUserMediaError(e) {
  console.log('****handleGetUserMediaError Error ', e)
}

function createPeerConnection() {
  let config = {
    iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
  }

  myPeerConnection = new RTCPeerConnection(config);

  console.log('****myPeerConnection ', myPeerConnection)

  myPeerConnection.onicecandidate = iceCallback;
  myPeerConnection.ontrack = handleTrackEvent;
  // myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  // myPeerConnection.onremovetrack = handleRemoveTrackEvent;
  // myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  // myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  // myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}


function callButtonAction() {
  myPeerConnection.createOffer()
  .then((offer) => {
  console.log('****Offer ', offer)
  return myPeerConnection.setLocalDescription(offer)
  })
  .then(() => {
    console.log('sssssssss', myPeerConnection.localDescription)
    socket.emit('offer', myPeerConnection.localDescription)
  })
}


const ICEButton = document.getElementById('getICEButton');
ICEButton.addEventListener('click', ICEButtonAction);

function ICEButtonAction () {
  let config = {
    iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
  }
  let pc = new RTCPeerConnection(config);
  console.log('****RTCPeerConnection: ', pc)
  const offerOptions = {offerToReceiveAudio: 1};
  pc.createOffer(
    offerOptions
  ).then((offer) => {
  console.log('****Offer ', offer)
  return pc.setLocalDescription(offer)
  }
    
  )
  pc.onicecandidate  = iceCallback;
  //pc.onicegatheringstatechange = iceCallback;

}

function iceCallback(e) {
  socket.emit('onicecandidate', e.candidate)
  console.log('****Candidate: ', e.candidate)
}

function handleTrackEvent(e) {
  console.log('**************TRACKS streaming ', e.streams[0])
  document.querySelector("#remoteVideo").srcObject = e.streams[0];
}