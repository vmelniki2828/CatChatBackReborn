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

module.exports = router;
