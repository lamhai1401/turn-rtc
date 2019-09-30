var offer_area = document.getElementById('offer'),
    answer_area = document.getElementById('answer'),
    iceConnectionLog = document.getElementById('ice-connection-state'),
    iceGatheringLog = document.getElementById('ice-gathering-state'),
    signalingLog = document.getElementById('signaling-state');

var id = ((10 ** 9) * Math.random() | 0).toString(16)

let signalingChannel = io.connect("https://beo-wssignal.herokuapp.com/", {
  query: { id: 2 }
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

pc.addEventListener('track', function(evt) {
    console.log(evt)
    if (evt.track.kind == 'video')
        document.getElementById('video').srcObject = evt.streams[0];
    else
        document.getElementById('audio').srcObject = evt.streams[0];
});

// signalingChannel.onmessage = receivedString => {
//     const message = JSON.parse(receivedString);
//     if (message.ice) {
//       // A typical value of ice here might look something like this:
//       //
//       // {candidate: "candidate:0 1 UDP 2122154243 192.168.1.9 53421 typ host", sdpMid: "0", ...}
//       //
//       // Pass the whole thing to addIceCandidate:
  
//       pc.addIceCandidate(message.ice).catch(e => {
//         console.log("Failure during addIceCandidate(): " + e.name);
//       });
//     } else {
//         console.log("Receive ICE candidate done !!!")
//         signalingChannel.disconnect();
//     }
// }

signalingChannel.on("message", (id, data) => {
    console.log("Sender", id)
    if (data) {
        pc.addIceCandidate(data).catch(e => {
            console.log("Failure during addIceCandidate(): " + e.name);
        });
    } else {
        console.log("Receive ICE candidate done !!!")
        // signalingChannel.disconnect();
    }
})

async function join() {
    let {offer} = await fetch("/get_broadcast", {
        method: "GET",
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(e => e.json())

    await pc.setRemoteDescription(offer).catch(e => alert(e))
    let answer = await pc.createAnswer().catch(e => alert(e))
    await pc.setLocalDescription(answer).catch(e => alert(e))
    answer_area.value = btoa(JSON.stringify(pc.localDescription))

    document.getElementById('offer-sdp').textContent = offer.sdp;
    document.getElementById('answer-sdp').textContent = pc.localDescription.sdp;

    let response = await fetch("/viewer", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sdp: pc.localDescription.sdp,
            type: pc.localDescription.type
        }) 
    }).then(e => e.json())

    console.log("viewer response", response)

    pc.addEventListener('track', function(evt) {
        console.log(evt)
        if (evt.track.kind == 'video')
            document.getElementById('video').srcObject = evt.streams[0];
        else
            document.getElementById('audio').srcObject = evt.streams[0];
    });
}