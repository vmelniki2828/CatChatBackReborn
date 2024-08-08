const mongoose = require('mongoose');


const clientSchema = new mongoose.Schema({
    username: String,
    email: { type: String, required: false }, 
    location: { type: String, required: false },
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