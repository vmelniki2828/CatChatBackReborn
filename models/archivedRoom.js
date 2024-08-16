const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: String,
    message: String,
    timestamp: String,
  });
  
  const clientSchema = new mongoose.Schema({
    username: String,
    clientId : String,
    email: String, 
    otherInfo: Object,
  });

const ArchivedRoomSchema = new mongoose.Schema({
    // roomID
    roomId: String,
    clients: clientSchema, // Использовать отдельную схему для клиентов
    managers: [], // Менеджеры чата
    messages: [messageSchema],
    startTime: { type: Date, default: Date.now }, // Время начала чата
    endTime: Date, 
  });

  module.exports = mongoose.model("ArchivedRoom", ArchivedRoomSchema);