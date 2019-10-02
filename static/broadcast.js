
var iceConnectionLog = document.getElementById('ice-connection-state'),
iceGatheringLog = document.getElementById('ice-gathering-state'),
id_broadcast = document.getElementById('id-broadcast'),
signalingLog = document.getElementById('signaling-state');

var id = ((0x10000) * Math.random() | 0).toString(16)
var viewer_id = ""

let signalingChannel = io.connect("https://beo-wssignal.herokuapp.com/", {
    query: { id: id }
})

id_broadcast.textContent += id

console.log("id_broadcast", id_broadcast.textContent)

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

pc.onicecandidate = function (event) {
    if (event.candidate) {
        console.log("Send ICE candidate: ", event.candidate)
        signalingChannel.send(
            viewer_id,
            { candidate: event.candidate }
        ); // "ice" is arbitrary
    } else {
        console.log("Send ICE candidate done !!!")
    }
}

signalingChannel.on(
    "message",
    async (channel, data) => {
        try {
            if (data.viewer) {
                viewer_id = channel
                const gumStream = await navigator.mediaDevices.getUserMedia(
                    { video: true, audio: true }
                );
                document.getElementById('video').srcObject = gumStream
                for (const track of gumStream.getTracks()) {
                    pc.addTrack(track);
                }
                let offer = await pc.createOffer({offerToReceiveVideo: true, offerToReceiveAudio: true})
                await pc.setLocalDescription(offer)

                let offers = pc.localDescription
                document.getElementById('offer-sdp').textContent = offers.sdp;
                signalingChannel.send(channel, offers)
            } else if (data.sdp) {
                document.getElementById('answer-sdp').textContent = data.sdp;
                await pc.setRemoteDescription(data)
            } else if (data.candidate) {
                console.log("Receive ICE candidate: ", data.candidate)
                await pc.addIceCandidate(data.candidate)
            } else {
                console.error(data)
            }
        } catch (error) {
            console.log(JSON.stringify(error))
        }
    }
)