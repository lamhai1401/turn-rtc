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

var pc = new RTCPeerConnection(config)

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

// connect audio / video
pc.addEventListener('track', function(evt) {
    console.log(evt)
    if (evt.track.kind == 'video')
        document.getElementById('video').srcObject = evt.streams[0];
    else
        document.getElementById('audio').srcObject = evt.streams[0];
});

pc.onicecandidate = event => onIceCandidate(pc, event)

function onIceCandidate(pc, event) {
    console.log("candidata") 
    console.log(event.candidate)
}

pc.createOffer({offerToReceiveVideo: true, offerToReceiveAudio: true})
.then(offer => pc.setLocalDescription(offer))
.then(async () => {
    let offer = pc.localDescription
    let {answer} = await fetch("/answer", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sdp: offer.sdp,
            type: offer.type
        })
    }).then(e => e.json())

    await pc.setRemoteDescription(answer)
    document.getElementById('offer-sdp').textContent = offer.sdp;
    document.getElementById('answer-sdp').textContent = answer.sdp;
})