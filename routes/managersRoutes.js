const express = require("express");
const router = express.Router();
const Manager = require("../models/Manager");

router.get("/managers", async (req, res) => {
  try {
    const manager = await Manager.find();
    if (!manager) {
      return res.status(404).json({ error: "Пользователи не найдены" });
    }
    res.json(manager);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка при получении пользователей" });
  }
});

router.get("/managers/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const manager = await Manager.findOne({ username });

    // Если менеджер не найден, возвращаем null
    if (!manager) {
      return res.json({ manager: null });
    }

    // Если менеджер найден, возвращаем его данные
    res.json({ manager });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка при поиске менеджера" });
  }
});

module.exports = router;
