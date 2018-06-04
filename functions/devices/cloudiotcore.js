const googleapis = require('googleapis');

const API_SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];
const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';
const SERVICE_NAME = 'cloudiot';
const DISCOVERY_URL = `${DISCOVERY_API}?version=${API_VERSION}`;

class CloudIoTCoreDevice {
  constructor(region, project, registry, deviceId) {
    this._region = region;
    this._project = project;
    this._registry = registry;
    this._deviceId = deviceId;
    this.type = 'CloudIoTCore';
  }

  connect() {
    return this._getCloudIoTClient().then(client => {
      this._client = client;
      return this;
    });
  }

  _getFullDeviceName() {
    return `projects/${this._project}/locations/${this._region}/registries/${
      this._registry
    }/devices/${this._deviceId}`;
  }

  getId() {
    return this._deviceId;
  }

  getDeviceState() {
    if (!this._client) {
      throw new Error('Device not connected');
    }
    const deviceName = this._getFullDeviceName();

    return new Promise((resolve, reject) => {
      this._client.projects.locations.registries.devices.get(
        {
          name: deviceName
        },
        (err, response, data) => {
          if (err) {
            reject(err);
            return;
          }

          if (response.data) {
            const { state } = response.data;
            const { binaryData } = state;
            const buffer = Buffer.from(binaryData, 'base64');
            const jsonData = buffer.toString('utf-8');
            const parsedState = JSON.parse(jsonData);
            resolve(parsedState);
            return;
          }

          resolve(response);
        }
      );
    });
  }

  sendConfigToDevice(config) {
    if (!this._client) {
      throw new Error('Device not connected');
    }
    const deviceName = this._getFullDeviceName();

    const data = Buffer.from(JSON.stringify(config), 'utf-8');
    const binaryData = data.toString('base64');

    return new Promise((resolve, reject) => {
      this._client.projects.locations.registries.devices.modifyCloudToDeviceConfig(
        {
          name: deviceName,
          resource: {
            version_to_update: 0,
            binary_data: binaryData
          }
        },
        (err, response) => {
          if (!err) {
            resolve(response.data);
            return;
          }
          reject(err);
        }
      );
    });
  }

  _getCloudIoTClient() {
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
}

module.exports = CloudIoTCoreDevice;
