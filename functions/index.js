const functions = require( 'firebase-functions' );
const admin = require( 'firebase-admin' );

const { dialogflow, DialogflowConversation } = require( 'actions-on-google' );

const CloudIotCoreDevice = require( './devices/cloudiotcore' );
const ParticleDevice = require( './devices/particle' );
const SmartPlant = require( './plant' );
const Conversation = require( './conversation' );

admin.initializeApp();
const db = admin.database();

const DEVICE_ID = 'esp8266_DA7A48';
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const REGION = 'us-central1';
const REGISTRY = 'talking-plant-registry';

const PARTICLE_DEVICE_ID = 'pale-monkey';
const PARTICLE_DEVICE_INTERNAL_ID = '180028000347363333343435';
const PARTICLE_ACCESS_TOKEN = '41cf8f9f6b404886837fae08bcb903151c011612';

const device = new CloudIotCoreDevice( REGION, PROJECT_ID, REGISTRY, DEVICE_ID );

const deviceParticle = new ParticleDevice(
  PARTICLE_DEVICE_ID,
  PARTICLE_DEVICE_INTERNAL_ID,
  PARTICLE_ACCESS_TOKEN
);

const plant = new SmartPlant( deviceParticle, db );

const conversation = new Conversation( plant );
const app = conversation.getDialogFlowApp();

/**
 * Configure Dialogflow Webhook
 */
exports.dialogflowFirebaseFulfillment = functions.https.onRequest( app );

/**
 * Receive data from pubsub, then
 * Write telemetry raw data to bigquery
 * Maintain last data on firebase realtime database
 */
exports.receiveTelemetry = functions.pubsub
  .topic( 'telemetry-topic' )
  .onPublish( ( event, context ) => {
    const attributes = event.attributes;
    const message = event.json;

    const deviceId = attributes.deviceId || attributes.device_id; // Particle sends with underline

    const data = {
      moisture : message.moisture,
      temperature : message.temperature,
      light : message.light,
      watering : message.watering,
      lightningUp : message.lightningUp,
      deviceId,
      timestamp : context.timestamp
    };

    return updateCurrentDataFirebase( data );
  } );

/**
 * Maintain last status in firebase
 */
function updateCurrentDataFirebase( data ) {
  return db.ref( `/devices/${data.deviceId}` ).set( {
    moisture : data.moisture,
    temperature : data.temperature,
    light : data.light,
    watering : data.watering,
    lightningUp : data.lightningUp,
    lastTimestamp : data.timestamp
  } );
}
