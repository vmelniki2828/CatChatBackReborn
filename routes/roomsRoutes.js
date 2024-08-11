const express = require("express");
const router = express.Router();
const Room = require("../models/Room"); // Убедитесь, что путь к модели Room правильный

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

module.exports = router;