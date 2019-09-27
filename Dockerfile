FROM golang

RUN go get -u github.com/pion/logging
RUN go get -u github.com/pion/turn
RUN go get -u github.com/gorilla/mux
RUN go get -u github.com/pion/rtcp
RUN go get -u github.com/pion/webrtc

COPY . /usr/local/src/rtc-server
WORKDIR /usr/local/src/rtc-server

CMD [ "go", "run", "." ]