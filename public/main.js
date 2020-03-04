// If we only want to just use a public Google STUN server then 
// uncomment the "config" variable inside the createPeerConnection
// function and disable the button getTokenButton.

const socket = io();

let localStream = '';
let peerConnection = '';
let config = '';
let mute = false;

//Define functions for the buttons

const getTokenButton = document.querySelector('#getTokenButton');
getTokenButton.addEventListener('click', getTokenButtonAction);

const startButton = document.querySelector('#startButton');
startButton.addEventListener('click', startButtonAction);

// const callButton = document.querySelector('#callButton');
// callButton.addEventListener('click', callButtonAction);

const hangupButton = document.querySelector('#hangupButton');
hangupButton.addEventListener('click', hangupButtonAction);

const muteVideoButton = document.querySelector('#muteVideoButton');
muteVideoButton.addEventListener('click', muteVideoButtonAction);


function getTokenButtonAction() {
  getTokenButton.disabled = true;
  
  function getToken() {

    return fetch('/token')
    .then((response) => {
        if (response.status === 200) {       
          return response.json()
        } else {
            throw new Error('Unable to fetch token');
        }
    }).then((tokenObject) => {
      //console.log('*****Access Token:*****', tokenObject)
      config = {
        iceServers: tokenObject.iceServers
      };
      //console.log('*******STUN SERVERS', tokenObject.iceServers)
      console.log('*****Access Token:*****', config);      
      socket.emit('config', config);
      startButton.disabled = false;
    })  
  }
  
  getToken();
}

function startButtonAction() {
  console.log('-->Start button clicked with config: ', config)

  createPeerConnection();

  const mediaConstraints = {
    audio: true, 
    video: true 
  };

  navigator.mediaDevices.getUserMedia(mediaConstraints)
  .then((localStream) => {
    document.querySelector('#localVideo').srcObject = localStream;
    console.log('-->localstream is ', localStream.getTracks());
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    console.log('-->peerConnection ', peerConnection);
    startButton.disabled = true;
  })
  .catch(handleGetUserMediaError);
}

function createPeerConnection() {
  // let config = {
  //   iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
  // }

  peerConnection = new RTCPeerConnection(config);

  console.log('-->peerConnection created: ', peerConnection)

  peerConnection.onicecandidate = handleICECandidate;
  peerConnection.ontrack = handleTrackEvent;
  peerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  peerConnection.onremovetrack = handleRemoveTrackEvent;
  peerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  peerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  peerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}

//Event handlers for the peerConnection object:

function handleICECandidate(e) {
  if (e.candidate) {
    socket.emit('onicecandidate', e.candidate)
    console.log('-->Sending ICE Candidate to peer: ', e.candidate)
  }
}

function handleTrackEvent(e) {
  console.log('-->ontrack trigerred for stream: ', e.streams)
  document.querySelector("#remoteVideo").srcObject = e.streams[0];
  hangupButton.disabled = false;
  muteVideoButton.disabled = false;
}

function handleNegotiationNeededEvent(e) {
  console.log('-->handleNegotiationNeededEvent called: ', e)
  console.log("-->Negotiation needed")
  console.log("-->Creating offer")

  peerConnection.createOffer()
  .then((offer) => {
    if (peerConnection.signalingState != "stable") {
      console.log("-->The connection isn't stable yet; postponing...");
      return
    }
    return peerConnection.setLocalDescription(offer);
  })
  .then(() => {
    socket.emit('offer', peerConnection.localDescription)
    console.log("-->Sending Offer SDP to peer: ", peerConnection.localDescription);
    //document.querySelector('#hangupButton').disabled = false;
  })
  .catch((reportError) => {
    console.log('Error', reportError)
  });
}

function handleRemoveTrackEvent(e) {
  console.log('-->handleRemoveTrackEvent called: ', e)
}

function handleICEConnectionStateChangeEvent(e) {
  console.log('-->handleICEConnectionStateChangeEvent called: ', e)

  switch(peerConnection.iceConnectionState) {
    case "new":
      console.log('-->iceConnectionState: ', e.target.iceConnectionState)
      break;
    case "connecting":
      console.log('-->iceConnectionState: ', e.target.iceConnectionState)
      break;
    case "connected":
      console.log('-->iceConnectionState: ', e.target.iceConnectionState)
      break;
    case "closed":
      console.log('-->iceConnectionState: ', e.target.iceConnectionState)
      break;
    case "failed":
      console.log('-->iceConnectionState: ', e.target.iceConnectionState)
      break;
    case "disconnected":
      console.log('-->iceConnectionState: ', e.target.iceConnectionState)
      closeVideoCall();
      break;
  }
}

function handleICEGatheringStateChangeEvent(e) {
  console.log('-->handleICEGatheringStateChangeEvent called: ', e)

  switch(peerConnection.iceGatheringState) {
    case "new":
      console.log('-->iceGatheringState: ', e.target.iceGatheringState)
      break;
    case "gathering":
      console.log('-->iceGatheringState: ', e.target.iceGatheringState)
      break;
    case "complete":
      console.log('-->iceGatheringState: ', e.target.iceGatheringState)
      break;
  }
}

