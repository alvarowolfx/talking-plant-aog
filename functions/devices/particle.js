const Particle = require( 'particle-api-js' );

class ParticleDevice {
  constructor( deviceId, internalId, accessToken ) {
    this.accessToken = accessToken;
    this.client = new Particle();
    this.deviceId = deviceId;
    this.internalId = internalId;
    this.type = 'Particle';
  }

  connect() {
    return Promise.resolve( true );
  }

  getId() {
    return this.internalId;
  }

  getDeviceState() {
    if ( !this.client ) {
      throw new Error( 'Device not connected' );
    }

    return this.client
      .getEventStream( {
        deviceId : this.deviceId,
        name : 'state',
        auth : this.accessToken
      } )
      .then( ( stream ) => {
        return new Promise( ( resolve, reject ) => {
          stream.on( 'event', ( result ) => {
            resolve( result.data );
            stream.destroy();
          } );
        } );
      } );
  }

  sendConfigToDevice( config ) {
    if ( !this.client ) {
      throw new Error( 'Device not connected' );
    }

    const keys = Object.keys( config );

    if ( keys.length !== 1 ) {
      throw new Error( 'Only one key per call.' );
    }

    const name = keys[0];
    const argument = String( config[name] );

    const options = {
      deviceId : this.deviceId,
      name,
      auth : this.accessToken,
      argument
    };

    console.log( 'Sending Config to device with options', options );

    return this.client.callFunction( options );
  }
}

module.exports = ParticleDevice;
