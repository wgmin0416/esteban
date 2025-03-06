const express = require("express");
const router = express.Router();
const authRoutes = require("./auth/auth");

// 회원 관련 API
router.use("/auth", authRoutes);

module.exports = router;