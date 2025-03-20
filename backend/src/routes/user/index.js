const express = require("express");
const router = express.Router();
const userController = require("../../controllers/userController.js");

// 회원가입
router.post("/join", userController.joinUser);
// ID 중복 체크
router.get("/id-duplicate-check", userController.checkDuplicateUserId);
// 로그인
router.post("/login", userController.loginUser);

module.exports = router;
