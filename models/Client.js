const mongoose = require('mongoose');


const clientSchema = new mongoose.Schema({
    username: {type : String},
    clientId:{type : String},
    email: { type: String}, 
    location: { type: String },
    // ip
    // device
    // phone
    // browser
    // userId Fundist
    // Tag
    // project
    // site
    // tickets
  });

  module.exports = mongoose.model('Client', clientSchema);