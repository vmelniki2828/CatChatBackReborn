const mongoose = require("mongoose");
const Client = require("./Client");

const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: String,
});

const roomSchema = new mongoose.Schema({
  // roomID
  roomId: String,
  clients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client" }], // Использовать отдельную схему для клиентов
  managers: [String], // Менеджеры чата
  messages: [messageSchema],
  startTime: { type: Date, default: Date.now }, // Время начала чата
  endTime: Date, // Время окончания чата.
  //  Добавить логику когда заканчивается чат! Возможно 10 минут спустя последнего сообщения. Как вариант
});

module.exports = mongoose.model("Room", roomSchema);
