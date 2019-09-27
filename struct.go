package main

import (
	"encoding/json"
	"net/http"
)

// Session for sdp
type Session struct {
	SDP  string `json:"sdp"`
	Type string `json:"type"`
}

// Respond for http request
func Respond(w http.ResponseWriter, data map[string]interface{}) {
	/*This is for response*/
	w.Header().Add("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// Message for http request
func Message(status bool, message string) map[string]interface{} {
	return map[string]interface{}{"status": status, "message": message}
}

func check(err *error, w http.ResponseWriter) {
	if err != nil {
		Respond(w, Message(false, "Invalid request"))
		return
	}
}
