const express = require("express");
const router = express.Router();
const userRoutes = require("./v1/user/index.js");

// 회원 관련 API
console.log("회원 관련 API");
router.use("/user", userRoutes);

module.exports = router;
