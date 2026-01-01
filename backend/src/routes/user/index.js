const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController.js');
const authMiddleware = require('../../middleware/authMiddleware.js');

// 소셜 로그인
router.get('/google/callback', userController.googleLoginCallback);
router.get('/naver/callback', userController.naverLoginCallback);
router.get('/kakao/callback', userController.kakaoLoginCallback);

// 관리자 로그인
router.post('/admin-login', userController.adminLogin);

// 로그아웃
router.get('/logout', userController.logout);

// 내 정보 조회
router.get('/my-info', authMiddleware, userController.myInfo);
// 내 정보 수정
router.put('/update', authMiddleware, userController.updateMyInfo);
// 내가 속한 팀 목록 조회
router.get('/my-teams', authMiddleware, userController.getMyTeams);

module.exports = router;
