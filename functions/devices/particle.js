const Particle = require('particle-api-js');

class ParticleDevice {
  constructor(deviceId, internalId, accessToken) {
    this._accessToken = accessToken;
    this._client = new Particle();
    this._deviceId = deviceId;
    this._internalId = internalId;
    this.type = 'Particle';
  }

  connect() {
    return Promise.resolve(true);
  }

  getId() {
    return this._internalId;
  }

  getDeviceState() {
    if (!this._client) {
      throw new Error('Device not connected');
    }

    return this._client
      .getEventStream({
        deviceId: this._deviceId,
        name: 'state',
        auth: this._accessToken
      })
      .then(stream => {
        return new Promise((resolve, reject) => {
          stream.on('event', result => {
            resolve(result.data);
            stream.destroy();
          });
        });
      });
  }

  sendConfigToDevice(config) {
    if (!this._client) {
      throw new Error('Device not connected');
    }

    const keys = Object.keys(config);

    if (keys.length !== 1) {
      throw new Error('Only one key per call.');
    }

    const name = keys[0];
    const argument = String(config[name]);

    const options = {
      deviceId: this._deviceId,
      name,
      auth: this._accessToken,
      argument
    };

    console.log('Sending Config to device with options', options);

    return this._client.callFunction(options);
  }
}

module.exports = ParticleDevice;
