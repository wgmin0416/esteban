const express = require("express");
const router = express.Router();

router.get("/login", (req, res) => {
  const { username, password } = req.body;

  // 예제 비즈니스 로직 (실제 로직은 DB 조회 추가)
  if (username === "admin" && password === "1234") {
    return res.json({ message: "Login successful", token: "fake-jwt-token" });
  }
  return res.status(401).json({ message: "Invalid credentials" });
});

module.exports = router;
