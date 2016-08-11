/**
 * Box.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
      boxId : { type : 'string' },
      boxLatitude : { type : 'float' },
      boxLongitude : { type : 'float' },
      isSendingInfo : { type : 'boolean' },
      temperature : { type : 'float' },
      humidity : { type : 'float' },
      light : { type : 'integer' },
      accelerometer : { type : 'string' },
      
      pickupOrder : {
          model : 'pickup'
      }
  }
};

