class SmartPlant {
  /**
   * @param {device} CloudIoTCoreDevice device
   * @param {db} database.Database db
   */
  constructor(device, db) {
    this._device = device;
    this._db = db;
  }

  connect() {
    return this._device.connect();
  }

  /**
   * @param {time} time in seconds to turn on
   */
  waterOn(time) {
    let now = Date.now() / 1000;
    let config = { waterUntil: now + time };
    return this._device.sendConfigToDevice(config);
  }

  waterOff() {
    return this.waterOn(0);
  }

  /**
   * @param {time} time in seconds to turn on
   */
  lightOn(time) {
    let now = Date.now() / 1000;
    let config = { lightUntil: now + time };
    return this._device.sendConfigToDevice(config);
  }

  lightOff() {
    return this.lightOn(0);
  }

  /**
   * @param {state} state current state of the plant
   */
  needWater(state) {
    return state.moisture < 33;
  }

  getCurrentState() {
    //return this._device.getDeviceState();
    return this._db
      .ref(`/devices/${this._device.getId()}`)
      .once('value')
      .then(snapshot => {
        return snapshot.val();
      });
  }
}

module.exports = SmartPlant;