function handleSignalingStateChangeEvent(e) {
  console.log('-->handleSignalingStateChangeEvent called: ', e)

  switch(peerConnection.signalingState) {
    case "stable":
      console.log('-->signalingState: ', e.target.signalingState)
      break;
    case "have-local-offer":
      console.log('-->signalingState: ', e.target.signalingState)
      break;
    case "have-remote-offer":
      console.log('-->signalingState: ', e.target.signalingState)
      break;
      case "have-local-pranswer":
        console.log('-->signalingState: ', e.target.signalingState)
        break;
      case "have-remote-pranswer":
        console.log('-->signalingState: ', e.target.signalingState)
        break;
      case "closed":
        console.log('-->signalingState: ', e.target.signalingState)
        break;
  }

}

//Define socket listeners and functions

socket.on('onicecandidate', handleIncomingICE);
socket.on('offer', handleOffer);
socket.on('answer', handleAnswer);
socket.on('config', handleConfig);

function handleIncomingICE(message) {
  let incomingICEcandidate = new RTCIceCandidate(message);
  console.log('-->Received ICE Candidate from peer: ', incomingICEcandidate);

  peerConnection.addIceCandidate(incomingICEcandidate)
    .catch((reportError) => {
      console.log('Error', reportError);
    });
}

function handleOffer(message) {  
  console.log('-->Received Offer SDP from peer: ', message);

  const mediaConstraints = {
    audio: true, 
    video: true 
  };

  if (!peerConnection) {
    createPeerConnection();
    console.log('-->RTCPeerConnection DID NOT EXIST AND CREATED')
  }

  let desc = new RTCSessionDescription(message);

  peerConnection.setRemoteDescription(desc).then(() => {
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  })
  .then((stream) => {
    localStream = stream;
    document.querySelector('#localVideo').srcObject = localStream;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  })
  .then(() => {
    return peerConnection.createAnswer();
  })
  .then((answer) => {
    return peerConnection.setLocalDescription(answer);
  })
  .then(() => {
    socket.emit('answer', peerConnection.localDescription);
    console.log("-->Sending Answer SDP to peer: ", peerConnection.localDescription); 
  })
  .catch(handleGetUserMediaError);
}

function handleAnswer(message) {
  console.log('-->Received Answer SDP from peer: ', message); 

  let desc = new RTCSessionDescription(message);

  peerConnection.setRemoteDescription(desc)
  .then(() => {
    console.log('-->desc created as result of receiving Answer SDP: ', desc);
  })
  .catch(handleGetUserMediaError);
}

function handleConfig(message) {
  console.log('-->Received STUN/TURN config from peer', message); 
  
  if (!config) {
    config = message;  
  }
}

function handleGetUserMediaError(e) {
  console.log('-->*handleGetUserMediaError Error ', e);
}

function closeVideoCall() {
  const remoteVideo = document.querySelector("#remoteVideo")
  const localVideo = document.querySelector('#localVideo')

  if (peerConnection) {
    peerConnection.ontrack = null;
    peerConnection.onremovetrack = null;
    peerConnection.onremovestream = null;
    peerConnection.onicecandidate = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.onsignalingstatechange = null;
    peerConnection.onicegatheringstatechange = null;
    peerConnection.onnegotiationneeded = null;

    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    }

    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(track => track.stop());
    }

    peerConnection.close();
    peerConnection = null;
  }

  remoteVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");

  document.querySelector("#hangupButton").disabled = true;

}

function hangupButtonAction() {
  console.log('-->close the connection')
  closeVideoCall()
}

function muteVideoButtonAction() {  
  
  if (mute===false) {
    //console.log('remote tracks: ', remoteVideo.srcObject.getTracks()[0]);
    //console.log('local tracks: ', localVideo.srcObject.getTracks()[0]);
  
    remoteVideo.srcObject.getTracks()[0].enabled = false;
    localVideo.srcObject.getTracks()[0].enabled = false;
  
    // console.log('remote tracks: ', remoteVideo.srcObject.getTracks()[0]);
    // console.log('local tracks: ', localVideo.srcObject.getTracks()[0]);

    document.querySelector('#muteVideoButton').textContent = 'Unmute';

    mute = true;

  } else {
    // console.log('remote tracks: ', remoteVideo.srcObject.getTracks()[0]);
    // console.log('local tracks: ', localVideo.srcObject.getTracks()[0]);
  
    remoteVideo.srcObject.getTracks()[0].enabled = true;
    localVideo.srcObject.getTracks()[0].enabled = true;
  
    // console.log('remote tracks: ', remoteVideo.srcObject.getTracks()[0]);
    // console.log('local tracks: ', localVideo.srcObject.getTracks()[0]);

    document.querySelector('#muteVideoButton').textContent = 'Mute';

    mute = false;
  }
}


// const ICEButton = document.getElementById('getICEButton');
// ICEButton.addEventListener('click', ICEButtonAction);

// function ICEButtonAction () {
//   let config = {
//     iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
//   }
//   let pc = new RTCPeerConnection(config);
//   console.log('****RTCPeerConnection: ', pc)
//   const offerOptions = {offerToReceiveAudio: 1};
//   pc.createOffer(
//     offerOptions
//   ).then((offer) => {
//   console.log('****Offer ', offer)
//   return pc.setLocalDescription(offer)
//   }
    
//   )
//   pc.onicecandidate  = iceCallback;
//   //pc.onicegatheringstatechange = iceCallback;

// }

// function callButtonAction() {
//   peerConnection.createOffer()
//   .then((offer) => {
//   console.log('-->Offer ', offer);
//   return peerConnection.setLocalDescription(offer);
//   })
//   .then(() => {
//     console.log('sssssssss', peerConnection.localDescription);
//     socket.emit('offer', peerConnection.localDescription);
//   })
// }
