#!/bin/sh

# sudo docker build -t docker-turn:1.0 .

# sudo docker tag docker-turn:1.0 gcr.io/livestreaming-241004/docker-turn:1.0

# gcloud auth print-access-token | sudo docker login -u oauth2accesstoken --password-stdin https://gcr.io/livestreaming-241004

# sudo docker push gcr.io/livestreaming-241004/docker-turn:1.0

sudo docker build -t docker-rtc:1.0 .

sudo docker tag docker-rtc:1.0 gcr.io/livestreaming-241004/docker-rtc:1.0

gcloud auth print-access-token | sudo docker login -u oauth2accesstoken --password-stdin https://gcr.io/livestreaming-241004

sudo docker push gcr.io/livestreaming-241004/docker-rtc:1.0