const mongoose = require('mongoose');


const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: String,
});

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

const chatSchema = new mongoose.Schema({
  clients: [clientSchema], // Использовать отдельную схему для клиентов
  managers: [String], // Менеджеры чата
  messages: [messageSchema],
  startTime: { type: Date, default: Date.now }, // Время начала чата
  endTime: Date, // Время окончания чата.
//  Добавить логику когда заканчивается чат! Возможно 10 минут спустя последнего сообщения. Как вариант 
});

module.exports = mongoose.model('Chat', chatSchema);