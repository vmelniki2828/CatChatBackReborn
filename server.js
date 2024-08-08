const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Client = require('./models/Client');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3001", // Укажите адрес вашего клиента
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
     reconnection: true, // Включает автоматическое восстановление соединения
  reconnectionAttempts: 5, // Максимальное количество попыток восстановления
  reconnectionDelay: 1000, 
  }
});

app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
     reconnection: true, // Включает автоматическое восстановление соединения
  reconnectionAttempts: 5, // Максимальное количество попыток восстановления
  reconnectionDelay: 1000,  // Укажите адрес вашего клиента
}));

app.use(express.static('public'));


let managers = []; // Список доступных менеджеров
let users = {}; // Соответствие пользователя и менеджера

io.on('connection', (socket) => {
  socket.on('user', async ({ username, email }) => {
    try {
      // Проверка на существующего пользователя
      const existingClient = await Client.findOne({ email });
      if (existingClient) {
        socket.emit('userExists', 'Пользователь с таким email уже существует');
        return;
      }

      // Создаем нового клиента
      const clientId = uuidv4();
      const client = new Client({
        username,
        clientId,
        email,
        // Другие поля
      });
      await client.save();

      if (managers.length > 0) {
        const manager = managers.shift();
        users[clientId] = { managerId: manager.id, roomId: `room-${clientId}` };
        socket.join(users[clientId].roomId);
        io.to(manager.socketId).socketsJoin(users[clientId].roomId);
        socket.emit('userAssigned', users[clientId].roomId);
        console.log(`Пользователь ${clientId} подключен к менеджеру ${manager.id}`);

        io.to(manager.socketId).emit('userAssigned', clientId);
      } else {
        socket.emit('noManagersAvailable');
        console.log(`Нет доступных менеджеров для пользователя ${clientId}`);
      }
    } catch (error) {
      console.error('Ошибка при подключении пользователя:', error);
      socket.emit('error', 'Ошибка при подключении пользователя');
    }
  });


  socket.on('message', ({ roomId, message }) => {
    io.to(roomId).emit('message', message); 
  });

  // Когда пользователь или менеджер отключаются
  socket.on('disconnect', () => {
    if (managers.includes(socket.id)) {
      managers = managers.filter((id) => id !== socket.id);
      console.log(`Менеджер ${socket.id} отключен`);
    } else if (users[socket.id]) {
      const managerId = users[socket.id];
      managers.push(managerId); // Освобождаем менеджера
      delete users[socket.id];
      console.log(`Пользователь ${socket.id} отключен`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});