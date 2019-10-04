package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/pion/rtcp"
	"github.com/pion/webrtc"
)

// var slaveConnection *webrtc.PeerConnection
var slaveTrack *webrtc.Track

var config = webrtc.Configuration{
	ICEServers: []webrtc.ICEServer{
		{
			URLs: []string{"stun:stun.l.google.com:19302"},
		},
		{
			URLs:           []string{"turn:35.247.173.254:3478"},
			Username:       "username",
			Credential:     "password",
			CredentialType: webrtc.ICECredentialTypePassword,
		},
		{
			URLs:           []string{"turn:35.240.163.22:3478"},
			Username:       "username",
			Credential:     "password",
			CredentialType: webrtc.ICECredentialTypePassword,
		},
	},
}

var broadcast *webrtc.SessionDescription
var viewer *webrtc.SessionDescription

// StartHTTPServer to use
func StartHTTPServer() {
	r := mux.NewRouter()

	fs := http.FileServer(http.Dir("static/"))

	// API here
	r.HandleFunc("/offer", handleOffer).Methods("POST")
	r.HandleFunc("/answer", handlerAnswer).Methods("POST")

	r.HandleFunc("/broadcast", handleBroadcast).Methods("POST")
	r.HandleFunc("/get_viewer", handleGetViewer).Methods("GET")
	r.HandleFunc("/get_broadcast", handleGetBroadcast).Methods("GET")
	r.HandleFunc("/viewer", handleViewer).Methods("POST")

	r.PathPrefix("/").
		Handler(
			http.StripPrefix(
				"/",
				fs,
			))

	go func() {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8088"
		}

		err := http.ListenAndServeTLS(fmt.Sprintf(":%s", port), "server.crt", "server.key", r)
		// err := http.ListenAndServe(fmt.Sprintf(":%s", port), r)

		if err != nil {
			fmt.Print(err)
		}
	}()

	select {}
}

// handleOffer for send offer to server
func handleOffer(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	offer := webrtc.SessionDescription{}

	err := json.NewDecoder(r.Body).Decode(&offer)
	defer r.Body.Close()

	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	// create peer connection
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	// create Track the we send video back to
	outputTrack, err := peerConnection.NewTrack(webrtc.DefaultPayloadTypeVP8, rand.Uint32(), "video", "pion")
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	// Add this newly created track to the PeerConnection
	_, err = peerConnection.AddTrack(outputTrack)
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	peerConnection.OnTrack(func(track *webrtc.Track, receiver *webrtc.RTPReceiver) {
		go func() {
			ticker := time.NewTicker(time.Second * 3)
			for range ticker.C {
				errSend := peerConnection.WriteRTCP([]rtcp.Packet{&rtcp.PictureLossIndication{MediaSSRC: track.SSRC()}})
				if errSend != nil {
					fmt.Println(errSend)
				}
			}
		}()

		for {
			// Read RTP packets  sent to Pion
			rtp, readErr := track.ReadRTP()
			if readErr != nil {
				panic(readErr)
			}

			// Replace the SSRC with the SSRC of the outbound track.
			// The only change we are making replacing the SSRC, the RTP packets are unchanged otherwise

			rtp.SSRC = outputTrack.SSRC()
			rtp.PayloadType = webrtc.DefaultPayloadTypeVP8

			if writeErr := outputTrack.WriteRTP(rtp); writeErr != nil {
				panic(writeErr)
			}

			if slaveTrack != nil {
				rtp.SSRC = slaveTrack.SSRC()
				rtp.PayloadType = webrtc.DefaultPayloadTypeVP8

				if writeErr := slaveTrack.WriteRTP(rtp); writeErr != nil {
					panic(writeErr)
				}
			}

			// do something with track for peer slave here
		}
	})

	peerConnection.OnICEConnectionStateChange(func(connectionState webrtc.ICEConnectionState) {
		fmt.Printf("ICE Connection State has changed: %s\n", connectionState.String())
	})

	// set remote description
	err = peerConnection.SetRemoteDescription(webrtc.SessionDescription{
		SDP:  offer.SDP,
		Type: offer.Type,
	})
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	answer, err := peerConnection.CreateAnswer(nil)
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	// Sets the LocalDescription, and starts our UDP listeners
	err = peerConnection.SetLocalDescription(answer)
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	session := Session{
		SDP:  answer.SDP,
		Type: answer.Type.String(),
	}

	// response
	resp := Message(true, "handleOffer connected !!!")
	resp["answer"] = session
	Respond(w, resp)
	return

}

func handlerAnswer(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	offer := webrtc.SessionDescription{}

	err := json.NewDecoder(r.Body).Decode(&offer)
	defer r.Body.Close()
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	// create peer connection
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	// create Track the we send video back to
	outputTrack, err := peerConnection.NewTrack(webrtc.DefaultPayloadTypeVP8, rand.Uint32(), "video", "pion")
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	// Add this newly created track to the PeerConnection
	_, err = peerConnection.AddTrack(outputTrack)
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	peerConnection.OnICEConnectionStateChange(func(connectionState webrtc.ICEConnectionState) {
		fmt.Printf("ICE Connection State has changed: %s\n", connectionState.String())
	})

	// set remote description
	err = peerConnection.SetRemoteDescription(webrtc.SessionDescription{
		SDP:  offer.SDP,
		Type: offer.Type,
	})
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	answer, err := peerConnection.CreateAnswer(nil)
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	// Sets the LocalDescription, and starts our UDP listeners
	err = peerConnection.SetLocalDescription(answer)
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	session := Session{
		SDP:  answer.SDP,
		Type: answer.Type.String(),
	}

	slaveTrack = outputTrack
	// response
	resp := Message(true, "handlerAnswer connected !!!")
	resp["answer"] = session
	Respond(w, resp)
	return
}

func handleBroadcast(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	offer := webrtc.SessionDescription{}

	err := json.NewDecoder(r.Body).Decode(&offer)
	defer r.Body.Close()

	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	broadcast = &offer

	// response
	resp := Message(true, "handleBroadcast connected !!!")
	Respond(w, resp)
	return
}

func handleGetViewer(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	// response
	resp := Message(true, "handleGetViewer connected !!!")
	resp["answer"] = Session{
		SDP:  viewer.SDP,
		Type: viewer.Type.String(),
	}
	Respond(w, resp)
	return
}

func handleGetBroadcast(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	// response
	resp := Message(true, "handleGetBroadcast connected !!!")
	resp["offer"] = Session{
		SDP:  broadcast.SDP,
		Type: broadcast.Type.String(),
	}
	Respond(w, resp)
	return
}

func handleViewer(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	answer := webrtc.SessionDescription{}

	err := json.NewDecoder(r.Body).Decode(&answer)
	defer r.Body.Close()

	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}

	viewer = &answer
	// response
	resp := Message(true, "handleViewer connected !!!")
	resp["offer"] = Session{
		SDP:  broadcast.SDP,
		Type: broadcast.Type.String(),
	}
	Respond(w, resp)
	return
}
