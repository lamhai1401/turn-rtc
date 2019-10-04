var iceConnectionLog = document.getElementById('ice-connection-state'),
iceGatheringLog = document.getElementById('ice-gathering-state'),
id_broadcast = document.getElementById('your-id'),
id_viewer = document.getElementById('call-id').value,
remote_video = document.getElementById('remoteVideo'),
local_video = document.getElementById('localVideo'),
signalingLog = document.getElementById('signaling-state');

var id = ((0x10000) * Math.random() | 0).toString(16)
id_broadcast.textContent += id

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

pc.onicecandidate = function (event) {
    if (event.candidate) {
        console.log("Send ICE candidate: ", event.candidate)
        signalingChannel.send(
            id_viewer,
            { candidate: event.candidate }
        ); // "ice" is arbitrary
    } else {
        console.log("Send ICE candidate done !!!")
    }
}

pc.ontrack = function (event) {
    var el = document.createElement(event.track.kind)
    el.srcObject = event.streams[0]
    el.autoplay = true
    el.controls = true
  
    remote_video.appendChild(el)
}

class WebRTCCall {
    constructor(id) {
        this.id = id
        this. signalingChannel = io.connect("https://beo-wssignal.herokuapp.com/", {
            query: { id: this.id }
        })
    }
}