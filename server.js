const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3001", // Укажите адрес вашего клиента
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: "http://localhost:3001" // Укажите адрес вашего клиента
}));

app.use(express.static('public'));


let managers = []; // Список доступных менеджеров
let users = {}; // Соответствие пользователя и менеджера

io.on('connection', (socket) => {
  // Когда подключается менеджер
  socket.on('manager', () => {
    managers.push(socket.id);
    console.log(`Менеджер ${socket.id} подключен`);
  });

  // Когда подключается пользователь
  socket.on('user', () => {
    if (managers.length > 0) {
      const managerId = managers.shift(); // Получаем первого доступного менеджера
      users[socket.id] = managerId; // Связываем пользователя с менеджером
      // Создаем комнату для пользователя и менеджера
      const roomId = `room-${socket.id}`;
      socket.join(roomId);
      io.to(managerId).socketsJoin(roomId);
      socket.emit('userAssigned', roomId);
      console.log(`Пользователь ${socket.id} подключен к менеджеру ${managerId}`);

      // Отправляем уведомление менеджеру
      io.to(managerId).emit('userAssigned', socket.id);
    } else {
      socket.emit('noManagersAvailable');
      console.log(`Нет доступных менеджеров для пользователя ${socket.id}`);
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