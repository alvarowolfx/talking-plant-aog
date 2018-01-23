const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { DialogflowApp } = require('actions-on-google');
const googleapis = require('googleapis');

const ACTION_WELCOME = 'input.welcome';
const ACTION_STATUS = 'status';
const ACTION_WATER_ON = 'water.on';
const ACTION_WATER_OFF = 'water.off';

admin.initializeApp(functions.config().firebase);
//const db = admin.firebase();

const DEVICE_ID = 'esp8266_DA7A48';
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const REGION = 'us-central1';
const REGISTRY = 'talking-plant-registry';

/**
 * @param {DialogflowApp} assistant
 */
function welcomeHandler(assistant, state) {
  let currentClient = null;
  getCloudIoTClient()
    .then(client => {
      currentClient = client;
      let now = Date.now() / 1000;
      let config = { waterUntil: now + 30 };
      return sendConfigToDevice(client, DEVICE_ID, config);
    })
    .then(response => {
      console.log('SendConfigToDevice:', response);
      return getDeviceState(currentClient, DEVICE_ID);
    })
    .then(device => {
      const { state } = device;
      console.log('State:', state);
      if (state.watering) {
        assistant.ask("I'm taking a shower.");
        return;
      }
      if (state.lightningUp) {
        assistant.ask("I'm taking a sun bath.");
        return;
      }

      let status = state.moisture < 200 ? 'feeling bad' : 'feeling awesome';

      assistant.ask(`I'm ${status}, thanks for asking.`);
    })
    .catch(err => {
      console.log('Catch', err);
      assistant.tell('Something went wrong when watering the plant.');
    });
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(
  (req, res) => {
    const assistant = new DialogflowApp({ request: req, response: res });

    const actionMap = new Map();
    actionMap.set(ACTION_WELCOME, welcomeHandler);
    //actionMap.set(ACTION_ORDER_PIZZA, orderPizzaHandler);
    //actionMap.set(ACTION_USER_DATA, userDataHandler);
    assistant.handleRequest(actionMap);
  }
);

function getFullDeviceName(deviceId) {
  return `projects/${PROJECT_ID}/locations/${REGION}/registries/${REGISTRY}/devices/${deviceId}`;
}

function getDeviceState(client, deviceId) {
  const device_name = getFullDeviceName(deviceId);

  return new Promise((resolve, reject) => {
    client.projects.locations.registries.devices.get(
      {
        name: device_name
      },
      (err, response) => {
        if (!err) {
          resolve(response);
          return;
        }
        reject(err);
      }
    );
  });
}

function sendConfigToDevice(client, deviceId, config) {
  const device_name = getFullDeviceName(deviceId);

  const data = new Buffer(JSON.stringify(config), 'utf-8');
  const binaryData = data.toString('base64');

  return new Promise((resolve, reject) => {
    client.projects.locations.registries.devices.modifyCloudToDeviceConfig(
      {
        name: device_name,
        resource: {
          version_to_update: 0,
          binary_data: binaryData
        }
      },
      (err, response) => {
        if (!err) {
          resolve(response);
          return;
        }
        reject(err);
      }
    );
  });
}

const API_SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];
const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';
const SERVICE_NAME = 'cloudiot';
const DISCOVERY_URL = `${DISCOVERY_API}?version=${API_VERSION}`;

function getCloudIoTClient() {
  return new Promise((resolve, reject) => {
    googleapis.auth.getApplicationDefault((err, auth, projectId) => {
      if (err) {
        reject(err);
        return;
      }

      googleapis.discoverAPI(DISCOVERY_URL, { auth }, (err, service) => {
        if (!err) {
          resolve(service);
        } else {
          reject(err);
        }
      });
    });
  });
}
