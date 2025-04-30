const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController.js');

// 회원가입
router.post('/join', userController.joinUser);
// ID 중복 체크
router.get('/id-duplicate-check', userController.checkDuplicateUserId);
// 소셜 로그인
router.get('/google/callback', userController.googleLoginCallback);
router.get('/naver/callback', userController.naverLoginCallback);
// router.get('/kakao/callback', userController.kakaoCallback);

module.exports = router;
