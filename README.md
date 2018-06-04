# (Work In Progress) How to talk with plants using IoT and Actions on Google.

## Overview

This project will teach you how to talk with plants using IoT and Actions on Google.

On the hardware part this project will have two version:

* One using a Particle Photon board and Cloud PubSub integration with Particle Cloud.
* Another one build using an ESP8266 running MongooseOS and Google Cloud IoT Core

### Upload firware to Particle board

The folder for this firware is `particle-firmware`.

* Work in progress

### Upload firmware with Mongoose OS Tools

The folder for this firware is `firmware`.

To use it we need to download and install it from the official website. Follow the installation instructions on https://mongoose-os.com/docs/quickstart/setup.html.

* `mos build --arch esp32`
* `mos flash`

### BOM

* Coming soon

### Schematic

![schematic](https://raw.githubusercontent.com/alvarowolfx/talking-plant-aog/master/schematic/TalkingPlant.png)

### Provision and config with GCP

* gcloud projects create talking-plant
* gcloud projects add-iam-policy-binding talking-plant --member=serviceAccount:cloud-iot@system.gserviceaccount.com --role=roles/pubsub.publisher
* gcloud config set project talking-plant
* gcloud beta pubsub topics create state-topic
* gcloud beta pubsub subscriptions create --topic state-topic state-subscription
* gcloud beta iot registries create talking-plant-registry --region us-central1 --state-pubsub-topic=state-topic

- mos gcp-iot-setup --gcp-project talking-plant --gcp-region us-central1 --gcp-registry talking-plant-registry --verbose

### References

* Coming soon
