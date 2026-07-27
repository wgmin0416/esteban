const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController.js');
const authMiddleware = require('../../middleware/authMiddleware.js');

// 소셜 로그인
router.get('/google/callback', userController.googleLoginCallback);
router.get('/naver/callback', userController.naverLoginCallback);
router.get('/kakao/callback', userController.kakaoLoginCallback);

// 앱: 일회용 코드(otc) → access token 교환
router.post('/app/token', userController.exchangeAppToken);

// 개발용 테스트 계정 로그인 (DEV_LOGIN_ENABLED=true 일 때만)
router.post('/dev-login', userController.devLogin);

// 관리자 로그인
router.post('/admin-login', userController.adminLogin);

// 로그아웃
router.get('/logout', userController.logout);

// Access Token 재발급
router.post('/refresh-token', userController.refreshAccessToken);

// 내 정보 조회
router.get('/my-info', authMiddleware, userController.myInfo);
// 내 정보 수정
router.put('/update', authMiddleware, userController.updateMyInfo);
// 내가 속한 팀 목록 조회
router.get('/my-teams', authMiddleware, userController.getMyTeams);

module.exports = router;
