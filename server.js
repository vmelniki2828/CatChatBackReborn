const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const Client = require("./models/Client");
const Manager = require("./models/Manager");
const Room = require("./models/Room");
const app = express();
const server = http.createServer(app);
const managersRoutes = require("./routes/managersRoutes");
const { default: mongoose } = require("mongoose");
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3001", // Укажите адрес вашего клиента
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
    reconnection: true, // Включает автоматическое восстановление соединения
    reconnectionAttempts: 5, // Максимальное количество попыток восстановления
    reconnectionDelay: 1000,
  },
});

app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
    reconnection: true, // Включает автоматическое восстановление соединения
    reconnectionAttempts: 5, // Максимальное количество попыток восстановления
    reconnectionDelay: 1000, // Укажите адрес вашего клиента
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

let managers = []; // Список доступных менеджеров
let users = {}; // Соответствие пользователя и менеджера

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
    console.log(username, email)
    try {
      let client = await Client.findOne({ email });
      if (client) {
        socket.emit("userExists", "Пользователь с таким email уже существует");
        return;
      } else {
        const clientId = socket.id;
        console.log(username, clientId, email)
        client = new Client({
          username,
          clientId,
          email,
        });
        await client.save();
      }
      console.log(`Клиент ${username} успешно сохранен`);
    } catch (err) {
      console.error("Ошибка при сохранении клиента в базе данных", err);
    }

    //   // Создаем нового клиента
    //   const clientId = uuidv4();
    //

    //   if (managers.length > 0) {
    //     const manager = managers.shift();
    //     users[clientId] = { managerId: manager.id, roomId: `room-${clientId}` };
    //     socket.join(users[clientId].roomId);
    //     io.to(manager.socketId).socketsJoin(users[clientId].roomId);
    //     socket.emit("userAssigned", users[clientId].roomId);
    //     console.log(
    //       `Пользователь ${clientId} подключен к менеджеру ${manager.id}`
    //     );

    //     io.to(manager.socketId).emit("userAssigned", clientId);
    //   } else {
    //     socket.emit("noManagersAvailable");
    //     console.log(`Нет доступных менеджеров для пользователя ${clientId}`);
    //   }
    // } catch (error) {
    //   console.error("Ошибка при подключении пользователя:", error);
    //   socket.emit("error", "Ошибка при подключении пользователя");
    // }
  });

  socket.on("message", ({ roomId, message }) => {
    io.to(roomId).emit("message", message);
  });

  // Когда пользователь или менеджер отключаются
  socket.on("disconnect", () => {
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
