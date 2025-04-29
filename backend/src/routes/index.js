const express = require("express");
const router = express.Router();
const userRoutes = require("./user");

// 회원, 인증 관련 API
router.use("/user", userRoutes);

module.exports = router;
