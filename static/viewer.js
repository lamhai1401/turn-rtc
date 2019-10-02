var iceConnectionLog = document.getElementById('ice-connection-state'),
    iceGatheringLog = document.getElementById('ice-gathering-state'),
    id_broadcast = document.getElementById('id-broadcast'),
    id_viewer = document.getElementById('id-viewer'),
    signalingLog = document.getElementById('signaling-state');

var id = ((0x10000) * Math.random() | 0).toString(16)

let signalingChannel = io.connect("https://beo-wssignal.herokuapp.com/", {
    query: { id: id }
})

id_viewer.textContent += id

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

let inboundStream = null;

pc.ontrack = ev => {
  if (ev.streams && ev.streams[0]) {
    document.getElementById('video').srcObject = ev.streams[0];
  } else {
    if (!inboundStream) {
      inboundStream = new MediaStream();
      document.getElementById('video').srcObject = inboundStream;
    }
    inboundStream.addTrack(ev.track);
  }
}

pc.onicecandidate = function (event) {
    if (event.candidate) {
        console.log("Send ICE candidate: ", event.candidate)
        signalingChannel.send(id_broadcast.value, { candidate: event.candidate }); // "ice" is arbitrary
    } else {
        console.log("Send ICE candidate done !!!")
    }
}

async function join() {
    signalingChannel.send(id_broadcast.value, { viewer: true })

    signalingChannel.on(
        "message",
        async (channel, data) => {
            try {
                if (data.viewer) {

                } else if (data.sdp) {
                    await pc.setRemoteDescription(data).then(() => console.log("Set remote done at: ", Date.now()))
    
                    let answer = await pc.createAnswer()
    
                    await pc.setLocalDescription(answer).then(() => console.log("Set local done at: ", Date.now()))
    
                    signalingChannel.send(id_broadcast.value, answer)

                    document.getElementById('offer-sdp').textContent = data.sdp
                    document.getElementById('answer-sdp').textContent = answer.sdp
                } else if (data.candidate) {
                    console.log("Receive ICE candidate: ", data.candidate)
                    await pc.addIceCandidate(data.candidate).then(() => console.log("Add success")).catch(err => console.error("ADD failed: ", err))
                } else {
                    console.error(data)
                }
            } catch (error) {
                alert(JSON.stringify(error))
            }
        }
    )
}