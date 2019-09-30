var offer_area = document.getElementById('offer'),
    answer_area = document.getElementById('answer'),
    iceConnectionLog = document.getElementById('ice-connection-state'),
    iceGatheringLog = document.getElementById('ice-gathering-state'),
    signalingLog = document.getElementById('signaling-state');

var id = ((10 ** 9) * Math.random() | 0).toString(16)

let signalingChannel = io.connect("https://beo-wssignal.herokuapp.com/", {
  query: { id: 1 }
})

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

pc.onicecandidate = function(event) {
    console.log("Send ICE candidate !!!")
    if (event.candidate) {
        console.log("Send ICE candidate !!!")
        signalingChannel.send(
            2,
            {
                candidate: event.candidate
            }
        ); // "ice" is arbitrary
    } else {
        console.log("Send ICE candidate done !!!")
        signalingChannel.send(
            2,
            null
        );
        // signalingChannel.disconnect();
    }
}

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

navigator.mediaDevices.getUserMedia({video: true, audio: true})
.then(stream => {
    pc.addStream(displayVideo(stream))
    return pc.createOffer({})
})
.then(offer => pc.setLocalDescription(offer))
.then( async () => {
    let offer = pc.localDescription
    document.getElementById('offer-sdp').textContent = offer.sdp;
    offer_area.value = btoa(JSON.stringify(offer))

    let response = await fetch("/broadcast", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sdp: offer.sdp,
            type: offer.type
        })
    }).then(e => e.json())

    console.log(" broadcast response", response)
})

async function start() {
    let {answer} = await fetch("/get_viewer", {
        method: "GET",
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(e => e.json())

    document.getElementById('answer-sdp').textContent = answer.sdp;
    await pc.setRemoteDescription(answer)
}