const { dialogflow, DialogflowConversation, SimpleResponse, RichResponse, RichResponseItem } = require( 'actions-on-google' );
const SmartPlant = require( './plant' );

const ACTION_WELCOME = 'Default Welcome Intent';
const ACTION_STATUS = 'status';
const ACTION_ENVIRONMENT = 'environment';
const ACTION_WATER_ON = 'water.on';
const ACTION_WATER_OFF = 'water.off';
const ACTION_LIGHT_ON = 'light.on';
const ACTION_LIGHT_OFF = 'light.off';

class Conversation {
  /**
   * @param {SmartPlant} plant
   */
  constructor( plant ) {
    this.plant = plant;

    const app = dialogflow();

    app.intent( ACTION_WELCOME, this.welcomeHandler.bind( this ) );
    app.intent( ACTION_ENVIRONMENT, this.enviromentHandler.bind( this ) );
    app.intent( ACTION_STATUS, this.statusHandler.bind( this ) );
    app.intent( ACTION_WATER_ON, this.waterOnHandler.bind( this ) );
    app.intent( ACTION_WATER_OFF, this.waterOffHandler.bind( this ) );
    app.intent( ACTION_LIGHT_ON, this.lightOnHandler.bind( this ) );
    app.intent( ACTION_LIGHT_OFF, this.lightOffHandler.bind( this ) );

    this.app = app;
  }

  getDialogFlowApp() {
    return this.app;
  }

  /**
   * @param {DialogflowConversation} conv
   */
  waterOnHandler( conv ) {
    return this.plant
      .connect()
      .then( ( ok ) => {
        return this.plant.getCurrentState();
      } )
      .then( ( state ) => {
        if ( state.watering ) {
          conv.ask( "Thanks, but I'm already taking a shower" );
          return true;
        } 
        if ( this.plant.needWater( state ) ) {
          conv.ask(
            "I'm really in need of taking a shower, thanks for taking care of me."
          );
        } else {
          conv.ask(
            "I'm feeling good, but it's always good to take a shower."
          );
        }
        return this.plant.waterOn( 30 );
        
      } );
  }

  /**
   * @param {DialogflowConversation} conv
   */
  waterOffHandler( conv ) {
    return this.plant
      .connect()
      .then( ( ok ) => {
        return this.plant.getCurrentState();
      } )
      .then( ( state ) => {
        if ( !state.watering ) {
          conv.ask( 'Thanks, but the shower is already off.' );
        } else {
          conv.ask( 'Ok, let me turn off the shower.' );
          return this.plant.waterOff();
        }
        return true;
      } )
      .catch( err => this.errorHandler( err, conv ) );
  }

  /**
   * @param {DialogflowConversation} conv
   */
  lightOnHandler( conv ) {
    return this.plant
      .connect()
      .then( ( ok ) => {
        return this.plant.getCurrentState();
      } )
      .then( ( state ) => {
        if ( state.lightningUp ) {
          conv.ask( "Thanks, but I'm already taking a sun bath." );
          return true;
        } 
        conv.ask( 'Turning on the light.' );
        return this.plant.lightOn( 30 );
        
      } );
  }

  /**
   * @param {DialogflowConversation} conv
   */
  lightOffHandler( conv ) {
    return this.plant
      .connect()
      .then( ( ok ) => {
        return this.plant.getCurrentState();
      } )
      .then( ( state ) => {
        if ( !state.lightningUp ) {
          conv.ask( 'Thanks, but the light is already on.' );
          return true;
        } 
        conv.ask( 'Turning off the light.' );
        return this.plant.lightOff();
        
      } );
  }

  /**
   * @param {DialogflowConversation} conv
   */
  enviromentHandler( conv ) {

    return this.plant
      .connect()
      .then( ( ok ) => {
        return this.plant.getCurrentState();
      } )
      .then( ( state ) => {
        const temp = state.temperature;
        let env = '';
        if ( temp > 32 ) {
          env = 'is very hot';
        } else if ( temp < 20 ) {
          env = 'a bit cold';
        } else {
          env = 'nice';
        }
        const msg = `The weather around here is ${env}, according to my calculations is around ${temp} degrees celsius`;
        conv.ask( msg );
      } )
      .catch( err => this.errorHandler( err, conv ) );
  }

  /**
   * @param {DialogflowConversation} conv
   */
  statusHandler( conv, { positive_words, negative_words } ) {
    return this.plant
      .connect()
      .then( ( ok ) => {
        return this.plant.getCurrentState();
      } )
      .then( ( state ) => {
        const msgs = [];
        if ( state.watering ) {
          msgs.push( "I'm taking a shower" );
          return;
        }
        if ( state.lightningUp ) {
          msgs.push( "I'm taking a sun bath" );
          return;
        }

        if ( msgs.length > 0 ) {
          const msg = `${msgs.join( ' and also ' )}.`;
          conv.ask( msg );
        }

        let status = msgs.length > 0 ? 'and ' : '';
        if ( this.plant.needWater( state ) ) {
          if ( state.watering ) {
            status += "I'm feeling bad now, but the water will make me better.";
          } else {
            status += "I'm feeling bad, but thanks for asking.";
          }
        } else {
          status += "I'm feeling awesome, thanks for asking.";
        }
        return conv.ask( status )        
      } )
      .catch( err => this.errorHandler( err, conv ) );
  }

  errorHandler( err, conv ) {
    console.log( 'Catch', err );
    conv.close(
      "Hummm, something went wrong and I don't know what I'm feeling."
    );
  }

  /**
   * @param {DialogflowConversation} conv
   */
  welcomeHandler( conv ) {
    conv.ask( 'Hi, is good to see you around.' );
  }
}

module.exports = Conversation;
