'use strict';

const socket = io()

let localStream = '';
let myPeerConnection = '';
let config = ''

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
  //console.log('****Received from server', message.sdp) 
  //   let config = {
  //   iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
  // }

  const mediaConstraints = {
    audio: true, 
    video: true 
  };

  if (!myPeerConnection) {
    createPeerConnection();
    console.log('@@@@@@@@@@@@@@@@ DID NOT EXIST AND CREATED')
  }

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

  let desc = new RTCSessionDescription(message);

  myPeerConnection.setRemoteDescription(desc).then(() => {
    console.log('----> desc created as result from the socket onAnswer', desc)
  })
  .catch(handleGetUserMediaError);

}

socket.on('config', handConfig)

function handConfig(message) {
  console.log('****Received config', message) 
  
  if (!config) {
    config = message  
  }
}




const startButton = document.querySelector('#startButton');
startButton.addEventListener('click', startButtonAction);

const callButton = document.querySelector('#callButton');
callButton.addEventListener('click', callButtonAction);

const hangupButton = document.querySelector('#hangupButton');
hangupButton.addEventListener('click', hangupButtonnAction);

const getTokenButton = document.querySelector('#getTokenButton');
getTokenButton.addEventListener('click', getTokenButtonAction);


function startButtonAction() {

  console.log('*******************', config)

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


  // let config = {
  //   iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
  // }

  myPeerConnection = new RTCPeerConnection(config);

  console.log('****myPeerConnection ', myPeerConnection)

  myPeerConnection.onicecandidate = iceCallback;
  myPeerConnection.ontrack = handleTrackEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  myPeerConnection.onremovetrack = handleRemoveTrackEvent;
  myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
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
    //document.querySelector('#hangupButton').disabled = false;
  })
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

function iceCallback(e) {
  if (e.candidate) {
    socket.emit('onicecandidate', e.candidate)
    console.log('****Candidate: ', e.candidate)
  }

}

function handleTrackEvent(e) {
  console.log('**************TRACKS streaming ', e.streams)
  document.querySelector("#remoteVideo").srcObject = e.streams[0];
}

async function handleNegotiationNeededEvent(e) {
  //console.log('****handleNegotiationNeededEvent called: ', e)

  console.log("*** Negotiation needed");

  try {
    console.log("---> Creating offer");
    const offer = await myPeerConnection.createOffer();

    // If the connection hasn't yet achieved the "stable" state,
    // return to the caller. Another negotiationneeded event
    // will be fired when the state stabilizes.

    if (myPeerConnection.signalingState != "stable") {
      console.log("     -- The connection isn't stable yet; postponing...")
      return;
    }

    // Establish the offer as the local peer's current
    // description.

    console.log("---> Setting local description to the offer");
    await myPeerConnection.setLocalDescription(offer);

    // Send the offer to the remote peer.

    console.log("---> Sending the offer to the remote peer");
    socket.emit('offer', myPeerConnection.localDescription)

  } catch(err) {
    console.log("*** The following error occurred while handling the negotiationneeded event:", err);

  };





}

function handleRemoveTrackEvent(e) {
  console.log('****handleRemoveTrackEvent called: ', e)

}

function handleICEConnectionStateChangeEvent(e) {
  console.log('****handleICEConnectionStateChangeEvent called: ', e)
}

function handleICEGatheringStateChangeEvent(e) {
  console.log('****handleICEGatheringStateChangeEvent called: ', e)
}

function handleSignalingStateChangeEvent(e) {
  console.log('****handleSignalingStateChangeEvent called: ', e)

}

function hangupButtonnAction() {
  console.log('close the connection')


  myPeerConnection.getStats(null).then(stats => {
    var statsOutput = "";
 
    stats.forEach(report => {
      if (report.type === "inbound-rtp" && report.kind === "video") {
        Object.keys(report).forEach(statName => {
          statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
        });
      }
    });
    
    document.querySelector("#statsP").innerHTML = statsOutput;
    console.log(statsOutput)
  });  
}


function getTokenButtonAction() {
  document.querySelector('#getTokenButton').disabled = true;

  function getToken() {
    return fetch('/token').
    then((response) => {
        if (response.status === 200) {       
          return response.json()
        } else {
            throw new Error('Unable to fetch token')
        }
    }).then((tokenObject) => {
      //console.log('*****Access Token:*****', tokenObject)
      config = {
        iceServers: tokenObject.iceServers
      }
      //console.log('*******STUN SERVERS', tokenObject.iceServers)
      console.log('*****Access Token:*****', config)
      socket.emit('config', config)
    })
  
  }
  
  getToken()
}





