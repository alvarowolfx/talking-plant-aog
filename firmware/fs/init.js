load('api_mqtt.js');
load('api_gpio.js');
load('api_sys.js');
load('api_timer.js');
load('api_bme280.js');
load('api_adc.js');
load('api_neopixel.js');
load('api_config.js');
load('api_net.js');

let deviceName = Cfg.get('device.id');
//let topic = '/devices/' + deviceName + '/events';
let stateTopic = '/devices/' + deviceName + '/state';
let configTopic = '/devices/' + deviceName + '/config';
let isConnected = false;

let neopixelPin = 2; // D4
let numPixels = 16,
  colorOrder = NeoPixel.GRB;
let strip = NeoPixel.create(neopixelPin, numPixels, colorOrder);
strip.clear();
strip.show();

let moistureSensorPin = 0; //A0
ADC.enable(moistureSensorPin);

let myBME = BME280.createI2C(0x76);
let data = BME280Data.create();

let waterRelayPin = 13; // D7
let lightRelayPin = 12; // D6
GPIO.set_mode(waterRelayPin, GPIO.MODE_OUTPUT);
GPIO.set_pull(waterRelayPin, GPIO.PULL_UP);
GPIO.set_mode(lightRelayPin, GPIO.MODE_OUTPUT);
GPIO.set_pull(lightRelayPin, GPIO.PULL_UP);

GPIO.write(waterRelayPin, 1); // Turn off
GPIO.write(lightRelayPin, 1); // Turn off

let state = {
  moisture: 0,
  temperature: 0,
  humidity: 0,
  watering: false,
  lightningUp: false
};

let desiredState = {
  moisture: 0,
  temperature: 0,
  humidity: 0,
  watering: false,
  lightningUp: false
};

function updateMoisture() {
  state.moisture = ADC.read(moistureSensorPin);
}

function updateEnviroment() {
  let ret = myBME.readAll(data);
  if (ret === 0) {
    state.temperature = data.temp();
    state.humidity = data.humid();
    //print(state);
  } else {
    print('Error reading');
  }
}

function syncState() {
  let msg = JSON.stringify(state);
  print('Sync State ', msg);
  if (isConnected) {
    MQTT.pub(stateTopic, msg, 1);
  }
}

function updateDisplay() {
  strip.clear();
  for (let i = 0; i < state.moisture / 32; i++) {
    if (state.moisture < 180) {
      strip.setPixel(i /* pixel */, 0, 0, 100);
    } else if (state.moisture < 400) {
      strip.setPixel(i /* pixel */, 0, 100, 0);
    } else {
      strip.setPixel(i /* pixel */, 100, 0, 0);
    }
  }
  strip.show();
}

// Moisture monitor
Timer.set(
  5000,
  Timer.REPEAT,
  function() {
    updateMoisture();
    updateDisplay();

    // Sync if we found a significant change
    let diff = Math.abs(oldMoisture - state.moisture);
    if(diff) > 100){
      syncState();
    }
  },
  null
);

// Relays monitor
Timer.set(
  1000,
  Timer.REPEAT,
  function() {
    let now = Timer.now();
    //print('Now is : ' + JSON.stringify(now));
    //print('Desired State : ' + JSON.stringify(desiredState));
    if (!state.watering) {
      if (desiredState.waterUntil > now) {
        state.watering = true;
        GPIO.write(waterRelayPin, 0);
        syncState();
      }
    } else {
      if (desiredState.waterUntil < now) {
        state.watering = false;
        GPIO.write(waterRelayPin, 1);
        syncState();
      }
    }

    if (!state.lightningUp) {
      if (desiredState.lightUntil > now) {
        state.lightningUp = true;
        GPIO.write(lightRelayPin, 0);
        syncState();
      }
    } else {
      if (desiredState.lightUntil < now) {
        state.lightningUp = false;
        GPIO.write(lightRelayPin, 1);
        syncState();
      }
    }
  },
  null
);

// Temperature and Humidity monitor
Timer.set(
  10000,
  Timer.REPEAT,
  function() {
    updateEnviroment();
  },
  null
);

// Sync state
Timer.set(
  60 * 1000,
  Timer.REPEAT,
  function() {
    syncState();
  },
  null
);

// First sync
Timer.set(
  5000,
  0,
  function() {
    syncState();
  },
  null
);

// Receive new config
MQTT.sub(
  configTopic,
  function(conn, topic, msg) {
    print('Got config update:', msg.slice(0, 100));
    if (!msg) {
      return;
    }
    let obj = JSON.parse(msg);
    if (obj) {
      if (obj.waterUntil) {
        // Water config
        desiredState.waterUntil = obj.waterUntil;
      }
      if (obj.lightUntil) {
        // Light config
        desiredState.lightUntil = obj.lightUntil;
      }
    }

    //setUpdateTimer();
  },
  null
);

updateEnviroment();
updateMoisture();
updateDisplay();

MQTT.setEventHandler(function(conn, ev) {
  if (ev === MQTT.EV_CONNACK) {
    print('MQTT CONNECTED');
    isConnected = true;
    syncState();
  }
}, null);

// Monitor network connectivity.
Net.setStatusEventHandler(function(ev, arg) {
  let evs = '???';
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = 'DISCONNECTED';
    isConnected = false;
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = 'CONNECTING';
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = 'CONNECTED';
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = 'GOT_IP';
  }
  print('== Net event:', ev, evs);
}, null);
