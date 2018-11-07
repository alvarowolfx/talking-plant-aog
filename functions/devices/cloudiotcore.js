const { google } = require( 'googleapis' );

// const API_SCOPES = [ 'https://www.googleapis.com/auth/cloud-platform' ];
const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';
// const SERVICE_NAME = 'cloudiot';
const DISCOVERY_URL = `${DISCOVERY_API}?version=${API_VERSION}`;

class CloudIoTCoreDevice {
  constructor( region, project, registry, deviceId ) {
    this.region = region;
    this.project = project;
    this.registry = registry;
    this.deviceId = deviceId;
    this.type = 'CloudIoTCore';
  }

  connect() {
    return this.getCloudIoTClient().then( ( client ) => {
      this.client = client;
      return this;
    } );
  }

  getFullDeviceName() {
    return `projects/${this.project}/locations/${this.region}/registries/${
      this.registry
    }/devices/${this.deviceId}`;
  }

  getId() {
    return this.deviceId;
  }

  getDeviceState() {
    if ( !this.client ) {
      throw new Error( 'Device not connected' );
    }
    const deviceName = this.getFullDeviceName();

    return new Promise( ( resolve, reject ) => {
      this.client.projects.locations.registries.devices.get(
        {
          name : deviceName
        },
        ( err, response, data ) => {
          if ( err ) {
            reject( err );
            return;
          }

          if ( response.data ) {
            const { state } = response.data;
            const { binaryData } = state;
            const buffer = Buffer.from( binaryData, 'base64' );
            const jsonData = buffer.toString( 'utf-8' );
            const parsedState = JSON.parse( jsonData );
            resolve( parsedState );
            return;
          }

          resolve( response );
        }
      );
    } );
  }

  sendConfigToDevice( config ) {
    if ( !this.client ) {
      throw new Error( 'Device not connected' );
    }
    const deviceName = this.getFullDeviceName();

    const data = Buffer.from( JSON.stringify( config ), 'utf-8' );
    const binaryData = data.toString( 'base64' );

    return new Promise( ( resolve, reject ) => {
      this.client.projects.locations.registries.devices.modifyCloudToDeviceConfig(
        {
          name : deviceName,
          resource : {
            version_to_update : 0,
            binary_data : binaryData
          }
        },
        ( err, response ) => {
          if ( !err ) {
            resolve( response.data );
            return;
          }
          reject( err );
        }
      );
    } );
  }

  getCloudIoTClient() {    
    return google.auth.getApplicationDefault().then( ( { credential } ) => {              
      google.options( {
        auth : credential
      } )
      return google.discoverAPI( DISCOVERY_URL )
    } )
  }
}

module.exports = CloudIoTCoreDevice;
