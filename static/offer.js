var iceConnectionLog = document.getElementById('ice-connection-state'),
    iceGatheringLog = document.getElementById('ice-gathering-state'),
    signalingLog = document.getElementById('signaling-state');

var config = {
    sdpSemantics: 'unified-plan',
    iceServers: [
        {
            urls: ['stun:stun.l.google.com:19302']
        },
        {
            urls: ["turn:35.247.173.254:3478"],
            username: "username",
            credential: "password"
        }
    ]
};

let displayVideo = video => {
    var el = document.createElement('video')
    el.srcObject = video
    el.autoplay = true
    el.muted = true
    el.width = 1280
    el.height = 720

    document.getElementById('localVideos').appendChild(el)
    return video
}

var pc = new RTCPeerConnection(config)

navigator.mediaDevices.getUserMedia({video: true, audio: true})
.then(stream => {
    pc.addStream(displayVideo(stream))
    return pc.createOffer({offerToReceiveVideo: true, offerToReceiveAudio: true})
})
.then(offer => pc.setLocalDescription(offer))
.then( async () => {
    let offer = pc.localDescription
    console.log("fetch")
    let {answer} = await fetch("/offer", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sdp: offer.sdp,
            type: offer.type
        })
    }).then(e => e.json())

    console.log("answer", answer)

    await pc.setRemoteDescription(answer)

    document.getElementById('offer-sdp').textContent = offer.sdp;
    document.getElementById('answer-sdp').textContent = answer.sdp;
})
.catch(err => alert(err))

// register some listeners to help debugging
pc.addEventListener('icegatheringstatechange', function () {
    iceGatheringLog.textContent += ' -> ' + pc.iceGatheringState;
}, false);
iceGatheringLog.textContent = pc.iceGatheringState;

pc.addEventListener('iceconnectionstatechange', function () {
    iceConnectionLog.textContent += ' -> ' + pc.iceConnectionState;
}, false);
iceConnectionLog.textContent = pc.iceConnectionState;

pc.addEventListener('signalingstatechange', function () {
    signalingLog.textContent += ' -> ' + pc.signalingState;
}, false);
signalingLog.textContent = pc.signalingState;
