const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const Manager = require("./models/Manager");
const Room = require("./models/Room");
const app = express();
const server = http.createServer(app);
const managersRoutes = require("./routes/managersRoutes");
const roomRoutes = require("./routes/roomsRoutes");
const { default: mongoose } = require("mongoose");
const ArchivedRoom = require("./models/archivedRoom");
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:80", // Укажите правильный адрес вашего клиента (фронтенда)
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: "http://localhost:80", // Укажите правильный адрес вашего клиента (фронтенда)
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

mongoose
  .connect("mongodb://127.0.0.1:27017/chat", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Подключение к базе данных MongoDB установлено");
  })
  .catch((err) => {
    console.error("Ошибка подключения к базе данных MongoDB", err);
  });

app.use(express.static("public"));
app.use(express.json());
app.use("/api", managersRoutes);
app.use("/api", roomRoutes);

// let managers = []; // Список доступных менеджеров
// let users = {}; // Соответствие пользователя и менеджера

const getRandomManager = async () => {
  try {
    const managers = await Manager.find(); // Получаем всех менеджеров
    if (managers.length === 0) {
      return null; // Если менеджеров нет, возвращаем null
    }
    const randomIndex = Math.floor(Math.random() * managers.length); // Выбираем случайный индекс
    return managers[randomIndex];
  } catch (err) {
    console.error("Ошибка при получении случайного менеджера", err);
    throw err; // Выбрасываем ошибку только если произошла ошибка с базой данных
  }
};

io.on("connection", (socket) => {
  console.log("Новый клиент подключен:", socket.id);

  socket.on("join_manager", async (username) => {
    console.log(`Менеджер ${username} присоединился`);
    try {
      let manager = await Manager.findOne({ username });
      if (!manager) {
        manager = new Manager({ username, socketId: socket.id });
        await manager.save();
      } else {
        manager.socketId = socket.id;
        await manager.save();
      }
      console.log(`Менеджер ${username} сохранен в базе данных`);
    } catch (err) {
      console.error("Ошибка при сохранении менеджера в базе данных", err);
    }
  });

  socket.on("delete_manager", async (username) => {
    console.log(`Менеджер ${username} вышел`);
    try {
      const manager = await Manager.findOneAndDelete({ username });
      if (manager) {
        console.log(`Менеджер ${username} удален из базы данных`);
      } else {
        console.log(`Менеджер ${username} не найден в базе данных`);
      }
    } catch (err) {
      console.error("Ошибка при удалении менеджера из базы данных", err);
    }
  });
  socket.on('rejoin_user', async ({ roomId }) => {
    console.log(`Клиент переподключается в комнату ${roomId}`);
    try {
      const room = await Room.findOne({ roomId });
  
      if (room) {
        socket.join(roomId);
        socket.emit('roomRejoined');
      } else {
        socket.emit('error', 'Комната не найдена.');
      }
    } catch (err) {
      console.error('Ошибка при переподключении к комнате:', err);
      socket.emit('error', 'Ошибка при переподключении к комнате.');
    }
  });
  
  socket.on('join_user', async ({ username, email, otherInfo }) => {
    console.log(`User ${username} with email ${email} and data:`, otherInfo);
    
    try {
      const randomManager = await getRandomManager();
      if (!randomManager) {
        socket.emit("noManagersAvailable", "Нет доступных менеджеров. Комната не может быть создана.");
        return;
      }
  
      const clientForRoom = {
        username,
        clientId: socket.id,
        email,
        otherInfo
      };
  
      const newRoom = new Room({
        roomId: `room_${clientForRoom.clientId}`,
        clients: clientForRoom,
        managers: [],
        messages: [],
      });
  
      await newRoom.save();
      console.log(`Комната с ID ${newRoom.roomId} успешно создана`);
      socket.emit('roomCreated', newRoom.roomId);
  
      newRoom.managers.push({
        username: randomManager.username,
        socketId: randomManager.socketId,
      });
      await newRoom.save();
  
      io.emit("newChat", newRoom);
  
      socket.join(newRoom.roomId);
    } catch (err) {
      console.error("Ошибка при создании комнаты или присоединении клиента", err);
      socket.emit("errorCreatingRoom", "Произошла ошибка при создании комнаты.");
    }
  });
  
  socket.on("send_message", async (message) => {
    const { roomId, sender, messageText } = message;
    try {
      const room = await Room.findOne({ roomId });
  
      if (!room) {
        console.error("Комната не найдена");
        socket.emit("error_message", { message: "Комната не найдена." });
        return;
      }
  
      const newMessage = {
        sender,
        message: messageText,
        timestamp: new Date(),
      };
  
      room.messages.push(newMessage);
      console.log("Добавляем сообщение в комнату:", newMessage);
      await room.save();
  
      console.log("Новое сообщение сохранено:", newMessage);
  
      console.log(`Отправляем сообщение в комнату ${roomId}`);
      io.to(roomId).emit("receive_message", newMessage);
      console.log(`Сообщение отправлено в комнату ${roomId}`);
      io.emit("update_chats");
      console.log("Чаты обновлены для всех клиентов");
    } catch (err) {
      console.error("Ошибка при отправке сообщения", err);
      // Отправляем сообщение клиенту об ошибке
      socket.emit("error_message", {
        message: "Ошибка при отправке сообщения. Попробуйте еще раз.",
      });
    }
  });

  socket.on("disconnect_chat", async (roomId) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        // Создаем архивную комнату на основе текущей
        console.log(room)
        const archivedRoom = new ArchivedRoom({
          roomId: room.roomId,
          clients: room.clients,
          managers: room.managers,
          messages: room.messages,
          startTime: room.startTime,
          endTime: new Date(), // Время окончания чата
        });

        await archivedRoom.save(); // Сохраняем архивную комнату

        // Удаляем активную комнату из коллекции Room
        await Room.deleteOne({ roomId: roomId });
        console.log(`Комната с ID ${roomId} была архивирована и удалена из активных комнат`);

        io.to(roomId).emit("chat_disconnected", "Чат был отключен и архивирован.");
        io.in(roomId).socketsLeave(roomId);
      } else {
        console.log(`Комната с ID ${roomId} не найдена`);
      }
    } catch (err) {
      console.error("Ошибка при архивации комнаты", err);
    }
  });

  // socket.on("disconnect", () => {
  //   console.log(`Клиент ${socket.id} отключен`);
    // Когда пользователь или менеджер отключаются
    // socket.on("disconnect", () => {
    //   if (managers.includes(socket.id)) {
    //     managers = managers.filter((id) => id !== socket.id);
    //     console.log(`Менеджер ${socket.id} отключен`);
    //   } else if (users[socket.id]) {
    //     const managerId = users[socket.id];
    //     managers.push(managerId); // Освобождаем менеджера
    //     delete users[socket.id];
    //     console.log(`Пользователь ${socket.id} отключен`);
    //   }
    // });
  // });

socket.on("get_archived_rooms", async ({ username }) => {
  try {
    // Находим все архивные комнаты, где менеджер с указанным именем участвовал
    const archivedRooms = await ArchivedRoom.find({
      "managers.username": username,
    });

    socket.emit("archived_rooms_update", archivedRooms); // Отправляем результат клиенту
  } catch (err) {
    console.error("Ошибка при получении архивированных чатов", err);
  }
});});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
