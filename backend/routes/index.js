const express = require("express");
const router = express.Router();
const authRoutes = require("./auth/auth");
const postRoutes = require("./post");

// 회원 관련 API
router.use("/auth", authRoutes);

// 게시판 API
router.use("/posts", postRoutes);

module.exports = router;