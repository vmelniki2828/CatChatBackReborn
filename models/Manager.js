const mongoose = require("mongoose");

const managerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  socketId: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Manager", managerSchema);
