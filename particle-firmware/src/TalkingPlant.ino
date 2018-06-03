/*
 * Project TalkingPlant
 * Description:
 * Author: Alvaro Viebrantz
 * Date: 02/06/2018
 */

typedef unsigned char uint8_t;

#include "JsonParserGeneratorRK.h"
#include "Adafruit_Sensor.h"
#include "Adafruit_BMP280.h"
#include "neopixel.h"

SYSTEM_MODE(AUTOMATIC);

#define SEALEVELPRESSURE_HPA (1013.25)
#define ONE_DAY_MILLIS (24 * 60 * 60 * 1000)

#define NEOPIXEL_PIN D4
#define PIXEL_COUNT 16
#define PIXEL_TYPE WS2812B

#define MOISTURE_PIN A0
#define LIGHT_PIN A1
#define WATER_RELAY_PIN D5
#define LIGHT_RELAY_PIN D6

typedef struct sensor_state{
  int moisture;
  int light;
  float temperature;
  float pressure;
  float altitude;
  bool watering;
  bool lightningUp;
} SensorState;

typedef struct desired_state{
  int waterUntil;
  int lightUntil;
} DesiredState;

Adafruit_BMP280 bmp; // I2C
Adafruit_NeoPixel strip(PIXEL_COUNT, NEOPIXEL_PIN, PIXEL_TYPE);
SensorState state;
DesiredState desiredState;

bool shouldSyncState = false;
bool shouldUpdateEnviroment = false;
bool shouldUpdateMoistureAndLight = false;
bool shouldCheckRelays = false;

unsigned long lastSync = millis();

Timer stateTimer(60*1000, shouldSyncStateFunc);
Timer envTimer(15*1000, shouldUpdateEnviromentFunc);
Timer adcTimer(5*1000, shouldUpdateMoistureAndLightFunc);
Timer relaysTimer(1*1000, shouldCheckRelaysFunc);

void shouldSyncStateFunc(){
  shouldSyncState = true;
}

void shouldUpdateEnviromentFunc(){
  shouldUpdateEnviroment = true;
}

void shouldUpdateMoistureAndLightFunc(){
  shouldUpdateMoistureAndLight = true;
}

void shouldCheckRelaysFunc(){
  shouldCheckRelays = true;
}


void updateEnviroment() {
  Particle.publish("DEBUG","Checking Environment");
  state.temperature = bmp.readTemperature();
  state.pressure = bmp.readPressure();
  state.altitude = bmp.readAltitude(SEALEVELPRESSURE_HPA);
  //state.humidity = bmp.readHumidity();
}

void updateMoistureAndLight(){
  Particle.publish("DEBUG","Checking moisture and light");
  int oldMoisture = state.moisture;
  state.moisture = analogRead(MOISTURE_PIN);
  state.light = analogRead(LIGHT_PIN);

  int diff = abs(oldMoisture - state.moisture);
  if(diff > 400){
    syncState();
  }

  updateDisplay();
}

void updateDisplay(){

  uint32_t color = strip.Color(100, 0, 0); //RED
  if (state.moisture < 180*4) {
    color = strip.Color(0, 0, 100); // BLUE
  } else if (state.moisture < 400*4) {
    color = strip.Color(0, 100, 0); // GREEN
  }

  int steps = (4096/PIXEL_COUNT);
  int value = (4096 - state.moisture) / steps;
  strip.clear();
  for (int i = 0; i < value; i++) {
    strip.setPixelColor(i /* pixel */, color);
  }
  strip.show();
}

void checkRelays(){
  int now = Time.now();
  if (!state.watering) {
    if (desiredState.waterUntil > now) {
      state.watering = true;
      digitalWrite(WATER_RELAY_PIN, LOW);
      syncState();
    }
  } else {
    if (desiredState.waterUntil < now) {
      state.watering = false;
      digitalWrite(WATER_RELAY_PIN, HIGH);
      syncState();
    }
  }

  if (!state.lightningUp) {
    if (desiredState.lightUntil > now) {
      state.lightningUp = true;
      digitalWrite(LIGHT_RELAY_PIN, LOW );
      syncState();
    }
  } else {
    if (desiredState.lightUntil < now) {
      state.lightningUp = false;
      digitalWrite(LIGHT_RELAY_PIN, HIGH );
      syncState();
    }
  }
}

int forceSyncState(String command){
  updateEnviroment();
  updateMoistureAndLight();
  syncState();
  return 0;
}

int waterUntilFunc(String command){
  int value = atoi(command);
  if(value > 0){
    desiredState.waterUntil = value;
    return 0;
  }

  return -1;
}

int lightUntilFunc(String command){
  int value = atoi(command);
  if(value > 0){
    desiredState.lightUntil = value;
    return 0;
  }

  return -1;
}

String getJsonState(){
  JsonWriterStatic<256> jw;
  {
    JsonWriterAutoObject obj(&jw);
    jw.insertKeyValue("temperature",state.temperature);
    //jw.insertKeyValue("humidity",state.humidity);
    jw.insertKeyValue("pressure",state.pressure);
    jw.insertKeyValue("altitude",state.altitude);

    jw.insertKeyValue("moisture",state.moisture);
    jw.insertKeyValue("light",state.light);

    jw.insertKeyValue("watering",state.watering);
    jw.insertKeyValue("lightningUp",state.lightningUp);
  }

  return jw.getBuffer();
}

void syncState(){
  Particle.publish("state", getJsonState(), PRIVATE);
}

// setup() runs once, when the device is first turned on.
void setup() {
  Serial.begin(9600);
  Particle.publish("DEBUG",F("Talking Plant project started"));

  pinMode(LIGHT_PIN, INPUT);
  pinMode(MOISTURE_PIN, INPUT);
  pinMode(WATER_RELAY_PIN, OUTPUT);
  pinMode(LIGHT_RELAY_PIN, OUTPUT);

  digitalWrite(WATER_RELAY_PIN, HIGH); // Turn off
  digitalWrite(LIGHT_RELAY_PIN, HIGH); // Turn off

  strip.begin();
  strip.clear();
  for (int i = 0; i < PIXEL_COUNT; i++) {
    strip.setPixelColor(i /* pixel */, strip.Color(100,100,100));
  }
  strip.show();

  if (bmp.begin(0x76)) {
    updateEnviroment();
    updateMoistureAndLight();
    updateDisplay();

    syncState();

    delay(2000);

    envTimer.start();
    adcTimer.start();
    stateTimer.start();
    relaysTimer.start();
  }else{
    Particle.publish("DEBUG","Could not find a valid BMP280 sensor, check wiring!");
  }

  Particle.function("syncState", forceSyncState);
  Particle.function("waterUntil", waterUntilFunc);
  Particle.function("lightUntil", lightUntilFunc);
}

// loop() runs over and over again, as quickly as it can execute.
void loop() {
  if (millis() - lastSync > ONE_DAY_MILLIS) {
    // Request time synchronization from the Particle Device Cloud
    Particle.syncTime();
    lastSync = millis();
  }

  if(shouldSyncState){
    syncState();
    shouldSyncState = false;
  }

  if(shouldUpdateEnviroment){
    updateEnviroment();
    shouldUpdateEnviroment = false;
  }

  if(shouldUpdateMoistureAndLight){
    updateMoistureAndLight();
    shouldUpdateMoistureAndLight = false;
  }

  if(shouldCheckRelays){
    checkRelays();
    shouldCheckRelays = false;
  }

  delay(100);
}
