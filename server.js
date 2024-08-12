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
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Укажите правильный адрес вашего клиента (фронтенда)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: "http://localhost:3000", // Укажите правильный адрес вашего клиента (фронтенда)
    methods: ["GET", "POST"],
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
app.use("/api", managersRoutes);
app.use("/api", roomRoutes);

// let managers = []; // Список доступных менеджеров
// let users = {}; // Соответствие пользователя и менеджера

const getRandomManager = async () => {
  try {
    const managers = await Manager.find(); // Получаем всех менеджеров
    if (managers.length === 0) {
      throw new Error("Нет доступных менеджеров");
    }
    const randomIndex = Math.floor(Math.random() * managers.length); // Выбираем случайный индекс
    return managers[randomIndex];
  } catch (err) {
    console.error("Ошибка при получении случайного менеджера", err);
    throw err;
  }
};

io.on("connection", (socket) => {
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

  socket.on("join_user", async (username, email) => {
    console.log(username, email);
    try {
      const clientForRoom = {
        username: username,
        clientId: socket.id,
        email: email,
        location: "", // Здесь можно установить значение location, если оно доступно
      };

      // Создаем новую комнату и добавляем клиента
      const newRoom = new Room({
        roomId: `room_${clientForRoom.clientId}`, // Генерация уникального ID для комнаты
        clients: clientForRoom, // Добавление клиента в комнату
        managers: [], // Менеджеры будут добавлены позже
        messages: [], // Изначально пустой массив сообщений
      });

      await newRoom.save();
      console.log(`Комната с ID ${newRoom.roomId} успешно создана`);
      socket.emit("roomCreated", newRoom.roomId);

      const randomManager = await getRandomManager();
      if (randomManager) {
        // Добавляем менеджера в комнату
        newRoom.managers.push({
          username: randomManager.username,
          socketId: randomManager.socketId,
        });
        await newRoom.save();
        console.log(
          `Менеджер ${randomManager.username} добавлен в комнату ${newRoom.roomId}`
        );
      }
      io.emit("newChat", newRoom);
    } catch (err) {
      console.error("Ошибка при сохранении клиента в базе данных", err);
    }
  });

  socket.on("send_message", async (message) => {
    const { roomId, sender, messageText } = message;
    try {
      const room = await Room.findOne({ roomId });
  
      if (!room) {
        console.error("Комната не найдена");
        return;
      }
  
      // Создание нового сообщения
      const newMessage = {
        sender,
        message: messageText,
        timestamp: new Date(),
      };
  
      // Добавление сообщения в массив
      room.messages.push(newMessage);
  
      // Сохранение изменений в базе данных
      await room.save();
      console.log(newMessage)
      // Отправка сообщения всем клиентам в комнате
      console.log(roomId)
      io.emit("receive_message", newMessage);
  
    } catch (err) {
      console.error("Ошибка при отправке сообщения", err);
    }
  });

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
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
