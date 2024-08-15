const express = require("express");
const router = express.Router();
const Room = require("../models/Room"); // Убедитесь, что путь к модели Room правильный
const Manager = require("../models/Manager");

// Маршрут для получения всех чатов по нику менеджера
router.get("/rooms/:managerName", async (req, res) => {
  const managerName = req.params.managerName;

  try {
    // Поиск всех комнат, где присутствует менеджер с указанным именем
    const rooms = await Room.find({ "managers.username": managerName });

    if (rooms.length === 0) {
      return res.status(404).json({ message: `Чаты с менеджером ${managerName} не найдены` });
    }

    res.json(rooms);
  } catch (err) {
    console.error("Ошибка при поиске чатов по нику менеджера", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.put("/rooms/:roomId/replace-manager", async (req, res) => {
  console.log('Запрос Body:', req.body); // Логируем тело запроса

  const { roomId } = req.params;
  const { oldManagerUsername, newManagerUsername } = req.body;

  try {
    // Находим комнату по roomId
    const room = await Room.findOne({ roomId });

    console.log(room)

    if (!room) {
      return res.status(404).json({ message: "Комната не найдена" });
    }

    // Находим старого менеджера в комнате
    const oldManagerIndex = room.managers.findIndex(manager => manager.username === oldManagerUsername);
    console.log(oldManagerIndex)
    if (oldManagerIndex === -1) {
      return res.status(404).json({ message: `Менеджер ${oldManagerUsername} не найден в этой комнате` });
    }

    // Находим нового менеджера в базе данных
    const newManager = await Manager.findOne({ username: newManagerUsername });
    if (!newManager) {
      return res.status(404).json({ message: `Новый менеджер ${newManagerUsername} не найден` });
    }

    // Заменяем старого менеджера на нового
    room.managers[oldManagerIndex] = {
      username: newManager.username,
      socketId: newManager.socketId,
    };

    // Сохраняем изменения в базе данных
    await room.save();

    res.json({ message: `Менеджер ${oldManagerUsername} успешно заменен на ${newManagerUsername}` });
  } catch (err) {
    console.error("Ошибка при замене менеджера", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

module.exports = router;